// Full-screen slides for the demo video. Plain HTML strings rendered into the #__slide overlay.
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Source of a top-level Python function (or several), read live from the repo so slides never drift from the code. */
export function pyFn(file, ...names) {
  const lines = fs.readFileSync(path.join(ROOT, file), 'utf8').split('\n')
  return names.map(n => {
    const i = lines.findIndex(l => l.startsWith(`def ${n}(`))
    if (i < 0) throw new Error(`${n} not found in ${file}`)
    let j = i + 1
    while (j < lines.length && (lines[j] === '' || /^\s/.test(lines[j]))) j++
    while (lines[j - 1] === '') j--
    return lines.slice(i, j).join('\n')
  }).join('\n\n\n')
}
export function slice(file, from, to) {
  const s = fs.readFileSync(path.join(ROOT, file), 'utf8'); const a = s.indexOf(from); const b = to ? s.indexOf(to, a + from.length) : s.length
  if (a < 0) throw new Error(`"${from}" not in ${file}`)
  return s.slice(a, b < 0 ? s.length : b).trimEnd()
}

export const STYLE = `<style>#__slide{
.sw{width:1760px}
.k{font-size:22px;font-weight:600;color:#5b61d6;letter-spacing:.02em;margin-bottom:14px}
.h1{font-size:92px;font-weight:600;letter-spacing:-.03em;line-height:1}
.h2{font-size:54px;font-weight:600;letter-spacing:-.02em;line-height:1.08;margin-bottom:26px}
.sub{font-size:30px;color:#646b7a;line-height:1.4}
.row{display:grid;gap:22px}
.box{background:#fff;border:1px solid #eceef2;border-radius:24px;padding:28px 30px}
.box h3{font-size:27px;font-weight:600;margin:0 0 8px}
.box p{font-size:22px;color:#646b7a;line-height:1.45;margin:0}
.big{font-size:64px;font-weight:600;letter-spacing:-.02em;color:#5b61d6;line-height:1.05;margin-bottom:10px}
.t{font-size:20px;color:#9aa1ae;font-weight:500;margin-bottom:6px}
ul.b{margin:0;padding-left:0;list-style:none}
ul.b li{font-size:25px;line-height:1.45;color:#3a404d;margin:0 0 14px;padding-left:28px;position:relative}
ul.b li:before{content:"";position:absolute;left:4px;top:15px;width:9px;height:9px;border-radius:50%;background:#5b61d6}
pre{margin:0}
pre code.hljs{display:block;overflow:hidden;background:#fff;border:1px solid #eceef2;border-radius:22px;padding:24px 28px!important;font:16px/1.55 "IBM Plex Mono",ui-monospace,monospace}
.term{background:#161a23;color:#d6dbe6;border-radius:22px;padding:24px 28px;font:17px/1.6 "IBM Plex Mono",monospace;white-space:pre;overflow:hidden}
.term .ok{color:#7ee2b0}
table.d{border-collapse:collapse;width:100%;font-size:23px}
table.d th{text-align:left;color:#9aa1ae;font-weight:500;padding:12px 18px 12px 0;border-bottom:1px solid #dfe2e8}
table.d td{padding:16px 18px 16px 0;border-bottom:1px solid #eceef2;color:#3a404d}
.arrow{font-size:40px;color:#c3c6e6;display:flex;align-items:center;justify-content:center}
.chip{display:inline-block;padding:6px 14px;border-radius:999px;background:#eceefb;color:#454bc0;font-size:19px;font-weight:500;margin:0 8px 8px 0}
.logo{width:96px;height:96px;border-radius:26px;background:#161a23;display:grid;place-items:center;margin-bottom:36px}
.code-col{min-width:0}
}</style>`

const LOGO = `<div class="logo"><svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M12.8 19.6A2 2 0 1 0 14 16H2"/><path d="M17.5 8a2.5 2.5 0 1 1 2 4H2"/><path d="M9.8 4.4A2 2 0 1 1 11 8H2"/></svg></div>`

export const title = (kicker, h, sub) => `${STYLE}<div class="sw">${LOGO}<div class="k">${kicker}</div><div class="h1">${h}</div><div class="sub" style="margin-top:26px;max-width:1200px">${sub}</div></div>`

