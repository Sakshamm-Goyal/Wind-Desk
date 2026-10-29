import { useEffect, useMemo, useState } from 'react'
import { Area, Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAccuracy, useDayAhead, type Meta } from './api'
import { Badge, Card, ErrorBox, Kpi, KpiStrip, Skeleton, dayName, fmt, hhmm, lbl, mw, mwSigned, signed, tick, tip } from './ui'

const SHOWCASE = '2026-01-28' // ponytail: worst day of the month, makes the pitch land; falls back to first day

export default function DayAhead({ meta, cutoff }: { meta: Meta; cutoff: string }) {
  const days = meta.delivery_days
  const [date, setDate] = useState(days.includes(SHOWCASE) ? SHOWCASE : days[0])
  const [showAll, setShowAll] = useState(false)
  const [showAdj, setShowAdj] = useState(true)
  const q = useDayAhead(date, cutoff)
  const acc = useAccuracy(cutoff)
  const idx = days.indexOf(date)

  useEffect(() => {  // ← / → to step through delivery days
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLSelectElement) return
      if (e.key === 'ArrowLeft' && idx > 0) setDate(days[idx - 1])
      if (e.key === 'ArrowRight' && idx < days.length - 1) setDate(days[idx + 1])
    }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [idx, days])

  const data = q.data
  const chart = useMemo(() => data?.rows.map((r, i) => ({
    ...r, label: `${String(r.hour).padStart(2, '0')}:00`,
    gap: r.forecast != null && r.actual != null ? [Math.min(r.forecast, r.actual), Math.max(r.forecast, r.actual)] : null,
    ...Object.fromEntries(data.evolution.map((v, k) => [`v${k}`, v.values[i]])),
  })), [data])
  const month = useMemo(() => acc.data?.per_day.map(d => ({ ...d, day: d.date.slice(8) })), [acc.data])

  if (q.error) return <ErrorBox e={q.error} />
  if (!data || !chart) return <Skeleton h={520} />
  const m = data.metrics, ma = data.adjusted_metrics
  const buf = showAdj ? acc.data?.buffer_adjusted : acc.data?.buffer
  const short = data.rows.filter(r => r.error != null && r.error < 0).length

  return (
    <div className={`space-y-4 transition-opacity ${q.isPlaceholderData ? 'opacity-50' : ''}`}>
      <div className="flex flex-wrap items-center gap-2 rise">
        <button className="btn" onClick={() => setDate(days[idx - 1])} disabled={idx <= 0} aria-label="Previous day">←</button>
        <select value={date} onChange={e => setDate(e.target.value)} className="btn" aria-label="Delivery day">
          {days.map(d => <option key={d} value={d}>{dayName(d)}</option>)}
        </select>
        <button className="btn" onClick={() => setDate(days[idx + 1])} disabled={idx >= days.length - 1} aria-label="Next day">→</button>
        <span className="ml-2 text-[13px] text-[var(--muted)]">decided <b className="mono text-[var(--ink)]">{hhmm(data.decision_time)}</b> on vintage <Badge tone="amber">{hhmm(data.vintage)}</Badge> {data.vintage_age_hours != null && <span className="text-[var(--dim)]">· {data.vintage_age_hours} h old</span>}</span>
        <label className="ml-auto flex items-center gap-2 text-[12px] text-[var(--muted)]"><input type="checkbox" checked={showAdj} onChange={e => setShowAdj(e.target.checked)} /> Bias-adjusted</label>
        <label className="flex items-center gap-2 text-[12px] text-[var(--muted)]"><input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} /> All vintages</label>
      </div>

      <Card title="January at a glance" right={<span className="label">daily MAE of the decision-time forecast · click a day</span>} className="!py-3">
        {!month ? <Skeleton h={64} /> : (
          <ResponsiveContainer width="100%" height={72}>
            <ComposedChart data={month} margin={{ top: 2, right: 4, left: 4, bottom: 0 }} onClick={s => { const d = (s as { activeLabel?: unknown })?.activeLabel; if (typeof d === 'string') setDate(d) }} style={{ cursor: 'pointer' }}>
              <XAxis dataKey="date" tick={tick} tickFormatter={lbl(() => '')} tickLine={false} axisLine={false} height={4} />
              <Tooltip {...tip} formatter={mw()} labelFormatter={(d: unknown) => dayName(String(d))} />
              <Bar dataKey="mae" name="MAE" radius={[2, 2, 0, 0]}>{month.map(d => <Cell key={d.date} fill={d.date === date ? 'var(--forecast)' : d.mae > 3000 ? 'rgb(185 28 28 / .45)' : 'var(--line-2)'} />)}</Bar>
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Card>

      <KpiStrip>
        <Kpi label="Vintage used" value={data.vintage ? hhmm(data.vintage).slice(8) : '–'} tone="amber" sub={data.vintage ? `lead ${fmt(data.rows[0].lead_hours)}–${fmt(data.rows[23].lead_hours)} h to delivery` : 'no forecast available'} hint="Latest WINDFOR publish at or before the cutoff on D-1" />
        <Kpi label="Forecast wind" value={`${fmt(data.forecast_mwh / 1000, 1)} GWh`} sub={`avg ${fmt(data.forecast_mwh / 24)} MW`} />
        <Kpi label="Actual wind" value={`${fmt(data.actual_mwh / 1000, 1)} GWh`} tone="teal" sub={`avg ${fmt(data.actual_mwh / 24)} MW`} />
        <Kpi label="Day bias · act − fcst" value={`${signed(m.bias)} MW`} tone={m.bias < -1500 ? 'bad' : m.bias > 1500 ? 'plain' : 'good'} sub={`MAE ${fmt(m.mae)} MW · nMAE ${fmt(m.nmae_pct, 1)} %`} />
        <Kpi label="Worst-hour shortfall" value={`${fmt(m.max_shortfall)} MW`} tone={m.max_shortfall > 3000 ? 'bad' : 'plain'} sub={`${short} of 24 hours short of forecast`} />
        <Kpi label="Bias-adjusted MAE" value={`${fmt(ma.mae)} MW`} tone={ma.n === 0 ? 'plain' : ma.mae < m.mae ? 'good' : 'bad'} sub={data.bias_adjustment != null ? `rolling 7-day correction ${signed(data.bias_adjustment)} MW` : 'no prior days in window'} />
      </KpiStrip>

      <Card title={`Forecast vs actual · ${dayName(date)}`} right={<span className="label">hourly · MW · UTC</span>}>
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={chart} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gActual" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--actual)" stopOpacity={0.18} /><stop offset="100%" stopColor="var(--actual)" stopOpacity={0.02} /></linearGradient>
            </defs>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="label" tick={tick} interval={2} />
            <YAxis tick={tick} width={56} tickFormatter={lbl(v => fmt(v / 1000, 0) + ' GW')} />
            <Tooltip {...tip} formatter={mw()} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {showAll && data.evolution.map((v, k) => (
              <Line key={k} dataKey={`v${k}`} name={v.label} stroke={v.is_decision ? 'var(--forecast)' : 'var(--line-2)'} strokeWidth={v.is_decision ? 2.5 : 1} dot={false} isAnimationActive={false} legendType="none" />
            ))}
            <Area dataKey="gap" name="gap" stroke="none" fill="var(--short)" fillOpacity={0.06} legendType="none" tooltipType="none" />
            <Area dataKey="actual" name="Actual (FUELHH)" stroke="var(--actual)" fill="url(#gActual)" strokeWidth={2} dot={false} />
            <Line dataKey="forecast" name="Forecast at decision (WINDFOR)" stroke="var(--forecast)" strokeWidth={2.5} dot={false} />
            {showAdj && <Line dataKey="adjusted" name="Bias-adjusted forecast" stroke="var(--adjusted)" strokeWidth={1.75} strokeDasharray="6 4" dot={false} />}
          </ComposedChart>
        </ResponsiveContainer>
        {showAll && <p className="mt-2 text-[12px] text-[var(--muted)]">Dim lines are every later WINDFOR vintage covering this day — what the desk would have known had it waited. Orange is the only one usable at the {cutoff} cutoff.</p>}
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Hourly error" right={<span className="label">actual − forecast · MW</span>}>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={chart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <XAxis dataKey="label" tick={tick} interval={3} />
              <YAxis tick={tick} width={48} domain={[(lo: number) => Math.min(0, lo), (hi: number) => Math.max(0, hi)]} />
              <Tooltip {...tip} formatter={mwSigned('error')} />
              <ReferenceLine y={0} stroke="var(--line-2)" />
              <Bar dataKey="error" name="error" radius={[2, 2, 0, 0]}>{chart.map((r, i) => <Cell key={i} fill={(r.error ?? 0) < 0 ? 'var(--short)' : 'var(--surplus)'} fillOpacity={0.85} />)}</Bar>
            </ComposedChart>
          </ResponsiveContainer>
          <p className="mt-1 text-[12px] text-[var(--muted)]">Red = less wind than forecast → thermal shortfall to cover.</p>
        </Card>

        <Card title="Procurement cover" right={<Badge tone={showAdj ? 'plain' : 'amber'}>{showAdj ? 'bias-adjusted' : 'raw forecast'}</Badge>}>
          {!buf ? <Skeleton h={160} /> : (
            <div className="space-y-2 text-[13px] text-[var(--muted)]">
              <p>Buy the demand gap implied by the {showAdj ? 'bias-adjusted ' : ''}forecast, <b className="text-[var(--ink)]">plus a wind-risk buffer</b> sized from January's error distribution:</p>
              {(['p80', 'p90', 'p95'] as const).map((k, i) => (
                <div key={k} className="flex items-center justify-between rounded-md border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2">
                  <span>covered in <b className="mono text-[var(--ink)]">{k.slice(1)} %</b> of hours</span>
                  <b className={`mono text-[15px] ${i === 1 ? 'text-[var(--forecast)]' : 'text-[var(--ink)]'}`}>+{fmt(buf[k])} MW</b>
                </div>
              ))}
              <p className="text-[12px] text-[var(--dim)]">Without a buffer the {showAdj ? 'adjusted' : 'raw'} forecast left the desk short in {fmt(buf.share_hours_short, 0)} % of January hours.</p>
            </div>
          )}
        </Card>

        <Card title="How to read this day">
          <ul className="list-disc space-y-1.5 pl-4 text-[13px] text-[var(--muted)]">
            <li>Decision made {hhmm(data.decision_time)} using the WINDFOR vintage of {hhmm(data.vintage)}.</li>
            <li>Day total <b className="text-[var(--amber-ink)]">{fmt(data.forecast_mwh / 1000, 1)} GWh</b> forecast vs <b className="text-[var(--teal-ink)]">{fmt(data.actual_mwh / 1000, 1)} GWh</b> delivered ({signed((data.actual_mwh - data.forecast_mwh) / 1000, 1)} GWh).</li>
            <li>Biggest miss: {fmt(m.max_shortfall)} MW short in one hour; {m.max_surplus >= 0 ? `${fmt(m.max_surplus)} MW surplus at best` : `even the best hour was ${fmt(-m.max_surplus)} MW short`}.</li>
            {ma.n > 0 && <li>Applying the rolling bias correction known at decision time {ma.mae < m.mae ? 'cuts' : 'raises'} the day's MAE from {fmt(m.mae)} to {fmt(ma.mae)} MW.</li>}
            <li className="text-[var(--dim)]">← / → keys step through days.</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
