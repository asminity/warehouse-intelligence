"""Matplotlib figures and animations. Everything drawn here comes from real results."""

from __future__ import annotations

from pathlib import Path

import matplotlib
import numpy as np

from ..grid import Cell, CellType, Grid
from ..result import SearchResult
from ..simulation import ReplanReport

# Palette (dark industrial)
BG = "#11151c"
FLOOR = "#2a313c"
CROWDED = "#7a5a1e"
SHELF = "#5b6573"
RESTRICTED = "#6e2a2a"
START = "#2bb673"
GOAL = "#f2a900"
TROLLEY = "#e5484d"
PATH = "#3ea6ff"
REVISED = "#f2a900"
TEXT = "#d7dde6"
ALGO_COLORS = {"BFS": "#3ea6ff", "DFS": "#b07cff", "Greedy": "#f2a900", "A*": "#2bb673"}

_CODES = {CellType.NORMAL: 0, CellType.CROWDED: 1, CellType.SHELF: 2, CellType.RESTRICTED: 3,
          CellType.START: 4, CellType.DESTINATION: 5, CellType.TROLLEY: 6}
_COLORS = [FLOOR, CROWDED, SHELF, RESTRICTED, START, GOAL, TROLLEY]


def _plt():
    import matplotlib.pyplot as plt

    return plt


def use_headless() -> None:
    matplotlib.use("Agg")


def grid_matrix(grid: Grid, hide_trolleys: bool) -> np.ndarray:
    m = np.array([[_CODES[c] for c in row] for row in grid.cells])
    if hide_trolleys:
        m[m == _CODES[CellType.TROLLEY]] = _CODES[CellType.NORMAL]
    return m


def draw_grid(ax, grid: Grid, hide_trolleys: bool = True, title: str | None = None) -> None:
    from matplotlib.colors import ListedColormap

    ax.set_facecolor(BG)
    ax.imshow(grid_matrix(grid, hide_trolleys), cmap=ListedColormap(_COLORS), vmin=0, vmax=6,
              interpolation="nearest")
    ax.set_xticks(range(grid.cols))
    ax.set_yticks(range(grid.rows))
    ax.tick_params(colors=TEXT, labelsize=6, length=0)
    ax.set_xticks(np.arange(-0.5, grid.cols), minor=True)
    ax.set_yticks(np.arange(-0.5, grid.rows), minor=True)
    ax.grid(which="minor", color=BG, linewidth=0.8)
    ax.tick_params(which="minor", length=0)
    for (r, c), label in ((grid.start, "S"), (grid.goal, "G")):
        ax.text(c, r, label, ha="center", va="center", color=BG, fontsize=8, fontweight="bold")
    for spine in ax.spines.values():
        spine.set_visible(False)
    if title:
        ax.set_title(title, color=TEXT, fontsize=10, loc="left")


def explored_cmap():
    """Dark teal (expanded early) -> bright cyan (expanded late); never grey like shelves."""
    from matplotlib.colors import LinearSegmentedColormap

    return LinearSegmentedColormap.from_list("explored", ["#14405a", "#1f78a8", "#5fd0ff"])


def draw_explored(ax, grid: Grid, explored: list[Cell]) -> None:
    """Shade expanded cells by expansion order (early = dim, late = bright)."""
    if not explored:
        return
    heat = np.full((grid.rows, grid.cols), np.nan)
    for i, (r, c) in enumerate(explored):
        heat[r, c] = i
    ax.imshow(heat, cmap=explored_cmap(), alpha=0.75, interpolation="nearest", vmin=0, vmax=len(explored))


def draw_path(ax, path: list[Cell], color: str = PATH, lw: float = 2.6, ls: str = "-", label: str | None = None) -> None:
    if len(path) < 2:
        return
    ys, xs = zip(*path)
    ax.plot(xs, ys, color=color, linewidth=lw, linestyle=ls, solid_capstyle="round", label=label)


def draw_robot(ax, cell: Cell) -> None:
    ax.scatter([cell[1]], [cell[0]], s=140, c="#ffffff", edgecolors=PATH, linewidths=2.5, zorder=5)


def draw_trolley(ax, cell: Cell, known: bool) -> None:
    ax.scatter([cell[1]], [cell[0]], s=170, marker="X", c=TROLLEY if known else "none",
               edgecolors=TROLLEY, linewidths=1.8, zorder=6)


def legend_handles():
    from matplotlib.patches import Patch

    items = [("Normal (1)", FLOOR), ("Crowded (4)", CROWDED), ("Shelf", SHELF), ("Restricted", RESTRICTED),
             ("Start", START), ("Destination", GOAL), ("Trolley", TROLLEY)]
    return [Patch(facecolor=c, edgecolor="#000000", label=n) for n, c in items]