export const problem = () => `${STYLE}<div class="sw">
<div class="k">The decision</div><div class="h2">One forecast, one auction, every morning</div>
<div class="row" style="grid-template-columns:1fr 60px 1fr 60px 1fr 60px 1fr;margin-top:20px">
  ${[['D-1 · 07:30', 'Forecast published', 'Elexon releases a new national wind forecast run (WINDFOR).'],
     ['D-1 · 09:00', 'Desk decides', 'Demand minus expected wind = power to buy.'],
     ['D-1 · 09:20', 'Auction closes', 'GB day-ahead gate closure. The volume is locked in.'],
     ['Day D', 'Wind turns up', 'Metered wind (FUELHH) shows how wrong the forecast was.']]
    .map(([t, h, p], i) => `${i ? '<div class="arrow">→</div>' : ''}<div class="box"><div class="t">${t}</div><h3>${h}</h3><p>${p}</p></div>`).join('')}
</div>
<div class="sub" style="margin-top:46px">WindDesk shows the forecast you could actually trade on — and how wrong it tends to be, in megawatts.</div></div>`

export const summary = () => `${STYLE}<div class="sw">
<div class="k">Pilot findings · January 2026</div><div class="h2">What changes for the desk</div>
<div class="row" style="grid-template-columns:repeat(3,1fr)">
  <div class="box"><div class="big">15 %</div><h3>Forecast ran high</h3><p>Delivered wind came in below the day-ahead forecast in 85 % of hours.</p></div>
  <div class="box"><div class="big">−17 %</div><h3>Error after correction</h3><p>A bias correction using only data known at 09:00 cuts MAE from 2,039 to 1,696 MW.</p></div>
  <div class="box"><div class="big">2.9 GW</div><h3>P90 buffer</h3><p>Covers 90 % of hours on top of the corrected forecast, instead of 4.1 GW on the raw one.</p></div>
</div>
<div style="margin-top:40px"><div class="t">Next steps</div><span class="chip">More months of history</span><span class="chip">Buffer sized by hour of day</span><span class="chip">Prices → buffer in £</span><span class="chip">Live refresh from Elexon</span></div></div>`

export const architecture = () => {
  const n = (t, h, p) => `<div class="box"><div class="t">${t}</div><h3>${h}</h3><p>${p}</p></div>`
  return `${STYLE}<div class="sw"><div class="k">Architecture</div><div class="h2">Small on purpose</div>
<div class="row" style="grid-template-columns:1fr 50px 1fr 50px 1fr 50px 1fr;align-items:stretch">
 ${n('Source', 'Elexon BMRS API', 'WINDFOR forecasts<br>FUELHH actuals (wind)')}<div class="arrow">→</div>
 ${n('backend/ingest.py', 'January snapshot', 'One-off fetch → data/*.json, committed for reproducibility')}<div class="arrow">→</div>
 ${n('backend/core.py + app.py', 'Python domain + FastAPI', 'Pure functions: as-of selection, metrics, bias correction. 3 GET routes.')}<div class="arrow">→</div>
 ${n('frontend/src', 'React + TypeScript', 'TanStack Query, Recharts, Tailwind v4, lucide icons')}
</div>
<div class="row" style="grid-template-columns:1fr 1fr 1fr;margin-top:22px">
 ${n('Run', 'docker compose up', 'nginx serves the SPA and proxies /api to uvicorn')}
 ${n('Deploy', 'Vercel or any VPS', 'Static build + the same FastAPI app as a Python function')}
 ${n('Deliberately absent', 'No DB, no pandas', '~20k rows for one month: stdlib bisect + statistics, fast cold start')}
</div></div>`
}

