// MOCK_DATA.ts — shapes match docs/api-contract.md exactly.
// Replace with real API calls once backend is live.

import type {
  PatientSummary,
  TrendResponse,
  CheckinHistoryRow,
  CheckinResponse,
} from '../types/contract'

// ── GET /patients ─────────────────────────────────────────────────────────────
export const MOCK_PATIENTS: PatientSummary[] = [
  {
    patient_id: 'p-001',
    name: 'Priya Sharma',
    injury_type: 'wrist',
    days_since_injury: 28,
    last_checkin: '2026-09-11',
    status: 'on_track',
  },
  {
    patient_id: 'p-002',
    name: 'Arjun Mehra',
    injury_type: 'ankle',
    days_since_injury: 45,
    last_checkin: '2026-09-09',
    status: 'plateaued',
  },
  {
    patient_id: 'p-003',
    name: 'Kavya Nair',
    injury_type: 'elbow',
    days_since_injury: 14,
    last_checkin: null,
    status: 'no_recent_checkin',
  },
  {
    patient_id: 'p-004',
    name: 'Rohit Verma',
    injury_type: 'wrist',
    days_since_injury: 60,
    last_checkin: '2026-09-10',
    status: 'on_track',
  },
  {
    patient_id: 'p-005',
    name: 'Sneha Pillai',
    injury_type: 'ankle',
    days_since_injury: 33,
    last_checkin: '2026-09-08',
    status: 'plateaued',
  },
  {
    patient_id: 'p-006',
    name: 'Deepak Joshi',
    injury_type: 'elbow',
    days_since_injury: 7,
    last_checkin: null,
    status: 'no_recent_checkin',
  },
]

// ── GET /patients/{id}/trend ──────────────────────────────────────────────────
export const MOCK_TRENDS: Record<string, TrendResponse> = {
  'p-001': {
    flag: 'on_track',
    weekly_scores: [
      { week: 1, rom_score: 32, form_quality_pct: 60, reference_band_low: 28, reference_band_high: 50 },
      { week: 2, rom_score: 41, form_quality_pct: 67, reference_band_low: 32, reference_band_high: 55 },
      { week: 3, rom_score: 55, form_quality_pct: 72, reference_band_low: 36, reference_band_high: 60 },
      { week: 4, rom_score: 63, form_quality_pct: 78, reference_band_low: 40, reference_band_high: 65 },
    ],
  },
  'p-002': {
    flag: 'plateaued',
    weekly_scores: [
      { week: 1, rom_score: 38, form_quality_pct: 55, reference_band_low: 30, reference_band_high: 55 },
      { week: 2, rom_score: 44, form_quality_pct: 60, reference_band_low: 34, reference_band_high: 58 },
      { week: 3, rom_score: 46, form_quality_pct: 62, reference_band_low: 38, reference_band_high: 62 },
      { week: 4, rom_score: 47, form_quality_pct: 63, reference_band_low: 42, reference_band_high: 66 },
      { week: 5, rom_score: 46, form_quality_pct: 61, reference_band_low: 46, reference_band_high: 70 },
      { week: 6, rom_score: 48, form_quality_pct: 64, reference_band_low: 50, reference_band_high: 74 },
    ],
  },
  'p-003': {
    flag: 'no_recent_checkin',
    weekly_scores: [
      { week: 1, rom_score: 25, form_quality_pct: 50, reference_band_low: 22, reference_band_high: 45 },
      { week: 2, rom_score: 30, form_quality_pct: 58, reference_band_low: 26, reference_band_high: 50 },
    ],
  },
  'p-004': {
    flag: 'on_track',
    weekly_scores: [
      { week: 1, rom_score: 30, form_quality_pct: 58, reference_band_low: 25, reference_band_high: 48 },
      { week: 2, rom_score: 42, form_quality_pct: 65, reference_band_low: 30, reference_band_high: 54 },
      { week: 3, rom_score: 53, form_quality_pct: 74, reference_band_low: 35, reference_band_high: 60 },
      { week: 4, rom_score: 60, form_quality_pct: 80, reference_band_low: 40, reference_band_high: 66 },
      { week: 5, rom_score: 68, form_quality_pct: 85, reference_band_low: 45, reference_band_high: 72 },
      { week: 6, rom_score: 74, form_quality_pct: 88, reference_band_low: 50, reference_band_high: 78 },
      { week: 7, rom_score: 79, form_quality_pct: 91, reference_band_low: 55, reference_band_high: 82 },
      { week: 8, rom_score: 83, form_quality_pct: 93, reference_band_low: 60, reference_band_high: 86 },
    ],
  },
  'p-005': {
    flag: 'plateaued',
    weekly_scores: [
      { week: 1, rom_score: 35, form_quality_pct: 52, reference_band_low: 30, reference_band_high: 52 },
      { week: 2, rom_score: 40, form_quality_pct: 57, reference_band_low: 34, reference_band_high: 56 },
      { week: 3, rom_score: 42, form_quality_pct: 60, reference_band_low: 38, reference_band_high: 60 },
      { week: 4, rom_score: 43, form_quality_pct: 61, reference_band_low: 42, reference_band_high: 64 },
    ],
  },
  'p-006': {
    flag: 'no_recent_checkin',
    weekly_scores: [
      { week: 1, rom_score: 20, form_quality_pct: 45, reference_band_low: 18, reference_band_high: 40 },
    ],
  },
}

