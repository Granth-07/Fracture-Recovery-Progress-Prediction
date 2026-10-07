"""
app/routers/patients.py

Endpoints:
  POST /patients         — register a new patient
  GET  /patients         — doctor dashboard list (all patients with summary fields)
"""
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Checkin, Patient
from app.schemas import PatientCreate, PatientListItem, PatientResponse

router = APIRouter(prefix="/patients", tags=["patients"])


# ---------------------------------------------------------------------------
# POST /patients
# ---------------------------------------------------------------------------

@router.post(
    "",
    response_model=PatientResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new patient",
)
def create_patient(body: PatientCreate, db: Session = Depends(get_db)):
    """
    Create a new patient record.

    Returns `{ patient_id }` exactly as specified in api-contract.md.
    """
    patient = Patient(
        name=body.name,
        injury_type=body.injury_type,
        injury_date=body.injury_date.isoformat(),
        side=body.side,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return PatientResponse(patient_id=patient.id)


# ---------------------------------------------------------------------------
# GET /patients
# ---------------------------------------------------------------------------

@router.get(
    "",
    response_model=list[PatientListItem],
    summary="Doctor dashboard — all patients with summary status",
)
def list_patients(db: Session = Depends(get_db)):
    """
    Return all patients with computed summary fields for the doctor dashboard.

    Field mapping (api-contract.md):
      patient_id        — UUID string
      name              — patient full name
      injury_type       — wrist | ankle | elbow
      days_since_injury — calendar days from injury_date to today (UTC)
      last_checkin      — ISO datetime of most recent check-in, or null
      status            — derived from most recent trend_flag:
                            on_track          → "active"
                            plateaued         → "needs_attention"
                            insufficient_data → "monitoring"
                            (no check-ins)    → "no_data"
    """
    patients = db.query(Patient).order_by(Patient.created_at.desc()).all()
    today = datetime.now(timezone.utc).date()

    result = []
    for p in patients:
        # Most recent check-in (if any)
        last_checkin_row: Checkin | None = (
            db.query(Checkin)
            .filter(Checkin.patient_id == p.id)
            .order_by(Checkin.created_at.desc())
            .first()
        )

        last_checkin_str: str | None = None
        if last_checkin_row:
            dt = last_checkin_row.created_at
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            last_checkin_str = dt.isoformat()

        # Derive status from most recent trend_flag
        status_map = {
            "on_track": "active",
            "plateaued": "needs_attention",
            "insufficient_data": "monitoring",
        }
        if last_checkin_row:
            status_value = status_map.get(last_checkin_row.trend_flag, "monitoring")
        else:
            status_value = "no_data"

        # Days since injury
        injury_dt = date.fromisoformat(p.injury_date)
        days_since_injury = (today - injury_dt).days

        result.append(
            PatientListItem(
                patient_id=p.id,
                name=p.name,
                injury_type=p.injury_type,
                days_since_injury=days_since_injury,
                last_checkin=last_checkin_str,
                status=status_value,
            )
        )

    return result
