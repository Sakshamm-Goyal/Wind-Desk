import type { ReactNode } from 'react'

export const fmt = (n: number | null | undefined, d = 0) => n == null || Number.isNaN(n) ? '–' : n.toLocaleString('en-GB', { maximumFractionDigits: d, minimumFractionDigits: d })
export const signed = (n: number | null | undefined, d = 0) => n == null ? '–' : (n > 0 ? '+' : '') + fmt(n, d)
export const hhmm = (iso: string | null | undefined) => iso ? new Date(iso).toLocaleString('en-GB', { timeZone: 'UTC', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) + 'Z' : '–'
export const dayName = (iso: string) => new Date(iso + 'T00:00Z').toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' })

export type Tone = 'bad' | 'good' | 'amber' | 'teal' | 'plain'
export function Kpi({ label, value, sub, tone = 'plain', hint }: { label: string; value: ReactNode; sub?: ReactNode; tone?: Tone; hint?: string }) {
  return (
    <div className="kpi" title={hint}>
      <div className="label">{label}</div>
      <div className={`v ${tone === 'plain' ? '' : `tone-${tone}`}`}>{value}</div>
      {sub && <div className="s">{sub}</div>}
    </div>
  )
}
export function KpiStrip({ children }: { children: ReactNode }) { return <div className="panel kpi-strip overflow-hidden rise">{children}</div> }

export function Card({ title, children, right, className = '' }: { title: string; children: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <section className={`card rise ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="display text-[15px] text-[var(--ink)]">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  )
}

export function Badge({ children, tone = 'plain' }: { children: ReactNode; tone?: Tone }) {
  const c = { plain: 'border-[var(--line-2)] text-[var(--muted)]', amber: 'border-[color-mix(in_oklab,var(--forecast)_45%,transparent)] text-[var(--forecast)] bg-[color-mix(in_oklab,var(--forecast)_6%,transparent)]', teal: 'border-[color-mix(in_oklab,var(--actual)_40%,transparent)] text-[var(--teal-ink)]', bad: 'border-[color-mix(in_oklab,var(--short)_40%,transparent)] text-[var(--short)]', good: 'border-[color-mix(in_oklab,var(--surplus)_40%,transparent)] text-[var(--surplus)]' }[tone]
  return <span className={`mono inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] ${c}`}>{children}</span>
}

export function Skeleton({ h = 300 }: { h?: number }) { return <div className="skeleton w-full" style={{ height: h }} /> }
export function ErrorBox({ e }: { e: Error }) { return <div className="card border-[var(--short)] text-sm text-[var(--short)]">Could not load data. {e.message}</div> }

// Recharts v3 formatter types are loose (ValueType | undefined); wrap once here.
type AnyFmt = (v: unknown, n?: unknown) => [string, string]
export const mw = (suffix = ' MW'): AnyFmt => (v, n) => [fmt(Number(v)) + suffix, String(n ?? '')]
export const mwSigned = (name: string): AnyFmt => v => [signed(Number(v)) + ' MW', name]
export const count = (name: string): AnyFmt => v => [String(v), name]
export const lbl = (f: (x: number) => string) => (v: unknown) => f(Number(v))
export const tip = {
  contentStyle: { background: '#fffefb', border: '1px solid var(--line-2)', borderRadius: 4, boxShadow: '0 2px 8px rgb(28 25 23 / .08)', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink)' },
  labelStyle: { color: 'var(--muted)', marginBottom: 4 },
  itemStyle: { padding: 0 },
}
export const tick = { fontSize: 10.5 }

export function downloadCsv(name: string, rows: Record<string, unknown>[]) {
  const keys = Object.keys(rows[0] ?? {})
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n')
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: name })
  a.click(); URL.revokeObjectURL(a.href)
}
