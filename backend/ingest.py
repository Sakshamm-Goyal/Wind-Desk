"""One-shot snapshot of Elexon wind actuals + forecasts for the January 2026 decision window.

Decisions made 1-31 Jan 2026 => delivery days 2 Jan - 1 Feb 2026.
We fetch forecasts published from 31 Dec 2025 (so a 1 Jan decision has a vintage)
to 1 Feb 2026, and actuals for the same span.

Run:  python backend/ingest.py
"""

import json
from pathlib import Path

import httpx

BASE = "https://data.elexon.co.uk/bmrs/api/v1/datasets"
FROM, TO = "2025-12-31T00:00Z", "2026-02-02T00:00Z"
DATA = Path(__file__).parent / "data"


def fetch(dataset: str, **params) -> list[dict]:
    # ponytail: stream endpoint returns the whole window in one call; chunk by week if Elexon ever caps it.
    r = httpx.get(f"{BASE}/{dataset}/stream", params={"publishDateTimeFrom": FROM, "publishDateTimeTo": TO, **params}, timeout=120)
    r.raise_for_status()
    return r.json()


def main() -> None:
    DATA.mkdir(exist_ok=True)
    windfor = [{"p": r["publishTime"], "t": r["startTime"], "g": r["generation"]} for r in fetch("WINDFOR")]
    fuelhh = [{"t": r["startTime"], "g": r["generation"]} for r in fetch("FUELHH", fuelType="WIND")]
    (DATA / "windfor.json").write_text(json.dumps(windfor, separators=(",", ":")))
    (DATA / "fuelhh.json").write_text(json.dumps(fuelhh, separators=(",", ":")))
    print(f"windfor rows={len(windfor)} fuelhh rows={len(fuelhh)}")


if __name__ == "__main__":
    main()
