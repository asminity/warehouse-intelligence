# Project Plan

Source of truth: `../AI_Warehouse_Robot_Group_Assignment.pdf`. Detailed spec: `../PROPOSED_PROMPT.md`.

## Stage A — Python core (submission-ready on its own) — **DONE (2026-11-18)**

| Step | Status | Verified by |
|---|---|---|
| Grid, cell types, costs, map files, validation | Done | `tests/test_algorithms.py::test_invalid_grids` and others |
| Problem formulation (state, actions, transition, goal test, path cost) | Done | `warehouse/problem.py`, README §3 |
| BFS, DFS (iterative), Greedy, A* with shared result and metric definitions | Done | 50-grid Dijkstra check, mutation check (breaking A* fails 53 tests) |
| Single shared `path_cost` + path validation | Done | tests |
| Trolley: ground truth vs known map, sensor, A* replanning from current position, failure report | Done | `tests/test_replanning.py` |
| Comparison table, generated findings, CSV | Done | `results/` |
| Console output: labeled grid, routes, trolley demo, tables | Done | `results/*_output.txt` |
| Matplotlib figures and animations | Done | `screenshots/` (figures checked visually) |
| 7 scenarios incl. short-vs-cheap, blocked destination, no alternative | Done | `test_all_scenarios_parse_and_run` |
| README with real results | Done; team details still to fill in | — |

Test status: `python -m pytest`, 129 passed (117 core + 12 API).

## Remaining before submission (team)
- Fill in group number, names, roll numbers, contributions and representative in README §9.
- Acknowledge AI or external help in README §10.
- Rename the folder or repo if the group number differs, push to GitHub, and check the instructor can access it.
- Email submission as described in the brief.

## Stage B — 3D web viewer — **DONE (2026-11-18)**

| Step | Status | Verified by |
|---|---|---|
| FastAPI wrapper with no saved state (`server/`): scenarios, search, compare, trolley demo, validation, SPA serving | Done | `tests/test_api.py` (12 tests) |
| React + TS (strict) + R3F scene: concrete floor, walls, instanced pallet racks, caged restricted zones, crowded aisles with workers, stations | Done | Checked in Chrome |
| AMR robot model (wheels, LiDAR, light bar, scanner field, carton) moving along the backend path | Done | Checked in Chrome |
| Replay of real search events: explored by recency, frontier, current cell, g/h/f inspector | Done | Values match CLI (A*: 29 moves, cost 29, 38 expanded) |
| Trolley lab: detection banner, map update, replan search, revised vs original route, failure state | Done | default: 1 replan, 45/45; no_alternative: unreachable |
| Compare: 4 routes on the floor (colour + line pattern), table, 4 Recharts charts, findings, CSV export | Done | Numbers match CLI for all 7 scenarios |
| Editing: paint tools, start/goal moves, invalid placements rejected | Done | Checked in Chrome |
| X-ray silhouettes for robot/trolley behind racks; low-rack toggle; 3 camera presets | Done | Checked in Chrome |
| Error boundary around the 3D view; empty-zone crash fixed | Done | All scenarios cycled with no console errors |

Not verified: the frame rate on a foreground window (the test browser window was throttled to about 1.5 fps,
including on a blank page), and the narrow-screen layout (below 1100 px). The test window could not be resized.
