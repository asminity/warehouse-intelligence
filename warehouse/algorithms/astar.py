"""A* Search.

Priority queue ordered by f(n) = g(n) + h(n), where
    g(n) = actual accumulated movement cost from the start,
    h(n) = Manhattan distance to the goal (admissible and consistent here).

Ties on f are broken by smaller h (prefer nodes nearer the goal), then by insertion
order, so the result is deterministic.

Path relaxation: ``best_g`` keeps the cheapest known cost to every cell. A neighbour
is (re-)pushed only when a strictly cheaper g is found; outdated heap entries whose
g is worse than best_g are skipped when popped ("stale entry" handling). Because h is
consistent, a cell's g is final the first time it is expanded, so the closed set
never discards a better path and the returned route has the minimum total cost.
"""

from __future__ import annotations

import heapq
from itertools import count

from ..grid import Cell
from ..heuristic import manhattan
from ..problem import SearchProblem
from ..result import DISCOVER, EXPAND, GOAL_FOUND, NO_PATH, SearchResult, build_result, reconstruct_path

NAME = "A*"


def astar(problem: SearchProblem, trace: bool = False) -> SearchResult:
    start, goal = problem.initial, problem.goal
    tie = count()
    h0 = manhattan(start, goal)
    # Heap entries: (f, h, tie, g, cell)
    frontier: list[tuple[int, int, int, int, Cell]] = [(h0, h0, next(tie), 0, start)]
    best_g: dict[Cell, int] = {start: 0}
    parent: dict[Cell, Cell | None] = {start: None}
    closed: set[Cell] = set()
    expanded = 0
    max_frontier = 1
    explored: list[Cell] = []
    events: list[dict] = []

    while frontier:
        f, h, _, g, node = heapq.heappop(frontier)
        if node in closed or g > best_g[node]:
            continue  # stale entry: a cheaper route to this cell was already found
        closed.add(node)
        expanded += 1
        if trace:
            explored.append(node)
            events.append({"type": EXPAND, "cell": node, "g": g, "h": h, "f": f, "frontier": len(frontier)})
        if problem.goal_test(node):
            path = reconstruct_path(parent, node)
            if trace:
                events.append({"type": GOAL_FOUND, "cell": node, "path": path})
            return build_result(NAME, problem, path, expanded, max_frontier, explored, events)
        for nxt, step in problem.successors(node):
            if nxt in closed:
                continue
            g_next = g + step
            if g_next < best_g.get(nxt, float("inf")):
                best_g[nxt] = g_next
                parent[nxt] = node
                h_next = manhattan(nxt, goal)
                heapq.heappush(frontier, (g_next + h_next, h_next, next(tie), g_next, nxt))
                if trace:
                    events.append({"type": DISCOVER, "cell": nxt, "parent": node,
                                   "g": g_next, "h": h_next, "f": g_next + h_next})
        max_frontier = max(max_frontier, len(frontier))

    if trace:
        events.append({"type": NO_PATH})
    return build_result(NAME, problem, [], expanded, max_frontier, explored, events)
