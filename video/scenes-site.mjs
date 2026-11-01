// Site-only silent walkthrough: every feature of the app, no slides. Short labels as on-screen text.
const D = 'Day-ahead desk', A = 'Forecast accuracy'
const glance = 'section:has-text("January at a glance")'
const runs = 'section:has-text("Forecast runs")'

export const scenes = [
  { part: D, lines: [
      'WindDesk · GB day-ahead wind forecast desk · January 2026',
      'Delivery day Wed 28 Jan. Decision at 09:00 on D-1 uses the 07:30 forecast run.',
    ], act: async h => {
      await h.uncover(); await h.sleep(600)
      await h.ring('main header'); await h.move('select[aria-label^="Decision cutoff"]')
      await h.at(1); await h.ring('main .chip-forecast >> nth=0'); await h.move('main .chip-forecast >> nth=0')
    } },

  { part: D, lines: [
      'Six KPIs for the day: run used, forecast vs actual, bias, worst shortfall, corrected error, P90 buffer.',
    ], act: async h => {
      for (const i of [0, 1, 2, 3, 4, 5]) { await h.ring(`.tile >> nth=${i}`); await h.move(`.tile >> nth=${i}`, { dx: .3, ms: 450 }); await h.sleep(650) }
    } },

  { part: D, lines: [
      'Hourly forecast vs actual. Hover any hour for exact values.',
      'Toggle: every later forecast run for the same day.',
    ], act: async h => {
      await h.ring('section:has-text("Wind generation")'); await h.sweep('section:has-text("Wind generation") .recharts-wrapper', 3200)
      await h.at(1); await h.click('label.switch:has-text("All forecast runs")', { dx: .1 }); await h.sleep(2400)
      await h.click('label.switch:has-text("All forecast runs")', { dx: .1 })
    } },

  { part: D, lines: [
      'Forecast runs: error of each run for this day. Runs after the cutoff are marked.',
    ], act: async h => {
      await h.ring(runs); await h.move(`${runs} li >> nth=1`, { dx: .4 })
      await h.scrollList(`${runs} ul`, 200); await h.move(`${runs} li >> nth=4`, { dx: .4 }); await h.sleep(600)
      await h.scrollList(`${runs} ul`, -200)
    } },

  { part: D, lines: [
      'Step through days with the arrows, the date picker, or ← → keys.',
    ], act: async h => {
      await h.ring(null); await h.click('button[aria-label="Next day"]'); await h.sleep(1100)
      await h.page.keyboard.press('ArrowRight'); await h.sleep(1100)
      await h.select('select[aria-label="Delivery day"]', '2026-01-28'); await h.sleep(700)
    } },

  { part: D, lines: [
      'January at a glance: daily error vs the monthly average. Click a bar to open that day.',
    ], act: async h => {
      await h.scrollTo(glance, 90); await h.ring(glance)
      await h.sweep(`${glance} .recharts-wrapper`, 2200, .08, .95, .7)
      await h.click(`${glance} .recharts-bar-rectangle >> nth=17`); await h.sleep(1200)
      await h.click(`${glance} .recharts-bar-rectangle >> nth=26`); await h.sleep(800)
    } },

  { part: D, lines: [
      'Hourly error bars, the procurement buffer, and a plain-English read of the day.',
      'Bias-adjusted on/off switches the forecast line and the buffer.',
    ], act: async h => {
      await h.scrollTo('section:has-text("Procurement cover")', 120)
      await h.ring('section:has-text("Hourly error")'); await h.sweep('section:has-text("Hourly error") .recharts-wrapper', 1600, .12, .95, .3)
      await h.ring('section:has-text("Procurement cover")'); await h.move('section:has-text("Procurement cover") .rounded-2xl >> nth=1', { dx: .8 })
      await h.ring('section:has-text("Reading this day")'); await h.move('section:has-text("Reading this day") li >> nth=1', { dx: .3 })
      await h.at(1); await h.ring(null); await h.scrollTo('main', 0)
      await h.click('label.switch:has-text("Bias-adjusted")', { dx: .1 }); await h.ring('.tile >> nth=5'); await h.sleep(2000)
      await h.click('label.switch:has-text("Bias-adjusted")', { dx: .1 }); await h.sleep(800); await h.ring(null)
    } },

  { part: D, lines: [
      'Change the decision cutoff and everything recalculates.',
    ], act: async h => {
      await h.ring('.tiles'); await h.select('select[aria-label^="Decision cutoff"]', '12:00'); await h.sleep(1800)
      await h.select('select[aria-label^="Decision cutoff"]', '09:00'); await h.ring(null)
    } },

  { part: D, lines: [
      'How it works: the method in one place.',
    ], act: async h => {
      await h.click('button:has-text("How it works") >> nth=1'); await h.sleep(2600)
      await h.click('dialog button:has-text("Got it")'); await h.sleep(500)
    } },

  { part: A, lines: [
      'Forecast accuracy: the whole month at the 09:00 cutoff.',
      'Error, bias, hours short, corrected error and the P90 buffer.',
    ], act: async h => {
      await h.click('aside button:has-text("Forecast accuracy")'); await h.sleep(900)
      await h.at(1); for (const i of [0, 1, 3, 4, 5]) { await h.ring(`.tile >> nth=${i}`); await h.move(`.tile >> nth=${i}`, { dx: .3, ms: 450 }); await h.sleep(500) }
    } },

  { part: A, lines: [
      'Accuracy by forecast run: the 07:30 run used at the gate vs every later run.',
      'Key findings, written from the numbers.',
    ], act: async h => {
      await h.scrollTo('section:has-text("Accuracy by forecast run")', 110); await h.ring('section:has-text("Accuracy by forecast run")')
      await h.sweep('section:has-text("Accuracy by forecast run") .recharts-wrapper', 2600, .08, .95, .6)
      await h.at(1); await h.ring('section:has-text("What January tells the desk")'); await h.move('section:has-text("What January tells the desk") li >> nth=1', { dx: .3 })
    } },

  { part: A, lines: [
      'Error by hour of day, by forecast horizon, and its distribution.',
    ], act: async h => {
      await h.scrollTo('section:has-text("Error by hour of day")', 110)
      for (const t of ['Error by hour of day', 'Error by horizon', 'Error distribution']) { await h.ring(`section:has-text("${t}")`); await h.sweep(`section:has-text("${t}") .recharts-wrapper`, 1500, .1, .92, .5) }
    } },

  { part: A, lines: [
      'Delivery day tracker: every day, sortable by any column, exportable to CSV.',
    ], act: async h => {
      await h.ring(null); await h.scrollTo('h2:has-text("Delivery day tracker")', 60); await h.move('tbody tr >> nth=0', { dx: .55 })
      await h.click('th:has-text("Delivery day")'); await h.sleep(1100)
      await h.click('th:has-text("Position")'); await h.sleep(1100)
      await h.click('th:has-text("MAE")'); await h.sleep(600); await h.move('button:has-text("Export CSV")')
    } },

  { part: A, hold: 800, lines: [
      'Collapsible sidebar, with the market context always visible.',
    ], act: async h => {
      await h.scrollTo('main', 0)
      await h.click('button[aria-label="Collapse sidebar"]'); await h.sleep(1300)
      await h.click('button[aria-label="WindDesk"]'); await h.sleep(900)
      await h.click('aside button:has-text("Day-ahead desk")'); await h.sleep(900)
    } },
]
