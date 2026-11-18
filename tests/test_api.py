from __future__ import annotations

import pytest

pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

from server.app import app  # noqa: E402

client = TestClient(app)
SHORT = ["S~~G", ".##.", "...."]


def test_health_and_scenarios():
    assert client.get("/api/health").json() == {"status": "ok"}
    names = [s["name"] for s in client.get("/api/scenarios").json()]
    assert "default" in names and "no_alternative" in names
    sc = client.get("/api/scenarios/default").json()
    assert sc["start"] == [6, 0] and sc["trolleys"] == [[3, 11]]


def test_unknown_scenario_404():
    assert client.get("/api/scenarios/nope").status_code == 404
    assert client.get("/api/scenarios/..%2Fmain").status_code == 404


def test_search_returns_real_events():
    r = client.post("/api/search", json={"grid": SHORT, "algorithm": "astar"}).json()
    assert r["path_length"] == 7 and r["total_cost"] == 7
    expands = [e for e in r["events"] if e["type"] == "NODE_EXPANDED"]
    assert len(expands) == r["nodes_expanded"]
    assert all(e["f"] == e["g"] + e["h"] for e in expands)


def test_search_ignores_unknown_trolley():
    r = client.post("/api/search", json={"grid": ["S.TG"], "algorithm": "bfs"}).json()
    assert r["goal_reached"] and [0, 2] in r["path"]


def test_compare():
    body = client.post("/api/compare", json={"grid": SHORT}).json()
    assert [r["algorithm"] for r in body["results"]] == ["BFS", "DFS", "Greedy", "A*"]
    assert "NOT the cheapest" in body["findings"]


def test_trolley_demo_default():
    grid = client.get("/api/scenarios/default").json()["grid"]
    rep = client.post("/api/trolley-demo", json={"grid": grid}).json()
    assert rep["goal_reached"] and rep["replans"] == 1
    assert rep["detections"][0]["replan"]["path"][0] == rep["detections"][0]["robot_position"]


@pytest.mark.parametrize("payload,status", [
    ({"grid": ["..", ".."], "algorithm": "bfs"}, 422),          # no start/goal
    ({"grid": ["S.G"], "algorithm": "dijkstra"}, 422),          # bad algorithm
    ({"grid": ["S?G"], "algorithm": "bfs"}, 422),               # bad symbol
    ({"grid": ["S.", "G"], "algorithm": "bfs"}, 422),           # ragged
    ({"grid": [], "algorithm": "bfs"}, 422),                    # empty
])
def test_invalid_requests(payload, status):
    resp = client.post("/api/search", json=payload)
    assert resp.status_code == status
    assert "Traceback" not in resp.text


def test_sensor_range_bounds():
    assert client.post("/api/trolley-demo", json={"grid": SHORT, "sensor_range": 0}).status_code == 422
