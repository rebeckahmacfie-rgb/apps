import { useMemo, useState } from "react"

export interface Point {
  x: number
  y: number | null
  label: string
}

const W = 320
const H = 140
const PAD_L = 32
const PAD_R = 8
const PAD_T = 10
const PAD_B = 20

function scaleX(i: number, n: number) {
  if (n <= 1) return PAD_L
  return PAD_L + (i / (n - 1)) * (W - PAD_L - PAD_R)
}

function makeScaleY(min: number, max: number) {
  const span = max - min || 1
  return (v: number) => PAD_T + (1 - (v - min) / span) * (H - PAD_T - PAD_B)
}

export function LineChart({
  points,
  color = "var(--series-1)",
  unit = "",
  goal,
  goalLabel,
  height = H,
}: {
  points: Point[]
  color?: string
  unit?: string
  goal?: number
  goalLabel?: string
  height?: number
}) {
  const [hover, setHover] = useState<number | null>(null)
  const valid = points.filter((p): p is Point & { y: number } => p.y != null)

  const { min, max } = useMemo(() => {
    const ys = valid.map((p) => p.y)
    if (goal != null) ys.push(goal)
    if (ys.length === 0) return { min: 0, max: 1 }
    const lo = Math.min(...ys)
    const hi = Math.max(...ys)
    const pad = (hi - lo) * 0.1 || 1
    return { min: lo - pad, max: hi + pad }
  }, [valid, goal])

  if (valid.length === 0) {
    return (
      <div className="text-sm py-8 text-center" style={{ color: "var(--text-muted)" }}>
        Not enough data yet
      </div>
    )
  }

  const y = makeScaleY(min, max)
  const n = points.length
  const pathD = points
    .map((p, i) => (p.y == null ? null : `${p.y === points[i].y && (i === 0 || points[i - 1].y == null) ? "M" : "L"}${scaleX(i, n)},${y(p.y)}`))
    .filter(Boolean)
    .join(" ")

  const hoverPoint = hover != null ? points[hover] : null

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${height}`}
        className="w-full"
        style={{ maxHeight: height }}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = (e.target as SVGElement).closest("svg")!.getBoundingClientRect()
          const relX = ((e.clientX - rect.left) / rect.width) * W
          const idx = Math.round(((relX - PAD_L) / (W - PAD_L - PAD_R)) * (n - 1))
          if (idx >= 0 && idx < n) setHover(idx)
        }}
        onTouchStart={(e) => {
          const rect = (e.target as SVGElement).closest("svg")!.getBoundingClientRect()
          const touch = e.touches[0]
          const relX = ((touch.clientX - rect.left) / rect.width) * W
          const idx = Math.round(((relX - PAD_L) / (W - PAD_L - PAD_R)) * (n - 1))
          if (idx >= 0 && idx < n) setHover(idx)
        }}
      >
        {/* gridlines */}
        {[0, 0.5, 1].map((f) => (
          <line
            key={f}
            x1={PAD_L}
            x2={W - PAD_R}
            y1={PAD_T + f * (height - PAD_T - PAD_B)}
            y2={PAD_T + f * (height - PAD_T - PAD_B)}
            stroke="var(--gridline)"
            strokeWidth={1}
          />
        ))}
        <text x={2} y={y(max) + 4} fontSize="9" fill="var(--text-muted)">
          {Math.round(max)}
          {unit}
        </text>
        <text x={2} y={y(min) + 4} fontSize="9" fill="var(--text-muted)">
          {Math.round(min)}
          {unit}
        </text>

        {goal != null && (
          <line
            x1={PAD_L}
            x2={W - PAD_R}
            y1={y(goal)}
            y2={y(goal)}
            stroke="var(--series-3)"
            strokeWidth={1.5}
            strokeDasharray="3,3"
          />
        )}
        {goal != null && goalLabel && (
          <text x={W - PAD_R} y={y(goal) - 3} fontSize="9" textAnchor="end" fill="var(--series-3)">
            {goalLabel}
          </text>
        )}

        <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {valid.length <= 60 &&
          points.map((p, i) =>
            p.y == null ? null : (
              <circle key={i} cx={scaleX(i, n)} cy={y(p.y)} r={hover === i ? 4 : 2.5} fill={color} stroke="var(--surface-1)" strokeWidth={1} />
            ),
          )}

        {hoverPoint && (
          <line x1={scaleX(hover!, n)} x2={scaleX(hover!, n)} y1={PAD_T} y2={height - PAD_B} stroke="var(--baseline)" strokeWidth={1} />
        )}
      </svg>
      {hoverPoint && hoverPoint.y != null && (
        <div
          className="absolute top-0 rounded-lg px-2 py-1 text-xs pointer-events-none shadow"
          style={{
            left: `${(scaleX(hover!, n) / W) * 100}%`,
            transform: "translateX(-50%)",
            background: "var(--card-surface)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        >
          <div className="font-semibold">
            {hoverPoint.y}
            {unit}
          </div>
          <div style={{ color: "var(--text-muted)" }}>{hoverPoint.label}</div>
        </div>
      )}
    </div>
  )
}

export function PairedBarChart({
  rows,
}: {
  rows: { label: string; flareValue: number; nonFlareValue: number; unit: string }[]
}) {
  if (rows.length === 0) {
    return (
      <div className="text-sm py-6 text-center" style={{ color: "var(--text-muted)" }}>
        Not enough data yet
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-4">
      {rows.map((r) => {
        const max = Math.max(r.flareValue, r.nonFlareValue, 1)
        return (
          <div key={r.label}>
            <div className="text-sm font-medium mb-1">{r.label}</div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-16 text-xs shrink-0" style={{ color: "var(--series-8)" }}>
                Flare days
              </div>
              <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: "var(--gridline)" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(r.flareValue / max) * 100}%`, background: "var(--series-8)" }}
                />
              </div>
              <div className="w-16 text-xs text-right shrink-0" style={{ color: "var(--text-secondary)" }}>
                {r.flareValue.toFixed(1)}
                {r.unit}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 text-xs shrink-0" style={{ color: "var(--series-1)" }}>
                Other days
              </div>
              <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: "var(--gridline)" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(r.nonFlareValue / max) * 100}%`, background: "var(--series-1)" }}
                />
              </div>
              <div className="w-16 text-xs text-right shrink-0" style={{ color: "var(--text-secondary)" }}>
                {r.nonFlareValue.toFixed(1)}
                {r.unit}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function SimpleBarChart({
  bars,
  color = "var(--series-1)",
  unit = "",
}: {
  bars: { label: string; value: number }[]
  color?: string
  unit?: string
}) {
  if (bars.length === 0) {
    return (
      <div className="text-sm py-6 text-center" style={{ color: "var(--text-muted)" }}>
        Not enough data yet
      </div>
    )
  }
  const max = Math.max(...bars.map((b) => b.value), 1)
  return (
    <div className="flex items-end gap-2" style={{ height: 120 }}>
      {bars.map((b) => (
        <div key={b.label} className="flex-1 flex flex-col items-center gap-1">
          <div className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
            {b.value.toFixed(1)}
          </div>
          <div
            className="w-full rounded-t-md"
            style={{ height: `${(b.value / max) * 80}px`, background: color, minHeight: 2 }}
          />
          <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            {b.label}
          </div>
        </div>
      ))}
      <span className="sr-only">{unit}</span>
    </div>
  )
}

const PAIN_RAMP = ["#f0efec", "#cde2fb", "#86b6ef", "#3987e5", "#1c5cab", "#0d366b"]

export function PainCalendar({
  data,
  onSelectDate,
}: {
  data: { date: string; maxPain?: number; isFlare: boolean }[]
  onSelectDate?: (date: string) => void
}) {
  const byDate = useMemo(() => new Map(data.map((d) => [d.date, d])), [data])
  const days = useMemo(() => {
    const arr: string[] = []
    const d = new Date()
    d.setDate(d.getDate() - 83)
    for (let i = 0; i < 84; i++) {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, "0")
      const day = String(d.getDate()).padStart(2, "0")
      arr.push(`${y}-${m}-${day}`)
      d.setDate(d.getDate() + 1)
    }
    return arr
  }, [])

  function colorFor(pain: number | undefined) {
    if (pain == null) return "var(--gridline)"
    const idx = Math.min(PAIN_RAMP.length - 1, Math.round((pain / 10) * (PAIN_RAMP.length - 1)))
    return PAIN_RAMP[idx]
  }

  return (
    <div>
      <div className="grid grid-cols-12 gap-1">
        {days.map((date) => {
          const entry = byDate.get(date)
          return (
            <button
              key={date}
              onClick={() => onSelectDate?.(date)}
              title={`${date}${entry?.maxPain != null ? ` · pain ${entry.maxPain}` : ""}`}
              className="aspect-square rounded relative"
              style={{
                background: colorFor(entry?.maxPain),
                border: entry?.isFlare ? "2px solid var(--status-critical)" : "1px solid var(--border)",
              }}
            />
          )
        })}
      </div>
      <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
        <span>Less pain</span>
        <div className="flex gap-0.5">
          {PAIN_RAMP.map((c) => (
            <div key={c} className="w-3 h-3 rounded-sm" style={{ background: c }} />
          ))}
        </div>
        <span>More pain</span>
        <span className="ml-3 inline-flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm" style={{ border: "2px solid var(--status-critical)" }} />
          Flare
        </span>
      </div>
    </div>
  )
}
