"""
app/schemas.py — Pydantic v2 request/response models.

All field names, types, and enum values match api-contract.md exactly.
Do not rename or add fields without updating the contract first.
"""
from __future__ import annotations

from datetime import date
from typing import Literal, Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Shared enums (mirrored from api-contract.md)
# ---------------------------------------------------------------------------

InjuryType = Literal["wrist", "ankle", "elbow"]
Side = Literal["left", "right"]
DeviationType = Literal["none", "compensation", "overextend", "speed"]
TrendFlag = Literal["on_track", "plateaued", "insufficient_data"]
TrendFlagExtended = Literal["on_track", "plateaued", "no_recent_checkin"]


# ---------------------------------------------------------------------------
# POST /patients
# ---------------------------------------------------------------------------

class PatientCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    injury_type: InjuryType
    injury_date: date                  # accepts "YYYY-MM-DD"
    side: Side


class PatientResponse(BaseModel):
    patient_id: str


# ---------------------------------------------------------------------------
# POST /checkins — request body
# ---------------------------------------------------------------------------

class RepIn(BaseModel):
    rep_index: int = Field(..., ge=0)
    max_angle: float = Field(..., ge=0.0, le=360.0)
    duration_sec: float = Field(..., gt=0.0)
    deviation_score: float = Field(..., ge=0.0, le=1.0)
    deviation_type: DeviationType


class CheckinCreate(BaseModel):
    patient_id: str
    exercise_id: str = Field(..., min_length=1, max_length=100)
    reps: list[RepIn] = Field(..., min_length=1)


# ---------------------------------------------------------------------------
# POST /checkins — response
# ---------------------------------------------------------------------------

class CheckinResponse(BaseModel):
    checkin_id: str
    rom_score: float           # 0–100
    adherence_streak: int      # consecutive days with at least one check-in
    trend_flag: TrendFlag


# ---------------------------------------------------------------------------
# GET /patients/{id}/trend
# ---------------------------------------------------------------------------

class WeeklyScore(BaseModel):
    week: int                        # 1-indexed week number relative to injury_date
    rom_score: float                 # average rom_score for that week
    form_quality_pct: float          # average form quality % for that week
    reference_band_low: float        # heuristic lower bound — not clinical ground truth
    reference_band_high: float       # heuristic upper bound — not clinical ground truth


class TrendResponse(BaseModel):
    weekly_scores: list[WeeklyScore]
    flag: TrendFlagExtended


# ---------------------------------------------------------------------------
# GET /patients (doctor dashboard list)
# ---------------------------------------------------------------------------

class PatientListItem(BaseModel):
    patient_id: str
    name: str
    injury_type: InjuryType
    days_since_injury: int
    last_checkin: Optional[str]      # ISO datetime string or null
    status: str                      # derived from trend_flag of most recent check-in
