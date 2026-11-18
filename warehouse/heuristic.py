"""Manhattan-distance heuristic used by Greedy Best-First Search and A*.

h(n) = |row_n - row_goal| + |col_n - col_goal|

Admissible (never overestimates): the robot moves only up/down/left/right, so each
move changes the Manhattan distance by at most 1. Reaching the goal therefore needs
at least h(n) moves, and every move costs at least 1 (NORMAL = 1, CROWDED = 4), so
the true remaining cost h*(n) >= h(n).

Consistent (monotone): for any move n -> n' with cost c(n, n') >= 1,
|h(n) - h(n')| = 1 <= c(n, n'), hence h(n) <= c(n, n') + h(n'). This lets A* close a
node the first time it is expanded without losing optimality.
"""

from __future__ import annotations

from .grid import Cell


def manhattan(a: Cell, b: Cell) -> int:
    return abs(a[0] - b[0]) + abs(a[1] - b[1])
