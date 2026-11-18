"""Warehouse grid: cell types, movement costs, parsing and validation.

A warehouse is a rectangular grid of single-character cells:

    .  NORMAL       passable, entry cost 1
    ~  CROWDED      passable, entry cost 4
    #  SHELF        impassable
    X  RESTRICTED   impassable
    S  START        passable, entry cost 1 (exactly one per map)
    G  DESTINATION  passable, entry cost 1 (exactly one per map)
    T  TROLLEY      impassable in the *ground truth*; absent from the robot's
                    initial *known* map (see ``Grid.known_view``)

Coordinates are ``(row, col)`` with ``(0, 0)`` at the top-left.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path

Cell = tuple[int, int]


class CellType(str, Enum):
    NORMAL = "."
    CROWDED = "~"
    SHELF = "#"
    RESTRICTED = "X"
    START = "S"
    DESTINATION = "G"
    TROLLEY = "T"

    @property
    def label(self) -> str:
        return self.name.capitalize()


#: Cost of *entering* a cell. ``None`` means the cell is impassable.
ENTRY_COST: dict[CellType, int | None] = {
    CellType.NORMAL: 1,
    CellType.CROWDED: 4,
    CellType.SHELF: None,
    CellType.RESTRICTED: None,
    CellType.START: 1,
    CellType.DESTINATION: 1,
    CellType.TROLLEY: None,
}

#: Minimum entry cost of any passable cell. Manhattan distance is admissible
#: because every move costs at least this much.
MIN_STEP_COST = min(c for c in ENTRY_COST.values() if c is not None)


class InvalidGridError(ValueError):
    """Raised when a warehouse map is malformed."""


@dataclass
class Grid:
    """A mutable warehouse map."""

    cells: list[list[CellType]]
    name: str = "warehouse"
    start: Cell = field(init=False)
    goal: Cell = field(init=False)

    def __post_init__(self) -> None:
        if not self.cells or not self.cells[0]:
            raise InvalidGridError("Grid must have at least one row and one column.")
        width = len(self.cells[0])
        if any(len(row) != width for row in self.cells):
            raise InvalidGridError("Grid rows must all have the same length.")
        starts = self.find(CellType.START)
        goals = self.find(CellType.DESTINATION)
        if len(starts) != 1:
            raise InvalidGridError(f"Grid must contain exactly one START 'S' (found {len(starts)}).")
        if len(goals) != 1:
            raise InvalidGridError(f"Grid must contain exactly one DESTINATION 'G' (found {len(goals)}).")
        self.start = starts[0]
        self.goal = goals[0]

    # ------------------------------------------------------------------ parsing
    @classmethod
    def from_string(cls, text: str, name: str = "warehouse") -> "Grid":
        rows: list[list[CellType]] = []
        for line_no, raw in enumerate(text.splitlines(), start=1):
            line = raw.strip()
            if not line or line.startswith(";"):  # blank lines and ';' comments are ignored
                continue
            row: list[CellType] = []
            for ch in line:
                try:
                    row.append(CellType(ch))
                except ValueError:
                    raise InvalidGridError(f"Unknown cell symbol {ch!r} on line {line_no}.") from None
            rows.append(row)
        return cls(rows, name=name)

    @classmethod
    def from_file(cls, path: str | Path) -> "Grid":
        path = Path(path)
        return cls.from_string(path.read_text(encoding="utf-8"), name=path.stem)

    def to_string(self) -> str:
        return "\n".join("".join(c.value for c in row) for row in self.cells)

    # ------------------------------------------------------------------ queries
    @property
    def rows(self) -> int:
        return len(self.cells)

    @property
    def cols(self) -> int:
        return len(self.cells[0])

    def in_bounds(self, cell: Cell) -> bool:
        r, c = cell
        return 0 <= r < self.rows and 0 <= c < self.cols

    def cell_type(self, cell: Cell) -> CellType:
        r, c = cell
        return self.cells[r][c]

    def is_passable(self, cell: Cell) -> bool:
        return self.in_bounds(cell) and ENTRY_COST[self.cell_type(cell)] is not None

    def entry_cost(self, cell: Cell) -> int:
        cost = ENTRY_COST[self.cell_type(cell)]
        if cost is None:
            raise ValueError(f"Cell {cell} ({self.cell_type(cell).label}) is impassable.")
        return cost

    def find(self, kind: CellType) -> list[Cell]:
        return [(r, c) for r, row in enumerate(self.cells) for c, t in enumerate(row) if t == kind]

    def count_passable(self) -> int:
        return sum(self.is_passable((r, c)) for r in range(self.rows) for c in range(self.cols))

    # ------------------------------------------------------------------ edits
    def copy(self) -> "Grid":
        return Grid([row[:] for row in self.cells], name=self.name)

    def set_cell(self, cell: Cell, kind: CellType) -> None:
        if not self.in_bounds(cell):
            raise InvalidGridError(f"Cell {cell} is outside the {self.rows}x{self.cols} grid.")
        if kind in (CellType.START, CellType.DESTINATION):
            raise InvalidGridError("Move START/DESTINATION with move_start/move_goal.")
        if cell in (self.start, self.goal):
            raise InvalidGridError("Cannot overwrite the START or DESTINATION cell.")
        r, c = cell
        self.cells[r][c] = kind

    def known_view(self) -> "Grid":
        """The robot's initial knowledge: the same map with every trolley removed.

        Trolleys exist physically (ground truth) but the robot does not know about
        them until its sensor detects one.
        """
        known = self.copy()
        for r, c in self.find(CellType.TROLLEY):
            known.cells[r][c] = CellType.NORMAL
        return known
