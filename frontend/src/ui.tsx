import type { ComponentType, ReactNode } from 'react'

export const fmt = (n: number | null | undefined, d = 0) => n == null || Number.isNaN(n) ? '–' : n.toLocaleString('en-GB', { maximumFractionDigits: d, minimumFractionDigits: d })
export const signed = (n: number | null | undefined, d = 0) => n == null ? '–' : (n > 0 ? '+' : '') + fmt(n, d)
export const hhmm = (iso: string | null | undefined) => iso ? new Date(iso).toLocaleString('en-GB', { timeZone: 'UTC', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) + 'Z' : '–'
export const dayName = (iso: string) => new Date(iso + 'T00:00Z').toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' })

export type Icon = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
export type Tone = 'bad' | 'good' | 'forecast' | 'plain'

export function Kpi({ icon: I, label, value, unit, sub, tone = 'plain', hint }: { icon: Icon; label: string; value: ReactNode; unit?: string; sub?: ReactNode; tone?: Tone; hint?: string }) {
  return (
    <div className="tile rise" title={hint}>
      <div className="tile-ic"><I size={20} strokeWidth={2.2} /></div>
      <div className="min-w-0">
        <div className="text-[14px] text-[var(--muted)]">{label}</div>
        <div className={`flex items-baseline gap-1.5 ${tone === 'plain' ? '' : `tone-${tone}`}`}>
          <span className="num text-[27px] font-medium leading-tight tracking-tight">{value}</span>
          {unit && <span className="text-[14px] text-[var(--dim)]">{unit}</span>}
        </div>
        {sub && <div className="truncate text-[12.5px] text-[var(--dim)]">{sub}</div>}
      </div>
    </div>
  )
}

export function Card({ title, children, right, className = '' }: { title: ReactNode; children: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <section className={`card rise ${className}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="card-title">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  )
}

export function Ring({ pct, color }: { pct: number; color: string }) {
  const r = 11, c = 2 * Math.PI * r, p = Math.min(1, Math.max(0, pct / 100))
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden>
      <circle cx="15" cy="15" r={r} fill="none" stroke="var(--line)" strokeWidth="4" />
      <circle cx="15" cy="15" r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${c * p} ${c}`} transform="rotate(-90 15 15)" />
    </svg>
  )
}

export function Skeleton({ h = 300 }: { h?: number }) { return <div className="skeleton w-full" style={{ height: h }} /> }
export function ErrorBox({ e }: { e: Error }) { return <div className="card text-[14px] text-[var(--short)]">Could not load data. {e.message}</div> }

// ---- Recharts helpers ----
// Recharts v3 formatter types are loose (ValueType | undefined); wrap once here.
type AnyFmt = (v: unknown, n?: unknown) => [string, string]
export const mw = (suffix = ' MW'): AnyFmt => (v, n) => [fmt(Number(v)) + suffix, String(n ?? '')]
export const mwSigned = (name: string): AnyFmt => v => [signed(Number(v)) + ' MW', name]
export const count = (name: string): AnyFmt => v => [String(v), name]
export const lbl = (f: (x: number) => string) => (v: unknown) => f(Number(v))
export const tip = {
  contentStyle: { background: '#fff', borderRadius: 14, boxShadow: '0 1px 2px rgb(22 26 35 / .06), 0 10px 30px -12px rgb(22 26 35 / .2)', border: '1px solid var(--line)', fontSize: 13, color: 'var(--ink)', padding: '10px 14px' },
  labelStyle: { color: 'var(--muted)', marginBottom: 4 },
  itemStyle: { padding: 0 },
}
export const tick = { fontSize: 12.5 }
export const axis = { axisLine: false, tickLine: false } as const

/** Diagonal hatch used as the empty track behind bars. Put inside a chart's children. */
export const Hatch = ({ id = 'hatch' }: { id?: string }) => (
  <defs>
    <pattern id={id} patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(45)">
      <rect width="7" height="7" fill="#f6f7f9" />
      <line x1="0" y1="0" x2="0" y2="7" stroke="#eceef2" strokeWidth="3" />
    </pattern>
  </defs>
)

/** Rounded pill drawn above a bar (Recharts label content). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const barPill = (show: (i: number) => boolean, text: (v: number) => string, fill = 'var(--forecast)', color = '#fff') => (p: any) => {
  if (!show(p.index)) return null
  const t = text(Number(p.value)), w = t.length * 7.4 + 22, cx = Number(p.x) + Number(p.width) / 2, cy = Number(p.y) - 18
  return (
    <g>
      <rect x={cx - w / 2} y={cy - 13} width={w} height={26} rx={13} fill={fill} />
      <text x={cx} y={cy + 4.5} textAnchor="middle" fontSize={13} fill={color}>{t}</text>
    </g>
  )
}

/** Pill label anchored at the left end of a ReferenceLine. */
export function LinePill({ viewBox, text, fill = 'var(--ink)', right }: { viewBox?: { x?: number; y?: number; width?: number }; text: string; fill?: string; right?: boolean }) {
  const w = text.length * 7 + 20, y = viewBox?.y ?? 0
  const x = right ? (viewBox?.x ?? 0) + (viewBox?.width ?? 0) - w : (viewBox?.x ?? 0) + 2
  return (
    <g>
      <rect x={x} y={y - 12} width={w} height={24} rx={12} fill={fill} />
      <text x={x + w / 2} y={y + 4.5} textAnchor="middle" fontSize={12.5} fill="#fff">{text}</text>
    </g>
  )
}

export function downloadCsv(name: string, rows: Record<string, unknown>[]) {
  const keys = Object.keys(rows[0] ?? {})
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n')
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: name })
  a.click(); URL.revokeObjectURL(a.href)
}

/** Two-line tick for run labels like "D-1 07:30": time on top, day tag under the first run of each day. */
export function RunTick({ x, y, payload, index }: { x?: number; y?: number; payload?: { value?: string }; index?: number }) {
  const [day, time] = String(payload?.value ?? '').split(' ')
  // ponytail: viewport check instead of measuring the axis; good enough for one chart.
  const dense = window.innerWidth < 900 && !['02:30', '09:30', '15:30', '22:30'].includes(time)
  return (
    <g transform={`translate(${x},${y})`}>
      {!dense && <text dy={14} textAnchor="middle" fontSize={11.5} fill="var(--dim)">{time}</text>}
      {(index === 0 || time === '02:30') && <text dy={31} textAnchor="middle" fontSize={11.5} fill="var(--ink)">{day === 'D' ? 'Day D' : day}</text>}
    </g>
  )
}
