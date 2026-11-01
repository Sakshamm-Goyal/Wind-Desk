// Records the WindDesk demo: drives the real app in headless Chrome, captures frames over CDP,
// narrates with macOS `say`, and muxes everything into a 1080p MP4 with SRT captions and chapters.
//   node record.mjs --dry   → generate narration only and print timings
//   node record.mjs         → full recording (app must be running at APP_URL)
//   node record.mjs --short → short silent cut: on-screen text only, timed for reading
//   node record.mjs --site  → silent walkthrough of the site only, no slides
import { chromium } from 'playwright'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
const MODE = process.argv.includes('--site') ? 'site' : process.argv.includes('--short') ? 'short' : 'full'
const SHORT = MODE !== 'full'  // silent, caption-timed
const { scenes, SPOKEN = [] } = await import({ site: './scenes-site.mjs', short: './scenes-short.mjs', full: './scenes.mjs' }[MODE])
const NAME = { site: 'winddesk-site-walkthrough', short: 'winddesk-demo-short', full: 'winddesk-demo' }[MODE]

const HERE = import.meta.dirname, OUT = path.join(HERE, 'out'), TTS = path.join(OUT, 'tts'), FR = path.join(OUT, 'frames')
const APP = process.env.APP_URL ?? 'http://localhost:5174'
const VOICE = process.env.VOICE ?? 'Daniel', RATE = Number(process.env.RATE ?? 182), SR = 22050
const GAP = 380, W = 1920, H = 1080
const sleep = ms => new Promise(r => setTimeout(r, ms))
fs.mkdirSync(TTS, { recursive: true })

// ---------- narration ----------
const spoken = t => SPOKEN.reduce((s, [re, rep]) => s.replace(re, rep), t)
function pcm(file) {  // say's WAV may carry extra chunks: find "data"
  const b = fs.readFileSync(file); let o = 12
  while (o < b.length) { const id = b.toString('ascii', o, o + 4), n = b.readUInt32LE(o + 4); if (id === 'data') return b.subarray(o + 8, o + 8 + n); o += 8 + n + (n % 2) }
  throw new Error('no data chunk in ' + file)
}
let k = 0
// silent cut: hold each caption long enough to read (~240 ms a word, 2.4 s minimum)
const readMs = t => Math.max(2400, t.split(/\s+/).length * 240 + 700)
for (const sc of scenes) sc.lines = sc.lines.map(text => {
  if (SHORT) return { text, data: null, ms: readMs(text) }
  const file = path.join(TTS, `${String(k++).padStart(3, '0')}.wav`)
  execFileSync('say', ['-v', VOICE, '-r', String(RATE), `--data-format=LEI16@${SR}`, '-o', file, spoken(text)])
  const data = pcm(file); return { text, file, data, ms: data.length / 2 / SR * 1000 }
})
const est = p => scenes.filter(s => s.part === p).reduce((a, s) => a + s.lines.reduce((b, l) => b + l.ms + GAP, 0) + 600, 0) / 1000
const parts = [...new Set(scenes.map(s => s.part))]
for (const p of parts) console.log(`${p}: ~${est(p).toFixed(0)} s ${SHORT ? 'of captions' : 'narration'}`)
if (process.argv.includes('--dry')) process.exit(0)

// ---------- recording ----------
fs.rmSync(FR, { recursive: true, force: true }); fs.mkdirSync(FR, { recursive: true })
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, acceptDownloads: true })
await ctx.addInitScript({ path: path.join(HERE, 'overlay.js') })
const page = await ctx.newPage()
const cdp = await ctx.newCDPSession(page)
const frames = []
cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
  const f = path.join(FR, `${String(frames.length).padStart(6, '0')}.jpg`)
  fs.writeFileSync(f, Buffer.from(data, 'base64')); frames.push({ f, t: metadata.timestamp * 1000 })
  cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
})
await page.goto(APP, { waitUntil: 'networkidle' })
await page.addStyleTag({ url: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap' })
await page.evaluate(() => document.fonts.load('16px "IBM Plex Mono"'))
await page.addStyleTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.10.0/styles/github.min.css' })
await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.10.0/highlight.min.js' })
await page.addStyleTag({ content: 'html{scroll-behavior:auto} ::-webkit-scrollbar{display:none} *{scrollbar-width:none}' })
await page.mouse.move(W * 0.62, H * 0.55)
await sleep(800)
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 })
const t0 = Date.now()

