"""Breadth-First Search.

FIFO queue, nodes marked as reached when they are enqueued so each cell enters the
queue at most once. Explores level by level, so the first time the goal is expanded
the path has the minimum number of MOVES. It ignores cell costs, so on a weighted
warehouse that path is NOT necessarily the cheapest one.

For comparability with the other algorithms the goal test is applied when a node is
expanded (popped), not when it is generated.
"""

from __future__ import annotations

from collections import deque

from ..grid import Cell
from ..problem import SearchProblem
from ..result import DISCOVER, EXPAND, GOAL_FOUND, NO_PATH, SearchResult, build_result, reconstruct_path

NAME = "BFS"


def bfs(problem: SearchProblem, trace: bool = False) -> SearchResult:
    start = problem.initial
    frontier: deque[Cell] = deque([start])
    parent: dict[Cell, Cell | None] = {start: None}
    depth: dict[Cell, int] = {start: 0}
    expanded = 0
    max_frontier = 1
    explored: list[Cell] = []
    events: list[dict] = []

    while frontier:
        node = frontier.popleft()
        expanded += 1
        if trace:
            explored.append(node)
            events.append({"type": EXPAND, "cell": node, "depth": depth[node], "frontier": len(frontier)})
        if problem.goal_test(node):
            path = reconstruct_path(parent, node)
            if trace:
                events.append({"type": GOAL_FOUND, "cell": node, "path": path})
            return build_result(NAME, problem, path, expanded, max_frontier, explored, events)
        for nxt, _cost in problem.successors(node):
            if nxt not in parent:
                parent[nxt] = node
                depth[nxt] = depth[node] + 1
                frontier.append(nxt)
                if trace:
                    events.append({"type": DISCOVER, "cell": nxt, "parent": node, "depth": depth[nxt]})
        max_frontier = max(max_frontier, len(frontier))

    if trace:
        events.append({"type": NO_PATH})
    return build_result(NAME, problem, [], expanded, max_frontier, explored, events)
