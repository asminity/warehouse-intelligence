"""Shared test utilities: an independent Dijkstra oracle and a random-grid generator."""

from __future__ import annotations

import heapq
import random

from warehouse.grid import Cell, CellType, Grid
from warehouse.heuristic import manhattan
from warehouse.problem import SearchProblem


def dijkstra(problem: SearchProblem, unit_cost: bool = False) -> int | None:
    """Reference uniform-cost search, written independently of the algorithms under test."""
    dist: dict[Cell, int] = {problem.initial: 0}
    heap = [(0, problem.initial)]
    while heap:
        d, node = heapq.heappop(heap)
        if node == problem.goal:
            return d
        if d > dist[node]:
            continue
        r, c = node
        for nxt in ((r - 1, c), (r, c + 1), (r + 1, c), (r, c - 1)):
            if problem.grid.is_passable(nxt):
                nd = d + (1 if unit_cost else problem.grid.entry_cost(nxt))
                if nd < dist.get(nxt, 1 << 30):
                    dist[nxt] = nd
                    heapq.heappush(heap, (nd, nxt))
    return None


def random_grid(seed: int, rows: int = 12, cols: int = 16) -> Grid:
    rng = random.Random(seed)
    weights = [(CellType.NORMAL, 55), (CellType.CROWDED, 20), (CellType.SHELF, 18), (CellType.RESTRICTED, 7)]
    kinds, w = zip(*weights)
    cells = [[rng.choices(kinds, w)[0] for _ in range(cols)] for _ in range(rows)]
    start = (rng.randrange(rows), rng.randrange(cols))
    goal = start
    while manhattan(start, goal) < (rows + cols) // 3:
        goal = (rng.randrange(rows), rng.randrange(cols))
    cells[start[0]][start[1]] = CellType.START
    cells[goal[0]][goal[1]] = CellType.DESTINATION
    return Grid(cells, name=f"random{seed}")


def assert_valid_path(grid: Grid, path: list[Cell], start: Cell, goal: Cell) -> None:
    assert path[0] == start and path[-1] == goal
    for a, b in zip(path, path[1:]):
        assert manhattan(a, b) == 1, f"jump {a}->{b}"
    for cell in path:
        assert grid.is_passable(cell), f"path enters impassable {cell}"
