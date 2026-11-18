"""Greedy Best-First Search.

Priority queue ordered by f(n) = h(n) (Manhattan distance to the goal) only; the cost
already paid, g(n), is ignored when choosing what to expand. Ties are broken by
insertion order (a counter), so results are deterministic.

Each cell is pushed at most once (marked reached on push). Fast and often expands few
nodes, but the route it finds is not guaranteed to be shortest or cheapest. Its actual
cost is computed afterwards with the shared path_cost() function.
"""

from __future__ import annotations

import heapq
from itertools import count

from ..grid import Cell
from ..heuristic import manhattan
from ..problem import SearchProblem
from ..result import DISCOVER, EXPAND, GOAL_FOUND, NO_PATH, SearchResult, build_result, reconstruct_path

NAME = "Greedy"


def greedy(problem: SearchProblem, trace: bool = False) -> SearchResult:
    start, goal = problem.initial, problem.goal
    tie = count()
    frontier: list[tuple[int, int, Cell]] = [(manhattan(start, goal), next(tie), start)]
    parent: dict[Cell, Cell | None] = {start: None}
    expanded = 0
    max_frontier = 1
    explored: list[Cell] = []
    events: list[dict] = []

    while frontier:
        h, _, node = heapq.heappop(frontier)
        expanded += 1
        if trace:
            explored.append(node)
            events.append({"type": EXPAND, "cell": node, "h": h, "frontier": len(frontier)})
        if problem.goal_test(node):
            path = reconstruct_path(parent, node)
            if trace:
                events.append({"type": GOAL_FOUND, "cell": node, "path": path})
            return build_result(NAME, problem, path, expanded, max_frontier, explored, events)
        for nxt, _cost in problem.successors(node):
            if nxt not in parent:
                parent[nxt] = node
                h_next = manhattan(nxt, goal)
                heapq.heappush(frontier, (h_next, next(tie), nxt))
                if trace:
                    events.append({"type": DISCOVER, "cell": nxt, "parent": node, "h": h_next})
        max_frontier = max(max_frontier, len(frontier))

    if trace:
        events.append({"type": NO_PATH})
    return build_result(NAME, problem, [], expanded, max_frontier, explored, events)
