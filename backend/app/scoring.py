"""
app/scoring.py — Feature computation for ROM score, form quality, adherence streak,
and trend flag.

IMPORTANT: All threshold values and reference bands in this file are
HEURISTIC STUBS — they are NOT clinical ground truth and must NOT be
presented to patients or clinicians as diagnostic conclusions.
They exist solely to populate the dashboard with plausible trend signals
until a qualified physio team provides literature-derived values.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

# ---------------------------------------------------------------------------
# ROM Score normalisation
# ---------------------------------------------------------------------------

# Fallback rom_score assigned on the very first check-in (no prior baseline).
# 50 = neutral midpoint — neither good nor bad, just "we have a starting point now".
_FIRST_CHECKIN_ROM_SCORE = 50.0

# Cap multiplier: a patient performing 2× their baseline gets a capped score of 100.
# HEURISTIC — not clinical ground truth.
_ROM_SCORE_CAP_MULTIPLIER = 2.0


def compute_rom_score(max_angle: float, baseline_angle: float | None) -> float:
    """
    Normalise max_angle (degrees) against the patient's own baseline to 0–100.

    If baseline_angle is None (first ever check-in), returns the neutral score
    and the caller is responsible for saving max_angle as the new baseline.

    Formula:
        raw_ratio = max_angle / baseline_angle
        clamped   = clamp(raw_ratio, 0, _ROM_SCORE_CAP_MULTIPLIER)
        score     = (clamped / _ROM_SCORE_CAP_MULTIPLIER) * 100

    This means:
        - baseline_angle → 50
        - 2× baseline    → 100  (capped)
        - 0              → 0
    """
    if baseline_angle is None or baseline_angle == 0.0:
        return _FIRST_CHECKIN_ROM_SCORE

    raw_ratio = max_angle / baseline_angle
    clamped = max(0.0, min(raw_ratio, _ROM_SCORE_CAP_MULTIPLIER))
    return round((clamped / _ROM_SCORE_CAP_MULTIPLIER) * 100.0, 2)


# ---------------------------------------------------------------------------
# Form quality
# ---------------------------------------------------------------------------

def compute_form_quality_pct(reps: list) -> float:
    """
    Percentage of reps where deviation_type == 'none', i.e. clean form.
    Returns 0.0 if no reps provided.
    """
    if not reps:
        return 0.0
    clean = sum(1 for r in reps if r.deviation_type == "none")
    return round((clean / len(reps)) * 100.0, 2)


# ---------------------------------------------------------------------------
# Adherence streak
# ---------------------------------------------------------------------------

def compute_adherence_streak(patient_id: str, db: "Session") -> int:
    """
    Count the number of consecutive calendar days (ending today) on which
    the patient submitted at least one check-in.

    Uses local UTC date for day boundaries.
    """
    from app.models import Checkin  # local import avoids circular deps

    checkins = (
        db.query(Checkin)
        .filter(Checkin.patient_id == patient_id)
        .order_by(Checkin.created_at.desc())
        .all()
    )

    if not checkins:
        return 0

    # Collect unique check-in dates (UTC)
    dates_with_checkins: set[str] = set()
    for c in checkins:
        dt = c.created_at
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        dates_with_checkins.add(dt.date().isoformat())

    today = datetime.now(timezone.utc).date()
    streak = 0
    cursor = today

    while cursor.isoformat() in dates_with_checkins:
        streak += 1
        cursor -= timedelta(days=1)

    return streak


# ---------------------------------------------------------------------------
# Trend flag
# ---------------------------------------------------------------------------

# --- HEURISTIC STUBS — not clinical ground truth ----------------------------
# These values represent a placeholder "expected recovery slope" band.
# A physio team should replace them with literature-derived reference ranges.
# The slope is in rom_score units per day (0–100 scale).
_REFERENCE_SLOPE_LOW: float = 0.3    # HEURISTIC: minimum expected daily improvement
_REFERENCE_SLOPE_HIGH: float = 2.5   # HEURISTIC: maximum expected daily improvement
_TREND_WINDOW_DAYS: int = 14         # compare last 2 weeks of data
_MIN_CHECKINS_FOR_TREND: int = 3     # need at least this many points to compute a slope
# --- end stubs ---------------------------------------------------------------


def compute_trend_flag(patient_id: str, db: "Session") -> str:
    """
    Compare the rom_score slope over the last _TREND_WINDOW_DAYS against
    the heuristic reference band [_REFERENCE_SLOPE_LOW, _REFERENCE_SLOPE_HIGH].

    Returns:
        "on_track"         — slope within or above reference band
        "plateaued"        — slope below reference band (recovery stalled)
        "insufficient_data"— fewer than _MIN_CHECKINS_FOR_TREND data points

    NOTE: This is a HEURISTIC stub.  Slope is computed as a simple
    least-squares linear regression over (day_offset, rom_score) pairs.
    Replace _REFERENCE_SLOPE_LOW / _REFERENCE_SLOPE_HIGH with values from
    peer-reviewed physio literature before any clinical use.
    """
    from app.models import Checkin  # local import avoids circular deps

    cutoff = datetime.now(timezone.utc) - timedelta(days=_TREND_WINDOW_DAYS)

    recent = (
        db.query(Checkin)
        .filter(
            Checkin.patient_id == patient_id,
            Checkin.created_at >= cutoff,
        )
        .order_by(Checkin.created_at.asc())
        .all()
    )

    if len(recent) < _MIN_CHECKINS_FOR_TREND:
        return "insufficient_data"

    # Build (x=day_offset_float, y=rom_score) pairs
    t0 = recent[0].created_at
    if t0.tzinfo is None:
        t0 = t0.replace(tzinfo=timezone.utc)

    xs = []
    ys = []
    for c in recent:
        dt = c.created_at
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        day_offset = (dt - t0).total_seconds() / 86400.0
        xs.append(day_offset)
        ys.append(c.rom_score)

    slope = _linear_slope(xs, ys)

    # HEURISTIC comparison — see stubs above
    if slope >= _REFERENCE_SLOPE_LOW:
        return "on_track"
    else:
        return "plateaued"


def _linear_slope(xs: list[float], ys: list[float]) -> float:
    """Ordinary least-squares slope (Σ((x-x̄)(y-ȳ)) / Σ((x-x̄)²))."""
    n = len(xs)
    if n < 2:
        return 0.0
    x_mean = sum(xs) / n
    y_mean = sum(ys) / n
    numerator = sum((x - x_mean) * (y - y_mean) for x, y in zip(xs, ys))
    denominator = sum((x - x_mean) ** 2 for x in xs)
    if denominator == 0.0:
        return 0.0
    return numerator / denominator


# ---------------------------------------------------------------------------
# Reference band (for trend endpoint)
# ---------------------------------------------------------------------------

# HEURISTIC reference band values per week — not clinical ground truth.
# Replace with literature-derived progressive ROM norms when available.
_REFERENCE_BAND_LOW_DEFAULT: float = 30.0   # HEURISTIC
_REFERENCE_BAND_HIGH_DEFAULT: float = 55.0  # HEURISTIC


def get_reference_band(week: int) -> tuple[float, float]:
    """
    Return (low, high) heuristic reference band for a given recovery week.

    Currently returns a flat band regardless of week.
    TODO: Replace with week-indexed lookup from physio literature.
    HEURISTIC — not clinical ground truth.
    """
    # Simple linear growth stub: band shifts up slightly each week
    # HEURISTIC — not clinical ground truth
    shift = (week - 1) * 2.0  # +2 points per week as a rough progression stub
    return (
        round(_REFERENCE_BAND_LOW_DEFAULT + shift, 1),
        round(_REFERENCE_BAND_HIGH_DEFAULT + shift, 1),
    )
