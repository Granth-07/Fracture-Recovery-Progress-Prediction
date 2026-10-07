// ─── Shared contract types — mirrors docs/api-contract.md exactly ───────────

export type InjuryType = 'wrist' | 'ankle' | 'elbow'
export type Side = 'left' | 'right'
export type DeviationType = 'none' | 'compensation' | 'overextend' | 'speed'
export type TrendFlag = 'on_track' | 'plateaued' | 'no_recent_checkin'
export type PatientStatus = TrendFlag  // alias used in list view

// ── POST /checkins ──────────────────────────────────────────────────────────
export interface RepRecord {
  rep_index: number
  max_angle: number
  duration_sec: number
  deviation_score: number
  deviation_type: DeviationType
}

export interface CheckinBody {
  patient_id: string
  exercise_id: string
  reps: RepRecord[]
}

export interface CheckinResponse {
  checkin_id: string
  rom_score: number
  adherence_streak: number
  trend_flag: TrendFlag
}

// ── GET /patients/{id}/trend ────────────────────────────────────────────────
export interface WeeklyScore {
  week: number
  rom_score: number
  form_quality_pct: number
  reference_band_low: number
  reference_band_high: number
}

export interface TrendResponse {
  weekly_scores: WeeklyScore[]
  flag: TrendFlag
}

// ── GET /patients ────────────────────────────────────────────────────────────
export interface PatientSummary {
  patient_id: string
  name: string
  injury_type: InjuryType
  days_since_injury: number
  last_checkin: string | null   // ISO date string or null
  status: PatientStatus
}

// ── POST /patients ───────────────────────────────────────────────────────────
export interface CreatePatientBody {
  name: string
  injury_type: InjuryType
  injury_date: string
  side: Side
}

export interface CreatePatientResponse {
  patient_id: string
}

// ── Check-in history row (derived from checkin response; stored locally) ─────
export interface CheckinHistoryRow {
  checkin_id: string
  date: string
  rom_score: number
  form_quality_pct: number
  adherence_streak: number
  trend_flag: TrendFlag
}
