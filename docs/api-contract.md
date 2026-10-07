# API Contract (v1) — shared source of truth

Base URL (local): `http://localhost:8000/api/v1`

## POST /patients
Body: `{ name, injury_type: "wrist"|"ankle"|"elbow", injury_date, side: "left"|"right" }`
Returns: `{ patient_id }`

## POST /checkins
Body:
```json
{
  "patient_id": "string",
  "exercise_id": "wrist_rotation",
  "reps": [
    { "rep_index": 0, "max_angle": 52.3, "duration_sec": 4.1,
      "deviation_score": 0.12, "deviation_type": "none" | "compensation" | "overextend" | "speed" }
  ]
}
```
Returns: `{ checkin_id, rom_score, adherence_streak, trend_flag: "on_track"|"plateaued"|"insufficient_data" }`

## GET /patients/{id}/trend
Returns:
```json
{
  "weekly_scores": [{ "week": 1, "rom_score": 40, "form_quality_pct": 78, "reference_band_low": 30, "reference_band_high": 55 }],
  "flag": "on_track" | "plateaued" | "no_recent_checkin"
}
```

## GET /patients (doctor dashboard list)
Returns: `[{ patient_id, name, injury_type, days_since_injury, last_checkin, status }]`

## Field naming rules
- Use `rom_score` (0–100 normalized), never raw pixel/angle-only values in list views
- Use `deviation_type` enum exactly as listed above — do not invent new values without updating this file
- No field named anything implying diagnosis (`healing_stage`, `fracture_status`, etc.)
