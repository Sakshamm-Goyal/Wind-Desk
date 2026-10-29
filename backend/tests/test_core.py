from datetime import UTC, date, datetime, time

from backend import core
from backend.core import Dataset, Vintage, accuracy, as_of, dayahead, decision_time, metrics


def H(d, h):
    return datetime(2026, 1, d, h, tzinfo=UTC)


def _ds():
    v1 = Vintage(H(4, 7), {H(5, h): 1000.0 for h in range(24)})  # D-1 07:00, the one a 09:00 cutoff must pick
    v2 = Vintage(H(4, 9), {H(5, h): 1500.0 for h in range(24)})  # D-1 09:00 exactly -> included (<=)
    v3 = Vintage(H(4, 11), {H(5, h): 2000.0 for h in range(24)})  # after cutoff -> must be ignored
    actual = {H(5, h): 900.0 for h in range(24)}
    return Dataset([v1, v2, v3], [v1.published, v2.published, v3.published], actual, (0, 0))


def test_as_of_picks_latest_not_after_cutoff():
    ds = _ds()
    assert as_of(ds, H(4, 8)).published == H(4, 7)
    assert as_of(ds, H(4, 9)).published == H(4, 9)  # inclusive boundary
    assert as_of(ds, H(4, 10)).published == H(4, 9)  # never leaks v3
    assert as_of(ds, H(3, 0)) is None


def test_decision_time_is_day_before():
    assert decision_time(date(2026, 1, 5), time(9, 0)) == H(4, 9)


def test_metrics_signs():
    m = metrics([(1000, 900), (1000, 1100)])
    assert m["mae"] == 100 and m["bias"] == 0 and m["rmse"] == 100
    assert m["max_shortfall"] == 100 and m["max_surplus"] == 100


def test_hourly_aggregation_and_no_lookahead(monkeypatch):
    monkeypatch.setattr(core, "load", lambda: _ds())
    out = dayahead(date(2026, 1, 5), time(8, 0))
    assert out["vintage"] == H(4, 7).isoformat()
    assert all(r["forecast"] == 1000 and r["error"] == -100 for r in out["rows"])
    assert out["metrics"]["max_shortfall"] == 100


def test_real_snapshot_smoke():
    core.load.cache_clear()
    out = accuracy()
    assert out["days"] >= 28
    assert 0 < out["overall"]["mae"] < 5000
    assert out["buffer"]["p90"] >= out["buffer"]["p80"]
    d = dayahead(date(2026, 1, 10))
    assert d["vintage"].endswith("T07:30:00+00:00")  # the 07:30 D-1 publish is the last before the 09:20 gate


def test_rolling_bias_uses_only_days_up_to_d_minus_2(monkeypatch):
    # forecasts 1000 every day, actuals 900 on D-2.. and 0 on D-1 -> D-1 must not influence the bias
    vs, actual = [], {}
    for day in range(1, 10):
        vs.append(Vintage(H(day, 7), {H(day + 1, h): 1000.0 for h in range(24)}))
        actual.update({H(day + 1, h): (0.0 if day + 1 == 9 else 900.0) for h in range(24)})
    ds = Dataset(vs, [v.published for v in vs], actual, (0, 0))
    assert core.rolling_bias(ds, date(2026, 1, 10), time(9, 0)) == -100.0
