import { useMemo, useState } from 'react'
import { Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAccuracy, type DayRow } from './api'
import { Badge, Card, ErrorBox, Kpi, KpiStrip, Skeleton, count, downloadCsv, fmt, hhmm, lbl, mw, signed, tick, tip } from './ui'

type SortKey = keyof DayRow

export default function Accuracy({ cutoff }: { cutoff: string }) {
  const q = useAccuracy(cutoff)
  const [sort, setSort] = useState<SortKey>('mae')
  const a = q.data
  const days = useMemo(() => a ? [...a.per_day].sort((x, y) => sort === 'date' || sort === 'vintage' ? x.date.localeCompare(y.date) : Math.abs((y[sort] as number) ?? 0) - Math.abs((x[sort] as number) ?? 0)) : [], [a, sort])
  if (q.error) return <ErrorBox e={q.error} />
  if (!a) return <Skeleton h={520} />
  const o = a.overall, adj = a.adjusted
  const decisionSlot = [...a.by_vintage].filter(v => v.label.startsWith('D-1') && v.label.slice(4) <= cutoff).pop()
  const bestSlot = a.by_vintage.reduce((b, v) => v.mae < b.mae ? v : b, a.by_vintage[0])
  const worstHour = a.by_hour.reduce((b, v) => v.mae > b.mae ? v : b, a.by_hour[0])
  const lead0 = a.by_lead[0], leadEnd = a.by_lead[a.by_lead.length - 1]

  return (
    <div className={`space-y-4 transition-opacity ${q.isPlaceholderData ? 'opacity-50' : ''}`}>
      <KpiStrip>
        <Kpi label="MAE" value={`${fmt(o.mae)} MW`} tone="amber" sub={`${a.days} delivery days · ${o.n} hours`} hint="Mean absolute error of the decision-time forecast" />
        <Kpi label="RMSE" value={`${fmt(o.rmse)} MW`} sub="penalises the big misses" />
        <Kpi label="Bias · act − fcst" value={`${signed(o.bias)} MW`} tone="bad" sub={`forecast runs ${fmt(100 * -o.bias / o.mean_actual, 0)} % above delivered wind`} />
        <Kpi label="nMAE" value={`${fmt(o.nmae_pct, 1)} %`} sub={`of mean actual ${fmt(o.mean_actual)} MW`} />
        <Kpi label="Hours short" value={`${fmt(a.buffer.share_hours_short, 0)} %`} tone="bad" sub="actual below forecast" />
        <Kpi label="P90 buffer" value={`+${fmt(a.buffer.p90)} MW`} sub={`P80 +${fmt(a.buffer.p80)} · P95 +${fmt(a.buffer.p95)}`} hint="Extra MW to procure so wind shortfall is covered in 90 % of hours" />
      </KpiStrip>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card rise">
          <h2 className="display mb-3 text-[15px]">With rolling 7-day bias correction</h2>
          <div className="mono grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5 text-[13px]">
            <span className="text-[var(--muted)]">MAE</span><b className="text-[var(--ink)]">{fmt(adj.mae)} MW <span className="font-normal text-[var(--surplus)]">{signed(100 * (adj.mae - o.mae) / o.mae, 0)} %</span></b>
            <span className="text-[var(--muted)]">bias</span><b className="text-[var(--ink)]">{signed(adj.bias)} MW</b>
            <span className="text-[var(--muted)]">hours short</span><b className="text-[var(--ink)]">{fmt(a.buffer_adjusted.share_hours_short, 0)} %</b>
            <span className="text-[var(--muted)]">P90 buffer</span><b className="text-[var(--ink)]">+{fmt(a.buffer_adjusted.p90)} MW</b>
          </div>
          <p className="mt-3 text-[12px] text-[var(--dim)]">Uses only actuals complete by D-2: nothing the desk would not have had at {cutoff} on D-1.</p>
        </div>
        <Card title="What January tells the desk" className="lg:col-span-2">
          <ul className="list-disc space-y-1.5 pl-4 text-[13px] text-[var(--muted)]">
            <li><b className="text-[var(--ink)]">Systematic over-forecast.</b> Actual wind came in below the day-ahead forecast in {fmt(a.buffer.share_hours_short, 0)} % of hours, by {fmt(-o.bias)} MW on average. A flat buffer alone is expensive; correcting the bias first cuts MAE by {fmt(100 * (o.mae - adj.mae) / o.mae, 0)} %.</li>
            <li><b className="text-[var(--ink)]">Waiting helps, but not much.</b> The {decisionSlot?.label} vintage (usable at the {cutoff} cutoff) scores {fmt(decisionSlot?.mae)} MW MAE; the best later vintage ({bestSlot.label}) only reaches {fmt(bestSlot.mae)} MW. Most of the error is structural, not horizon.</li>
            <li><b className="text-[var(--ink)]">Horizon curve.</b> MAE grows from {fmt(lead0.mae)} MW at {lead0.lead_hours} h lead to {fmt(leadEnd.mae)} MW at {leadEnd.lead_hours} h.</li>
            <li><b className="text-[var(--ink)]">Worst hour of day</b> is {String(worstHour.hour).padStart(2, '0')}:00 UTC (MAE {fmt(worstHour.mae)} MW); <b className="text-[var(--ink)]">worst day</b> was {a.worst_day?.date} (MAE {fmt(a.worst_day?.mae)} MW, {fmt(a.worst_day?.nmae_pct, 0)} % of actual).</li>
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Error by hour of day" right={<span className="label">MW · UTC</span>}>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={a.by_hour} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="hour" tick={tick} tickFormatter={lbl(h => String(h).padStart(2, '0'))} />
              <YAxis tick={tick} width={48} />
              <Tooltip {...tip} formatter={mw()} labelFormatter={lbl(h => `${String(h).padStart(2, '0')}:00 UTC`)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine y={0} stroke="var(--line-2)" />
              <Bar dataKey="mae" name="MAE" fill="var(--line-2)" radius={[2, 2, 0, 0]} />
              <Line dataKey="bias" name="Bias" stroke="var(--short)" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Accuracy by forecast vintage" right={<Badge tone="amber">orange = usable at {cutoff}</Badge>}>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={a.by_vintage} margin={{ top: 4, right: 8, left: 0, bottom: 24 }}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="label" tick={tick} angle={-40} textAnchor="end" interval={0} />
              <YAxis tick={tick} width={48} domain={['dataMin - 200', 'auto']} />
              <Tooltip {...tip} formatter={mw()} />
              <Bar dataKey="mae" name="MAE" radius={[2, 2, 0, 0]}>{a.by_vintage.map((v, i) => <Cell key={i} fill={v.label === decisionSlot?.label ? 'var(--forecast)' : v.label.startsWith('D ') ? 'var(--line)' : 'var(--line-2)'} />)}</Bar>
            </ComposedChart>
          </ResponsiveContainer>
          <p className="mt-1 text-[12px] text-[var(--muted)]">Each bar: MAE of that publish slot for the next delivery day. "D " slots are same-day (intraday) — what waiting would have bought.</p>
        </Card>

        <Card title="Error by forecast horizon" right={<span className="label">all vintages · hours publish → delivery</span>}>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={a.by_lead} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="lead_hours" tick={tick} unit="h" />
              <YAxis tick={tick} width={48} domain={['dataMin - 200', 'auto']} />
              <Tooltip {...tip} formatter={mw()} labelFormatter={lbl(h => `${h} h lead`)} />
              <ReferenceLine x={16} stroke="var(--forecast)" strokeDasharray="4 3" label={{ value: 'day-ahead window →', fontSize: 10, fill: 'var(--amber-ink)', position: 'insideTopLeft' }} />
              <Line dataKey="mae" name="MAE" stroke="var(--forecast)" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Error distribution" right={<span className="label">actual − forecast · GW · 500 MW bins</span>}>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={a.histogram} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="bin_start" tick={tick} interval={1} tickFormatter={lbl(v => fmt(v / 1000, 1))} />
              <YAxis tick={tick} width={40} />
              <Tooltip {...tip} formatter={count('hours')} labelFormatter={lbl(v => `${fmt(v)} to ${fmt(v + 500)} MW`)} />
              <ReferenceLine x={0} stroke="var(--ink)" />
              <Bar dataKey="count" name="hours" radius={[2, 2, 0, 0]}>{a.histogram.map((h, i) => <Cell key={i} fill={h.bin_start < 0 ? 'var(--short)' : 'var(--surplus)'} fillOpacity={0.75} />)}</Bar>
            </ComposedChart>
          </ResponsiveContainer>
          <p className="mt-1 text-[12px] text-[var(--muted)]">P10 {signed(a.percentiles.p10)} · P50 {signed(a.percentiles.p50)} · P90 {signed(a.percentiles.p90)} MW. Mass sits left of zero: the forecast is systematically high.</p>
        </Card>
      </div>

      <Card title="Per delivery day" right={<div className="flex items-center gap-3">{a.worst_day && <Badge tone="bad">worst {a.worst_day.date} · MAE {fmt(a.worst_day.mae)} MW</Badge>}<button className="btn" onClick={() => downloadCsv(`winddesk-accuracy-${cutoff.replace(':', '')}.csv`, a.per_day)}>Export CSV</button></div>}>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="text-left">
              <tr>{([['date', 'Delivery'], ['vintage', 'Vintage used'], ['forecast_mwh', 'Forecast GWh'], ['actual_mwh', 'Actual GWh'], ['mae', 'MAE MW'], ['bias', 'Bias MW'], ['max_shortfall', 'Max short MW'], ['nmae_pct', 'nMAE %'], ['bias_adjustment', 'Adj. used MW']] as [SortKey, string][]).map(([k, l]) => (
                <th key={k} className="cursor-pointer py-2 pr-3 hover:text-[var(--ink)]" onClick={() => setSort(k)}>{l}{sort === k ? ' ▾' : ''}</th>
              ))}</tr>
            </thead>
            <tbody className="mono">
              {days.map(r => (
                <tr key={r.date}>
                  <td className="py-1.5 pr-3 text-[var(--ink)]">{r.date}</td>
                  <td className="pr-3 text-[var(--dim)]">{hhmm(r.vintage)}</td>
                  <td className="pr-3 text-[var(--amber-ink)]">{fmt(r.forecast_mwh / 1000, 1)}</td>
                  <td className="pr-3 text-[var(--teal-ink)]">{fmt(r.actual_mwh / 1000, 1)}</td>
                  <td className="pr-3">{fmt(r.mae)}</td>
                  <td className={`pr-3 ${r.bias < 0 ? 'text-[var(--short)]' : 'text-[var(--surplus)]'}`}>{signed(r.bias)}</td>
                  <td className="pr-3">{fmt(r.max_shortfall)}</td>
                  <td className="pr-3">{fmt(r.nmae_pct, 1)}</td>
                  <td className="pr-3 text-[var(--dim)]">{signed(r.bias_adjustment)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
