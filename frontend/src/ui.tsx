import type { ReactNode } from 'react'

export const fmt = (n: number | null | undefined, d = 0) => n == null || Number.isNaN(n) ? '–' : n.toLocaleString('en-GB', { maximumFractionDigits: d, minimumFractionDigits: d })
export const signed = (n: number | null | undefined, d = 0) => n == null ? '–' : (n > 0 ? '+' : '') + fmt(n, d)
export const hhmm = (iso: string | null | undefined) => iso ? new Date(iso).toLocaleString('en-GB', { timeZone: 'UTC', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) + 'Z' : '–'
export const dayName = (iso: string) => new Date(iso + 'T00:00Z').toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' })

export function Kpi({ label, value, sub, tone, hint }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'good' | 'bad' | 'neutral'; hint?: string }) {
  const color = tone === 'good' ? 'text-emerald-700' : tone === 'bad' ? 'text-red-700' : 'text-slate-900'
  return (
    <div className="card" title={hint}>
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`num mt-1 text-2xl font-semibold leading-tight ${color}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  )
}

export function Card({ title, children, right, className = '' }: { title: string; children: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  )
}

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'blue' | 'red' | 'green' | 'violet' }) {
  const c = { slate: 'bg-slate-100 text-slate-700', blue: 'bg-blue-50 text-blue-700', red: 'bg-red-50 text-red-700', green: 'bg-emerald-50 text-emerald-700', violet: 'bg-violet-50 text-violet-700' }[tone]
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${c}`}>{children}</span>
}

export function Skeleton({ h = 300 }: { h?: number }) { return <div className="skeleton w-full" style={{ height: h }} /> }
export function ErrorBox({ e }: { e: Error }) { return <div className="card border-red-200 bg-red-50 text-sm text-red-800">Could not load data. {e.message}</div> }

// Recharts v3 formatter types are loose (ValueType | undefined); wrap once here.
type AnyFmt = (v: unknown, n?: unknown) => [string, string]
export const mw = (suffix = ' MW'): AnyFmt => (v, n) => [fmt(Number(v)) + suffix, String(n ?? '')]
export const mwSigned = (name: string): AnyFmt => v => [signed(Number(v)) + ' MW', name]
export const count = (name: string): AnyFmt => v => [String(v), name]
export const lbl = (f: (x: number) => string) => (v: unknown) => f(Number(v))

export function downloadCsv(name: string, rows: Record<string, unknown>[]) {
  const keys = Object.keys(rows[0] ?? {})
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n')
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: name })
  a.click(); URL.revokeObjectURL(a.href)
}
