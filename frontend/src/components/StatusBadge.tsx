import type { PatientStatus } from '../types/contract'

interface StatusBadgeProps {
  status: PatientStatus
}

const CONFIG = {
  on_track: {
    label: 'On Track',
    classes: 'badge bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30',
    dot: 'bg-emerald-400',
  },
  plateaued: {
    label: 'Plateaued',
    classes: 'badge bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30',
    dot: 'bg-amber-400',
  },
  no_recent_checkin: {
    label: 'No Recent Check-in',
    classes: 'badge bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30',
    dot: 'bg-rose-400',
  },
} satisfies Record<PatientStatus, { label: string; classes: string; dot: string }>

export function StatusBadge({ status }: StatusBadgeProps) {
  const cfg = CONFIG[status]
  return (
    <span className={cfg.classes}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} animate-pulse-slow`} />
      {cfg.label}
    </span>
  )
}
