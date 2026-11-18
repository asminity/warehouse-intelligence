"""Pydantic request models and response serialisers for the web API."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, field_validator

from warehouse.grid import Grid
from warehouse.result import SearchResult
from warehouse.simulation import ReplanReport

MAX_SIDE = 60


class GridRequest(BaseModel):
    grid: list[str] = Field(..., description="Map rows using . ~ # X S G T", min_length=1, max_length=MAX_SIDE)

    @field_validator("grid")
    @classmethod
    def _shape(cls, rows: list[str]) -> list[str]:
        if any(len(r) > MAX_SIDE for r in rows):
            raise ValueError(f"Grid may be at most {MAX_SIDE} columns wide.")
        return rows

    def to_grid(self, name: str = "custom") -> Grid:
        return Grid.from_string("\n".join(self.grid), name=name)


class SearchRequest(GridRequest):
    algorithm: str = Field("astar", description="bfs | dfs | greedy | astar")


class TrolleyRequest(GridRequest):
    sensor_range: int = Field(1, ge=1, le=5)


def cell(c: tuple[int, int]) -> list[int]:
    return [c[0], c[1]]


def _event(e: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for k, v in e.items():
        if isinstance(v, tuple):
            out[k] = list(v)
        elif isinstance(v, list):
            out[k] = [list(x) if isinstance(x, tuple) else x for x in v]
        else:
            out[k] = v
    return out


def result_out(r: SearchResult, events: bool = True) -> dict[str, Any]:
    return {
        "algorithm": r.algorithm,
        "goal_reached": r.goal_reached,
        "path": [cell(c) for c in r.path],
        "path_length": r.path_length,
        "total_cost": r.total_cost,
        "nodes_expanded": r.nodes_expanded,
        "max_frontier_size": r.max_frontier_size,
        "execution_time_ms": round(r.execution_time_ms, 4),
        "explored": [cell(c) for c in r.explored],
        "events": [_event(e) for e in r.events] if events else [],
        "message": r.message,
    }


def grid_out(g: Grid, description: str = "") -> dict[str, Any]:
    from warehouse.grid import CellType

    return {
        "name": g.name,
        "description": description,
        "rows": g.rows,
        "cols": g.cols,
        "grid": g.to_string().splitlines(),
        "start": cell(g.start),
        "goal": cell(g.goal),
        "trolleys": [cell(t) for t in g.find(CellType.TROLLEY)],
    }


def report_out(rep: ReplanReport) -> dict[str, Any]:
    return {
        "scenario": rep.scenario,
        "start": cell(rep.start),
        "goal": cell(rep.goal),
        "initial_plan": result_out(rep.initial_plan),
        "detections": [
            {
                "step": d.step,
                "robot_position": cell(d.robot_position),
                "obstacle": cell(d.obstacle),
                "replan": result_out(d.replan),
            }
            for d in rep.detections
        ],
        "executed_path": [cell(c) for c in rep.executed_path],
        "goal_reached": rep.goal_reached,
        "replans": rep.replans,
        "executed_moves": rep.executed_moves,
        "executed_cost": rep.executed_cost,
        "total_nodes_expanded": rep.total_nodes_expanded,
        "events": [_event(e) for e in rep.events],
        "message": rep.message,
    }
