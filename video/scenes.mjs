// The demo, scene by scene. Each scene: narration lines (one caption each) + screen actions synced via at(i).
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
  // ───────────── PART 1 · client ─────────────
  { part: P1, lines: [
      'Hello, and thank you for your time.',
      'This is WindDesk, the pilot we built for your day-ahead trading desk.',
      "In the next five minutes I'll show you what it does, what it found in January, and how it changes the size of your morning purchase.",
    ], act: async h => { await h.slide(S.title('Pilot review · January 2026', 'WindDesk', 'The wind forecast your desk can actually trade on, and how wrong it tends to be.')); await h.uncover() } },

  { part: P1, lines: [
      "Every morning, before the day-ahead auction closes at 09:20, your desk buys tomorrow's power.",
      'Wind covers part of demand, and the rest has to be bought. So the trade depends on one number: how much wind will turn up.',
      'Elexon republishes its national wind forecast about eight times a day, but at 09:00 only one run is actually available to you.',
      'WindDesk shows exactly that run, and measures how far wrong it tends to be.',
    ], act: async h => { await h.slide(S.problem()) } },

  { part: P1, lines: [
      "This is the day-ahead desk, showing delivery on Wednesday the 28th of January.",
      'The decision is made at 09:00 the day before, and the latest forecast at that moment was the 07:30 run.',
      "The desk never uses a forecast that wasn't published yet. Everything here is what you could really have known.",
    ], act: async h => {
      await h.hide(); await h.sleep(700)
      await h.at(0); await h.ring('main header'); await h.move('select[aria-label^="Decision cutoff"]')
      await h.at(1); await h.ring('main .chip-forecast >> nth=0'); await h.move('main .chip-forecast >> nth=0')
      await h.at(2); await h.ring('.tile >> nth=0'); await h.move('.tile >> nth=0', { dx: .3 })
    } },

  { part: P1, lines: [
      'The forecast promised 267 gigawatt hours of wind. Only 138 arrived, about half.',
      'Every single hour was short, the worst by more than six gigawatts.',
      'That gap had to be covered from thermal plant, at short notice.',
    ], act: async h => {
      await h.at(0); await h.ring('.tile >> nth=1'); await h.move('.tile >> nth=1', { dx: .35 })
      await h.at(1); await h.ring('.tile >> nth=3'); await h.move('.tile >> nth=3', { dx: .35 })
      await h.at(2); await h.ring('.tile >> nth=2'); await h.move('.tile >> nth=2', { dx: .35 })
    } },

  { part: P1, lines: [
      'The chart makes it plain. Violet is the forecast you traded on; black is what was actually generated.',
      "The dashed grey line is the same forecast after a bias correction. I'll come back to that.",
    ], act: async h => {
      await h.ring(null); await h.at(0); await h.sweep('section:has-text("Wind generation") .recharts-wrapper', 4200)
      await h.at(1); await h.sweep('section:has-text("Wind generation") .recharts-wrapper', 2600, .9, .45)
    } },

  { part: P1, lines: [
      'On the right is every forecast run for this day.',
      'The runs published after the gate got much better: the 11:30 run nearly halved the error.',
      "But that was two hours too late for the auction. That's why the error has to be planned for, not just watched.",
    ], act: async h => {
      await h.at(0); await h.ring('section:has-text("Forecast runs")'); await h.move('section:has-text("Forecast runs") li >> nth=1', { dx: .4 })
      await h.at(1); await h.scrollList('section:has-text("Forecast runs") ul', 130); await h.move('section:has-text("Forecast runs") li >> nth=3', { dx: .4 })
      await h.click('label.switch:has-text("All forecast runs")', { dx: .1 }); await h.ring('section:has-text("Wind generation")')
      await h.at(2); await h.sleep(2500); await h.click('label.switch:has-text("All forecast runs")', { dx: .1 }); await h.ring(null)
    } },

  { part: P1, lines: [
      "Below is January at a glance. Each bar is one day's average error; the dashed line is the monthly average.",
      'Click any day to open it. The 19th, for example, was a good day: the forecast was close to what was delivered.',
      'And back to the 28th, the worst day of the month.',
    ], act: async h => {
      await h.scrollTo('section:has-text("January at a glance")', 90); await h.ring('section:has-text("January at a glance")')
      await h.move('section:has-text("January at a glance") .recharts-bar-rectangle >> nth=9')
      await h.at(1); await h.ring(null); await h.click('section:has-text("January at a glance") .recharts-bar-rectangle >> nth=17'); await h.sleep(900)
      await h.scrollTo('main', 0); await h.sleep(500); await h.ring('.tiles'); await h.move('.tile >> nth=2', { dx: .35 })
      await h.at(2); await h.ring(null); await h.select('select[aria-label="Delivery day"]', '2026-01-28'); await h.sleep(600)
    } },

  { part: P1, lines: [
      'Now the part that changes the trade: procurement cover.',
      'To have your wind risk covered in ninety percent of hours, buy about 2.9 gigawatts on top of the bias-adjusted forecast.',
      'Without the correction, the same cover needs 4.1 gigawatts.',
    ], act: async h => {
      await h.scrollTo('section:has-text("Procurement cover")', 120); await h.ring('section:has-text("Procurement cover")')
      await h.at(1); await h.move('section:has-text("Procurement cover") .rounded-2xl >> nth=1', { dx: .8 })
      await h.at(2); await h.scrollTo('main', 0); await h.click('label.switch:has-text("Bias-adjusted")', { dx: .1 }); await h.ring('.tile >> nth=5'); await h.move('.tile >> nth=5', { dx: .35 })
      await h.sleep(2600); await h.click('label.switch:has-text("Bias-adjusted")', { dx: .1 }); await h.ring('.tile >> nth=5')
    } },

  { part: P1, lines: [
      'The forecast accuracy page sums up the month.',
      'The average error is just over two gigawatts, about eighteen percent of the wind delivered.',
      'And it is one-sided: the forecast was too high in 85 percent of hours.',
      'Correcting that bias, using only data you have on the morning, cuts the error by seventeen percent and halves the number of short hours.',
    ], act: async h => {
      await h.ring(null); await h.click('aside button:has-text("Forecast accuracy")'); await h.sleep(900)
      await h.at(1); await h.ring('.tile >> nth=0'); await h.move('.tile >> nth=0', { dx: .3 })
      await h.at(2); await h.ring('.tile >> nth=3'); await h.move('.tile >> nth=3', { dx: .3 })
      await h.at(3); await h.ring('.tile >> nth=4'); await h.move('.tile >> nth=4', { dx: .3 })
    } },

  { part: P1, lines: [
      'This chart scores every forecast run of the day. The run you can use at the gate averages about 2,000 megawatts of error.',
      'The best run, published late on the delivery day itself, still only gets to about 1,660.',
      "So waiting doesn't fix it. Most of the error is systematic, which is exactly why a correction works.",
    ], act: async h => {
      await h.scrollTo('section:has-text("Accuracy by forecast run")', 110); await h.ring('section:has-text("Accuracy by forecast run")')
      await h.move('section:has-text("Accuracy by forecast run") .recharts-bar-rectangle >> nth=2')
      await h.at(1); await h.move('section:has-text("Accuracy by forecast run") .recharts-bar-rectangle >> nth=15')
      await h.at(2); await h.ring('section:has-text("What January tells the desk")'); await h.move('section:has-text("What January tells the desk") li >> nth=1', { dx: .2 })
    } },

  { part: P1, lines: [
      'The error is worst overnight, around five in the morning, and grows steadily with forecast horizon.',
      'The distribution sits mostly left of zero: less wind than promised.',
    ], act: async h => {
      await h.scrollTo('section:has-text("Error by hour of day")', 110); await h.ring('section:has-text("Error by hour of day")')
      await h.sweep('section:has-text("Error by hour of day") .recharts-wrapper', 1800, .1, .4)
      await h.ring('section:has-text("Error by horizon")'); await h.sweep('section:has-text("Error by horizon") .recharts-wrapper', 1900)
      await h.at(1); await h.ring('section:has-text("Error distribution")'); await h.sweep('section:has-text("Error distribution") .recharts-wrapper', 2400)
    } },

  { part: P1, lines: [
      'Finally, the delivery day tracker lists every day: the run used, the error, and whether the desk ended up short or long.',
      'It sorts by any column and exports to a spreadsheet in one click.',
    ], act: async h => {
      await h.ring(null); await h.scrollTo('h2:has-text("Delivery day tracker")', 60); await h.move('tbody tr >> nth=0', { dx: .55 })
      await h.move('tbody tr >> nth=2', { dx: .55 })
      await h.at(1); await h.click('th:has-text("Delivery day")'); await h.sleep(900); await h.click('th:has-text("MAE")'); await h.sleep(500); await h.move('button:has-text("Export CSV")')
    } },

  { part: P1, lines: [
      'And to test a different decision time, change the cutoff and every number recalculates.',
    ], act: async h => {
      await h.scrollTo('main', 0); await h.select('select[aria-label^="Decision cutoff"]', '23:00'); await h.ring('.tiles'); await h.sleep(2200)
      await h.select('select[aria-label^="Decision cutoff"]', '09:00'); await h.ring(null)
    } },

  { part: P1, lines: [
      'To sum up. The forecast you trade on ran fifteen percent high all January.',
      'A simple correction, using only what you know at 09:00, removes a good part of that error.',
      'And a buffer of about three gigawatts, rather than four, covers ninety percent of hours.',
      'Next, we would extend this to more months, size the buffer by hour of day, and add prices so it becomes a cost in pounds.',
      'Thank you. Part two walks through how it is built.',
    ], act: async h => { await h.slide(S.summary()) } },

  // ───────────── PART 2 · tech lead ─────────────
  { part: P2, lines: [
      'Part two is the technical walkthrough, for review and handover.',
      "I'll cover the architecture, the data, the core logic, testing, and how it runs and deploys.",
    ], act: async h => { await h.slide(S.title('Part 2 · Technical walkthrough', 'How WindDesk is built', 'Architecture · data · core logic · tests · practices · deployment')) } },

  { part: P2, lines: [
      'The architecture is deliberately small.',
      'A one-off ingest script pulls the two Elexon datasets and commits a January snapshot as JSON.',
      'A Python domain module does all the analysis in pure functions, and a thin FastAPI layer exposes three routes.',
      'The React front end is TypeScript, with TanStack Query for data and Recharts for charts.',
      'Docker Compose runs it behind nginx, and the same app deploys to Vercel as a Python function.',
      'There is no database and no pandas: one month is about twenty thousand rows, so plain Python keeps it simple and quick to start.',
    ], act: async h => { await h.slide(S.architecture()) } },

  { part: P2, lines: [
      'Before writing code, I checked the data against the live API.',
      'WINDFOR is hourly, published eight times a day, with a horizon of about 73 hours. FUELHH is half-hourly, so actuals are averaged to the hour.',
      'Decisions in January means delivery days from the 2nd of January to the 1st of February, so the snapshot starts on the 31st of December.',
    ], act: async h => { await h.slide(S.data()) } },

  { part: P2, lines: [
      'The whole product hinges on this function.',
      'as_of binary-searches the sorted publish times and returns the last run published at or before the cutoff.',
      'The boundary is inclusive, and a later run can never leak in. decision_time is simply the cutoff on the day before delivery.',
    ], act: async h => { await h.slide(S.code('Core logic · backend/core.py', 'Point-in-time forecast selection', ['Bisect over sorted publish times: O(log n)', 'Inclusive cutoff: a run at exactly 09:00 counts', 'Later vintages are only ever shown as context'], S.pyFn('backend/core.py', 'as_of', 'decision_time'))) } },

  { part: P2, lines: [
      'Error is always actual minus forecast, so negative means short.',
      'metrics returns mean absolute error, RMSE, bias, normalised error, and the worst shortfall and surplus.',
      'I use normalised error rather than percentage error, because wind can drop close to zero.',
    ], act: async h => { await h.slide(S.code('Core logic · backend/core.py', 'One metrics function, one sign convention', ['error = actual − forecast', 'nMAE instead of MAPE: wind can approach zero', 'Shared by the day view and the monthly view'], S.pyFn('backend/core.py', 'metrics'))) } },

  { part: P2, lines: [
      'The bias correction is the mean error of the seven delivery days ending at D minus two.',
      "D minus one's actuals are not complete at 09:00, so they are excluded, and a dedicated test checks exactly that.",
    ], act: async h => { await h.slide(S.code('Core logic · backend/core.py', 'Leak-free bias correction', ['Window ends at D-2: fully known at decision time', 'Same as-of selection for every past day', 'Cuts monthly MAE by 17 %'], S.pyFn('backend/core.py', 'rolling_bias'))) } },

  { part: P2, lines: [
      'Two analysis views are worth pointing out.',
      'The horizon curve pools every run, not just the one used at the gate, so lead time is not confused with hour of day.',
      'The run ladder scores each publish slot, which is how we quantify what waiting would have bought.',
    ], act: async h => { await h.slide(S.code('Analysis · backend/core.py', 'Horizon curve and run ladder', ['lead_curve: every vintage × every hour', 'Removes the hour-of-day confound', 'vintage_ladder: MAE per publish slot, D-1 and D'], S.pyFn('backend/core.py', 'lead_curve'))) } },

  { part: P2, lines: [
      'There are six tests, all on the logic that matters.',
      'They cover the inclusive cutoff, no look-ahead, metric signs, hourly aggregation, the bias window, and a smoke test on the real snapshot that asserts the 07:30 run is chosen.',
    ], act: async h => { await h.slide(S.tests(S.slice('backend/tests/test_core.py', 'def _ds', 'def test_decision_time'), pytestOut())) } },

  { part: P2, lines: [
      'The API has three routes, each taking the cutoff as a validated parameter, with OpenAPI docs built in.',
      'On the front end, a typed client wraps each route in a query hook keyed by date and cutoff, so switching days is instant and the previous day stays on screen while the next one loads.',
    ], act: async h => { await h.slide(S.apiFront(S.slice('frontend/src/api.ts', 'async function get', null))) } },

  { part: P2, lines: [
      'On practices: Python is linted and formatted with ruff; the front end with oxlint and the TypeScript compiler.',
      'Continuous integration runs the tests, lint, the production build and a Docker build on every push.',
      'Deliberate shortcuts are marked in the code with a comment naming the limit and the upgrade path.',
      'I used Claude as an AI assistant throughout, and that is disclosed in the README.',
    ], act: async h => { await h.slide(S.practices()) } },

  { part: P2, lines: [
      'Known limits: one month, wind only, a simple bias model, and a manual data refresh.',
      'To run it, clone the repo and run docker compose up. The README lists every file, the commands and the deployed link.',
      'Thanks for reviewing.',
    ], act: async h => { await h.slide(S.closing()) } },
]

// Say it right; captions keep the written form.
export const SPOKEN = [
  [/\bWindDesk\b/g, 'Wind Desk'], [/\bWINDFOR\b/g, 'Wind For'], [/\bFUELHH\b/g, 'Fuel H H'],
  [/\bRMSE\b/g, 'R M S E'], [/\bAPI\b/g, 'A P I'], [/\bOpenAPI\b/g, 'Open A P I'], [/\bFastAPI\b/g, 'Fast A P I'],
  [/\bJSON\b/g, 'jay-son'], [/\bTanStack\b/g, 'Tan Stack'], [/\boxlint\b/g, 'ox lint'], [/\bnginx\b/g, 'engine X'],
  [/\bREADME\b/g, 'read me'], [/\bas_of\b/g, 'as of'], [/\bdecision_time\b/g, 'decision time'], [/\bAI\b/g, 'A I'],
  [/\b09:00\b/g, 'nine o\'clock'], [/\b09:20\b/g, 'nine twenty'], [/\b07:30\b/g, 'seven thirty'], [/\b11:30\b/g, 'eleven thirty'],
  [/\b2\.9\b/g, 'two point nine'], [/\b4\.1\b/g, 'four point one'], [/\bD minus\b/g, 'D minus'],
]
