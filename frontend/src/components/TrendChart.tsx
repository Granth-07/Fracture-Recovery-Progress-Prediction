import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Area,
  ComposedChart,
  Legend,
} from 'recharts'
import type { WeeklyScore, TrendFlag } from '../types/contract'

interface TrendChartProps {
  weeklyScores: WeeklyScore[]
  flag: TrendFlag
}

const FLAG_COLOR: Record<TrendFlag, string> = {
  on_track: '#10b981',
  plateaued: '#f59e0b',
  no_recent_checkin: '#f43f5e',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="card !p-4 text-xs space-y-1 shadow-xl min-w-[160px]">
      <p className="font-semibold text-slate-200 mb-2">Week {label}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="text-slate-200 font-medium">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export function TrendChart({ weeklyScores, flag }: TrendChartProps) {
  const lineColor = FLAG_COLOR[flag]

  // Recharts Area needs two series to shade between two values.
  // We encode the band as: bandBase = reference_band_low, bandRange = high - low
  const data = weeklyScores.map((w) => ({
    week: `Wk ${w.week}`,
    rom_score: w.rom_score,
    form_quality_pct: w.form_quality_pct,
    band_low: w.reference_band_low,
    band_range: w.reference_band_high - w.reference_band_low,
  }))

  return (
    <div className="w-full h-72">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="romGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={lineColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="week" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px', color: '#94a3b8', paddingTop: '12px' }}
            formatter={(val) =>
              val === 'band_low'
                ? 'Reference band'
                : val === 'form_quality_pct'
                ? 'Form quality %'
                : 'ROM score'
            }
          />

          {/* Reference band — shaded area between low and high */}
          <Area
            dataKey="band_low"
            stackId="band"
            stroke="transparent"
            fill="transparent"
            legendType="none"
            name="band_low"
            dot={false}
            activeDot={false}
          />
          <Area
            dataKey="band_range"
            stackId="band"
            stroke="#6366f1"
            strokeDasharray="4 4"
            strokeWidth={1}
            fill="#6366f120"
            name="band_low"
            dot={false}
            activeDot={false}
          />

          {/* Form quality secondary line */}
          <Line
            type="monotone"
            dataKey="form_quality_pct"
            name="form_quality_pct"
            stroke="#94a3b8"
            strokeWidth={1.5}
            dot={false}
            strokeDasharray="6 3"
          />

          {/* ROM score primary line */}
          <Line
            type="monotone"
            dataKey="rom_score"
            name="rom_score"
            stroke={lineColor}
            strokeWidth={2.5}
            dot={{ fill: lineColor, r: 4, strokeWidth: 0 }}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />

          <ReferenceLine y={100} stroke="#334155" strokeDasharray="2 4" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
