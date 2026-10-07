"""
backend/seed.py — Synthetic data seed script for local development/testing.

Usage:
    cd backend
    python seed.py

Requires DATABASE_URL to be set in environment or a .env file at backend/.env.
Creates 3 patients, each with 14 days of check-ins, to populate a realistic
dashboard state for manual testing.

SYNTHETIC DATA ONLY — not real patient information.
"""
import os
import random
import sys
import uuid
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

# Make `app` importable when running from the backend/ directory
sys.path.insert(0, str(Path(__file__).parent))

# Load .env file if present (never commit .env)
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    sys.exit(
        "ERROR: DATABASE_URL environment variable is not set.\n"
        "Copy backend/.env.example to backend/.env and fill in the real value."
    )

from app.database import Base
from app.models import Checkin, Patient, Rep
from app.scoring import (
    compute_adherence_streak,
    compute_form_quality_pct,
    compute_rom_score,
    compute_trend_flag,
)

engine = create_engine(DATABASE_URL, echo=False)
Session = sessionmaker(bind=engine)

# ---------------------------------------------------------------------------
# Synthetic patient specs
# ---------------------------------------------------------------------------

PATIENTS = [
    {
        "name": "Alice Sharma",
        "injury_type": "wrist",
        "injury_date": (date.today() - timedelta(days=21)).isoformat(),
        "side": "right",
    },
    {
        "name": "Bob Nair",
        "injury_type": "ankle",
        "injury_date": (date.today() - timedelta(days=35)).isoformat(),
        "side": "left",
    },
    {
        "name": "Priya Menon",
        "injury_type": "elbow",
        "injury_date": (date.today() - timedelta(days=14)).isoformat(),
        "side": "right",
    },
]

# Per-injury baseline ROM angles (degrees) — realistic starting points
# These are approximate functional ROM values for reference; synthetic only.
BASELINE_ANGLES = {
    "wrist": 35.0,
    "ankle": 20.0,
    "elbow": 90.0,
}

# Deviation type distribution (synthetic, not clinical)
DEVIATION_TYPES = ["none", "none", "none", "compensation", "overextend", "speed"]


# ---------------------------------------------------------------------------
# Seed helpers
# ---------------------------------------------------------------------------

def make_reps(exercise_id: str, base_angle: float, day_progress: float, n_reps: int = 5):
    """
    Generate synthetic rep data for a single check-in.

    day_progress: 0.0 → 1.0 representing how far through recovery the patient is.
    Angles and deviation types are randomised around a trend that improves over time.
    """
    reps = []
    for i in range(n_reps):
        # Angle grows as patient improves; add realistic noise
        angle = base_angle * (1.0 + day_progress * random.uniform(0.5, 1.0))
        angle = round(max(5.0, angle + random.gauss(0, 3.0)), 2)

        # Duration slightly decreases (more efficient movement) as progress increases
        duration = round(random.uniform(3.0, 6.0) - day_progress * random.uniform(0, 1.5), 2)
        duration = max(1.0, duration)

        # Deviation: improves over time (more "none" as day_progress increases)
        good_threshold = 0.4 + day_progress * 0.5  # 40% → 90% chance of clean rep
        if random.random() < good_threshold:
            deviation_type = "none"
        else:
            deviation_type = random.choice(["compensation", "overextend", "speed"])

        deviation_score = round(random.uniform(0.0, 0.3) if deviation_type == "none" else random.uniform(0.2, 0.8), 3)

        reps.append({
            "rep_index": i,
            "max_angle": angle,
            "duration_sec": duration,
            "deviation_score": deviation_score,
            "deviation_type": deviation_type,
        })
    return reps


# ---------------------------------------------------------------------------
# Main seed routine
# ---------------------------------------------------------------------------

