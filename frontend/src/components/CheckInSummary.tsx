import { useNavigate } from 'react-router-dom'
import { StatusBadge } from './StatusBadge'
import type { CheckinResponse, RepRecord } from '../types/contract'

interface CheckInSummaryProps {
  patientId: string
  patientName: string
  response: CheckinResponse
  reps: RepRecord[]
}

export function CheckInSummary({ patientId, patientName, response, reps }: CheckInSummaryProps) {
  const navigate = useNavigate()

  const avgAngle = reps.length
    ? reps.reduce((s, r) => s + r.max_angle, 0) / reps.length
    : 0
  const cleanReps = reps.filter((r) => r.deviation_type === 'none').length
  const formPct = reps.length ? Math.round((cleanReps / reps.length) * 100) : 0

  return (
    <div className="animate-slide-up space-y-6">
      <div className="text-center space-y-2">
        <div className="text-5xl mb-3">🎉</div>
        <h2 className="text-2xl font-bold text-white">Check-in complete!</h2>
        <p className="text-slate-400 text-sm">{patientName} · Session recorded</p>
      </div>

      {/* Functional trend */}
      <div className="card flex flex-col items-center gap-3">
        <p className="text-slate-400 text-xs uppercase tracking-widest">Functional Trend</p>
        <StatusBadge status={response.trend_flag} />
        <p className="text-slate-500 text-xs">Streak: 🔥 {response.adherence_streak} days</p>
      </div>

      {/* Score grid */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-brand-400">{response.rom_score}</p>
          <p className="text-xs text-slate-400 mt-1">ROM Score</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-emerald-400">{formPct}%</p>
          <p className="text-xs text-slate-400 mt-1">Form Quality</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-slate-200">{reps.length}</p>
          <p className="text-xs text-slate-400 mt-1">Reps</p>
        </div>
      </div>

      {/* Per-rep breakdown */}
      {reps.length > 0 && (
        <div className="card space-y-3">
          <h3 className="text-sm font-semibold text-slate-300">Rep Breakdown</h3>
          <div className="space-y-2">
            {reps.map((rep) => {
              const colour =
                rep.deviation_type === 'none'
                  ? 'text-emerald-400'
                  : rep.deviation_type === 'speed'
                  ? 'text-rose-400'
                  : 'text-amber-400'
              return (
                <div
                  key={rep.rep_index}
                  className="flex justify-between items-center text-xs border-b border-surface-border/50 pb-2 last:border-0 last:pb-0"
                >
                  <span className="text-slate-400">Rep {rep.rep_index + 1}</span>
                  <span className="text-slate-300">{rep.max_angle.toFixed(1)}°</span>
                  <span className="text-slate-300">{rep.duration_sec.toFixed(1)}s</span>
                  <span className={`font-medium ${colour}`}>{rep.deviation_type}</span>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-slate-500">Avg peak angle: {avgAngle.toFixed(1)}°</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          id="btn-view-trend"
          className="btn-primary flex-1"
          onClick={() => navigate(`/patients/${patientId}`)}
        >
          View Functional Trend
        </button>
        <button
          id="btn-back-dashboard"
          className="btn-ghost flex-1"
          onClick={() => navigate('/dashboard')}
        >
          Dashboard
        </button>
      </div>
    </div>
  )
}
