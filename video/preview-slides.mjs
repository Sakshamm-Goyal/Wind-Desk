// Renders every slide (and one app frame) to PNG for a quick visual check, without narration.
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import { scenes } from './scenes.mjs'

const OUT = path.join(import.meta.dirname, 'out', 'slides'); fs.mkdirSync(OUT, { recursive: true })
const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } })
await ctx.addInitScript({ path: path.join(import.meta.dirname, 'overlay.js') })
const page = await ctx.newPage()
await page.goto(process.env.APP_URL ?? 'http://localhost:5174', { waitUntil: 'networkidle' })
await page.addStyleTag({ url: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap' })
await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.10.0/highlight.min.js' })
await page.addStyleTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.10.0/styles/github.min.css' })
await page.evaluate(() => document.fonts.load('16px "IBM Plex Mono"'))
await page.evaluate(() => window.__demo.uncover()); await page.waitForTimeout(500)
let n = 0
for (const sc of scenes) {
  let html = null
  // app scenes wait on narration cues that never come here, so give each act a moment and move on
  const stub = new Proxy({ slide: async x => { html = x }, at: () => new Promise(() => {}) }, { get: (t, k) => t[k] ?? (async () => {}) })
  await Promise.race([sc.act(stub).catch(() => {}), new Promise(r => setTimeout(r, 50))])
  if (!html) continue
  await page.evaluate(x => window.__demo.slide(x), html); await page.waitForTimeout(600)
  await page.screenshot({ path: path.join(OUT, `${String(++n).padStart(2, '0')}.png`) })
}
await page.evaluate(() => { window.__demo.hide(); window.__demo.uncover() }); await page.waitForTimeout(800)
await page.screenshot({ path: path.join(OUT, 'app.png') })
await b.close(); console.log(n, 'slides')
