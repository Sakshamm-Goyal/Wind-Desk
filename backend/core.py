"""Domain logic: point-in-time forecast selection and accuracy metrics.

Conventions
-----------
* All times are UTC (January: UK == UTC).
* error     = actual - forecast   (negative => less wind than promised)
* shortfall = forecast - actual   (positive => the trader bought too little; must cover with thermal)
* Grain is hourly: WINDFOR is hourly; FUELHH half-hours are averaged to the hour.
"""

from __future__ import annotations

import json
import math
import statistics
from bisect import bisect_right
from collections import defaultdict
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from functools import lru_cache
from pathlib import Path

DATA = Path(__file__).parent / "data"
UTC = UTC

# Decisions made 1-31 Jan 2026 => delivery days 2 Jan - 1 Feb 2026.
DECISION_FROM, DECISION_TO = date(2026, 1, 1), date(2026, 1, 31)
DELIVERY_DAYS = [DECISION_FROM + timedelta(days=i + 1) for i in range((DECISION_TO - DECISION_FROM).days + 1)]
DEFAULT_CUTOFF = time(9, 0)  # N2EX / EPEX GB day-ahead gate closure is 09:20 UK; 09:00 leaves time to act.


def _dt(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


@dataclass(frozen=True)
class Vintage:
    published: datetime
    values: dict[datetime, float]  # startTime -> MW


@dataclass(frozen=True)
class Dataset:
    vintages: list[Vintage]  # sorted by published
    publish_times: list[datetime]  # parallel list for bisect
    actual: dict[datetime, float]  # hour -> mean MW
    snapshot_rows: tuple[int, int]


@lru_cache(maxsize=1)
def load() -> Dataset:
    raw_f = json.loads((DATA / "windfor.json").read_text())
    raw_a = json.loads((DATA / "fuelhh.json").read_text())

    by_pub: dict[datetime, dict[datetime, float]] = defaultdict(dict)
    for r in raw_f:
        by_pub[_dt(r["p"])][_dt(r["t"])] = float(r["g"])
    vintages = [Vintage(p, by_pub[p]) for p in sorted(by_pub)]

    halves: dict[datetime, list[float]] = defaultdict(list)
    for r in raw_a:
        halves[_dt(r["t"]).replace(minute=0, second=0, microsecond=0)].append(float(r["g"]))
    actual = {h: statistics.fmean(v) for h, v in halves.items()}

    return Dataset(vintages, [v.published for v in vintages], actual, (len(raw_f), len(raw_a)))


def as_of(ds: Dataset, cutoff: datetime) -> Vintage | None:
    """Latest vintage published at or before `cutoff`. This is the only forecast the trader could act on."""
    i = bisect_right(ds.publish_times, cutoff)
    return ds.vintages[i - 1] if i else None


def decision_time(delivery: date, cutoff: time = DEFAULT_CUTOFF) -> datetime:
    return datetime.combine(delivery - timedelta(days=1), cutoff, UTC)


def day_hours(delivery: date) -> list[datetime]:
    start = datetime.combine(delivery, time(0), UTC)
    return [start + timedelta(hours=h) for h in range(24)]


# ---------- metrics ----------


def _pct(xs: list[float], p: float) -> float:
    """Linear-interpolated percentile, p in [0,100]."""
    if not xs:
        return math.nan
    s = sorted(xs)
    k = (len(s) - 1) * p / 100
    lo, hi = math.floor(k), math.ceil(k)
    return s[lo] + (s[hi] - s[lo]) * (k - lo)


def metrics(pairs: list[tuple[float, float]]) -> dict:
    """pairs of (forecast, actual)."""
    if not pairs:
        return {"n": 0}
    errs = [a - f for f, a in pairs]
    abs_errs = [abs(e) for e in errs]
    mean_actual = statistics.fmean(a for _, a in pairs)
    mae = statistics.fmean(abs_errs)
    return {
        "n": len(pairs),
        "mae": round(mae, 1),
        "rmse": round(math.sqrt(statistics.fmean(e * e for e in errs)), 1),
        "bias": round(statistics.fmean(errs), 1),
        "nmae_pct": round(100 * mae / mean_actual, 2) if mean_actual else None,
        "mean_actual": round(mean_actual, 1),
        "max_shortfall": round(-min(errs), 1),
        "max_surplus": round(max(errs), 1),
    }


# ---------- views ----------


def _rows(ds: Dataset, v: Vintage | None, delivery: date) -> list[dict]:
    out = []
    for h in day_hours(delivery):
        f = v.values.get(h) if v else None
        a = ds.actual.get(h)
        out.append(
            {
                "time": h.isoformat(),
                "hour": h.hour,
                "forecast": f,
                "actual": a,
                "error": (a - f) if (f is not None and a is not None) else None,
                "lead_hours": round((h - v.published).total_seconds() / 3600, 1) if v else None,
            }
        )
    return out


BIAS_WINDOW_DAYS = 7


def rolling_bias(ds: Dataset, delivery: date, cutoff: time, window: int = BIAS_WINDOW_DAYS) -> float | None:
    """Mean error (actual - forecast) of the as-of forecasts for the `window` delivery days ending at D-2.

    Leak-free: at D-1 09:00 the trader has complete actuals only up to D-2.
    ponytail: recomputes prior days each call; memoise per (day, cutoff) if the window grows beyond a month.
    """
    errs: list[float] = []
    for back in range(2, 2 + window):
        d = delivery - timedelta(days=back)
        v = as_of(ds, decision_time(d, cutoff))
        errs += [r["error"] for r in _rows(ds, v, d) if r["error"] is not None]
    return statistics.fmean(errs) if errs else None


def dayahead(delivery: date, cutoff: time = DEFAULT_CUTOFF) -> dict:
    ds = load()
    at = decision_time(delivery, cutoff)
    v = as_of(ds, at)
    rows = _rows(ds, v, delivery)
    bias_adj = rolling_bias(ds, delivery, cutoff)
    for r in rows:
        r["adjusted"] = round(r["forecast"] + bias_adj, 1) if (r["forecast"] is not None and bias_adj is not None) else None
    pairs = [(r["forecast"], r["actual"]) for r in rows if r["error"] is not None]
    m = metrics(pairs)
    m_adj = metrics([(r["adjusted"], r["actual"]) for r in rows if r["error"] is not None and r["adjusted"] is not None])

    # Every vintage that covers this delivery day and was published before the day ends: "what you'd know later".
    day_end = datetime.combine(delivery, time(23), UTC)
    hours = day_hours(delivery)
    evolution = [
        {
            "published": x.published.isoformat(),
            "values": [x.values.get(h) for h in hours],
            "is_decision": v is not None and x.published == v.published,
            "label": _vintage_label(x.published, delivery),
        }
        for x in ds.vintages
        if x.published <= day_end and any(h in x.values for h in hours)
    ]
    return {
        "delivery_date": delivery.isoformat(),
        "decision_time": at.isoformat(),
        "vintage": v.published.isoformat() if v else None,
        "vintage_age_hours": round((at - v.published).total_seconds() / 3600, 1) if v else None,
        "rows": rows,
        "forecast_mwh": round(sum(r["forecast"] for r in rows if r["forecast"] is not None)),
        "actual_mwh": round(sum(r["actual"] for r in rows if r["actual"] is not None)),
        "metrics": m,
        "bias_adjustment": round(bias_adj, 1) if bias_adj is not None else None,
        "adjusted_metrics": m_adj,
        "evolution": evolution,
    }


def _vintage_label(published: datetime, delivery: date) -> str:
    d = (published.date() - delivery).days
    rel = "D" if d == 0 else f"D{d:+d}"
    return f"{rel} {published:%H:%M}"


def accuracy(cutoff: time = DEFAULT_CUTOFF) -> dict:
    ds = load()
    pooled: list[tuple[float, float]] = []
    pooled_adj: list[tuple[float, float]] = []
    by_hour: dict[int, list] = defaultdict(list)
    per_day = []
    for d in DELIVERY_DAYS:
        at = decision_time(d, cutoff)
        v = as_of(ds, at)
        rows = _rows(ds, v, d)
        pairs = [(r["forecast"], r["actual"]) for r in rows if r["error"] is not None]
        if not pairs:
            continue
        bias_adj = rolling_bias(ds, d, cutoff)
        if bias_adj is not None:
            pooled_adj += [(f + bias_adj, a) for f, a in pairs]
        for r in rows:
            if r["error"] is None:
                continue
            p = (r["forecast"], r["actual"])
            pooled.append(p)
            by_hour[r["hour"]].append(p)
        m = metrics(pairs)
        per_day.append(
            {
                "date": d.isoformat(),
                "vintage": v.published.isoformat() if v else None,
                "forecast_mwh": round(sum(f for f, _ in pairs)),
                "actual_mwh": round(sum(a for _, a in pairs)),
                **{k: m[k] for k in ("mae", "bias", "max_shortfall", "nmae_pct")},
                "bias_adjustment": round(bias_adj, 1) if bias_adj is not None else None,
            }
        )

    errs = [a - f for f, a in pooled]
    shortfalls = [f - a for f, a in pooled]
    shortfalls_adj = [f - a for f, a in pooled_adj]
    bin_w = 500
    hist: dict[int, int] = defaultdict(int)
    for e in errs:
        hist[int(math.floor(e / bin_w)) * bin_w] += 1

    return {
        "cutoff": cutoff.strftime("%H:%M"),
        "days": len(per_day),
        "overall": metrics(pooled),
        "adjusted": metrics(pooled_adj),  # same forecasts + rolling 7-day bias correction known at decision time
        "percentiles": {f"p{p}": round(_pct(errs, p), 1) for p in (5, 10, 25, 50, 75, 90, 95)},
        "buffer": {  # MW to buy on top of the forecast-implied thermal need, so wind shortfall is covered X% of hours
            "p80": round(max(0.0, _pct(shortfalls, 80)), 1),
            "p90": round(max(0.0, _pct(shortfalls, 90)), 1),
            "p95": round(max(0.0, _pct(shortfalls, 95)), 1),
            "share_hours_short": round(100 * sum(s > 0 for s in shortfalls) / len(shortfalls), 1) if shortfalls else None,
        },
        "buffer_adjusted": {
            "p80": round(max(0.0, _pct(shortfalls_adj, 80)), 1),
            "p90": round(max(0.0, _pct(shortfalls_adj, 90)), 1),
            "p95": round(max(0.0, _pct(shortfalls_adj, 95)), 1),
            "share_hours_short": round(100 * sum(s > 0 for s in shortfalls_adj) / len(shortfalls_adj), 1) if shortfalls_adj else None,
        },
        "by_hour": [{"hour": h, **metrics(by_hour[h])} for h in range(24)],
        "by_lead": lead_curve(ds),
        "by_vintage": vintage_ladder(ds),
        "histogram": [{"bin_start": k, "count": hist[k]} for k in sorted(hist)],
        "per_day": per_day,
        "worst_day": max(per_day, key=lambda r: r["mae"]) if per_day else None,
    }


def lead_curve(ds: Dataset) -> list[dict]:
    """MAE vs forecast horizon using every vintage and every delivery hour in the window (not just the as-of one).

    Pooling all vintages removes the hour-of-day confound a single daily vintage would have.
    """
    lo, hi = datetime.combine(DELIVERY_DAYS[0], time(0), UTC), datetime.combine(DELIVERY_DAYS[-1], time(23), UTC)
    by_lead: dict[int, list] = defaultdict(list)
    for v in ds.vintages:
        for h, f in v.values.items():
            if lo <= h <= hi and h in ds.actual and h > v.published:
                by_lead[int((h - v.published).total_seconds() // 3600)].append((f, ds.actual[h]))
    return [{"lead_hours": k, **metrics(by_lead[k])} for k in sorted(by_lead) if len(by_lead[k]) >= 20]


def vintage_ladder(ds: Dataset) -> list[dict]:
    """MAE of each daily publish slot (D-1 02:30 ... D 02:30) for the next delivery day.

    Shows what accuracy the trader gives up by committing at the day-ahead gate instead of waiting.
    """
    slots: dict[str, list] = defaultdict(list)
    order: dict[str, tuple[int, int]] = {}
    for d in DELIVERY_DAYS:
        hours = day_hours(d)
        for v in ds.vintages:
            rel = (v.published.date() - d).days
            if rel not in (-1, 0) or v.published > datetime.combine(d, time(23), UTC):
                continue
            label = _vintage_label(v.published, d)
            order[label] = (rel, v.published.hour * 60 + v.published.minute)
            slots[label].extend((v.values[h], ds.actual[h]) for h in hours if h in v.values and h in ds.actual)
    return [{"label": k, **metrics(slots[k])} for k in sorted(slots, key=order.get) if len(slots[k]) >= 10 * 24]


def meta() -> dict:
    ds = load()
    return {
        "decision_window": [DECISION_FROM.isoformat(), DECISION_TO.isoformat()],
        "delivery_days": [d.isoformat() for d in DELIVERY_DAYS if any(h in ds.actual for h in day_hours(d))],
        "default_cutoff": DEFAULT_CUTOFF.strftime("%H:%M"),
        "gate_closure": "09:20",
        "snapshot": {
            "windfor_rows": ds.snapshot_rows[0],
            "fuelhh_rows": ds.snapshot_rows[1],
            "first_publish": ds.publish_times[0].isoformat(),
            "last_publish": ds.publish_times[-1].isoformat(),
        },
    }