export const data = () => `${STYLE}<div class="sw"><div class="k">Data, verified against the live API</div><div class="h2">Two datasets, one grain</div>
<table class="d"><tr><th>Dataset</th><th>Resolution</th><th>Published</th><th>Horizon</th><th>Used as</th></tr>
<tr><td><b>WINDFOR</b></td><td>hourly</td><td>8× a day · 02:30 … 22:30 UTC</td><td>~73 h</td><td>forecast vintages (publishTime)</td></tr>
<tr><td><b>FUELHH</b> · WIND</td><td>30 min</td><td>~30 min after each period</td><td>—</td><td>actuals, averaged to the hour</td></tr></table>
<div class="row" style="grid-template-columns:1fr 1fr;margin-top:30px">
<div class="box"><h3>Decision window</h3><p>Decisions on 1–31 Jan 2026 ⇒ delivery days 2 Jan – 1 Feb. Snapshot starts 31 Dec so the first decision has a forecast.</p></div>
<div class="box"><h3>Conventions</h3><p>All times UTC (January: UK = UTC). error = actual − forecast; negative means the desk is short.</p></div>
</div></div>`

export const code = (kicker, h, bullets, src, lang = 'python', file = '') => `${STYLE}<div class="sw"><div class="k">${kicker}</div><div class="h2">${h}</div>
<div class="row" style="grid-template-columns:420px minmax(0,1fr);align-items:start">
<ul class="b">${bullets.map(b => `<li>${b}</li>`).join('')}${file ? `<li style="color:#9aa1ae;font-size:20px">${file}</li>` : ''}</ul>
<pre class="code-col"><code class="language-${lang}">${esc(src)}</code></pre></div></div>`

export const tests = (src, out) => `${STYLE}<div class="sw"><div class="k">Testing</div><div class="h2">Tests pin the behaviour that matters</div>
<div class="row" style="grid-template-columns:minmax(0,1fr);gap:18px">
<pre class="code-col"><code class="language-python">${esc(src)}</code></pre>
<div class="term">${esc(out).replace(/PASSED/g, '<span class="ok">PASSED</span>').replace(/(\d+ passed)/, '<span class="ok">$1</span>')}</div></div></div>`

export const apiFront = src => `${STYLE}<div class="sw"><div class="k">API & front end</div><div class="h2">Thin API, typed client</div>
<div class="row" style="grid-template-columns:repeat(3,1fr);margin-bottom:22px">
${[['GET /api/meta', 'window, delivery days, snapshot info'], ['GET /api/dayahead/{date}', 'hourly rows, run used, every vintage'], ['GET /api/accuracy', 'metrics, buffers, breakdowns, per day']]
  .map(([h, p]) => `<div class="box" style="padding:22px 26px"><h3 style="font-size:24px">${h}</h3><p>${p} · <b>?cutoff=HH:MM</b></p></div>`).join('')}
</div>
<pre class="code-col"><code class="language-typescript">${esc(src)}</code></pre></div>`

export const practices = () => `${STYLE}<div class="sw"><div class="k">Development practices</div><div class="h2">Easy to review, easy to hand over</div>
<div class="row" style="grid-template-columns:repeat(3,1fr)">
${[['Lint & format', 'ruff for Python, oxlint + tsc for the front end'],
   ['CI on every push', 'pytest, ruff, lint, production build, docker build'],
   ['Pure domain core', 'All analysis in core.py; FastAPI and React stay thin'],
   ['Marked shortcuts', '“ponytail:” comments name each limit and its upgrade path'],
   ['Reproducible data', 'Snapshot committed; ingest.py refreshes it in one command'],
   ['AI disclosure', 'Built with Claude as an assistant — stated in the README']]
  .map(([h, p]) => `<div class="box"><h3>${h}</h3><p>${p}</p></div>`).join('')}
</div></div>`

export const closing = () => `${STYLE}<div class="sw"><div class="k">Limits & how to run</div><div class="h2">Known limits, clear next steps</div>
<div class="row" style="grid-template-columns:1fr 1fr;align-items:start">
<ul class="b"><li>One month, national wind only — exactly the brief</li><li>Bias model is a rolling mean; a regression on level and hour would do better</li><li>Snapshot refresh is manual; add a scheduled ingest for live use</li><li>No prices yet, so the buffer is in MW, not £</li></ul>
<div class="term">$ git clone &lt;repo&gt; && cd &lt;repo&gt;
$ docker compose up --build
<span class="ok">✓</span> app  → http://localhost:3000
<span class="ok">✓</span> api  → http://localhost:8000/docs

$ pytest -q && ruff check backend api
<span class="ok">6 passed</span></div></div></div>`
