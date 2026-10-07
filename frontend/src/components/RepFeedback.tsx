import type { DeviationType } from '../types/contract'

interface RepFeedbackProps {
  repIndex: number
  deviationType: DeviationType
  deviationScore: number
  maxAngle: number
}

const FEEDBACK_CONFIG: Record<DeviationType, { label: string; hint: string; classes: string; border: string }> = {
  none: {
    label: '✓ Good form',
    hint: 'Keep it up!',
    classes: 'bg-emerald-500/10 text-emerald-400',
    border: 'border-emerald-500/40',
  },
  compensation: {
    label: '⚠ Compensation detected',
    hint: 'Keep the joint aligned — avoid shifting weight.',
    classes: 'bg-amber-500/10 text-amber-400',
    border: 'border-amber-500/40',
  },
  overextend: {
    label: '⚠ Over-extension',
    hint: 'Reduce range slightly and stay within comfortable limits.',
    classes: 'bg-amber-500/10 text-amber-400',
    border: 'border-amber-500/40',
  },
  speed: {
    label: '🔴 Speed deviation',
    hint: 'Slow down — controlled movement gives better results.',
    classes: 'bg-rose-500/10 text-rose-400',
    border: 'border-rose-500/40',
  },
}

export function RepFeedback({ repIndex, deviationType, deviationScore, maxAngle }: RepFeedbackProps) {
  const cfg = FEEDBACK_CONFIG[deviationType]
  return (
    <div className={`rounded-xl border p-3 animate-fade-in ${cfg.classes} ${cfg.border}`}>
      <div className="flex justify-between items-start gap-2">
        <div>
          <p className="font-semibold text-sm">Rep {repIndex + 1} — {cfg.label}</p>
          <p className="text-xs opacity-80 mt-0.5">{cfg.hint}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs opacity-70">Max angle</p>
          <p className="font-bold text-sm">{maxAngle.toFixed(1)}°</p>
          <p className="text-xs opacity-60">dev: {(deviationScore * 100).toFixed(0)}%</p>
        </div>
      </div>
    </div>
  )
}

// ── Live overlay colour ring ────────────────────────────────────────────────
interface LiveFeedbackRingProps {
  deviationType: DeviationType
}

const RING_COLOR: Record<DeviationType, string> = {
  none: '#10b981',
  compensation: '#f59e0b',
  overextend: '#f59e0b',
  speed: '#f43f5e',
}

export function LiveFeedbackRing({ deviationType }: LiveFeedbackRingProps) {
  return (
    <div
      className="pointer-events-none absolute inset-0 rounded-2xl border-4 transition-colors duration-200"
      style={{ borderColor: RING_COLOR[deviationType] }}
    />
  )
}
