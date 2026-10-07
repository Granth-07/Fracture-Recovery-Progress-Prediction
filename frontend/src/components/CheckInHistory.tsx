import { StatusBadge } from './StatusBadge'
import type { CheckinHistoryRow } from '../types/contract'

interface CheckInHistoryProps {
  rows: CheckinHistoryRow[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function CheckInHistory({ rows }: CheckInHistoryProps) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <span className="text-4xl mb-3">📋</span>
        <p className="text-sm">No check-ins recorded yet.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" id="checkin-history-table">
        <thead>
          <tr className="text-left text-slate-400 border-b border-surface-border">
            <th className="pb-3 pr-4 font-medium">Date</th>
            <th className="pb-3 pr-4 font-medium">ROM Score</th>
            <th className="pb-3 pr-4 font-medium">Form Quality</th>
            <th className="pb-3 pr-4 font-medium">Streak</th>
            <th className="pb-3 font-medium">Functional Trend</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.checkin_id} className="border-b border-surface-border/50 table-row-hover">
              <td className="py-3 pr-4 text-slate-200">{formatDate(row.date)}</td>
              <td className="py-3 pr-4">
                <span className="font-semibold text-brand-400">{row.rom_score}</span>
                <span className="text-slate-500 text-xs ml-1">/ 100</span>
              </td>
              <td className="py-3 pr-4">
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-surface-border rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all duration-500"
                      style={{ width: `${row.form_quality_pct}%` }}
                    />
                  </div>
                  <span className="text-slate-300">{row.form_quality_pct}%</span>
                </div>
              </td>
              <td className="py-3 pr-4 text-slate-300">
                🔥 {row.adherence_streak} {row.adherence_streak === 1 ? 'day' : 'days'}
              </td>
              <td className="py-3">
                <StatusBadge status={row.trend_flag} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
