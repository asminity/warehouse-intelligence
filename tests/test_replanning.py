from __future__ import annotations

from pathlib import Path

import pytest

from warehouse.algorithms import astar
from warehouse.grid import CellType, Grid
from warehouse.problem import SearchProblem
from warehouse.simulation import run_trolley_experiment

from .helpers import assert_valid_path

SCENARIOS = Path(__file__).resolve().parent.parent / "scenarios"


def load(name: str) -> Grid:
    return Grid.from_file(SCENARIOS / f"{name}.txt")


def check_robot_never_entered_blocked_cells(truth: Grid, rep) -> None:
    for cell in rep.executed_path:
        assert truth.is_passable(cell), f"robot entered {cell}"


def test_known_map_omits_trolley():
    truth = load("default")
    (trolley,) = truth.find(CellType.TROLLEY)
    assert not truth.is_passable(trolley)
    assert truth.known_view().is_passable(trolley)


def test_default_trolley_is_on_initial_astar_route():
    truth = load("default")
    (trolley,) = truth.find(CellType.TROLLEY)
    plan = astar(SearchProblem.from_grid(truth.known_view()))
    assert trolley in plan.path


def test_default_scenario_successful_replan():
    truth = load("default")
    rep = run_trolley_experiment(truth)
    assert rep.goal_reached and rep.replans == 1
    d = rep.detections[0]
    assert d.obstacle == truth.find(CellType.TROLLEY)[0]
    # detected BEFORE entering: robot is adjacent to the trolley and never stood on it
    assert abs(d.robot_position[0] - d.obstacle[0]) + abs(d.robot_position[1] - d.obstacle[1]) == 1
    assert d.obstacle not in rep.executed_path
    check_robot_never_entered_blocked_cells(truth, rep)
    assert_valid_path(truth, rep.executed_path, truth.start, truth.goal)
    assert rep.final_known_map.cell_type(d.obstacle) == CellType.TROLLEY


def test_replanning_starts_from_current_position_not_start():
    truth = load("default")
    rep = run_trolley_experiment(truth)
    d = rep.detections[0]
    assert d.robot_position != truth.start
    assert d.replan.path[0] == d.robot_position
    assert rep.executed_path[d.step] == d.robot_position
    # the revised plan is optimal on the updated known map from that position
    fresh = astar(SearchProblem.from_grid(rep.final_known_map, d.robot_position))
    assert d.replan.total_cost == fresh.total_cost


def test_no_alternative_route_after_detection():
    truth = load("no_alternative")
    rep = run_trolley_experiment(truth)
    assert not rep.goal_reached
    assert rep.replans == 1 and not rep.detections[0].replan.goal_reached
    assert "unreachable" in rep.message
    assert rep.executed_path[-1] == rep.detections[0].robot_position  # robot stopped there
    check_robot_never_entered_blocked_cells(truth, rep)
    types = [e["type"] for e in rep.events]
    assert "REPLANNING_FAILED" in types and "DELIVERY_COMPLETED" not in types


def test_event_sequence_order():
    rep = run_trolley_experiment(load("default"))
    types = [e["type"] for e in rep.events if e["type"] != "ROBOT_MOVED"]
    assert types == ["INITIAL_PLAN", "OBSTACLE_DETECTED", "ROBOT_STOPPED", "MAP_UPDATED",
                     "REPLANNING_STARTED", "NEW_PATH_FOUND", "ROBOT_RESUMED", "DELIVERY_COMPLETED"]


def test_multiple_trolleys_cause_multiple_replans():
    truth = load("default")
    revised = run_trolley_experiment(truth).detections[0].replan.path
    truth.set_cell(revised[len(revised) // 2], CellType.TROLLEY)  # second trolley on the revised route
    rep = run_trolley_experiment(truth)
    assert rep.goal_reached and rep.replans == 2
    check_robot_never_entered_blocked_cells(truth, rep)


def test_no_trolley_means_no_replans():
    rep = run_trolley_experiment(load("open"))
    assert rep.goal_reached and rep.replans == 0
    assert rep.executed_path == rep.initial_plan.path


def test_trolley_off_route_is_never_detected():
    rep = run_trolley_experiment(Grid.from_string("S...G\n.....\nT...."))
    assert rep.replans == 0 and rep.goal_reached


def test_larger_sensor_range_detects_earlier():
    truth = load("default")
    near = run_trolley_experiment(truth, sensor_range=1).detections[0]
    far = run_trolley_experiment(truth, sensor_range=3).detections[0]
    assert far.step < near.step


def test_invalid_sensor_range():
    with pytest.raises(ValueError):
        run_trolley_experiment(load("default"), sensor_range=0)


@pytest.mark.parametrize("name", sorted(p.stem for p in SCENARIOS.glob("*.txt")))
def test_all_scenarios_parse_and_run(name):
    truth = load(name)
    check_robot_never_entered_blocked_cells(truth, run_trolley_experiment(truth))
