"""Dynamic obstacle detection and A* replanning (Task 4).

Two maps are kept:
  * ground truth  -- the physical warehouse, trolleys included;
  * known map     -- what the robot believes; trolleys are initially absent.

The robot plans with A* on its known map and walks the plan one cell at a time.
Before every move its sensor inspects the next ``sensor_range`` cells of the plan
against the ground truth. If an undiscovered obstacle is seen, the robot:

  1. stops (it never enters the blocked cell),
  2. writes the obstacle into its known map,
  3. replans with A* from its CURRENT cell to the original destination,
  4. resumes on the new plan, or stops and reports the destination unreachable.

This repeats until the goal is reached or replanning fails, so several trolleys are
handled too.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from ..algorithms.astar import astar
from ..grid import Cell, CellType, Grid
from ..path_cost import path_cost
from ..problem import SearchProblem
from ..result import SearchResult


@dataclass
class Detection:
    step: int  # number of moves the robot had completed when it detected the obstacle
    robot_position: Cell
    obstacle: Cell
    replan: SearchResult  # A* run from robot_position on the updated known map


@dataclass
class ReplanReport:
    scenario: str
    start: Cell
    goal: Cell
    initial_plan: SearchResult
    detections: list[Detection]
    executed_path: list[Cell]
    goal_reached: bool
    replans: int  # successful + failed replanning attempts
    executed_moves: int
    executed_cost: int
    total_nodes_expanded: int  # initial plan + all replans
    final_known_map: Grid
    events: list[dict[str, Any]] = field(default_factory=list)
    message: str = ""


def _plan(known: Grid, frm: Cell, goal: Cell) -> SearchResult:
    return astar(SearchProblem.from_grid(known, frm, goal), trace=True)


def run_trolley_experiment(truth: Grid, sensor_range: int = 1) -> ReplanReport:
    if sensor_range < 1:
        raise ValueError("sensor_range must be at least 1 (the robot must see the next cell).")
    known = truth.known_view()
    start, goal = truth.start, truth.goal
    events: list[dict[str, Any]] = []

    initial = _plan(known, start, goal)
    events.append({"type": "INITIAL_PLAN", "path": initial.path, "goal_reached": initial.goal_reached})
    plan = initial.path
    pos = start
    executed = [start]
    detections: list[Detection] = []
    nodes = initial.nodes_expanded
    max_replans = truth.rows * truth.cols  # safety bound; each replan permanently adds an obstacle

    if not initial.goal_reached:
        msg = "Initial A* planning failed: the destination is unreachable on the known map."
        events.append({"type": "PLANNING_FAILED", "robot": pos})
        return ReplanReport(truth.name, start, goal, initial, [], executed, False, 0, 0, 0,
                            nodes, known, events, msg)

    i = 0  # index of the robot's current cell within `plan`
    goal_reached = True
    while pos != goal:
        # --- sense: look ahead along the current plan --------------------------------
        blocked: Cell | None = None
        for k in range(1, sensor_range + 1):
            if i + k >= len(plan):
                break
            ahead = plan[i + k]
            if not truth.is_passable(ahead) and known.is_passable(ahead):
                blocked = ahead
                break

        if blocked is not None:
            step = len(executed) - 1
            events.append({"type": "OBSTACLE_DETECTED", "cell": blocked, "robot": pos, "step": step})
            events.append({"type": "ROBOT_STOPPED", "robot": pos})
            r, c = blocked
            known.cells[r][c] = CellType.TROLLEY
            events.append({"type": "MAP_UPDATED", "cell": blocked, "cell_type": CellType.TROLLEY.name})
            events.append({"type": "REPLANNING_STARTED", "from": pos, "to": goal})
            replan = _plan(known, pos, goal)
            nodes += replan.nodes_expanded
            detections.append(Detection(step, pos, blocked, replan))
            if not replan.goal_reached or len(detections) > max_replans:
                events.append({"type": "REPLANNING_FAILED", "robot": pos})
                goal_reached = False
                break
            events.append({"type": "NEW_PATH_FOUND", "path": replan.path, "cost": replan.total_cost})
            events.append({"type": "ROBOT_RESUMED", "robot": pos})
            plan, i = replan.path, 0
            continue

        # --- act: move one cell -------------------------------------------------------
        i += 1
        pos = plan[i]
        assert truth.is_passable(pos), "robot entered an impassable cell"  # invariant
        executed.append(pos)
        events.append({"type": "ROBOT_MOVED", "robot": pos, "step": len(executed) - 1})

    executed_cost = path_cost(truth, executed)
    if goal_reached:
        events.append({"type": "DELIVERY_COMPLETED", "robot": pos})
        msg = (f"Delivered after {len(detections)} replan(s): "
               f"{len(executed) - 1} moves, cost {executed_cost}.")
    else:
        msg = (f"Destination {goal} is unreachable: obstacle detected at {detections[-1].obstacle} "
               f"and no alternative route exists from {pos}. Robot stopped.")
    return ReplanReport(truth.name, start, goal, initial, detections, executed, goal_reached,
                        len(detections), len(executed) - 1, executed_cost, nodes, known, events, msg)
