# Demo video script (≤ 10 min, two parts)

Record with Loom/OBS at 1080p, browser at 1440 px wide, app on the deployed URL. Keep the cursor slow. Upload unlisted on YouTube, open the link in an incognito window to verify.

---

## Part 1 — Client pitch (≤ 5 min)

**Audience:** the day-ahead procurement team. Goal: they feel the product understands their job.

| Time | Screen | Say |
|---|---|---|
| 0:00 | Title / app header | "Every morning before 09:20 your desk buys the gap between demand and expected wind for tomorrow. The wind number you act on is a forecast, and in January that forecast was wrong by two gigawatts on an average hour. WindDesk shows you exactly which forecast you were acting on and how much risk to price into the buy." |
| 0:30 | Day-ahead desk, 28 Jan selected | "This is 28 January. At 09:00 on the 27th, the latest forecast available was the 07:30 WINDFOR run — the badge tells you that, and that it was 1.5 hours old. It promised 267 GWh of wind. 138 GWh arrived. Every one of the 24 hours was short; the worst by 6.3 GW. That is the size of thermal you'd have had to find intraday." |
| 1:15 | Tick **All vintages** | "Grey lines are every forecast published later. Waiting wouldn't have saved this day — the forecast only caught up after delivery started. That's why we never show you a later vintage as if you could have used it: the desk is strictly point-in-time." |
| 1:45 | **January at a glance** strip, click a calm day (e.g. 14 Jan), then back | "The strip is the month at a glance. Red bars are days the forecast missed by more than 3 GW. Click any bar to open the day; arrow keys step through." |
| 2:15 | **Procurement cover** card | "Here's the number you asked for. From January's error distribution: to be covered in 90 % of hours, buy about 4.1 GW on top of what the raw forecast implies. Untick bias-adjusted and it rises to 4.1 GW; with it on, it is to 2.9 GW." |
| 2:45 | Untick/tick **Bias-adjusted forecast** (grey dashed line) | "Why? WINDFOR has run about 15 % above metered wind all month — mostly curtailment. We correct it with the average error of the previous seven days ending at D-2, which is everything you actually know at 09:00. Nothing from the future leaks in. It cuts the error on this day from 5.4 to 3.4 GW." |
| 3:15 | **Forecast accuracy** tab, KPI row + violet panel | "Across the month: MAE 2.0 GW, 18 % of average wind, forecast high in 85 % of hours. With the correction: MAE 1.7 GW, bias gone, short only 40 % of hours." |
| 3:45 | **What January tells the desk** panel | Read the four bullets — they're written for the client. Emphasise: "most of the error is structural, not horizon — waiting for a later run buys you 15 %, correcting the bias buys you more." |
| 4:15 | Error by hour of day, vintage ladder | "Nights (02–06 UTC) are the worst hours — that's where the buffer should go. And here's what each later publish would have scored: the 07:30 you must use, in orange, versus every later one." |
| 4:40 | Decision cutoff → 23:00, then back to 09:00 | "If your desk ever trades intraday, change the cutoff and everything recomputes." |
| 4:50 | Close | "Next: more months, a per-hour buffer instead of a flat one, and prices so the buffer becomes a £ number. Questions?" |

---

## Part 2 — Tech lead walkthrough (≤ 5 min)

**Audience:** reviewer. Goal: make the review and knowledge transfer easy.

| Time | Screen | Say |
|---|---|---|
| 5:00 | README → repository layout | "Monorepo: Python FastAPI backend, React/TypeScript frontend, Docker for both, Vercel config, CI. Everything the brief asked for and nothing it didn't — no DB, no pandas, because the window is fixed and the data is 20k rows." |
| 5:30 | `backend/ingest.py` + `backend/data/` | "Data facts I verified against the API before writing code: WINDFOR is hourly, published eight times a day with a 73-hour horizon; FUELHH is half-hourly. The snapshot covers 31 Dec – 1 Feb so every January decision has a vintage, and it's committed so deploys and reviews are reproducible." |
| 6:00 | `backend/core.py` → `as_of`, `decision_time`, `_rows` | "The whole product hinges on one function: `as_of` bisects sorted publish times and returns the last vintage at or before the cutoff. Inclusive boundary, never later. Half-hours are averaged to the hour in `load`. The error convention is at the top of the file." |
| 6:45 | `rolling_bias`, `accuracy`, `lead_curve`, `vintage_ladder` | "Bias correction uses days ending at D-2 — the leak test pins that. `accuracy` pools the as-of pairs for the month. The horizon curve pools every vintage, not just the as-of one, to avoid confounding lead time with hour of day. The vintage ladder is the 'what waiting buys' chart." |
| 7:20 | `backend/tests/test_core.py`, run `pytest` | "Six tests, all on the non-trivial logic: cutoff boundary, no-lookahead, metric signs, hourly aggregation, bias-window leak, and a smoke test on the real snapshot that asserts the 07:30 vintage is chosen." |
| 7:50 | `backend/app.py`, `/docs` | "Routes are thin. OpenAPI at /docs. Cutoff is validated; out-of-window dates 404." |
| 8:10 | `frontend/src/api.ts`, `DayAhead.tsx` | "Typed client plus TanStack Query; queries keyed by date and cutoff, placeholder data keeps the old day on screen. Pages are two components with Recharts; formatting helpers in `ui.tsx`. Tailwind v4 with a handful of CSS tokens." |
| 8:40 | `docker-compose.yml`, `vercel.json`, CI | "`docker compose up` runs nginx-fronted SPA plus uvicorn. Vercel serves the static build and the same FastAPI app as a Python function with `backend/**` bundled. CI runs ruff, pytest, lint, build and a docker build on every push." |
| 9:10 | README → limitations | "Known limits: one month, wind only, simple bias model, manual refresh. The `ponytail:` comments mark deliberate shortcuts and their upgrade path. Total time about 12 hours, AI-assisted — disclosed in the README." |
| 9:40 | End | "Happy to walk through any file in more depth." |

---

## Pre-flight checklist

- [ ] Deployed URL loads in incognito; `/api/health` returns `{"ok":true}`
- [ ] GitHub repo is public with an anonymous name; README links to app + video
- [ ] Video unlisted, ≤ 10 min, both parts ≤ 5 min, link opens in incognito
- [ ] Form submitted with repo, app, video links
