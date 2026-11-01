// Short silent cut (~3 min): same app and slides, on-screen text only.
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import * as S from './slides.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const P1 = 'Part 1 · For the trading desk', P2 = 'Part 2 · Technical walkthrough'
const pytestOut = () => {
  let out
  try { out = execFileSync(path.join(ROOT, '.venv/bin/python'), ['-m', 'pytest', '-v', '-p', 'no:cacheprovider'], { cwd: ROOT, encoding: 'utf8' }) } catch (e) { out = e.stdout }
  return out.split('\n').filter(l => /PASSED|FAILED|passed|failed/.test(l)).map(l => l.replace(/^backend\/tests\/test_core\.py::/, '').replace(/\s+\[\s*\d+%\]/, '').replace(/^=+\s*|\s*=+$/g, '')).join('\n')
}

export const scenes = [
  // ───────── PART 1 ─────────
  { part: P1, hold: 600, lines: [
      'WindDesk: a pilot for your GB day-ahead trading desk.',
      'How much wind can you count on when you buy at 09:00?',
    ], act: async h => { await h.slide(S.title('Pilot review · January 2026', 'WindDesk', 'The wind forecast your desk can actually trade on, and how wrong it tends to be.')); await h.uncover() } },

  { part: P1, hold: 1200, lines: [
      'The auction closes at 09:20 on D-1. At 09:00, the latest forecast is the 07:30 run.',
      'WindDesk shows that run, never a later one, and measures its error.',
    ], act: async h => { await h.slide(S.problem()) } },

  { part: P1, lines: [
      'Day-ahead desk · Wed 28 Jan, the worst day of January.',
      'Forecast 267 GWh, delivered 138 GWh. All 24 hours were short.',
      'Violet: forecast you traded on. Black: actual wind.',
      'Later runs got better, but only after the auction had closed.',
    ], act: async h => {
      await h.hide(); await h.sleep(500)
      await h.at(0); await h.ring('main .chip-forecast >> nth=0'); await h.move('main .chip-forecast >> nth=0')
      await h.at(1); await h.ring('.tile >> nth=1'); await h.move('.tile >> nth=1', { dx: .35 })
      await h.at(2); await h.ring(null); await h.sweep('section:has-text("Wind generation") .recharts-wrapper', 2600)
      await h.at(3); await h.click('label.switch:has-text("All forecast runs")', { dx: .1 }); await h.ring('section:has-text("Forecast runs")')
      await h.sleep(2200); await h.click('label.switch:has-text("All forecast runs")', { dx: .1 }); await h.ring(null)
    } },

  { part: P1, lines: [
      'Every day of January is one click away.',
      'P90 buffer: +2.9 GW on the bias-adjusted forecast, versus +4.1 GW on the raw one.',
    ], act: async h => {
      await h.scrollTo('section:has-text("January at a glance")', 90); await h.ring('section:has-text("January at a glance")')
      await h.click('section:has-text("January at a glance") .recharts-bar-rectangle >> nth=17'); await h.sleep(900)
      await h.select('select[aria-label="Delivery day"]', '2026-01-28'); await h.sleep(500)
      await h.at(1); await h.scrollTo('section:has-text("Procurement cover")', 120); await h.ring('section:has-text("Procurement cover")')
      await h.move('section:has-text("Procurement cover") .rounded-2xl >> nth=1', { dx: .8 })
    } },

  { part: P1, lines: [
      'January: the forecast ran 15 % above delivered wind and was short in 85 % of hours.',
      'A leak-free bias correction cuts the error by 17 %.',
      'Waiting for later runs barely helps. The error is systematic.',
    ], act: async h => {
      await h.ring(null); await h.scrollTo('main', 0); await h.click('aside button:has-text("Forecast accuracy")'); await h.sleep(800)
      await h.ring('.tiles'); await h.move('.tile >> nth=1', { dx: .3 })
      await h.at(1); await h.ring('.tile >> nth=4'); await h.move('.tile >> nth=4', { dx: .3 })
      await h.at(2); await h.scrollTo('section:has-text("Accuracy by forecast run")', 110); await h.ring('section:has-text("Accuracy by forecast run")')
      await h.move('section:has-text("Accuracy by forecast run") .recharts-bar-rectangle >> nth=15')
    } },

  { part: P1, lines: [
      'Every delivery day: run used, error, short or long. Sortable and exportable.',
    ], act: async h => { await h.ring(null); await h.scrollTo('h2:has-text("Delivery day tracker")', 60); await h.move('tbody tr >> nth=0', { dx: .55 }); await h.move('tbody tr >> nth=3', { dx: .55 }) } },

  { part: P1, hold: 1800, lines: [
      'Takeaway: correct the bias first, then carry a buffer of about 3 GW, not 4.',
    ], act: async h => { await h.slide(S.summary()) } },

  // ───────── PART 2 ─────────
  { part: P2, lines: [
      'Part 2: how it is built.',
    ], act: async h => { await h.slide(S.title('Part 2 · Technical walkthrough', 'How WindDesk is built', 'Architecture · data · core logic · tests · practices · deployment')) } },

  { part: P2, hold: 1500, lines: [
      'Elexon → JSON snapshot → pure-Python core → FastAPI → React + TypeScript.',
      'No database, no pandas: one month is about 20k rows.',
    ], act: async h => { await h.slide(S.architecture()) } },

  { part: P2, hold: 1200, lines: [
      'WINDFOR is hourly, 8 runs a day. FUELHH is half-hourly, averaged to the hour.',
    ], act: async h => { await h.slide(S.data()) } },

  { part: P2, hold: 1500, lines: [
      'The key function returns the last run published at or before the cutoff. No look-ahead.',
    ], act: async h => { await h.slide(S.code('Core logic · backend/core.py', 'Point-in-time forecast selection', ['Bisect over sorted publish times', 'Inclusive cutoff', 'Later runs never leak in'], S.pyFn('backend/core.py', 'as_of', 'decision_time'))) } },

  { part: P2, hold: 1500, lines: [
      'The bias correction uses only days up to D-2, which are fully known at decision time.',
    ], act: async h => { await h.slide(S.code('Core logic · backend/core.py', 'Leak-free bias correction', ['Window ends at D-2', 'Same as-of selection for past days', 'Cuts monthly MAE by 17 %'], S.pyFn('backend/core.py', 'rolling_bias'))) } },

  { part: P2, hold: 1500, lines: [
      '6 tests on the logic that matters, including a no-look-ahead check.',
    ], act: async h => { await h.slide(S.tests(S.slice('backend/tests/test_core.py', 'def _ds', 'def test_decision_time'), pytestOut())) } },

  { part: P2, hold: 1200, lines: [
      'ruff and oxlint, CI on every push, Docker, and AI assistance disclosed in the README.',
    ], act: async h => { await h.slide(S.practices()) } },

  { part: P2, hold: 1500, lines: [
      'Run it with docker compose up. Thanks for reviewing.',
    ], act: async h => { await h.slide(S.closing()) } },
]
