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
    <div className="mx-auto max-w-7xl px-4 pb-10">
      {/* terminal status bar */}
      <div className="-mx-4 mb-6 flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-[var(--line)] bg-[var(--bg-2)] px-4 py-1.5 text-[12px] text-[var(--muted)]">
        <span>GB day-ahead auction (N2EX / EPEX)</span>
        <span>Gate closure <b className="text-[var(--ink)]">{meta.data?.gate_closure ?? '09:20'} UK</b></span>
        <span>Decision <b className="text-[var(--amber-ink)]">{cutoff} UTC on D-1</b></span>
        <span>Decisions <b className="text-[var(--ink)]">1–31 Jan 2026</b></span>
        <span className="ml-auto">Source: Elexon WINDFOR, FUELHH (wind){meta.data && <> · snapshot {String(meta.data.snapshot.last_publish).slice(0, 10)}</>}</span>
      </div>

      <header className="mb-5 flex flex-wrap items-end justify-between gap-4 rise">
        <div>
          <h1 className="display text-[36px] leading-none">Wind<span className="text-[var(--amber-ink)]">Desk</span></h1>
          <p className="mt-2 text-[13px] text-[var(--muted)]">The wind forecast you can act on at the day-ahead gate, and how wrong it tends to be, in megawatts.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-[13px] text-[var(--muted)]">Decision cutoff
            <select value={cutoff} onChange={e => setCutoff(e.target.value)} className="btn" aria-label="Decision cutoff time on D-1">
              {CUTOFFS.map(c => <option key={c} value={c}>{c}{c === '09:00' ? ' · default' : c === '09:20' ? ' · gate' : ''}</option>)}
            </select>
          </label>
          <nav className="flex gap-1" role="tablist">
            {([['desk', 'Day-ahead desk'], ['accuracy', 'Forecast accuracy']] as [Tab, string][]).map(([t, l]) => (
              <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`btn ${tab === t ? 'btn-on' : ''}`}>{l}</button>
            ))}
          </nav>
          <button className="btn" onClick={() => dlg.current?.showModal()}>How it works</button>
        </div>
      </header>

      {meta.error ? <ErrorBox e={meta.error} /> : !meta.data ? <Skeleton h={420} /> : tab === 'desk' ? <DayAhead meta={meta.data} cutoff={cutoff} /> : <Accuracy cutoff={cutoff} />}

      <footer className="mt-10 border-t border-[var(--line)] pt-4 flex flex-wrap justify-between gap-2 text-[11px] text-[var(--dim)]">
        <span>Only the WINDFOR vintage published at or before the cutoff on D-1 is ever used for a decision. No look-ahead.</span>
        {meta.data && <span>{meta.data.snapshot.windfor_rows} forecast rows · {meta.data.snapshot.fuelhh_rows} actual rows</span>}
      </footer>

      <dialog ref={dlg} className="m-auto w-[min(660px,92vw)] rounded-xl p-0" onClick={e => e.target === dlg.current && dlg.current.close()}>
        <div className="space-y-3 p-6 text-[13.5px] leading-relaxed text-[var(--muted)]">
          <h2 className="display text-xl text-[var(--ink)]">How WindDesk works</h2>
          <p><b className="text-[var(--ink)]">The decision.</b> To serve its customers on delivery day D, the desk buys the non-wind gap in the GB day-ahead auction, which closes at 09:20 UK on D-1. Whatever wind forecast exists at that moment is the one the trade is based on.</p>
          <p><b className="text-[var(--ink)]">Point-in-time forecasts.</b> Elexon's WINDFOR is republished ~8× a day with a ~3-day horizon. For each delivery day we pick the latest vintage with <code>publishTime ≤ D-1 cutoff</code> (default 09:00 → the 07:30 publish) and compare it hour-by-hour with the metered actual (FUELHH, fuel type WIND, half-hours averaged to the hour). Later vintages are shown only as "what you would have known later".</p>
          <p><b className="text-[var(--ink)]">Error convention.</b> error = actual − forecast. Negative means less wind than promised: a shortfall the desk must cover from thermal plant, usually at intraday or balancing prices.</p>
          <p><b className="text-[var(--ink)]">Bias correction.</b> WINDFOR runs systematically above metered wind (curtailment and embedded generation are the usual reasons). The desk applies the mean error of the previous 7 delivery days ending at D-2, everything that is fully known at decision time, so the adjustment is leak-free.</p>
          <p><b className="text-[var(--ink)]">Buffer.</b> The P80/P90/P95 of the shortfall distribution across January: how much extra to procure on top of the forecast-implied gap to be covered in that share of hours.</p>
          <div className="pt-2 text-right"><button className="btn" onClick={() => dlg.current?.close()}>Close</button></div>
        </div>
      </dialog>
    </div>
  )
}