def _figure(nrows: int, ncols: int, grid: Grid, extra_h: float = 0.9):
    plt = _plt()
    cell = 0.32
    w = max(6.0, ncols * (grid.cols * cell + 0.8))
    h = nrows * (grid.rows * cell + extra_h) + 0.6
    fig, axes = plt.subplots(nrows, ncols, figsize=(w, h), squeeze=False)
    fig.patch.set_facecolor(BG)
    return fig, axes


def _add_legend(fig) -> None:
    fig.legend(handles=legend_handles(), loc="lower center", ncol=7, fontsize=7, frameon=False,
               labelcolor=TEXT)


def _caption(r: SearchResult) -> str:
    if not r.goal_reached:
        return f"{r.algorithm}: no route found  |  expanded {r.nodes_expanded}"
    return f"{r.algorithm}: {r.path_length} moves, cost {r.total_cost}  |  expanded {r.nodes_expanded}"


def figure_route(grid: Grid, r: SearchResult):
    fig, axes = _figure(1, 1, grid)
    ax = axes[0][0]
    draw_grid(ax, grid, title=_caption(r))
    draw_explored(ax, grid, r.explored)
    draw_path(ax, r.path, ALGO_COLORS.get(r.algorithm, PATH))
    _add_legend(fig)
    fig.tight_layout(rect=(0, 0.06, 1, 1))
    return fig


def figure_all_routes(grid: Grid, results: list[SearchResult]):
    fig, axes = _figure(2, 2, grid)
    for ax, r in zip(axes.flat, results):
        draw_grid(ax, grid, title=_caption(r))
        draw_explored(ax, grid, r.explored)
        draw_path(ax, r.path, ALGO_COLORS.get(r.algorithm, PATH))
    fig.suptitle(f"Routes and explored cells — {grid.name}", color=TEXT, fontsize=12)
    _add_legend(fig)
    fig.tight_layout(rect=(0, 0.04, 1, 0.97), h_pad=3.0)
    return fig


def figure_trolley(truth: Grid, rep: ReplanReport):
    """Three panels: initial plan / detection moment / revised route (or failure)."""
    fig, axes = _figure(1, 3, truth, extra_h=1.4)
    a0, a1, a2 = axes[0]
    trolleys = truth.find(CellType.TROLLEY)

    draw_grid(a0, truth, title="1. Initial A* plan (trolley unknown)")
    draw_path(a0, rep.initial_plan.path, PATH, label="original plan")
    for t in trolleys:
        draw_trolley(a0, t, known=False)

    if rep.detections:
        d = rep.detections[0]
        walked = rep.executed_path[: d.step + 1]
        draw_grid(a1, truth, title=f"2. Detected at {d.obstacle}, robot at {d.robot_position}")
        draw_path(a1, rep.initial_plan.path, PATH, lw=1.4, ls="--")
        draw_path(a1, walked, "#ffffff", lw=2.6, label="walked")
        draw_trolley(a1, d.obstacle, known=True)
        draw_robot(a1, d.robot_position)

        if rep.goal_reached:
            title = f"3. Revised route: {rep.replans} replan(s), {rep.executed_moves} moves, cost {rep.executed_cost}"
        else:
            title = "3. Replanning FAILED: destination unreachable"
        draw_grid(a2, truth, title=title)
        draw_path(a2, rep.initial_plan.path, PATH, lw=1.4, ls="--", label="original plan")
        for det in rep.detections:
            draw_path(a2, det.replan.path, REVISED, lw=2.6, label="revised plan")
            draw_trolley(a2, det.obstacle, known=True)
        draw_robot(a2, rep.executed_path[-1])
        a2.legend(loc="upper center", bbox_to_anchor=(0.5, -0.08), ncol=2, fontsize=7, frameon=False,
                  labelcolor=TEXT)
    else:
        for ax, t in ((a1, "2. No obstacle detected"), (a2, "3. " + rep.message[:60])):
            draw_grid(ax, truth, title=t)
            draw_path(ax, rep.executed_path, PATH)

    for ax in (a0, a1, a2):
        ax.title.set_fontsize(8)
    fig.suptitle(f"Trolley detection and A* replanning — {truth.name}", color=TEXT, fontsize=12)
    _add_legend(fig)
    fig.tight_layout(rect=(0, 0.06, 1, 0.95))
    return fig


