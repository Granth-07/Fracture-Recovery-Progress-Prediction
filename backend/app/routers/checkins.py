"""
app/routers/checkins.py

Endpoint:
  POST /checkins — submit a new exercise check-in with rep data
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Checkin, Patient, Rep
from app.schemas import CheckinCreate, CheckinResponse
from app.scoring import (
    compute_adherence_streak,
    compute_form_quality_pct,
    compute_rom_score,
    compute_trend_flag,
)

router = APIRouter(prefix="/checkins", tags=["checkins"])


@router.post(
    "",
    response_model=CheckinResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit an exercise check-in with rep-level data",
)
def create_checkin(body: CheckinCreate, db: Session = Depends(get_db)):
    """
    Create a check-in session.

    Processing steps:
      1. Validate patient exists
      2. Compute max_angle as the maximum across all submitted reps
      3. If patient has no baseline yet, store this session's max_angle as baseline
      4. Compute rom_score (0–100) relative to patient baseline
      5. Compute form_quality_pct (% clean reps)
      6. Persist check-in and reps
      7. Compute adherence_streak and trend_flag (read from DB history)
      8. Return CheckinResponse

    Returns exactly: { checkin_id, rom_score, adherence_streak, trend_flag }
    as specified in api-contract.md.
    """
    # 1. Validate patient
    patient: Patient | None = db.query(Patient).filter(Patient.id == body.patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient '{body.patient_id}' not found.",
        )

    # 2. Best max_angle this session (peak ROM across all reps)
    session_max_angle = max(r.max_angle for r in body.reps)

    # 3. Set baseline on first ever check-in; compute rom_score against it
    if patient.rom_baseline is None:
        # First check-in — store as baseline, return neutral score
        rom_score = compute_rom_score(session_max_angle, None)
        patient.rom_baseline = session_max_angle
    else:
        rom_score = compute_rom_score(session_max_angle, patient.rom_baseline)

    # 4. Form quality
    # Build lightweight objects compatible with compute_form_quality_pct
    form_quality_pct = _form_quality_from_body(body.reps)

    # 5. Persist check-in (reps added after to get checkin.id)
    checkin = Checkin(
        patient_id=body.patient_id,
        exercise_id=body.exercise_id,
        rom_score=rom_score,
        form_quality_pct=form_quality_pct,
        adherence_streak=0,      # placeholder; updated below after flush
        trend_flag="insufficient_data",  # placeholder; updated after persistence
    )
    db.add(checkin)
    db.flush()  # assigns checkin.id without committing

    # 6. Persist reps
    for rep_in in body.reps:
        rep = Rep(
            checkin_id=checkin.id,
            rep_index=rep_in.rep_index,
            max_angle=rep_in.max_angle,
            duration_sec=rep_in.duration_sec,
            deviation_score=rep_in.deviation_score,
            deviation_type=rep_in.deviation_type,
        )
        db.add(rep)

    db.flush()  # reps now in session; patient baseline update included

    # 7. Compute streak and trend using DB history (includes this check-in)
    adherence_streak = compute_adherence_streak(body.patient_id, db)
    trend_flag = compute_trend_flag(body.patient_id, db)

    # Update computed fields on the checkin row
    checkin.adherence_streak = adherence_streak
    checkin.trend_flag = trend_flag

    db.commit()
    db.refresh(checkin)

    return CheckinResponse(
        checkin_id=checkin.id,
        rom_score=rom_score,
        adherence_streak=adherence_streak,
        trend_flag=trend_flag,
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

class _RepProxy:
    """Minimal duck-typed proxy so scoring functions don't depend on SQLAlchemy models."""
    def __init__(self, deviation_type: str):
        self.deviation_type = deviation_type


def _form_quality_from_body(reps) -> float:
    proxies = [_RepProxy(r.deviation_type) for r in reps]
    return compute_form_quality_pct(proxies)
