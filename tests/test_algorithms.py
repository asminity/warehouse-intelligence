from __future__ import annotations

import pytest

from warehouse.algorithms import ALGORITHMS, astar, bfs, dfs, get_algorithm, greedy
from warehouse.grid import Grid, InvalidGridError
from warehouse.path_cost import InvalidPathError, path_cost
from warehouse.problem import InvalidProblemError, SearchProblem

from .helpers import assert_valid_path, dijkstra, random_grid

ALL = list(ALGORITHMS.items())
IDS = list(ALGORITHMS)


def problem(text: str) -> SearchProblem:
    return SearchProblem.from_grid(Grid.from_string(text))


OPEN = """
S....
.....
....G
"""

SHELVES = """
S.#...
.##.#.
....#G
"""

RESTRICTED = """
S..XX..
.X.XX.X
.X....G
"""

SHORT_VS_CHEAP = """
S~~G
.##.
....
"""

NO_ROUTE = """
S.#..
..#.G
..#..
"""


@pytest.mark.parametrize("name,fn", ALL, ids=IDS)
@pytest.mark.parametrize("text", [OPEN, SHELVES, RESTRICTED, SHORT_VS_CHEAP],
                         ids=["open", "shelves", "restricted", "crowded"])
def test_every_algorithm_returns_valid_path_with_correct_cost(name, fn, text):
    p = problem(text)
    r = fn(p)
    assert r.goal_reached and r.algorithm == name
    assert_valid_path(p.grid, r.path, p.initial, p.goal)
    assert r.path_length == len(r.path) - 1
    assert r.total_cost == path_cost(p.grid, r.path)


def test_open_warehouse_bfs_and_astar_are_manhattan():
    p = problem(OPEN)
    assert bfs(p).path_length == 6
    assert astar(p).total_cost == 6


def test_crowded_cells_change_astar_route():
    p = problem("S~G\n...\n")
    assert bfs(p).total_cost == 5  # straight through the crowded cell: 4 + 1
    a = astar(p)
    assert a.total_cost == 4 and a.path_length == 4  # around it: 4 normal cells


def test_short_crowded_route_vs_long_cheap_route():
    """Task 3: BFS finds fewer moves, A* finds the lower cost, and they differ."""
    p = problem(SHORT_VS_CHEAP)
    b, a = bfs(p), astar(p)
    assert b.path_length == 3 and b.total_cost == 9
    assert a.path_length == 7 and a.total_cost == 7
    assert b.path_length < a.path_length and a.total_cost < b.total_cost


@pytest.mark.parametrize("name,fn", ALL, ids=IDS)
def test_no_route(name, fn):
    r = fn(problem(NO_ROUTE))
    assert not r.goal_reached and r.path == [] and r.total_cost is None and r.path_length is None
    assert "No route" in r.message


@pytest.mark.parametrize("name,fn", ALL, ids=IDS)
def test_start_equals_destination(name, fn):
    g = Grid.from_string("S.G")
    r = fn(SearchProblem.from_grid(g, initial=g.goal))
    assert r.goal_reached and r.path == [g.goal] and r.path_length == 0 and r.total_cost == 0


@pytest.mark.parametrize("bad", [(0, 2), (5, 5), (-1, 0)])
def test_invalid_start(bad):
    g = Grid.from_string("S.#\n..G")
    with pytest.raises(InvalidProblemError):
        SearchProblem.from_grid(g, initial=bad)


@pytest.mark.parametrize("bad", [(0, 2), (9, 0)])
def test_invalid_destination(bad):
    g = Grid.from_string("S.#\n..G")
    with pytest.raises(InvalidProblemError):
        SearchProblem.from_grid(g, goal=bad)


@pytest.mark.parametrize("text", ["..\n..", "SS\nG.", "S.\n.", "S?G"])
def test_invalid_grids(text):
    with pytest.raises(InvalidGridError):
        Grid.from_string(text)


def test_path_cost_rejects_illegal_paths():
    g = Grid.from_string("S#G\n...")
    with pytest.raises(InvalidPathError):
        path_cost(g, [(0, 0), (0, 1), (0, 2)])  # through a shelf
    with pytest.raises(InvalidPathError):
        path_cost(g, [(0, 0), (1, 1)])  # diagonal jump


def test_astar_exposes_g_h_f():
    r = astar(problem(SHORT_VS_CHEAP), trace=True)
    expands = [e for e in r.events if e["type"] == "NODE_EXPANDED"]
    assert expands and all(e["f"] == e["g"] + e["h"] for e in expands)
    assert expands[-1]["cell"] == r.path[-1] and expands[-1]["g"] == r.total_cost


def test_untraced_run_matches_traced_run():
    p = problem(SHELVES)
    for _, fn in ALL:
        a, b = fn(p, trace=False), fn(p, trace=True)
        assert (a.path, a.nodes_expanded) == (b.path, b.nodes_expanded)
        assert a.events == [] and b.events


def test_deterministic():
    p = problem(RESTRICTED)
    for _, fn in ALL:
        assert fn(p).path == fn(p).path


def test_dfs_handles_large_grid_without_recursion_error():
    g = Grid.from_string("\n".join(["S" + "." * 199] + ["." * 200] * 198 + ["." * 199 + "G"]))
    assert dfs(SearchProblem.from_grid(g)).goal_reached


def test_get_algorithm_aliases():
    assert get_algorithm("astar")[0] == "A*"
    assert get_algorithm("GBFS")[0] == "Greedy"
    with pytest.raises(ValueError):
        get_algorithm("dijkstra")


@pytest.mark.parametrize("seed", range(50))
def test_against_dijkstra_oracle(seed):
    """A* cost is optimal; BFS move count is minimal; DFS/Greedy are valid and never cheaper."""
    p = SearchProblem.from_grid(random_grid(seed))
    best = dijkstra(p)
    fewest = dijkstra(p, unit_cost=True)
    a, b, d, gr = astar(p), bfs(p), dfs(p), greedy(p)
    if best is None:
        assert not any(r.goal_reached for r in (a, b, d, gr))
        return
    assert a.total_cost == best
    assert b.path_length == fewest
    for r in (a, b, d, gr):
        assert r.goal_reached
        assert_valid_path(p.grid, r.path, p.initial, p.goal)
        assert r.total_cost == path_cost(p.grid, r.path) >= best
