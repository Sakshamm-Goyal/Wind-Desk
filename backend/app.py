"""FastAPI surface. Thin: parse params, call core, return JSON."""

from datetime import date, time

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from . import core

app = FastAPI(title="WindDesk API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET"], allow_headers=["*"])


def _cutoff(s: str) -> time:
    try:
        return time.fromisoformat(s)
    except ValueError:
        raise HTTPException(400, "cutoff must be HH:MM") from None


@app.get("/api/meta")
def get_meta():
    return core.meta()


@app.get("/api/dayahead/{delivery}")
def get_dayahead(delivery: date, cutoff: str = Query(core.DEFAULT_CUTOFF.strftime("%H:%M"))):
    if delivery not in core.DELIVERY_DAYS:
        raise HTTPException(404, f"delivery day outside window {core.DELIVERY_DAYS[0]}..{core.DELIVERY_DAYS[-1]}")
    return core.dayahead(delivery, _cutoff(cutoff))


@app.get("/api/accuracy")
def get_accuracy(cutoff: str = Query(core.DEFAULT_CUTOFF.strftime("%H:%M"))):
    return core.accuracy(_cutoff(cutoff))


@app.get("/api/health")
def health():
    return {"ok": True}
