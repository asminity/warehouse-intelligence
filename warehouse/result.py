"""Structured search results and the search-event trace."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any

from .grid import Cell
from .path_cost import path_cost
from .problem import SearchProblem

#: Event types emitted when tracing is on.
EXPAND = "NODE_EXPANDED"
DISCOVER = "NODE_DISCOVERED"
GOAL_FOUND = "GOAL_FOUND"
NO_PATH = "NO_PATH"


@dataclass
class SearchResult:
    algorithm: str
    goal_reached: bool
    path: list[Cell]
    path_length: int | None  # number of moves, None if no route
    total_cost: int | None  # computed by path_cost(), None if no route
    nodes_expanded: int
    max_frontier_size: int
    execution_time_ms: float = 0.0
    explored: list[Cell] = field(default_factory=list)  # expansion order (traced runs only)
    events: list[dict[str, Any]] = field(default_factory=list)  # traced runs only
    message: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def reconstruct_path(parent: dict[Cell, Cell | None], goal: Cell) -> list[Cell]:
    path: list[Cell] = []
    node: Cell | None = goal
    while node is not None:
        path.append(node)
        node = parent[node]
    path.reverse()
    return path


def build_result(
    algorithm: str,
    problem: SearchProblem,
    path: list[Cell],
    nodes_expanded: int,
    max_frontier: int,
    explored: list[Cell],
    events: list[dict[str, Any]],
) -> SearchResult:
    if path:
        cost = path_cost(problem.grid, path)
        return SearchResult(
            algorithm, True, path, len(path) - 1, cost, nodes_expanded, max_frontier,
            explored=explored, events=events,
            message=f"Route found: {len(path) - 1} moves, cost {cost}.",
        )
    return SearchResult(
        algorithm, False, [], None, None, nodes_expanded, max_frontier,
        explored=explored, events=events,
        message=f"No route exists from {problem.initial} to {problem.goal}.",
    )