// ── Check-in history per patient ──────────────────────────────────────────────
export const MOCK_CHECKIN_HISTORY: Record<string, CheckinHistoryRow[]> = {
  'p-001': [
    { checkin_id: 'ci-101', date: '2026-09-11', rom_score: 63, form_quality_pct: 78, adherence_streak: 7, trend_flag: 'on_track' },
    { checkin_id: 'ci-102', date: '2026-09-04', rom_score: 55, form_quality_pct: 72, adherence_streak: 6, trend_flag: 'on_track' },
    { checkin_id: 'ci-103', date: '2026-08-28', rom_score: 41, form_quality_pct: 67, adherence_streak: 4, trend_flag: 'on_track' },
    { checkin_id: 'ci-104', date: '2026-08-21', rom_score: 32, form_quality_pct: 60, adherence_streak: 2, trend_flag: 'plateaued' },
  ],
  'p-002': [
    { checkin_id: 'ci-201', date: '2026-09-09', rom_score: 48, form_quality_pct: 64, adherence_streak: 3, trend_flag: 'plateaued' },
    { checkin_id: 'ci-202', date: '2026-09-02', rom_score: 46, form_quality_pct: 61, adherence_streak: 2, trend_flag: 'plateaued' },
    { checkin_id: 'ci-203', date: '2026-08-26', rom_score: 47, form_quality_pct: 63, adherence_streak: 1, trend_flag: 'plateaued' },
  ],
  'p-003': [],
  'p-004': [
    { checkin_id: 'ci-401', date: '2026-09-10', rom_score: 83, form_quality_pct: 93, adherence_streak: 12, trend_flag: 'on_track' },
    { checkin_id: 'ci-402', date: '2026-09-03', rom_score: 79, form_quality_pct: 91, adherence_streak: 11, trend_flag: 'on_track' },
    { checkin_id: 'ci-403', date: '2026-08-27', rom_score: 74, form_quality_pct: 88, adherence_streak: 10, trend_flag: 'on_track' },
  ],
  'p-005': [
    { checkin_id: 'ci-501', date: '2026-09-08', rom_score: 43, form_quality_pct: 61, adherence_streak: 2, trend_flag: 'plateaued' },
  ],
  'p-006': [],
}

// ── Mock checkin response (used after completing a check-in flow) ─────────────
export function mockCheckinResponse(patientId: string): CheckinResponse {
  const streak = MOCK_CHECKIN_HISTORY[patientId]?.length ?? 0
  return {
    checkin_id: `ci-new-${Date.now()}`,
    rom_score: Math.round(50 + Math.random() * 30),
    adherence_streak: streak + 1,
    trend_flag: 'on_track',
  }
}
