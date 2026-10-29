import { useMemo, useState } from 'react'
import { Bar, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, ArrowDownRight, ArrowUpRight, Clock3, Download, Factory, Gauge, ShieldCheck, Sigma, TrendingDown } from 'lucide-react'
import { useAccuracy, type DayRow } from './api'
import { Card, ErrorBox, Hatch, Kpi, LinePill, Ring, RunTick, Skeleton, axis, barPill, count, downloadCsv, fmt, hhmm, lbl, mw, signed, tick, tip } from './ui'

type SortKey = keyof DayRow
const COLS: [SortKey, string][] = [['date', 'Delivery day'], ['nmae_pct', 'Error vs actual'], ['forecast_mwh', 'Forecast'], ['actual_mwh', 'Actual'], ['mae', 'MAE'], ['bias', 'Position'], ['max_shortfall', 'Worst hour'], ['bias_adjustment', 'Correction used']]

export default function Accuracy({ cutoff }: { cutoff: string }) {
  const q = useAccuracy(cutoff)
  const [sort, setSort] = useState<SortKey>('mae')
  const a = q.data
  const days = useMemo(() => a ? [...a.per_day].sort((x, y) => sort === 'date' || sort === 'vintage' ? x.date.localeCompare(y.date) : Math.abs((y[sort] as number) ?? 0) - Math.abs((x[sort] as number) ?? 0)) : [], [a, sort])
  if (q.error) return <ErrorBox e={q.error} />
  if (!a) return <Skeleton h={560} />
  const o = a.overall, adj = a.adjusted
  const decisionIdx = a.by_vintage.map(v => v.label.startsWith('D-1') && v.label.slice(4) <= cutoff).lastIndexOf(true)
  const decisionSlot = a.by_vintage[decisionIdx]
  const bestSlot = a.by_vintage.reduce((b, v) => v.mae < b.mae ? v : b, a.by_vintage[0])
  const worstHourIdx = a.by_hour.reduce((bi, v, i, arr) => v.mae > arr[bi].mae ? i : bi, 0)
  const worstHour = a.by_hour[worstHourIdx]
  const lead0 = a.by_lead[0], leadEnd = a.by_lead[a.by_lead.length - 1]

  return (
    <div className={`space-y-3 transition-opacity ${q.isPlaceholderData ? 'opacity-60' : ''}`}>
      <div className="tiles">
        <Kpi icon={Sigma} label="Mean absolute error" value={fmt(o.mae)} unit="MW" sub={`${a.days} delivery days · ${o.n} hours · RMSE ${fmt(o.rmse)} MW`} hint="Mean absolute error of the decision-time forecast" />
        <Kpi icon={TrendingDown} label="Bias (actual − forecast)" value={signed(o.bias)} unit="MW" tone="bad" sub={`forecast runs ${fmt(100 * -o.bias / o.mean_actual, 0)} % above delivered wind`} />
        <Kpi icon={Gauge} label="Normalised MAE" value={fmt(o.nmae_pct, 1)} unit="%" sub={`of mean actual ${fmt(o.mean_actual)} MW`} />
        <Kpi icon={Factory} label="Hours short of forecast" value={fmt(a.buffer.share_hours_short, 0)} unit="%" tone="bad" sub={`${fmt(adj.n ? a.buffer_adjusted.share_hours_short : null, 0)} % after bias correction`} />
        <Kpi icon={Activity} label="Bias-adjusted MAE" value={fmt(adj.mae)} unit="MW" tone="good" sub={`${signed(100 * (adj.mae - o.mae) / o.mae, 0)} % vs raw · bias ${signed(adj.bias)} MW`} />
        <Kpi icon={ShieldCheck} label="P90 procurement buffer" value={`+${fmt(a.buffer_adjusted.p90)}`} unit="MW" tone="forecast" sub={`bias-adjusted · raw forecast needs +${fmt(a.buffer.p90)} MW`} hint="Extra MW to buy so wind shortfall is covered in 90 % of hours" />
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Card title="Accuracy by forecast run" right={<span className="hint">MAE of each publish slot for the next delivery day</span>}>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={a.by_vintage} margin={{ top: 36, right: 8, left: -8, bottom: 0 }} barCategoryGap="16%">
              <Hatch />
              <XAxis dataKey="label" tick={<RunTick />} {...axis} interval={0} height={40} />
              <YAxis tick={tick} width={62} {...axis} domain={[0, 2400]} ticks={[0, 600, 1200, 1800, 2400]} tickFormatter={lbl(v => fmt(v / 1000, 1) + ' GW')} />
              <Tooltip {...tip} formatter={mw()} cursor={false} />
              {decisionSlot && <ReferenceLine y={decisionSlot.mae} stroke="var(--dim)" strokeDasharray="5 5" strokeWidth={1.25} label={<LinePill text="at the gate" right />} />}
              <Bar dataKey="mae" name="MAE" radius={[10, 10, 10, 10]} background={{ fill: 'url(#hatch)', radius: 10 }} label={barPill(i => i === decisionIdx, v => `${fmt(v)} MW`)}>
                {a.by_vintage.map((v, i) => <Cell key={i} fill={i === decisionIdx ? 'var(--forecast)' : v.label.startsWith('D ') ? '#eceef3' : '#d7d9ee'} />)}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
          <p className="hint mt-2">"D-1" runs are published the day before delivery, "D" runs on the day itself. The indigo bar is the last run available at the {cutoff} cutoff; the bars to its right show what waiting would have bought.</p>
        </Card>

        <Card title="What January tells the desk">
          <ul className="space-y-4 text-[14px] leading-relaxed text-[var(--muted)]">
            <Finding title="Systematic over-forecast">Wind came in below the day-ahead forecast in {fmt(a.buffer.share_hours_short, 0)} % of hours, by {fmt(-o.bias)} MW on average. Correcting that bias first cuts MAE by {fmt(100 * (o.mae - adj.mae) / o.mae, 0)} %.</Finding>
            <Finding title="Waiting helps, but not much">The {decisionSlot?.label} run scores {fmt(decisionSlot?.mae)} MW; the best later run ({bestSlot.label}) reaches {fmt(bestSlot.mae)} MW. Most of the error is structural, not horizon.</Finding>
            <Finding title="Error grows with horizon">MAE rises from {fmt(lead0.mae)} MW at {lead0.lead_hours} h lead to {fmt(leadEnd.mae)} MW at {leadEnd.lead_hours} h.</Finding>
            <Finding title="Where it hurts">Worst hour {String(worstHour.hour).padStart(2, '0')}:00 UTC (MAE {fmt(worstHour.mae)} MW). Worst day {a.worst_day?.date}, MAE {fmt(a.worst_day?.mae)} MW, {fmt(a.worst_day?.nmae_pct, 0)} % of actual.</Finding>
          </ul>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card title="Error by hour of day" right={<span className="hint">UTC</span>}>
          <ResponsiveContainer width="100%" height={230}>
            <ComposedChart data={a.by_hour} margin={{ top: 30, right: 4, left: -8, bottom: 0 }} barCategoryGap="14%">
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="hour" tick={tick} {...axis} interval={5} tickFormatter={lbl(h => String(h).padStart(2, '0'))} dy={6} />
              <YAxis tick={tick} width={44} {...axis} tickFormatter={lbl(v => fmt(v / 1000, 1) + 'k')} />
              <Tooltip {...tip} formatter={mw()} labelFormatter={lbl(h => `${String(h).padStart(2, '0')}:00 UTC`)} cursor={false} />
              <ReferenceLine y={0} stroke="var(--line-2)" />
              <Bar dataKey="mae" name="MAE" radius={[6, 6, 6, 6]} label={barPill(i => i === worstHourIdx, v => fmt(v))}>
                {a.by_hour.map((_, i) => <Cell key={i} fill={i === worstHourIdx ? 'var(--forecast)' : '#d7d9ee'} />)}
              </Bar>
              <Line dataKey="bias" name="Bias" stroke="var(--short)" strokeWidth={2} dot={false} strokeDasharray="5 4" />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="hint mt-2">Bars: MAE. Dashed line: bias. Night hours miss most.</p>
        </Card>

        <Card title="Error by horizon" right={<span className="hint">all runs</span>}>
          <ResponsiveContainer width="100%" height={230}>
            <ComposedChart data={a.by_lead} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
              <defs><linearGradient id="gLead" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--forecast)" stopOpacity={0.2} /><stop offset="100%" stopColor="var(--forecast)" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="lead_hours" tick={tick} {...axis} unit="h" interval={11} dy={6} />
              <YAxis tick={tick} width={44} {...axis} domain={['dataMin - 200', 'auto']} tickFormatter={lbl(v => fmt(v / 1000, 1) + 'k')} />
              <Tooltip {...tip} formatter={mw()} labelFormatter={lbl(h => `${h} h ahead`)} />
              <ReferenceLine x={16} stroke="var(--dim)" strokeDasharray="5 5" />
              <Line dataKey="mae" name="MAE" stroke="var(--forecast)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 3, stroke: '#fff' }} />
            </ComposedChart>
          </ResponsiveContainer>
          <p className="hint mt-2">Hours from publish to delivery. Day-ahead decisions sit right of the dashed line.</p>
        </Card>

        <Card title="Error distribution" right={<span className="hint">actual − forecast</span>}>
          <ResponsiveContainer width="100%" height={230}>
            <ComposedChart data={a.histogram} margin={{ top: 8, right: 4, left: -4, bottom: 0 }} barCategoryGap="10%">
              <XAxis dataKey="bin_start" tick={tick} {...axis} interval={3} tickFormatter={lbl(v => fmt(v / 1000, 0) + ' GW')} dy={6} />
              <YAxis tick={tick} width={40} {...axis} />
              <Tooltip {...tip} formatter={count('hours')} labelFormatter={lbl(v => `${fmt(v)} to ${fmt(v + 500)} MW`)} cursor={false} />
              <Bar dataKey="count" name="hours" radius={[5, 5, 5, 5]}>{a.histogram.map((h, i) => <Cell key={i} fill={h.bin_start < 0 ? '#ef9fa2' : '#9ed3bd'} />)}</Bar>
            </ComposedChart>
          </ResponsiveContainer>
          <p className="hint mt-2">P10 {signed(a.percentiles.p10)} · P50 {signed(a.percentiles.p50)} · P90 {signed(a.percentiles.p90)} MW. Most hours sit left of zero.</p>
        </Card>
      </div>

      <section className="rise pt-7">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="text-[26px] font-medium tracking-tight">Delivery day tracker</h2>
          <span className="chip bg-white">{a.days} days</span>
          <button className="btn ml-auto" onClick={() => downloadCsv(`winddesk-accuracy-${cutoff.replace(':', '')}.csv`, a.per_day)}><Download size={16} />Export CSV</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[15px]">
            <thead><tr>{COLS.map(([k, l]) => <th key={k} className="cursor-pointer hover:text-[var(--ink)]" onClick={() => setSort(k)} aria-sort={sort === k ? 'descending' : 'none'}>{l}{sort === k ? ' ↓' : ''}</th>)}</tr></thead>
            <tbody className="num">
              {days.map(r => {
                const shortDay = r.bias < 0
                return (
                  <tr key={r.date}>
                    <td><div className="leading-tight"><div>{new Date(r.date + 'T00:00Z').toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' })}</div><div className="flex items-center gap-1 text-[13px] text-[var(--dim)]"><Clock3 size={12} />{hhmm(r.vintage)} run</div></div></td>
                    <td><span className="flex items-center gap-2.5"><Ring pct={r.nmae_pct ?? 0} color={(r.nmae_pct ?? 0) > 25 ? 'var(--short)' : 'var(--forecast)'} />{fmt(r.nmae_pct, 0)}%</span></td>
                    <td>{fmt(r.forecast_mwh / 1000, 1)} <span className="text-[13px] text-[var(--dim)]">GWh</span></td>
                    <td>{fmt(r.actual_mwh / 1000, 1)} <span className="text-[13px] text-[var(--dim)]">GWh</span></td>
                    <td>{fmt(r.mae)} <span className="text-[13px] text-[var(--dim)]">MW</span></td>
                    <td><span className={`chip ${shortDay ? 'chip-short' : 'chip-good'} !h-8 bg-white`}>{shortDay ? <ArrowDownRight size={15} /> : <ArrowUpRight size={15} />}{shortDay ? 'Short' : 'Long'} {fmt(Math.abs(r.bias))} MW</span></td>
                    <td>{fmt(r.max_shortfall)} <span className="text-[13px] text-[var(--dim)]">MW</span></td>
                    <td className="text-[var(--muted)]">{signed(r.bias_adjustment)} <span className="text-[13px] text-[var(--dim)]">{r.bias_adjustment != null && 'MW'}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Finding({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-[var(--forecast)]" />
      <div><b className="font-medium text-[var(--ink)]">{title}.</b> {children}</div>
    </li>
  )
}
