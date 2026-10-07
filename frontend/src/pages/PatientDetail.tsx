import { useParams, useNavigate } from 'react-router-dom'
import { MOCK_PATIENTS, MOCK_TRENDS, MOCK_CHECKIN_HISTORY } from '../data/MOCK_DATA'
import { StatusBadge } from '../components/StatusBadge'
import { TrendChart } from '../components/TrendChart'
import { CheckInHistory } from '../components/CheckInHistory'

const INJURY_EMOJI: Record<string, string> = {
  wrist: '🤝',
  ankle: '🦵',
  elbow: '💪',
}

export function PatientDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const patient = MOCK_PATIENTS.find((p) => p.patient_id === id)
  const trend = id ? MOCK_TRENDS[id] : undefined
  const history = id ? (MOCK_CHECKIN_HISTORY[id] ?? []) : []

  if (!patient || !trend) {
    return (
      <main className="max-w-4xl mx-auto px-6 py-16 text-center">
        <p className="text-slate-400">Patient not found.</p>
        <button className="btn-ghost mt-4" onClick={() => navigate('/dashboard')}>
          ← Back
        </button>
      </main>
    )
  }

  const latestScore = trend.weekly_scores.at(-1)

  return (
    <main className="max-w-5xl mx-auto px-6 py-8 animate-fade-in">
      {/* Breadcrumb */}
      <button
        id="btn-back"
        onClick={() => navigate('/dashboard')}
        className="btn-ghost mb-6 flex items-center gap-2 text-sm"
      >
        ← All Patients
      </button>

      {/* Patient header */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-700/50 flex items-center justify-center text-xl font-bold text-brand-300">
              {patient.name.split(' ').map((n) => n[0]).join('')}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{patient.name}</h1>
              <p className="text-slate-400 text-sm mt-0.5 capitalize">
                {INJURY_EMOJI[patient.injury_type]} {patient.injury_type} injury · {patient.days_since_injury} days since injury
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={patient.status} />
            <button
              id="btn-start-checkin"
              className="btn-primary"
              onClick={() => navigate(`/patients/${patient.patient_id}/checkin`)}
            >
              Start Check-in
            </button>
          </div>
        </div>

        {/* Stat row */}
        {latestScore && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-surface-border">
            <div>
              <p className="text-xs text-slate-400 mb-1">ROM Score</p>
              <p className="text-2xl font-bold text-brand-400">{latestScore.rom_score}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Form Quality</p>
              <p className="text-2xl font-bold text-emerald-400">{latestScore.form_quality_pct}%</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Reference Band</p>
              <p className="text-2xl font-bold text-slate-300">
                {latestScore.reference_band_low}–{latestScore.reference_band_high}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Weeks Tracked</p>
              <p className="text-2xl font-bold text-slate-300">{trend.weekly_scores.length}</p>
            </div>
          </div>
        )}
      </div>

      {/* Trend chart */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Functional Trend</h2>
            <p className="text-slate-400 text-xs mt-0.5">
              ROM score over weeks · shaded band = reference range
            </p>
          </div>
          <StatusBadge status={trend.flag} />
        </div>
        <TrendChart weeklyScores={trend.weekly_scores} flag={trend.flag} />
      </div>

      {/* Check-in history */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">
          Check-in History
          <span className="ml-2 text-sm font-normal text-slate-400">({history.length} sessions)</span>
        </h2>
        <CheckInHistory rows={history} />
      </div>
    </main>
  )
}
