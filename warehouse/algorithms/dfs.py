"""Depth-First Search (graph search, iterative).

LIFO stack instead of recursion, so it cannot hit Python's recursion limit on large
grids. A node is marked visited when it is popped; a cell may sit on the stack more
than once but is expanded at most once, so the search terminates on any finite grid.

Neighbours are pushed in reverse action order so they are explored in the fixed
UP, RIGHT, DOWN, LEFT order. DFS finds *a* route if one exists, but guarantees
neither the fewest moves nor the lowest cost.
"""

from __future__ import annotations

from ..grid import Cell
from ..problem import SearchProblem
from ..result import DISCOVER, EXPAND, GOAL_FOUND, NO_PATH, SearchResult, build_result, reconstruct_path

NAME = "DFS"


def dfs(problem: SearchProblem, trace: bool = False) -> SearchResult:
    start = problem.initial
    # Stack entries: (cell, parent, depth)
    stack: list[tuple[Cell, Cell | None, int]] = [(start, None, 0)]
    parent: dict[Cell, Cell | None] = {}
    expanded = 0
    max_frontier = 1
    explored: list[Cell] = []
    events: list[dict] = []

    while stack:
        node, par, depth = stack.pop()
        if node in parent:  # already expanded via another branch
            continue
        parent[node] = par
        expanded += 1
        if trace:
            explored.append(node)
            events.append({"type": EXPAND, "cell": node, "depth": depth, "frontier": len(stack)})
        if problem.goal_test(node):
            path = reconstruct_path(parent, node)
            if trace:
                events.append({"type": GOAL_FOUND, "cell": node, "path": path})
            return build_result(NAME, problem, path, expanded, max_frontier, explored, events)
        for nxt, _cost in reversed(list(problem.successors(node))):
            if nxt not in parent:
                stack.append((nxt, node, depth + 1))
                if trace:
                    events.append({"type": DISCOVER, "cell": nxt, "parent": node, "depth": depth + 1})
        max_frontier = max(max_frontier, len(stack))

    if trace:
        events.append({"type": NO_PATH})
    return build_result(NAME, problem, [], expanded, max_frontier, explored, events)
