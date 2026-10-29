import { useEffect, useMemo, useRef, useState } from 'react'
import { Area, Bar, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, CalendarDays, ChevronLeft, ChevronRight, Clock3, Factory, Gauge, ShieldCheck, TrendingDown, Wind } from 'lucide-react'
import { useAccuracy, useDayAhead, type Meta } from './api'
import { Card, ErrorBox, Hatch, Kpi, LinePill, Skeleton, axis, barPill, dayName, fmt, hhmm, lbl, mw, mwSigned, signed, tick, tip } from './ui'

const SHOWCASE = '2026-01-28' // ponytail: worst day of the month, makes the pitch land; falls back to first day

export default function DayAhead({ meta, cutoff }: { meta: Meta; cutoff: string }) {
  const days = meta.delivery_days
  const [date, setDate] = useState(days.includes(SHOWCASE) ? SHOWCASE : days[0])
  const [showAll, setShowAll] = useState(false)
  const [showAdj, setShowAdj] = useState(true)
  const q = useDayAhead(date, cutoff)
  const acc = useAccuracy(cutoff)
  const idx = days.indexOf(date)
  const runsRef = useRef<HTMLUListElement>(null)

  useEffect(() => {  // ← / → to step through delivery days
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLSelectElement || e.target instanceof HTMLInputElement) return
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
  const runs = useMemo(() => data?.evolution.map(v => {
    const pairs = v.values.flatMap((f, i) => f != null && data.rows[i].actual != null ? [[f, data.rows[i].actual as number]] : [])
    return { ...v, mae: pairs.length ? pairs.reduce((s, [f, a]) => s + Math.abs(a - f), 0) / pairs.length : null, afterGate: new Date(v.published) > new Date(data.decision_time) }
  }), [data])
  useEffect(() => {  // keep the run actually used in view
    const ul = runsRef.current, li = ul?.querySelector<HTMLElement>('[data-used]')
    if (ul && li) ul.scrollTop = li.offsetTop - ul.offsetTop - 70
  }, [runs])
  const month = useMemo(() => acc.data?.per_day.map(d => ({ ...d, day: String(Number(d.date.slice(8))) })), [acc.data])

  if (q.error) return <ErrorBox e={q.error} />
  if (!data || !chart || !runs) return <Skeleton h={560} />
  const m = data.metrics, ma = data.adjusted_metrics
  const buf = showAdj ? acc.data?.buffer_adjusted : acc.data?.buffer
  const short = data.rows.filter(r => r.error != null && r.error < 0).length
  const sel = month?.findIndex(d => d.date === date) ?? -1

  return (
    <div className={`space-y-3 transition-opacity ${q.isPlaceholderData ? 'opacity-60' : ''}`}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button className="btn btn-icon" onClick={() => setDate(days[idx - 1])} disabled={idx <= 0} aria-label="Previous day"><ChevronLeft size={18} /></button>
        <label className="relative">
          <CalendarDays size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <select value={date} onChange={e => setDate(e.target.value)} className="sel !pl-10" aria-label="Delivery day">
            {days.map(d => <option key={d} value={d}>{dayName(d)}</option>)}
          </select>
        </label>
        <button className="btn btn-icon" onClick={() => setDate(days[idx + 1])} disabled={idx >= days.length - 1} aria-label="Next day"><ChevronRight size={18} /></button>
        <span className="ml-2 text-[15px] text-[var(--muted)]">Decided {hhmm(data.decision_time)} on the <span className="chip chip-forecast">{hhmm(data.vintage)}</span> run</span>
        <div className="ml-auto flex flex-wrap gap-5">
          <label className="switch"><input type="checkbox" checked={showAdj} onChange={e => setShowAdj(e.target.checked)} />Bias-adjusted</label>
          <label className="switch"><input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} />All forecast runs</label>
        </div>
      </div>

      <div className="tiles">
        <Kpi icon={Clock3} label="Forecast run used" value={data.vintage ? hhmm(data.vintage).slice(8, 13) : '–'} unit="UTC, D-1" sub={data.vintage ? `${data.vintage_age_hours} h old at decision · lead ${fmt(data.rows[0].lead_hours)}–${fmt(data.rows[23].lead_hours)} h` : 'no forecast available'} hint="Latest WINDFOR publish at or before the cutoff on D-1" />
        <Kpi icon={Wind} label="Forecast vs actual wind" value={`${fmt(data.forecast_mwh / 1000, 0)} / ${fmt(data.actual_mwh / 1000, 0)}`} unit="GWh" sub={`avg ${fmt(data.forecast_mwh / 24)} vs ${fmt(data.actual_mwh / 24)} MW`} />
        <Kpi icon={TrendingDown} label="Day bias (actual − forecast)" value={signed(m.bias)} unit="MW" tone={m.bias < -1500 ? 'bad' : 'plain'} sub={`MAE ${fmt(m.mae)} MW · ${fmt(m.nmae_pct, 0)} % of actual`} />
        <Kpi icon={Factory} label="Worst-hour shortfall" value={fmt(m.max_shortfall)} unit="MW" tone={m.max_shortfall > 3000 ? 'bad' : 'plain'} sub={`${short} of 24 hours short of forecast`} />
        <Kpi icon={Activity} label="Bias-adjusted MAE" value={fmt(ma.mae)} unit="MW" tone={ma.n > 0 && ma.mae < m.mae ? 'good' : 'plain'} sub={data.bias_adjustment != null ? `7-day correction ${signed(data.bias_adjustment)} MW` : 'no prior days in window'} />
        <Kpi icon={ShieldCheck} label="P90 procurement buffer" value={buf ? `+${fmt(buf.p90)}` : '–'} unit="MW" tone="forecast" sub={showAdj ? 'on top of the bias-adjusted forecast' : 'on top of the raw forecast'} />
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card title={<>Wind generation <span className="ml-3 text-[15px] font-normal text-[var(--dim)]">{dayName(date)} · hourly</span></>} right={<Legend items={[['var(--forecast)', 'Forecast at decision'], ['var(--actual)', 'Actual'], ...(showAdj ? [['var(--adjusted)', 'Bias-adjusted', true] as [string, string, boolean]] : [])]} />}>
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={chart} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="gActual" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--actual)" stopOpacity={0.07} /><stop offset="100%" stopColor="var(--actual)" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="label" tick={tick} interval={2} {...axis} dy={8} />
              <YAxis tick={tick} width={56} tickFormatter={lbl(v => fmt(v / 1000, 0) + ' GW')} {...axis} />
              <Tooltip {...tip} formatter={mw()} />
              {showAll && data.evolution.map((v, k) => (
                <Line key={k} dataKey={`v${k}`} name={v.label} stroke={v.is_decision ? 'var(--forecast)' : '#d9d7e6'} strokeWidth={v.is_decision ? 2.5 : 1.2} dot={false} isAnimationActive={false} />
              ))}
              <Area dataKey="gap" name="gap" stroke="none" fill="var(--forecast)" fillOpacity={0.08} tooltipType="none" />
              <Area dataKey="actual" name="Actual (FUELHH)" stroke="var(--actual)" fill="url(#gActual)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 3, stroke: '#fff' }} />
              <Line dataKey="forecast" name="Forecast at decision" stroke="var(--forecast)" strokeWidth={3} dot={false} activeDot={{ r: 5, strokeWidth: 3, stroke: '#fff' }} />
              {showAdj && <Line dataKey="adjusted" name="Bias-adjusted" stroke="var(--adjusted)" strokeWidth={2} strokeDasharray="6 5" dot={false} />}
            </ComposedChart>
          </ResponsiveContainer>
          {showAll && <p className="hint mt-2">Light lines are every later WINDFOR run for this day, i.e. what the desk would have known had it waited. Only the indigo line was available at the {cutoff} cutoff.</p>}
        </Card>

        <Card title="Forecast runs" right={<span className="hint">MAE for this day</span>}>
          <ul ref={runsRef} className="scroll-thin -mr-3 max-h-[372px] overflow-y-auto pr-3">
            {runs.map(r => (
              <li key={r.published} data-used={r.is_decision || undefined} className="flex items-center gap-3 border-b border-[var(--line)] py-3 last:border-0">
                <span className={`grid h-10 w-10 flex-none place-items-center rounded-full ${r.is_decision ? 'bg-[var(--forecast)] text-white' : r.afterGate ? 'bg-[var(--soft)] text-[var(--dim)]' : 'bg-[var(--forecast-soft)] text-[#454bc0]'}`}><Clock3 size={17} /></span>
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="text-[15px]">{r.label} run {r.is_decision && <span className="chip chip-forecast ml-1 !h-6">used</span>}</div>
                  <div className="text-[13px] text-[var(--dim)]">{hhmm(r.published)} · {r.afterGate ? 'after cutoff' : 'available'}</div>
                </div>
                <span className={`num text-[15px] ${r.is_decision ? 'font-medium' : 'text-[var(--muted)]'}`}>{fmt(r.mae)} <span className="text-[12px] text-[var(--dim)]">MW</span></span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="January at a glance" right={<span className="hint">Daily MAE of the decision-time forecast · click a day</span>}>
        {!month || !acc.data ? <Skeleton h={220} /> : (
          <ResponsiveContainer width="100%" height={250}>
            <ComposedChart data={month} margin={{ top: 36, right: 8, left: -8, bottom: 0 }} barCategoryGap="18%"
              onClick={s => { const i = Number((s as { activeTooltipIndex?: unknown })?.activeTooltipIndex); if (month[i]) setDate(month[i].date) }} style={{ cursor: 'pointer' }}>
              <Hatch />
              <XAxis dataKey="day" tick={tick} {...axis} dy={8} interval={0} />
              <YAxis tick={tick} width={48} {...axis} tickFormatter={lbl(v => fmt(v / 1000, 0) + ' GW')} domain={[0, (hi: number) => Math.ceil(hi / 1000) * 1000]} />
              <Tooltip {...tip} formatter={mw()} labelFormatter={(_: unknown, p: readonly { payload?: { date?: string } }[]) => p?.[0]?.payload?.date ? dayName(p[0].payload.date) : ''} cursor={false} />
              <ReferenceLine y={acc.data.overall.mae} stroke="var(--dim)" strokeDasharray="5 5" strokeWidth={1.25} label={<LinePill text="avg" />} />
              <Bar dataKey="mae" name="MAE" radius={[10, 10, 10, 10]} background={{ fill: 'url(#hatch)', radius: 10 }}
                label={barPill(i => i === sel, v => `${fmt(v)} MW`)}>
                {month.map((d, i) => <Cell key={d.date} fill={i === sel ? 'var(--forecast)' : d.mae > acc.data!.overall.mae ? '#c3c6e6' : '#e5e7f1'} />)}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card title="Hourly error" right={<span className="hint">actual − forecast</span>}>
          <ResponsiveContainer width="100%" height={210}>
            <ComposedChart data={chart} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="label" tick={tick} interval={5} {...axis} dy={6} />
              <YAxis tick={tick} width={58} {...axis} tickFormatter={lbl(v => fmt(v / 1000, 0) + ' GW')} domain={[(lo: number) => Math.min(0, lo), (hi: number) => Math.max(0, hi)]} />
              <Tooltip {...tip} formatter={mwSigned('error')} cursor={false} />
              <ReferenceLine y={0} stroke="var(--line-2)" />
              <Bar dataKey="error" name="error" radius={[6, 6, 6, 6]}>{chart.map((r, i) => <Cell key={i} fill={(r.error ?? 0) < 0 ? 'var(--short)' : 'var(--surplus)'} fillOpacity={0.85} />)}</Bar>
            </ComposedChart>
          </ResponsiveContainer>
          <p className="hint mt-2">Red hours had less wind than forecast: thermal shortfall to cover.</p>
        </Card>

        <Card title="Procurement cover" right={<span className={`chip ${showAdj ? 'chip-forecast' : ''}`}>{showAdj ? 'bias-adjusted' : 'raw forecast'}</span>}>
          {!buf ? <Skeleton h={180} /> : (
            <div className="space-y-2.5 text-[14px] text-[var(--muted)]">
              <p>Buy the gap implied by the {showAdj ? 'bias-adjusted ' : ''}forecast, plus a wind-risk buffer sized from January's errors:</p>
              {(['p80', 'p90', 'p95'] as const).map(k => (
                <div key={k} className={`flex items-center justify-between rounded-2xl px-4 py-3 ${k === 'p90' ? 'bg-[var(--forecast-soft)]' : 'bg-[var(--soft)]'}`}>
                  <span className="flex items-center gap-2"><Gauge size={17} />Covered in {k.slice(1)} % of hours</span>
                  <b className="num text-[17px] font-medium text-[var(--ink)]">+{fmt(buf[k])} MW</b>
                </div>
              ))}
              <p className="hint">Without a buffer the {showAdj ? 'adjusted' : 'raw'} forecast left the desk short in {fmt(buf.share_hours_short, 0)} % of January hours.</p>
            </div>
          )}
        </Card>

        <Card title="Reading this day">
          <ul className="space-y-3 text-[14px] text-[var(--muted)]">
            <Li>Decision at {hhmm(data.decision_time)} on the WINDFOR run published {hhmm(data.vintage)}.</Li>
            <Li>Forecast <b className="font-medium text-[var(--forecast)]">{fmt(data.forecast_mwh / 1000, 1)} GWh</b>, delivered <b className="font-medium text-[var(--actual)]">{fmt(data.actual_mwh / 1000, 1)} GWh</b> ({signed((data.actual_mwh - data.forecast_mwh) / 1000, 1)} GWh).</Li>
            <Li>Biggest miss {fmt(m.max_shortfall)} MW in one hour; {m.max_surplus >= 0 ? `best hour ${fmt(m.max_surplus)} MW above forecast` : `even the best hour was ${fmt(-m.max_surplus)} MW short`}.</Li>
            {ma.n > 0 && <Li>The bias correction known at decision time {ma.mae < m.mae ? 'cuts' : 'raises'} MAE from {fmt(m.mae)} to {fmt(ma.mae)} MW.</Li>}
            <Li muted>Use ← and → to step through days.</Li>
          </ul>
        </Card>
      </div>
    </div>
  )
}

function Li({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return <li className={`flex gap-3 ${muted ? 'text-[var(--dim)]' : ''}`}><span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-[var(--forecast)]" /><span>{children}</span></li>
}

function Legend({ items }: { items: [string, string, boolean?][] }) {
  return (
    <div className="flex flex-wrap gap-4 text-[13px] text-[var(--muted)]">
      {items.map(([c, l, dashed]) => <span key={l} className="flex items-center gap-2"><span className="h-[3px] w-4 rounded-full" style={{ background: dashed ? `repeating-linear-gradient(90deg, ${c} 0 4px, transparent 4px 7px)` : c }} />{l}</span>)}
    </div>
  )
}
