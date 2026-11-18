from __future__ import annotations

import main
from warehouse.compare import compare_all, findings
from warehouse.grid import Grid


def test_compare_uses_independent_copies():
    g = Grid.from_string("S~~G\n.##.\n....")
    before = g.to_string()
    results = compare_all(g, repeats=1)
    assert [r.algorithm for r in results] == ["BFS", "DFS", "Greedy", "A*"]
    assert g.to_string() == before
    assert all(r.execution_time_ms >= 0 for r in results)


def test_findings_detect_shortest_not_cheapest():
    text = findings(compare_all(Grid.from_string("S~~G\n.##.\n...."), repeats=1))
    assert "NOT the cheapest" in text and "A* (cost 7)" in text


def test_findings_no_route():
    assert "unreachable" in findings(compare_all(Grid.from_string("S#G"), repeats=1))


def test_cli_default_runs(capsys):
    assert main.main([]) == 0
    out = capsys.readouterr().out
    for marker in ("TASK 1", "TASK 3", "TASK 4", "TASK 5", "TROLLEY DETECTED", "Replans"):
        assert marker in out


def test_cli_no_alternative_reports_failure(capsys):
    assert main.main(["--scenario", "no_alternative"]) == 0
    assert "REPLANNING FAILED" in capsys.readouterr().out


def test_cli_manual_trolley(capsys):
    assert main.main(["--scenario", "short_vs_cheap", "--trolley", "2,1"]) == 0
    assert "TROLLEY DETECTED at (2, 1)" in capsys.readouterr().out


def test_cli_rejects_trolley_on_start():
    assert main.main(["--trolley", "6,0"]) == 2
