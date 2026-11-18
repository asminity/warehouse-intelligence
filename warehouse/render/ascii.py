"""Labeled console rendering of the warehouse grid (plain ASCII, safe on any console)."""

from __future__ import annotations

from ..grid import Cell, CellType, Grid

PATH_MARK = "*"
EXPLORED_MARK = ":"
ROBOT_MARK = "R"
DETECTED_MARK = "!"

LEGEND = (
    "Legend: S start  G destination  . normal(1)  ~ crowded(4)  # shelf  X restricted  "
    "T trolley  * route  : explored  R robot  ! detected trolley"
)


def render(
    grid: Grid,
    path: list[Cell] | None = None,
    explored: list[Cell] | None = None,
    robot: Cell | None = None,
    detected: list[Cell] | None = None,
    hide_trolleys: bool = False,
) -> str:
    """Return the grid as text with row/column labels and optional overlays."""
    canvas = [[c.value for c in row] for row in grid.cells]
    if hide_trolleys:
        for r, c in grid.find(CellType.TROLLEY):
            canvas[r][c] = CellType.NORMAL.value
    keep = {CellType.START.value, CellType.DESTINATION.value}
    for r, c in explored or []:
        if canvas[r][c] not in keep:
            canvas[r][c] = EXPLORED_MARK
    for r, c in path or []:
        if canvas[r][c] not in keep:
            canvas[r][c] = PATH_MARK
    for r, c in detected or []:
        canvas[r][c] = DETECTED_MARK
    if robot is not None:
        canvas[robot[0]][robot[1]] = ROBOT_MARK

    w = len(str(grid.rows - 1))
    tens = " " * (w + 1) + " ".join(str(c // 10) if c >= 10 else " " for c in range(grid.cols))
    ones = " " * (w + 1) + " ".join(str(c % 10) for c in range(grid.cols))
    lines = [tens, ones] if grid.cols > 10 else [ones]
    lines += [f"{r:>{w}} " + " ".join(row) for r, row in enumerate(canvas)]
    return "\n".join(lines)