def figure_charts(results: list[SearchResult]):
    plt = _plt()
    fig, axes = plt.subplots(1, 4, figsize=(13, 3.4))
    fig.patch.set_facecolor(BG)
    metrics = [("execution_time_ms", "Execution time (ms)"), ("nodes_expanded", "Nodes expanded"),
               ("path_length", "Path length (moves)"), ("total_cost", "Total path cost")]
    names = [r.algorithm for r in results]
    colors = [ALGO_COLORS.get(n, PATH) for n in names]
    for ax, (attr, title) in zip(axes, metrics):
        vals = [getattr(r, attr) for r in results]
        heights = [v if v is not None else 0 for v in vals]
        bars = ax.bar(names, heights, color=colors)
        for b, v in zip(bars, vals):
            label = "n/a" if v is None else (f"{v:.3f}" if isinstance(v, float) else str(v))
            ax.text(b.get_x() + b.get_width() / 2, b.get_height(), label, ha="center", va="bottom",
                    color=TEXT, fontsize=8)
        ax.set_title(title, color=TEXT, fontsize=10)
        ax.set_facecolor(BG)
        ax.tick_params(colors=TEXT, labelsize=8)
        for s in ("top", "right"):
            ax.spines[s].set_visible(False)
        for s in ("left", "bottom"):
            ax.spines[s].set_color("#3a4250")
    fig.tight_layout()
    return fig


def save(fig, path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(path, dpi=140, facecolor=fig.get_facecolor())
    _plt().close(fig)
    return path


# ------------------------------------------------------------------- animations
def animate_search(grid: Grid, r: SearchResult, interval_ms: int = 40):
    """Replay the real expansion order, then move the robot along the returned path."""
    from matplotlib.animation import FuncAnimation

    fig, axes = _figure(1, 1, grid)
    ax = axes[0][0]
    draw_grid(ax, grid, title=f"{r.algorithm} exploring...")
    heat = np.full((grid.rows, grid.cols), np.nan)
    im = ax.imshow(heat, cmap=explored_cmap(), alpha=0.75, vmin=0, vmax=max(1, len(r.explored)),
                   interpolation="nearest")
    (line,) = ax.plot([], [], color=ALGO_COLORS.get(r.algorithm, PATH), linewidth=2.6)
    robot = ax.scatter([grid.start[1]], [grid.start[0]], s=140, c="#ffffff", edgecolors=PATH,
                       linewidths=2.5, zorder=5)
    n_explore, n_move = len(r.explored), len(r.path)

    def update(i: int):
        if i < n_explore:
            rr, cc = r.explored[i]
            heat[rr, cc] = i
            im.set_data(heat)
        else:
            k = i - n_explore
            if k < n_move:
                ys, xs = zip(*r.path[: k + 1])
                line.set_data(xs, ys)
                robot.set_offsets([[xs[-1], ys[-1]]])
                ax.set_title(_caption(r) + f"  |  robot at {r.path[k]}", color=TEXT, fontsize=9, loc="left")
        return im, line, robot

    return fig, FuncAnimation(fig, update, frames=n_explore + n_move + 10, interval=interval_ms,
                              blit=False, repeat=False)


def animate_trolley(truth: Grid, rep: ReplanReport, interval_ms: int = 220):
    """Replay the event log of a trolley experiment."""
    from matplotlib.animation import FuncAnimation

    fig, axes = _figure(1, 1, truth)
    ax = axes[0][0]
    draw_grid(ax, truth, title="Initial A* plan (trolley unknown to robot)")
    draw_path(ax, rep.initial_plan.path, PATH, lw=1.6, ls="--")
    for t in truth.find(CellType.TROLLEY):
        draw_trolley(ax, t, known=False)
    (walked,) = ax.plot([], [], color="#ffffff", linewidth=2.6)
    robot = ax.scatter([truth.start[1]], [truth.start[0]], s=140, c="#ffffff", edgecolors=PATH,
                       linewidths=2.5, zorder=5)
    trail: list[Cell] = [truth.start]
    events = [e for e in rep.events if e["type"] != "INITIAL_PLAN"]

    def update(i: int):
        if i >= len(events):
            return (walked, robot)
        e = events[i]
        kind = e["type"]
        if kind == "ROBOT_MOVED":
            trail.append(e["robot"])
            ys, xs = zip(*trail)
            walked.set_data(xs, ys)
            robot.set_offsets([[xs[-1], ys[-1]]])
            ax.set_title(f"Robot at {e['robot']} (step {e['step']})", color=TEXT, fontsize=9, loc="left")
        elif kind == "OBSTACLE_DETECTED":
            draw_trolley(ax, e["cell"], known=True)
            ax.set_title(f"OBSTACLE DETECTED at {e['cell']} - robot stopped at {e['robot']}",
                         color=TROLLEY, fontsize=9, loc="left")
        elif kind == "NEW_PATH_FOUND":
            draw_path(ax, e["path"], REVISED, lw=2.2)
            ax.set_title(f"Replanned from {e['path'][0]}: new cost {e['cost']}", color=REVISED,
                         fontsize=9, loc="left")
        elif kind == "REPLANNING_FAILED":
            ax.set_title("REPLANNING FAILED - destination unreachable", color=TROLLEY, fontsize=9, loc="left")
        elif kind == "DELIVERY_COMPLETED":
            ax.set_title(rep.message, color=START, fontsize=9, loc="left")
        return (walked, robot)

    return fig, FuncAnimation(fig, update, frames=len(events) + 8, interval=interval_ms, blit=False,
                              repeat=False)
