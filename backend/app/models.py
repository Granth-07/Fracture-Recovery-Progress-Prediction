"""
app/models.py — SQLAlchemy ORM models.

Tables:
  patients  — one row per registered patient
  checkins  — one row per exercise session
  reps      — one row per individual rep within a check-in

Field naming rule (from api-contract.md):
  - Use rom_score (0-100), not raw angle values in API surfaces
  - deviation_type follows the exact enum in the contract
  - No field names implying diagnosis (no healing_stage, fracture_status, etc.)
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.database import Base


# ---------------------------------------------------------------------------
# Enum definitions — mirror api-contract.md exactly
# ---------------------------------------------------------------------------

INJURY_TYPE_ENUM = Enum(
    "wrist", "ankle", "elbow",
    name="injury_type_enum",
)

SIDE_ENUM = Enum(
    "left", "right",
    name="side_enum",
)

DEVIATION_TYPE_ENUM = Enum(
    "none", "compensation", "overextend", "speed",
    name="deviation_type_enum",
)

TREND_FLAG_ENUM = Enum(
    "on_track", "plateaued", "insufficient_data",
    name="trend_flag_enum",
)


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class Patient(Base):
    __tablename__ = "patients"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    injury_type = Column(INJURY_TYPE_ENUM, nullable=False)
    injury_date = Column(String(10), nullable=False)   # ISO date string "YYYY-MM-DD"
    side = Column(SIDE_ENUM, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Baseline ROM angle (degrees) captured on the patient's FIRST check-in.
    # Used to normalise subsequent rom_score values to a 0-100 scale.
    # NULL until the first check-in is submitted.
    rom_baseline: Column = Column(Float, nullable=True, default=None)

    checkins = relationship("Checkin", back_populates="patient", cascade="all, delete-orphan")


class Checkin(Base):
    __tablename__ = "checkins"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String(36), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    exercise_id = Column(String(100), nullable=False)

    # Computed fields stored for fast retrieval
    rom_score = Column(Float, nullable=False)          # 0–100 normalised score
    form_quality_pct = Column(Float, nullable=False)   # % of reps with deviation_type="none"
    adherence_streak = Column(Integer, nullable=False, default=0)
    trend_flag = Column(TREND_FLAG_ENUM, nullable=False, default="insufficient_data")

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    patient = relationship("Patient", back_populates="checkins")
    reps = relationship("Rep", back_populates="checkin", cascade="all, delete-orphan")


class Rep(Base):
    __tablename__ = "reps"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    checkin_id = Column(String(36), ForeignKey("checkins.id", ondelete="CASCADE"), nullable=False)

    rep_index = Column(Integer, nullable=False)
    max_angle = Column(Float, nullable=False)          # degrees — raw pose extraction output
    duration_sec = Column(Float, nullable=False)
    deviation_score = Column(Float, nullable=False)    # 0.0–1.0 form deviation magnitude
    deviation_type = Column(DEVIATION_TYPE_ENUM, nullable=False)

    checkin = relationship("Checkin", back_populates="reps")
