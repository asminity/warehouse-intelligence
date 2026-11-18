"""Formal search-problem definition (Task 2).

State            the robot's cell ``(row, col)``.
Initial state    START, or the robot's current cell when it replans.
Actions          UP, RIGHT, DOWN, LEFT (always generated in this order). An action is
                 legal when the resulting cell is inside the grid and passable.
Transition       RESULT((r, c), UP) = (r - 1, c), and so on for the other directions.
Goal test        state == DESTINATION.
Path cost        sum of the entry costs of every cell entered after the initial one
                 (NORMAL = 1, CROWDED = 4).
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Iterator

from .grid import Cell, Grid


class Action(Enum):
    UP = (-1, 0)
    RIGHT = (0, 1)
    DOWN = (1, 0)
    LEFT = (0, -1)


#: Fixed action order: makes every algorithm deterministic and reproducible.
ACTION_ORDER: tuple[Action, ...] = (Action.UP, Action.RIGHT, Action.DOWN, Action.LEFT)


class InvalidProblemError(ValueError):
    """Raised when start/goal are outside the grid or inside an impassable cell."""


@dataclass(frozen=True)
class SearchProblem:
    grid: Grid
    initial: Cell
    goal: Cell

    @classmethod
    def from_grid(cls, grid: Grid, initial: Cell | None = None, goal: Cell | None = None) -> "SearchProblem":
        problem = cls(grid, grid.start if initial is None else initial, grid.goal if goal is None else goal)
        problem.validate()
        return problem

    def validate(self) -> None:
        for label, cell in (("Start", self.initial), ("Destination", self.goal)):
            if not self.grid.in_bounds(cell):
                raise InvalidProblemError(
                    f"{label} {cell} is outside the {self.grid.rows}x{self.grid.cols} grid."
                )
            if not self.grid.is_passable(cell):
                raise InvalidProblemError(
                    f"{label} {cell} is inside an impassable {self.grid.cell_type(cell).label} cell."
                )

    def actions(self, state: Cell) -> list[Action]:
        return [a for a in ACTION_ORDER if self.grid.is_passable(self.result(state, a))]

    @staticmethod
    def result(state: Cell, action: Action) -> Cell:
        dr, dc = action.value
        return (state[0] + dr, state[1] + dc)

    def goal_test(self, state: Cell) -> bool:
        return state == self.goal

    def step_cost(self, state: Cell, action: Action, next_state: Cell) -> int:
        return self.grid.entry_cost(next_state)

    def successors(self, state: Cell) -> Iterator[tuple[Cell, int]]:
        """Yield ``(next_state, step_cost)`` in the fixed action order."""
        for action in self.actions(state):
            nxt = self.result(state, action)
            yield nxt, self.step_cost(state, action, nxt)