// ---------- helpers for scene actions ----------
const L = s => typeof s === 'string' ? page.locator(s).first() : s
let cur = { x: W * 0.62, y: H * 0.55 }
const ease = t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
async function glide(x, y, ms = 650) {
  const a = { ...cur }, n = Math.max(8, Math.round(ms / 16))
  for (let i = 1; i <= n; i++) { const e = ease(i / n); await page.mouse.move(a.x + (x - a.x) * e, a.y + (y - a.y) * e); await sleep(ms / n) }
  cur = { x, y }
}
const h = {
  page, sleep,
  async move(sel, { dx = .5, dy = .5, ms } = {}) { const b = await L(sel).boundingBox(); if (b) await glide(b.x + b.width * dx, b.y + b.height * dy, ms) },
  async click(sel, o) { await h.move(sel, o); await sleep(140); await page.mouse.down(); await sleep(70); await page.mouse.up(); await sleep(250) },
  async select(sel, value) { await h.click(sel, { dx: .3 }); await L(sel).selectOption(value); await sleep(400) },
  async ring(sel) { const b = sel ? await L(sel).boundingBox() : null; await page.evaluate(r => window.__demo.ring(r), b) },
  async scrollTo(sel, off = 40) {
    await h.ring(null)
    await L(sel).evaluate((el, off) => window.scrollTo({ top: el === document.querySelector('main') ? 0 : el.getBoundingClientRect().top + scrollY - off, behavior: 'smooth' }), off)
    await sleep(1000)
  },
  async scrollList(sel, by) { await L(sel).evaluate((el, by) => el.scrollBy({ top: by, behavior: 'smooth' }), by); await sleep(700) },
  async sweep(sel, ms = 3000, from = .06, to = .96, fy = .45) {
    const b = await L(sel).boundingBox(); if (!b) return
    const y = b.y + b.height * fy
    await glide(b.x + b.width * from, y, 500)
    const n = Math.round(ms / 30)
    for (let i = 1; i <= n; i++) { const x = b.x + b.width * (from + (to - from) * i / n); await page.mouse.move(x, y); await sleep(30) }
    cur = { x: b.x + b.width * to, y }
  },
  async slide(html) { await page.evaluate(x => window.__demo.slide(x), html); await sleep(500) },
  async hide() { await page.evaluate(() => window.__demo.hide()); await sleep(450) },
  async uncover() { await page.evaluate(() => window.__demo.uncover()) },
}

// ---------- run ----------
const cues = [], chapters = []
for (const [si, sc] of scenes.entries()) {
  if (!si || sc.part !== scenes[si - 1].part) { chapters.push({ t: Date.now() - t0, title: sc.part }); await page.evaluate(p => window.__demo.part(p), sc.part) }
  const gates = sc.lines.map(() => { let r; const p = new Promise(res => (r = res)); return { p, r } })
  const narr = (async () => {
    for (const [i, l] of sc.lines.entries()) {
      const t = Date.now() - t0
      cues.push({ start: t, end: t + l.ms, text: l.text, data: l.data })
      await page.evaluate(x => window.__demo.cap(x), l.text); gates[i].r()
      await sleep(l.ms + GAP)
    }
  })()
  const act = sc.act ? sc.act({ ...h, at: i => gates[i].p }) : null
  await Promise.all([narr, act])
  await sleep(sc.hold ?? 0)
  await page.evaluate(() => window.__demo.cap('')); await sleep(350)
  process.stdout.write(`scene ${si + 1}/${scenes.length} done at ${((Date.now() - t0) / 1000).toFixed(1)} s\n`)
}
await sleep(900)
const total = Date.now() - t0
await cdp.send('Page.stopScreencast'); await sleep(300)
await browser.close()

// ---------- assemble ----------
const pad = n => String(n).padStart(2, '0')
const ts = (ms, sep = ',') => `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)}${sep}${String(Math.floor(ms % 1000)).padStart(3, '0')}`
// video: variable-duration frames (screencast only sends frames on change), aligned to t0
const vf = frames.map(f => ({ ...f, t: f.t - t0 })).filter((f, i, a) => f.t >= 0 || (a[i + 1] && a[i + 1].t > 0))
let list = ''
vf.forEach((f, i) => { const start = Math.max(0, f.t), end = i + 1 < vf.length ? Math.max(0, vf[i + 1].t) : total; if (end > start) list += `file '${f.f}'\nduration ${((end - start) / 1000).toFixed(4)}\n` })
list += `file '${vf.at(-1).f}'\n`
fs.writeFileSync(path.join(OUT, 'frames.txt'), list)
// audio: one PCM track with each line placed at its cue time
const mp4 = path.join(OUT, `${NAME}.mp4`)
const video = ['-vf', `scale=${W}:${H}:flags=lanczos,fps=30,format=yuv420p`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-tune', 'stillimage', '-t', (total / 1000).toFixed(3), '-movflags', '+faststart']
if (SHORT) execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(OUT, 'frames.txt'), '-an', ...video, mp4], { stdio: 'inherit' })
else {
const audio = Buffer.alloc(Math.ceil(total / 1000 * SR) * 2)
for (const c of cues) c.data.copy(audio, Math.floor(c.start / 1000 * SR) * 2)
const hdr = Buffer.alloc(44); hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + audio.length, 4); hdr.write('WAVEfmt ', 8); hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(1, 22)
hdr.writeUInt32LE(SR, 24); hdr.writeUInt32LE(SR * 2, 28); hdr.writeUInt16LE(2, 32); hdr.writeUInt16LE(16, 34); hdr.write('data', 36); hdr.writeUInt32LE(audio.length, 40)
fs.writeFileSync(path.join(OUT, 'narration.wav'), Buffer.concat([hdr, audio]))
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(OUT, 'frames.txt'), '-i', path.join(OUT, 'narration.wav'),
  '-map', '0:v', '-map', '1:a', ...video, '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', mp4], { stdio: 'inherit' })
}
fs.writeFileSync(path.join(OUT, `${NAME}.srt`), cues.map((c, i) => `${i + 1}\n${ts(c.start)} --> ${ts(c.end + 250)}\n${c.text}\n`).join('\n'))
fs.writeFileSync(path.join(OUT, `${NAME}-chapters.txt`), chapters.map(c => `${ts(c.t, '').slice(3, 8).replace(/^0/, '')} ${c.title}`).join('\n') + '\n')
console.log(`\n✓ ${mp4}  (${(total / 1000 / 60).toFixed(2)} min, ${frames.length} frames)`)
for (const [i, c] of chapters.entries()) console.log(`  ${c.title}: ${(((chapters[i + 1]?.t ?? total) - c.t) / 1000).toFixed(0)} s`)
