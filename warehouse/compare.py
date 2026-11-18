"""Run all four algorithms on the same map and summarise the results (Task 5)."""

from __future__ import annotations

import statistics
import time
from pathlib import Path

from .algorithms import ALGORITHMS, SearchFn
from .grid import Grid
from .problem import SearchProblem
from .result import SearchResult

TIMING_REPEATS = 5


def run_algorithm(name: str, fn: SearchFn, problem: SearchProblem, repeats: int = TIMING_REPEATS) -> SearchResult:
    """Time ``repeats`` untraced runs (median), then do one traced run for the events.

    Tracing is off while timing, so recording the exploration never inflates the time.
    """
    timings = []
    for _ in range(repeats):
        t0 = time.perf_counter()
        fn(problem, trace=False)
        timings.append((time.perf_counter() - t0) * 1000.0)
    result = fn(problem, trace=True)
    result.execution_time_ms = statistics.median(timings)
    return result


def compare_all(grid: Grid, repeats: int = TIMING_REPEATS) -> list[SearchResult]:
    """Each algorithm gets its own fresh copy of the map, so none can affect another."""
    results = []
    for name, fn in ALGORITHMS.items():
        problem = SearchProblem.from_grid(grid.copy())
        results.append(run_algorithm(name, fn, problem, repeats))
    return results


def _fmt(v: object) -> str:
    return "-" if v is None else str(v)


def comparison_rows(results: list[SearchResult]) -> list[list[str]]:
    return [
        [r.algorithm, "Yes" if r.goal_reached else "No", _fmt(r.path_length), _fmt(r.total_cost),
         str(r.nodes_expanded), f"{r.execution_time_ms:.3f}"]
        for r in results
    ]


HEADERS = ["Algorithm", "Goal reached", "Moves", "Total cost", "Nodes expanded", "Time (ms)"]


def format_table(headers: list[str], rows: list[list[str]], markdown: bool = False) -> str:
    widths = [max(len(h), *(len(r[i]) for r in rows)) for i, h in enumerate(headers)]
    if markdown:
        line = lambda cells: "| " + " | ".join(c.ljust(w) for c, w in zip(cells, widths)) + " |"  # noqa: E731
        sep = "|" + "|".join("-" * (w + 2) for w in widths) + "|"
        return "\n".join([line(headers), sep, *map(line, rows)])
    line = lambda cells: "  ".join(c.ljust(w) for c, w in zip(cells, widths))  # noqa: E731
    return "\n".join([line(headers), "  ".join("-" * w for w in widths), *map(line, rows)])


def findings(results: list[SearchResult]) -> str:
    """Plain-English summary generated from the measured numbers (nothing hardcoded)."""
    ok = [r for r in results if r.goal_reached]
    if not ok:
        return "No algorithm found a route: the destination is unreachable on this map."

    def names(items: list[SearchResult]) -> str:
        return ", ".join(r.algorithm for r in items)

    min_moves = min(r.path_length for r in ok)  # type: ignore[type-var]
    min_cost = min(r.total_cost for r in ok)  # type: ignore[type-var]
    min_nodes = min(r.nodes_expanded for r in ok)
    shortest = [r for r in ok if r.path_length == min_moves]
    cheapest = [r for r in ok if r.total_cost == min_cost]
    fewest_nodes = [r for r in ok if r.nodes_expanded == min_nodes]

    lines = [
        f"- Fewest moves: {names(shortest)} ({min_moves} moves).",
        f"- Lowest total cost: {names(cheapest)} (cost {min_cost}).",
        f"- Fewest nodes expanded: {names(fewest_nodes)} ({min_nodes} nodes).",
    ]
    shortest_cost = min(r.total_cost for r in shortest)  # type: ignore[type-var]
    if shortest_cost == min_cost:
        lines.append(f"- The shortest route ({min_moves} moves) was also the cheapest (cost {min_cost}).")
    else:
        cheapest_moves = min(r.path_length for r in cheapest)  # type: ignore[type-var]
        lines.append(
            f"- The shortest route was NOT the cheapest: the {min_moves}-move route costs {shortest_cost}, "
            f"while the cheapest route takes {cheapest_moves} moves but costs only {min_cost} "
            f"({shortest_cost - min_cost} less). The extra moves avoid crowded cells (cost 4 each)."
        )
    failed = [r for r in results if not r.goal_reached]
    if failed:
        lines.append(f"- No route found by: {names(failed)}.")
    return "\n".join(lines)


def write_csv(results: list[SearchResult], path: str | Path) -> None:
    import csv

    with open(path, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow([*HEADERS, "Max frontier"])
        for r, row in zip(results, comparison_rows(results)):
            w.writerow([*row, r.max_frontier_size])
