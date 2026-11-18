"""AI-Based Route Planning for a Warehouse Delivery Robot -- command-line program.

Examples
    python main.py                               # default scenario, full report
    python main.py --scenario short_vs_cheap
    python main.py --scenario no_alternative     # trolley with no alternative route
    python main.py --trolley 3,15                # place a trolley manually
    python main.py --save-figures                # also write PNGs to screenshots/
    python main.py --animate astar               # animate a search (bfs/dfs/greedy/astar)
    python main.py --animate trolley             # animate detection + replanning
    python main.py --list
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from warehouse.algorithms import get_algorithm
from warehouse.compare import HEADERS, compare_all, comparison_rows, findings, format_table, write_csv
from warehouse.grid import CellType, Grid, InvalidGridError
from warehouse.problem import InvalidProblemError, SearchProblem
from warehouse.render.ascii import LEGEND, render
from warehouse.simulation import ReplanReport, run_trolley_experiment

ROOT = Path(__file__).resolve().parent
SCENARIOS = ROOT / "scenarios"
SCREENSHOTS = ROOT / "screenshots"
RESULTS = ROOT / "results"


def banner(title: str) -> None:
    print("\n" + "=" * 78 + f"\n {title}\n" + "=" * 78)


def load_scenario(name: str) -> Grid:
    path = Path(name)
    if not path.suffix:
        path = SCENARIOS / f"{name}.txt"
    if not path.exists():
        available = ", ".join(sorted(p.stem for p in SCENARIOS.glob("*.txt")))
        raise SystemExit(f"Scenario {name!r} not found. Available: {available}")
    return Grid.from_file(path)


def parse_cell(text: str) -> tuple[int, int]:
    try:
        r, c = (int(v) for v in text.split(","))
        return r, c
    except ValueError:
        raise argparse.ArgumentTypeError("expected ROW,COL, e.g. 3,15") from None


def print_trolley_report(truth: Grid, rep: ReplanReport) -> None:
    banner("TASK 4 - TROLLEY DETECTION AND A* REPLANNING")
    trolleys = truth.find(CellType.TROLLEY)
    print(f"Physical trolley(s) at {trolleys} -- NOT on the robot's known map.")
    print(f"Sensor: checks the next cell of the plan before every move.\n")
    print("Original A* route on the known map:")
    if rep.initial_plan.goal_reached:
        print(f"  {rep.initial_plan.path_length} moves, cost {rep.initial_plan.total_cost}")
        print(render(truth, rep.initial_plan.path))
    else:
        print("  No route found on the known map.")

    for n, d in enumerate(rep.detections, start=1):
        print(f"\n[Detection {n}] step {d.step}: TROLLEY DETECTED at {d.obstacle} "
              f"while robot at {d.robot_position}.")
        print("  Robot stopped -> known map updated (cell marked impassable) -> "
              f"A* replanning from CURRENT position {d.robot_position} to {rep.goal}")
        if d.replan.goal_reached:
            print(f"  New route found: {d.replan.path_length} moves, cost {d.replan.total_cost} "
                  f"(expanded {d.replan.nodes_expanded} nodes)")
            print(render(rep.final_known_map, d.replan.path, robot=d.robot_position,
                         detected=[x.obstacle for x in rep.detections[:n]]))
        else:
            print("  REPLANNING FAILED: no alternative route exists. Robot remains stopped.")
            print(render(rep.final_known_map, robot=d.robot_position,
                         detected=[x.obstacle for x in rep.detections[:n]]))

    print("\nOutcome: " + rep.message)
    print(f"Route actually travelled: {' -> '.join(map(str, rep.executed_path))}")
    rows = [["A* (dynamic)", "Yes" if rep.goal_reached else "No",
             str(rep.executed_moves) if rep.goal_reached else "-",
             str(rep.executed_cost) if rep.goal_reached else "-",
             str(rep.total_nodes_expanded), str(rep.replans)]]
    print("\n" + format_table(["Experiment", "Goal reached", "Moves", "Total cost",
                               "Nodes expanded (all plans)", "Replans"], rows))


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Warehouse delivery robot: BFS / DFS / Greedy / A* + replanning")
    ap.add_argument("--scenario", default="default", help="scenario name in scenarios/ or a path to a map file")
    ap.add_argument("--trolley", type=parse_cell, action="append", metavar="ROW,COL",
                    help="place an (unknown) trolley at ROW,COL; may be repeated")
    ap.add_argument("--sensor-range", type=int, default=1, help="cells the robot sees ahead (default 1)")
    ap.add_argument("--save-figures", action="store_true", help="write PNG figures to screenshots/")
    ap.add_argument("--csv", action="store_true", help="write the comparison table to results/")
    ap.add_argument("--animate", metavar="WHAT", help="bfs | dfs | greedy | astar | trolley")
    ap.add_argument("--list", action="store_true", help="list available scenarios")
    args = ap.parse_args(argv)

    if args.list:
        for p in sorted(SCENARIOS.glob("*.txt")):
            first = p.read_text(encoding="utf-8").splitlines()[0].lstrip("; ")
            print(f"{p.stem:<22} {first}")
        return 0

    try:
        truth = load_scenario(args.scenario)
        for cell in args.trolley or []:
            truth.set_cell(cell, CellType.TROLLEY)
        known = truth.known_view()
        SearchProblem.from_grid(known)  # validates start/goal
    except (InvalidGridError, InvalidProblemError) as exc:
        print(f"Invalid warehouse: {exc}", file=sys.stderr)
        return 2

    # ---------------------------------------------------------------- Task 1
    banner(f"TASK 1 - WAREHOUSE '{truth.name}'  ({truth.rows} x {truth.cols})")
    print(render(truth))
    print(LEGEND)
    obstacles = len(truth.find(CellType.SHELF)) + len(truth.find(CellType.RESTRICTED))
    print(f"Start {truth.start}  Destination {truth.goal}  Passable cells {known.count_passable()}  "
          f"Shelf/restricted cells {obstacles}  Crowded cells {len(truth.find(CellType.CROWDED))}")
    print("Moves: up/down/left/right. Entering a normal cell costs 1, a crowded cell costs 4.")

    # ---------------------------------------------------------------- Task 3
    banner("TASK 3 - SEARCH ALGORITHMS (on the robot's known map)")
    results = compare_all(known)
    for r in results:
        print(f"\n--- {r.algorithm} ---")
        if r.goal_reached:
            print(f"Route: {r.path_length} moves, total cost {r.total_cost}, "
                  f"{r.nodes_expanded} nodes expanded")
            print(render(known, r.path))
        else:
            print(f"No route found: {r.message}  ({r.nodes_expanded} nodes expanded)")

    # ---------------------------------------------------------------- Task 5
    banner("TASK 5 - PERFORMANCE COMPARISON")
    print(format_table(HEADERS, comparison_rows(results)))
    print("\nTime = median of 5 runs with event tracing off.\n")
    print(findings(results))

    # ---------------------------------------------------------------- Task 4
    rep: ReplanReport | None = None
    if truth.find(CellType.TROLLEY):
        rep = run_trolley_experiment(truth, sensor_range=args.sensor_range)
        print_trolley_report(truth, rep)
    else:
        print("\n(No trolley in this scenario. Add one with --trolley ROW,COL to run the replanning demo.)")

    # ---------------------------------------------------------------- outputs
    if args.csv:
        RESULTS.mkdir(exist_ok=True)
        out = RESULTS / f"comparison_{truth.name}.csv"
        write_csv(results, out)
        print(f"\nWrote {out.relative_to(ROOT)}")

    if args.save_figures:
        from warehouse.render import plots

        plots.use_headless()
        written = [plots.save(plots.figure_all_routes(known, results), SCREENSHOTS / f"{truth.name}_routes.png"),
                   plots.save(plots.figure_charts(results), SCREENSHOTS / f"{truth.name}_charts.png")]
        for r in results:
            slug = r.algorithm.replace("*", "star").lower()
            written.append(plots.save(plots.figure_route(known, r), SCREENSHOTS / f"{truth.name}_{slug}.png"))
        if rep is not None:
            written.append(plots.save(plots.figure_trolley(truth, rep), SCREENSHOTS / f"{truth.name}_trolley.png"))
        print("\nWrote figures:\n  " + "\n  ".join(str(p.relative_to(ROOT)) for p in written))

    if args.animate:
        from warehouse.render import plots
        import matplotlib.pyplot as plt

        what = args.animate.lower()
        if what == "trolley":
            if rep is None:
                print("This scenario has no trolley; use --trolley ROW,COL.", file=sys.stderr)
                return 2
            fig, anim = plots.animate_trolley(truth, rep)
        else:
            try:
                name, _ = get_algorithm(what)
            except ValueError as exc:
                print(exc, file=sys.stderr)
                return 2
            fig, anim = plots.animate_search(known, next(r for r in results if r.algorithm == name))
        fig._anim = anim  # keep a reference so the animation is not garbage-collected
        plt.show()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
