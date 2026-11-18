"""FastAPI wrapper around the `warehouse` package.

This layer contains NO algorithm logic. Every route, cost, explored cell and replanning
decision is computed by the Python package; the browser only replays the returned events.
The API is stateless: each request carries the full grid, so experiments never share state.

Run:  uvicorn server.app:app --reload        (from the project root)
"""

from __future__ import annotations

import logging
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from warehouse.algorithms import get_algorithm
from warehouse.compare import compare_all, findings, run_algorithm
from warehouse.grid import Grid, InvalidGridError
from warehouse.problem import InvalidProblemError, SearchProblem
from warehouse.simulation import run_trolley_experiment

from .schemas import GridRequest, SearchRequest, TrolleyRequest, grid_out, report_out, result_out

ROOT = Path(__file__).resolve().parent.parent
SCENARIOS = ROOT / "scenarios"
WEB_DIST = ROOT / "web" / "dist"

log = logging.getLogger("warehouse.api")
app = FastAPI(title="Warehouse Intelligence API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(InvalidGridError)
@app.exception_handler(InvalidProblemError)
async def _invalid(_: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(status_code=422, content={"detail": str(exc)})


@app.exception_handler(Exception)
async def _unexpected(_: Request, exc: Exception) -> JSONResponse:
    log.exception("Unhandled error", exc_info=exc)
    return JSONResponse(status_code=500, content={"detail": "Internal server error."})


def _description(path: Path) -> str:
    first = path.read_text(encoding="utf-8").splitlines()[0]
    return first.lstrip("; ").strip() if first.startswith(";") else ""


def _known_problem(grid: Grid) -> tuple[Grid, SearchProblem]:
    known = grid.known_view()
    return known, SearchProblem.from_grid(known)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/scenarios")
def list_scenarios() -> list[dict]:
    out = []
    for p in sorted(SCENARIOS.glob("*.txt")):
        g = Grid.from_file(p)
        out.append({"name": p.stem, "description": _description(p), "rows": g.rows, "cols": g.cols})
    return out


@app.get("/api/scenarios/{name}")
def get_scenario(name: str) -> dict:
    path = SCENARIOS / f"{name}.txt"
    if not name.replace("_", "").isalnum() or not path.exists():
        raise HTTPException(404, f"Scenario {name!r} not found.")
    return grid_out(Grid.from_file(path), _description(path))


@app.post("/api/search")
def search(req: SearchRequest) -> dict:
    """Run one algorithm on the robot's KNOWN map (trolleys are not known yet)."""
    try:
        name, fn = get_algorithm(req.algorithm)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from None
    _, problem = _known_problem(req.to_grid())
    return result_out(run_algorithm(name, fn, problem))


@app.post("/api/compare")
def compare(req: GridRequest) -> dict:
    """Run all four algorithms, each on its own copy of the known map."""
    known, _ = _known_problem(req.to_grid())
    results = compare_all(known)
    return {"results": [result_out(r, events=False) for r in results], "findings": findings(results)}


@app.post("/api/trolley-demo")
def trolley_demo(req: TrolleyRequest) -> dict:
    """Ground truth = submitted grid (with T); the robot starts with T removed."""
    grid = req.to_grid()
    SearchProblem.from_grid(grid.known_view())  # validate start / goal
    return report_out(run_trolley_experiment(grid, sensor_range=req.sensor_range))


# Serve the built frontend (npm run build) from the same origin, if present.
if WEB_DIST.exists():
    app.mount("/assets", StaticFiles(directory=WEB_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str) -> FileResponse:
        if full_path.startswith("api/") or full_path == "api":
            raise HTTPException(404, "Unknown API endpoint.")
        target = WEB_DIST / full_path
        if full_path and target.is_file() and WEB_DIST in target.resolve().parents:
            return FileResponse(target)
        return FileResponse(WEB_DIST / "index.html")
