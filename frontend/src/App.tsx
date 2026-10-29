import { useRef, useState } from 'react'
import { useMeta } from './api'
import DayAhead from './DayAhead'
import Accuracy from './Accuracy'
import { ErrorBox, Skeleton } from './ui'

const CUTOFFS = ['06:00', '08:00', '09:00', '09:20', '12:00', '16:00', '23:00']
type Tab = 'desk' | 'accuracy'

export default function App() {
  const meta = useMeta()
  const [tab, setTab] = useState<Tab>('desk')
  const [cutoff, setCutoff] = useState('09:00')
  const dlg = useRef<HTMLDialogElement>(null)

  return (
    <div className="mx-auto max-w-7xl px-4 py-5">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-lg text-white">🌬️</div>
          <div>
            <h1 className="text-xl font-bold leading-tight tracking-tight">WindDesk</h1>
            <p className="text-xs text-slate-500">GB day-ahead wind desk · decisions 1–31 Jan 2026 · Elexon WINDFOR vs FUELHH (WIND)</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-slate-600">Decision cutoff <span className="text-slate-400">(D-1, UTC)</span>
            <select value={cutoff} onChange={e => setCutoff(e.target.value)} className="btn ml-2" aria-label="Decision cutoff time on D-1">
              {CUTOFFS.map(c => <option key={c} value={c}>{c}{c === '09:00' ? ' · default' : c === '09:20' ? ' · gate' : ''}</option>)}
            </select>
          </label>
          <nav className="flex rounded-lg border border-slate-300 bg-white p-0.5 text-sm" role="tablist">
            {([['desk', 'Day-ahead desk'], ['accuracy', 'Forecast accuracy']] as [Tab, string][]).map(([t, l]) => (
              <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`rounded-md px-3 py-1 transition ${tab === t ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}>{l}</button>
            ))}
          </nav>
          <button className="btn" onClick={() => dlg.current?.showModal()}>How it works</button>
        </div>
      </header>

      {meta.error ? <ErrorBox e={meta.error} /> : !meta.data ? <Skeleton h={420} /> : tab === 'desk' ? <DayAhead meta={meta.data} cutoff={cutoff} /> : <Accuracy cutoff={cutoff} />}

      <footer className="mt-10 flex flex-wrap justify-between gap-2 text-xs text-slate-400">
        <span>Gate closure for the GB day-ahead auction is {meta.data?.gate_closure ?? '09:20'} UK. The desk only ever uses the forecast vintage published at or before the chosen cutoff on D-1 — no look-ahead.</span>
        {meta.data && <span>Snapshot {String(meta.data.snapshot.last_publish).slice(0, 10)} · {meta.data.snapshot.windfor_rows} forecast rows · {meta.data.snapshot.fuelhh_rows} actual rows</span>}
      </footer>

      <dialog ref={dlg} className="m-auto w-[min(640px,92vw)] rounded-2xl p-0" onClick={e => e.target === dlg.current && dlg.current.close()}>
        <div className="space-y-3 p-6 text-sm text-slate-700">
          <h2 className="text-base font-semibold text-slate-900">How WindDesk works</h2>
          <p><b>The decision.</b> To serve its customers on delivery day D, the desk buys the non-wind gap in the GB day-ahead auction, which closes at 09:20 UK on D-1. Whatever wind forecast exists at that moment is the one the trade is based on.</p>
          <p><b>Point-in-time forecasts.</b> Elexon's WINDFOR is republished ~8× a day with a ~3-day horizon. For each delivery day we pick the latest vintage with <code>publishTime ≤ D-1 cutoff</code> (default 09:00 → the 07:30 publish) and compare it hour-by-hour with the metered actual (FUELHH, fuel type WIND, half-hours averaged to the hour). Later vintages are shown only as "what you would have known later".</p>
          <p><b>Error convention.</b> error = actual − forecast. Negative means less wind than promised: a shortfall the desk must cover from thermal plant, usually at intraday or balancing prices.</p>
          <p><b>Bias correction.</b> WINDFOR runs systematically above metered wind (curtailment and embedded generation are the usual reasons). The desk applies the mean error of the previous 7 delivery days ending at D-2, everything that is fully known at decision time, so the adjustment is leak-free.</p>
          <p><b>Buffer.</b> The P80/P90/P95 of the shortfall distribution across January: how much extra to procure on top of the forecast-implied gap to be covered in that share of hours.</p>
          <div className="pt-2 text-right"><button className="btn" onClick={() => dlg.current?.close()}>Close</button></div>
        </div>
      </dialog>
    </div>
  )
}
