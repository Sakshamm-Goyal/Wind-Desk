import { useRef, useState } from 'react'
import { CalendarDays, ChartColumnBig, Clock3, Database, Gavel, Info, PanelLeft, Wind } from 'lucide-react'
import { useMeta } from './api'
import DayAhead from './DayAhead'
import Accuracy from './Accuracy'
import { ErrorBox, Skeleton, type Icon } from './ui'

const CUTOFFS = ['06:00', '08:00', '09:00', '09:20', '12:00', '16:00', '23:00']
type Tab = 'desk' | 'accuracy'
const NAV: [Tab, string, Icon][] = [['desk', 'Day-ahead desk', Wind], ['accuracy', 'Forecast accuracy', ChartColumnBig]]

export default function App() {
  const meta = useMeta()
  const [tab, setTab] = useState<Tab>('desk')
  const [cutoff, setCutoff] = useState('09:00')
  const [collapsed, setCollapsed] = useState(false)
  const dlg = useRef<HTMLDialogElement>(null)
  const open = () => dlg.current?.showModal()

  return (
    <div className="min-h-screen p-2 sm:p-4 lg:p-8">
      <div className="shell mx-auto flex max-w-[1560px] overflow-hidden">
        <aside className="side hidden shrink-0 flex-col border-r border-[var(--line-2)] px-4 py-7 lg:flex" style={{ width: collapsed ? 84 : 272 }}>
          <div className="mb-9 flex items-center justify-between px-1.5">
            <button className="flex items-center gap-2.5" onClick={() => collapsed && setCollapsed(false)} aria-label="WindDesk">
              <span className="logo"><Wind size={21} strokeWidth={2.4} /></span>
              {!collapsed && <span className="text-[24px] font-medium tracking-tight">winddesk</span>}
            </button>
            {!collapsed && <button className="text-[var(--dim)] hover:text-[var(--ink)]" onClick={() => setCollapsed(true)} aria-label="Collapse sidebar"><PanelLeft size={21} /></button>}
          </div>

          <nav className="space-y-1">
            {NAV.map(([t, l, I]) => (
              <button key={t} className={`nav ${tab === t ? 'nav-on' : ''}`} onClick={() => setTab(t)} title={l} aria-current={tab === t}>
                <I size={20} />{!collapsed && l}
              </button>
            ))}
            <button className="nav" onClick={open} title="How it works"><Info size={20} />{!collapsed && 'How it works'}</button>
          </nav>

          {!collapsed && (
            <>
              <div className="mx-2 my-6 h-px bg-[var(--line-2)]" />
              <div className="mb-2 px-3.5 text-[12.5px] text-[var(--dim)]">Market context</div>
              <div className="side-meta"><Gavel size={18} />Gate closure <b className="ml-auto font-medium text-[var(--ink)]">09:20 UK</b></div>
              <div className="side-meta"><Clock3 size={18} />Decision cutoff <b className="ml-auto font-medium text-[var(--ink)]">{cutoff}</b></div>
              <div className="side-meta"><CalendarDays size={18} />Decisions <b className="ml-auto font-medium text-[var(--ink)]">1–31 Jan</b></div>
              <div className="side-meta"><Database size={18} />Snapshot <b className="ml-auto font-medium text-[var(--ink)]">{meta.data ? String(meta.data.snapshot.last_publish).slice(5, 10).split('-').reverse().join('/') : '–'}</b></div>
            </>
          )}

          <div className="mt-auto flex items-center gap-3 px-1.5 pt-6">
            <span className="grid h-11 w-11 flex-none place-items-center rounded-full bg-gradient-to-br from-[#f3d3df] to-[#d6d7f5] text-[14px] font-semibold">GB</span>
            {!collapsed && <div className="min-w-0 leading-tight"><div className="text-[15px]">Day-ahead desk</div><div className="truncate text-[13px] text-[var(--muted)]">Pilot · January 2026</div></div>}
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <header className="mb-7 flex flex-wrap items-center gap-x-5 gap-y-3">
            <h1 className="text-[30px] font-medium tracking-tight">{tab === 'desk' ? 'Day-ahead desk' : 'Forecast accuracy'}</h1>
            <span className="hidden h-7 w-px bg-[var(--line-2)] md:block" />
            <label className="flex items-center gap-1 text-[15px] text-[var(--muted)]"><Clock3 size={19} />
              <select value={cutoff} onChange={e => setCutoff(e.target.value)} className="sel sel-ghost" aria-label="Decision cutoff time on D-1 (UTC)">
                {CUTOFFS.map(c => <option key={c} value={c}>Cutoff {c} UTC{c === '09:00' ? ' (default)' : c === '09:20' ? ' (gate)' : ''}</option>)}
              </select>
            </label>
            <div className="ml-auto flex items-center gap-3">
              <span className="hidden items-center gap-2 text-[15px] text-[var(--muted)] xl:flex"><Database size={18} />Elexon WINDFOR · FUELHH</span>
              <span className="hidden h-6 w-px bg-[var(--line-2)] xl:block" />
              <button className="btn-dark" onClick={open}><Info size={18} />How it works</button>
            </div>
            <nav className="flex w-full gap-1 rounded-full bg-white p-1 lg:hidden">
              {NAV.map(([t, l]) => <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-full px-3 py-2 text-[14px] ${tab === t ? 'bg-[var(--ink)] text-white' : 'text-[var(--muted)]'}`}>{l}</button>)}
            </nav>
          </header>

          {meta.error ? <ErrorBox e={meta.error} /> : !meta.data ? <Skeleton h={480} /> : tab === 'desk' ? <DayAhead meta={meta.data} cutoff={cutoff} /> : <Accuracy cutoff={cutoff} />}

          <footer className="mt-10 flex flex-wrap justify-between gap-2 text-[13px] text-[var(--dim)]">
            <span>Only the WINDFOR run published at or before the cutoff on D-1 is used for a decision. No look-ahead.</span>
            {meta.data && <span>{fmtInt(meta.data.snapshot.windfor_rows)} forecast rows · {fmtInt(meta.data.snapshot.fuelhh_rows)} actual rows</span>}
          </footer>
        </main>
      </div>

      <dialog ref={dlg} className="m-auto w-[min(680px,92vw)] rounded-[24px] p-0" onClick={e => e.target === dlg.current && dlg.current.close()}>
        <div className="space-y-3.5 p-7 text-[15px] leading-relaxed text-[var(--muted)]">
          <h2 className="text-[24px] font-medium tracking-tight text-[var(--ink)]">How WindDesk works</h2>
          <p><b className="font-medium text-[var(--ink)]">The decision.</b> To serve customers on delivery day D, the desk buys the non-wind gap in the GB day-ahead auction, which closes at 09:20 UK on D-1. Whatever wind forecast exists at that moment is the one the trade is based on.</p>
          <p><b className="font-medium text-[var(--ink)]">Point-in-time forecasts.</b> Elexon's WINDFOR is republished about 8 times a day with a 3-day horizon. For each delivery day we pick the latest run with <code>publishTime ≤ D-1 cutoff</code> (default 09:00, which selects the 07:30 run) and compare it hour by hour with metered wind (FUELHH, half-hours averaged to the hour). Later runs are shown only as "what you would have known later".</p>
          <p><b className="font-medium text-[var(--ink)]">Error convention.</b> error = actual − forecast. Negative means less wind than promised: a shortfall the desk must cover from thermal plant.</p>
          <p><b className="font-medium text-[var(--ink)]">Bias correction.</b> WINDFOR runs above metered wind, mostly through curtailment. The desk applies the mean error of the 7 delivery days ending at D-2, all fully known at decision time, so nothing leaks from the future.</p>
          <p><b className="font-medium text-[var(--ink)]">Buffer.</b> P80, P90 and P95 of January's shortfall distribution: how much extra to buy on top of the forecast-implied gap to be covered in that share of hours.</p>
          <div className="flex justify-end pt-2"><button className="btn-dark" onClick={() => dlg.current?.close()}>Got it</button></div>
        </div>
      </dialog>
    </div>
  )
}

const fmtInt = (v: unknown) => Number(v).toLocaleString('en-GB')
