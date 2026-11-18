"""The single shared path-cost function. No algorithm reports its own cost."""

from __future__ import annotations

from .grid import Cell, Grid
from .heuristic import manhattan


class InvalidPathError(ValueError):
    pass


def validate_path(grid: Grid, path: list[Cell]) -> None:
    """Raise if the path leaves the grid, crosses an impassable cell or jumps."""
    for i, cell in enumerate(path):
        if not grid.is_passable(cell):
            raise InvalidPathError(f"Path step {i} enters impassable cell {cell}.")
        if i and manhattan(path[i - 1], cell) != 1:
            raise InvalidPathError(f"Path step {i} jumps from {path[i - 1]} to {cell}.")


def path_cost(grid: Grid, path: list[Cell]) -> int:
    """Sum of entry costs of every cell entered after the first one."""
    validate_path(grid, path)
    return sum(grid.entry_cost(cell) for cell in path[1:])
