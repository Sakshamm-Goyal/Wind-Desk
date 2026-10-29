# WindDesk — Day-ahead wind forecast desk for a UK utility

## 1. Domain facts (verified against Elexon API, 29 Oct 2026)

| Dataset | Resolution | Cadence | Horizon | Notes |
|---|---|---|---|---|
| FUELHH (fuelType=WIND) | 30 min | published ~30 min after period | — | actual metered wind, MW |
| WINDFOR | 1 hour | 8 publishes/day: 02:30 04:30 07:30 09:30 11:30 15:30 18:30 22:30 UTC | ~73 h (D-1 21:00 → D+2 21:00) | each publish overwrites the whole horizon |

- GB day-ahead auction (N2EX / EPEX GB) gate closure: **09:20 UK**, results ~09:50. January ⇒ UK time == UTC, no DST pain.
- "Latest forecast available at decision time" for delivery day D = the WINDFOR publish with the greatest `publishTime <= D-1 09:00` (default cutoff, user-adjustable). In practice that is the **07:30 publish on D-1**, lead time 14.5–38.5 h.
- Using any later publish is lookahead leakage. The app never does that for the decision view; it shows later vintages only as "what you would have known later".
- "Decisions made in January 2026" ⇒ decision dates 1–31 Jan ⇒ **delivery days 2 Jan – 1 Feb 2026**.
- Actuals are averaged to hourly (mean of the :00 and :30 settlement periods) so forecast and actual share one grain.

## 2. What the trader needs (the two requirements → features)

1. **See the forecast they must act on** → Day-ahead desk: pick delivery day, see the as-of forecast, which vintage it is, how old it is, and the actual overlaid once known.
2. **Quantify the error so they can size the buy** → Accuracy page: MAE / RMSE / bias / MAPE, error by hour-of-day, error by lead time, error by vintage, error distribution, daily table, and a **procurement buffer**: P90 of (actual − forecast) shortfall → "buy forecast − X MW to be covered 90 % of hours".

## 3. Architecture (lazy, no DB, no pandas)

```
repo/
├── api/index.py            Vercel entry: re-exports backend FastAPI app
├── backend/
│   ├── app.py              FastAPI routes (3 endpoints)
│   ├── core.py             pure functions: as-of selection, hourly agg, metrics
│   ├── ingest.py           one-shot fetch from Elexon → data/*.json (committed)
│   ├── data/               windfor.json, fuelhh.json (Jan 2026 snapshot)
│   ├── tests/test_core.py  pytest for the non-trivial logic
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/               Vite + React + TS + Tailwind + Recharts
│   ├── src/ (App, DayAhead, Accuracy, api.ts, charts)
│   ├── Dockerfile          build → nginx (proxies /api → backend)
│   └── nginx.conf
├── docker-compose.yml
├── vercel.json             static frontend + python serverless /api
├── README.md
└── PLAN.md
```

Data is a fixed January snapshot ⇒ fetch once, commit JSON (~1 MB), serve from memory. Re-run `ingest.py` to refresh. No DB, no scheduler. Stdlib `statistics` for metrics; data is ~20k rows.

### API
| Route | Returns |
|---|---|
| `GET /api/meta` | decision window, delivery dates, default cutoff, data snapshot time |
| `GET /api/dayahead/{date}?cutoff=09:00` | hourly rows {time, forecast, actual, error}, vintage used, lead-time, day totals, all vintages for the evolution chart, buffer recommendation |
| `GET /api/accuracy?cutoff=09:00` | overall metrics, by hour-of-day, by lead time, by vintage, percentiles, histogram, per-day table |

### UI
- **Day-ahead desk**: date + cutoff controls → KPI strip (vintage, lead time, forecast MWh, actual MWh, error) → forecast vs actual chart (+ toggle: all vintages) → buffer card.
- **Accuracy**: KPI tiles → error-by-hour bars → MAE-by-lead-time line → error histogram with P10/P50/P90 markers → daily table sorted by |error| → worst-day callout.

## 4. Quality bar
- pytest on `core.py` (as-of selection incl. tie/none cases, hourly agg, metrics).
- Type hints, docstrings on the domain functions, `ponytail:` comments where a ceiling is deliberate.
- README: file tree, run (docker compose up / dev), deploy link, methodology, limitations, AI-tools disclosure.

## 5. Deploy
- Vercel single project: `frontend/dist` static + `api/index.py` (FastAPI on Vercel Python runtime). VPS alternative: `docker compose up -d` behind Caddy.
- Docker compose for local / reviewer.

## 6. Video outline (10 min)
Part 1 client (5 min): the problem (buy at 09:20 D-1 on a forecast) → desk demo on a bad day → accuracy page → "your P90 buffer is X MW; here is what it would have cost in Jan" → next steps.
Part 2 tech lead (5 min): repo tree → data facts → as-of selection in core.py → metrics → tests → compose/vercel → limitations & roadmap.

## 7. Out of scope (say so in README)
Prices, demand, other fuels, live polling, auth, DB. Add when the client wants >1 month or real-time.
