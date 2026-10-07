"""
app/routers/trends.py

Endpoint:
  GET /patients/{id}/trend — weekly ROM and form quality trend for a patient
"""
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Checkin, Patient
from app.schemas import TrendResponse, WeeklyScore
from app.scoring import compute_trend_flag, get_reference_band

router = APIRouter(prefix="/patients", tags=["trends"])

# A check-in is considered "recent" if it's within this many days.
# HEURISTIC — not clinical ground truth.
_RECENT_CHECKIN_DAYS: int = 14


@router.get(
    "/{patient_id}/trend",
    response_model=TrendResponse,
    summary="Weekly ROM and form quality trend for a patient",
)
def get_patient_trend(patient_id: str, db: Session = Depends(get_db)):
    """
    Aggregate per-week ROM score and form quality for the patient, plus
    heuristic reference band values for visualisation.

    Week numbering is relative to the patient's injury_date (week 1 = first
    7 days post-injury).

    Flag values (api-contract.md):
      "on_track"          — slope within/above reference band (last 2 weeks)
      "plateaued"         — slope below reference band
      "no_recent_checkin" — no check-in in the last _RECENT_CHECKIN_DAYS days
      (Note: "insufficient_data" from scoring is mapped to "no_recent_checkin"
       when there is genuinely no recent check-in activity.)
    """
    # Validate patient exists
    patient: Patient | None = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient '{patient_id}' not found.",
        )

    # All check-ins for this patient, ordered oldest-first
    all_checkins: list[Checkin] = (
        db.query(Checkin)
        .filter(Checkin.patient_id == patient_id)
        .order_by(Checkin.created_at.asc())
        .all()
    )

    # --- Check for no recent check-in ----------------------------------------
    if all_checkins:
        last_dt = all_checkins[-1].created_at
        if last_dt.tzinfo is None:
            last_dt = last_dt.replace(tzinfo=timezone.utc)
        days_since_last = (datetime.now(timezone.utc) - last_dt).days
        no_recent = days_since_last > _RECENT_CHECKIN_DAYS
    else:
        no_recent = True

    if no_recent:
        return TrendResponse(weekly_scores=[], flag="no_recent_checkin")

    # --- Aggregate by week (relative to injury_date) -------------------------
    injury_date = date.fromisoformat(patient.injury_date)

    weekly_data: dict[int, list[tuple[float, float]]] = {}  # week -> [(rom_score, form_quality_pct)]

    for c in all_checkins:
        dt = c.created_at
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        days_offset = (dt.date() - injury_date).days
        week_num = max(1, (days_offset // 7) + 1)  # 1-indexed
        weekly_data.setdefault(week_num, []).append((c.rom_score, c.form_quality_pct))

    weekly_scores: list[WeeklyScore] = []
    for week_num in sorted(weekly_data.keys()):
        entries = weekly_data[week_num]
        avg_rom = round(sum(e[0] for e in entries) / len(entries), 2)
        avg_form = round(sum(e[1] for e in entries) / len(entries), 2)
        band_low, band_high = get_reference_band(week_num)
        weekly_scores.append(
            WeeklyScore(
                week=week_num,
                rom_score=avg_rom,
                form_quality_pct=avg_form,
                reference_band_low=band_low,
                reference_band_high=band_high,
            )
        )

    # --- Compute trend flag from last 2 weeks of data ------------------------
    raw_flag = compute_trend_flag(patient_id, db)
    # Map "insufficient_data" (not enough points) to "no_recent_checkin" for
    # this endpoint's narrower flag enum (api-contract.md GET /trend).
    if raw_flag == "insufficient_data":
        flag = "no_recent_checkin"
    else:
        flag = raw_flag  # "on_track" | "plateaued"

    return TrendResponse(weekly_scores=weekly_scores, flag=flag)