def seed():
    random.seed(42)  # reproducible synthetic data
    Base.metadata.create_all(bind=engine)
    db = Session()

    try:
        # Clear existing seed data (idempotent re-runs)
        seed_names = {p["name"] for p in PATIENTS}
        existing = db.query(Patient).filter(Patient.name.in_(seed_names)).all()
        for p in existing:
            db.delete(p)
        db.commit()

        created_ids = []

        for spec in PATIENTS:
            # --- Create patient -----------------------------------------------
            patient_id = str(uuid.uuid4())
            injury_date = date.fromisoformat(spec["injury_date"])
            total_days_injured = (date.today() - injury_date).days

            patient = Patient(
                id=patient_id,
                name=spec["name"],
                injury_type=spec["injury_type"],
                injury_date=spec["injury_date"],
                side=spec["side"],
                rom_baseline=None,  # set on first check-in below
            )
            db.add(patient)
            db.flush()

            base_angle = BASELINE_ANGLES[spec["injury_type"]]

            # --- Create 14 days of check-ins (one per day) --------------------
            n_days = min(14, total_days_injured)
            for day_offset in range(n_days):
                checkin_date = injury_date + timedelta(days=day_offset + 1)
                # UTC datetime at noon to avoid timezone edge cases
                checkin_dt = datetime(
                    checkin_date.year, checkin_date.month, checkin_date.day,
                    12, 0, 0, tzinfo=timezone.utc,
                )

                progress = day_offset / max(n_days - 1, 1)  # 0.0 → 1.0
                reps_data = make_reps(
                    exercise_id="wrist_rotation" if spec["injury_type"] == "wrist"
                                else ("ankle_circles" if spec["injury_type"] == "ankle"
                                      else "elbow_flexion"),
                    base_angle=base_angle,
                    day_progress=progress,
                )

                session_max_angle = max(r["max_angle"] for r in reps_data)

                # First check-in sets baseline
                if patient.rom_baseline is None:
                    rom_score = 50.0  # neutral first check-in score
                    patient.rom_baseline = session_max_angle
                else:
                    rom_score = compute_rom_score(session_max_angle, patient.rom_baseline)

                # Form quality from rep data
                class _R:
                    def __init__(self, dt): self.deviation_type = dt
                form_quality_pct = compute_form_quality_pct([_R(r["deviation_type"]) for r in reps_data])

                exercise_id = (
                    "wrist_rotation" if spec["injury_type"] == "wrist"
                    else ("ankle_circles" if spec["injury_type"] == "ankle"
                          else "elbow_flexion")
                )
                checkin = Checkin(
                    id=str(uuid.uuid4()),
                    patient_id=patient_id,
                    exercise_id=exercise_id,
                    rom_score=rom_score,
                    form_quality_pct=form_quality_pct,
                    adherence_streak=day_offset + 1,  # simplified; updated below
                    trend_flag="insufficient_data",
                    created_at=checkin_dt,
                )
                db.add(checkin)
                db.flush()

                for rep_data in reps_data:
                    rep = Rep(
                        id=str(uuid.uuid4()),
                        checkin_id=checkin.id,
                        rep_index=rep_data["rep_index"],
                        max_angle=rep_data["max_angle"],
                        duration_sec=rep_data["duration_sec"],
                        deviation_score=rep_data["deviation_score"],
                        deviation_type=rep_data["deviation_type"],
                    )
                    db.add(rep)

            db.flush()

            # Update trend_flag on the most recent check-in using live DB query
            latest_checkin = (
                db.query(Checkin)
                .filter(Checkin.patient_id == patient_id)
                .order_by(Checkin.created_at.desc())
                .first()
            )
            if latest_checkin:
                tf = compute_trend_flag(patient_id, db)
                latest_checkin.trend_flag = tf

            db.commit()
            created_ids.append((spec["name"], patient_id))
            print(f"  ✓  {spec['name']:20s}  patient_id={patient_id}")

        print("\nSeed complete. Patient IDs:")
        for name, pid in created_ids:
            print(f"  {name}: {pid}")
        print("\nTip: export one as an env var and test the trend endpoint:")
        print(f"  curl http://localhost:8000/api/v1/patients/{created_ids[0][1]}/trend")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("Seeding database with synthetic patient data...")
    seed()
