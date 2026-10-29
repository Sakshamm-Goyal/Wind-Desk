import { useEffect, useMemo, useState } from 'react'
import { Area, Bar, Cell, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAccuracy, useDayAhead, type Meta } from './api'
import { Badge, Card, ErrorBox, Kpi, Skeleton, dayName, fmt, hhmm, lbl, mw, mwSigned, signed } from './ui'

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
    ...Object.fromEntries(data.evolution.map((v, k) => [`v${k}`, v.values[i]])),
  })), [data])
  const month = useMemo(() => acc.data?.per_day.map(d => ({ ...d, day: d.date.slice(8) })), [acc.data])

  if (q.error) return <ErrorBox e={q.error} />
  if (!data || !chart) return <Skeleton h={520} />
  const m = data.metrics, ma = data.adjusted_metrics
  const buf = showAdj ? acc.data?.buffer_adjusted : acc.data?.buffer
  const short = data.rows.filter(r => r.error != null && r.error < 0).length

  return (
    <div className={`space-y-4 transition-opacity ${q.isPlaceholderData ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn" onClick={() => setDate(days[idx - 1])} disabled={idx <= 0} aria-label="Previous day">←</button>
        <select value={date} onChange={e => setDate(e.target.value)} className="btn font-medium" aria-label="Delivery day">
          {days.map(d => <option key={d} value={d}>{dayName(d)}</option>)}
        </select>
        <button className="btn" onClick={() => setDate(days[idx + 1])} disabled={idx >= days.length - 1} aria-label="Next day">→</button>
        <span className="text-sm text-slate-600">Decision <b className="text-slate-900">{hhmm(data.decision_time)}</b> → vintage <Badge tone="blue">{hhmm(data.vintage)}</Badge> {data.vintage_age_hours != null && <span className="text-slate-400">({data.vintage_age_hours} h old)</span>}</span>
        <label className="ml-auto flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={showAdj} onChange={e => setShowAdj(e.target.checked)} /> Bias-adjusted forecast</label>
        <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} /> All vintages</label>
      </div>

      <Card title="January at a glance · daily MAE of the decision-time forecast (click a day)" className="!py-3">
        {!month ? <Skeleton h={64} /> : (
          <ResponsiveContainer width="100%" height={72}>
            <ComposedChart data={month} margin={{ top: 2, right: 4, left: 4, bottom: 0 }} onClick={s => { const d = (s as { activeLabel?: unknown })?.activeLabel; if (typeof d === 'string') setDate(d) }} style={{ cursor: 'pointer' }}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={lbl(() => '')} tickLine={false} axisLine={false} height={4} />
              <Tooltip formatter={mw()} labelFormatter={(d: unknown) => dayName(String(d))} />
              <Bar dataKey="mae" name="MAE" radius={[3, 3, 0, 0]}>{month.map(d => <Cell key={d.date} fill={d.date === date ? 'var(--forecast)' : d.mae > 3000 ? '#fca5a5' : '#cbd5e1'} />)}</Bar>
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Forecast vintage" value={data.vintage ? hhmm(data.vintage).slice(8) : '–'} sub={data.vintage ? `lead ${fmt(data.rows[0].lead_hours)}–${fmt(data.rows[23].lead_hours)} h to delivery` : 'no forecast available'} hint="Latest WINDFOR publish at or before the cutoff on D-1" />
        <Kpi label="Forecast wind" value={`${fmt(data.forecast_mwh / 1000, 1)} GWh`} sub={`avg ${fmt(data.forecast_mwh / 24)} MW`} />
        <Kpi label="Actual wind" value={`${fmt(data.actual_mwh / 1000, 1)} GWh`} sub={`avg ${fmt(data.actual_mwh / 24)} MW`} />
        <Kpi label="Day bias (actual − fcst)" value={`${signed(m.bias)} MW`} tone={m.bias < -1500 ? 'bad' : m.bias > 1500 ? 'neutral' : 'good'} sub={`MAE ${fmt(m.mae)} MW · nMAE ${fmt(m.nmae_pct, 1)} %`} />
        <Kpi label="Worst-hour shortfall" value={`${fmt(m.max_shortfall)} MW`} tone={m.max_shortfall > 3000 ? 'bad' : 'neutral'} sub={`${short} of 24 hours short of forecast`} />
        <Kpi label="Bias-adjusted MAE" value={`${fmt(ma.mae)} MW`} tone={ma.n === 0 ? 'neutral' : ma.mae < m.mae ? 'good' : 'bad'} sub={data.bias_adjustment != null ? `rolling 7-day correction ${signed(data.bias_adjustment)} MW` : 'no prior days in window'} />
      </div>

      <Card title={`Forecast vs actual · ${dayName(date)} (hourly, MW)`}>
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={chart} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={2} />
            <YAxis tick={{ fontSize: 11 }} width={56} tickFormatter={lbl(v => fmt(v / 1000, 0) + ' GW')} />
            <Tooltip formatter={mw()} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {showAll && data.evolution.map((v, k) => (
              <Line key={k} dataKey={`v${k}`} name={v.label} stroke={v.is_decision ? 'var(--forecast)' : '#cbd5e1'} strokeWidth={v.is_decision ? 2.5 : 1} dot={false} isAnimationActive={false} legendType="none" />
            ))}
            <Area dataKey="actual" name="Actual (FUELHH)" stroke="var(--actual)" fill="var(--actual)" fillOpacity={0.12} strokeWidth={2} dot={false} />
            <Line dataKey="forecast" name="Forecast at decision (WINDFOR)" stroke="var(--forecast)" strokeWidth={2.5} dot={false} />
            {showAdj && <Line dataKey="adjusted" name="Bias-adjusted forecast" stroke="var(--adjusted)" strokeWidth={2} strokeDasharray="6 4" dot={false} />}
          </ComposedChart>
        </ResponsiveContainer>
        {showAll && <p className="mt-2 text-xs text-slate-500">Grey lines are every later WINDFOR vintage covering this day — what the desk would have known had it waited. Blue is the only one usable at the {cutoff} cutoff.</p>}
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Hourly error · actual − forecast (MW)">
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={chart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={3} />
              <YAxis tick={{ fontSize: 10 }} width={48} domain={[(lo: number) => Math.min(0, lo), (hi: number) => Math.max(0, hi)]} />
              <Tooltip formatter={mwSigned('error')} />
              <ReferenceLine y={0} stroke="#94a3b8" />
              <Bar dataKey="error" name="error">{chart.map((r, i) => <Cell key={i} fill={(r.error ?? 0) < 0 ? 'var(--short)' : 'var(--surplus)'} />)}</Bar>
            </ComposedChart>
          </ResponsiveContainer>
          <p className="mt-1 text-xs text-slate-500">Red = less wind than forecast → thermal shortfall to cover.</p>
        </Card>

        <Card title="Procurement cover" right={<Badge tone={showAdj ? 'violet' : 'blue'}>{showAdj ? 'bias-adjusted' : 'raw forecast'}</Badge>}>
          {!buf ? <Skeleton h={160} /> : (
            <div className="space-y-2 text-sm">
              <p className="text-slate-600">Buy the demand gap implied by the {showAdj ? 'bias-adjusted ' : ''}forecast, <b>plus a wind-risk buffer</b> sized from January's error distribution:</p>
              {(['p80', 'p90', 'p95'] as const).map(k => (
                <div key={k} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
                  <span>Covered in {k.slice(1)} % of hours</span>
                  <b className="num">+{fmt(buf[k])} MW</b>
                </div>
              ))}
              <p className="text-xs text-slate-500">Without a buffer the {showAdj ? 'adjusted' : 'raw'} forecast left the desk short in {fmt(buf.share_hours_short, 0)} % of January hours.</p>
            </div>
          )}
        </Card>

        <Card title="How to read this day">
          <ul className="list-disc space-y-1 pl-4 text-sm text-slate-700">
            <li>Decision made {hhmm(data.decision_time)} using the WINDFOR vintage of {hhmm(data.vintage)}.</li>
            <li>Day total {fmt(data.forecast_mwh / 1000, 1)} GWh forecast vs {fmt(data.actual_mwh / 1000, 1)} GWh delivered ({signed((data.actual_mwh - data.forecast_mwh) / 1000, 1)} GWh).</li>
            <li>Biggest miss: {fmt(m.max_shortfall)} MW short in one hour; {m.max_surplus >= 0 ? `${fmt(m.max_surplus)} MW surplus at best` : `even the best hour was ${fmt(-m.max_surplus)} MW short`}.</li>
            {ma.n > 0 && <li>Applying the rolling bias correction known at decision time {ma.mae < m.mae ? 'cuts' : 'raises'} the day's MAE from {fmt(m.mae)} to {fmt(ma.mae)} MW.</li>}
            <li className="text-slate-400">Tip: ← / → keys step through days.</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
