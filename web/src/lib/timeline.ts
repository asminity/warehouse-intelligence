// Converts backend results into a replayable timeline of steps.
// Every step comes from a real event produced by the Python search / simulation;
// nothing here decides routes. The only arithmetic is the running "cost so far"
// display, which re-adds the published cell costs along the backend's path.
import type { Cell, SearchResult, TrolleyReport } from "../types/api";
import { CELL_INFO, key, type Sym } from "./grid";

export type Phase = "plan" | "replan";

export type Step =
  | { k: "expand"; cell: Cell; g?: number; h?: number; f?: number; depth?: number; adds: Cell[]; phase: Phase }
  | { k: "path"; path: Cell[]; variant: "plan" | "revised"; cost: number | null }
  | { k: "move"; to: Cell }
  | { k: "detect"; obstacle: Cell; robot: Cell }
  | { k: "mapUpdate"; obstacle: Cell }
  | { k: "replanStart"; from: Cell }
  | { k: "replanFail"; robot: Cell }
  | { k: "resume" }
  | { k: "noPath" }
  | { k: "done"; ok: boolean; message: string };

export interface Timeline {
  mode: "search" | "trolley";
  steps: Step[];
  durations: number[]; // seconds at 1x
  start: Cell;
}

function searchSteps(r: SearchResult, phase: Phase): Step[] {
  const steps: Step[] = [];
  for (const e of r.events) {
    if (e.type === "NODE_EXPANDED" && e.cell) {
      steps.push({ k: "expand", cell: e.cell, g: e.g, h: e.h, f: e.f, depth: e.depth, adds: [], phase });
    } else if (e.type === "NODE_DISCOVERED" && e.cell) {
      const last = steps[steps.length - 1];
      if (last && last.k === "expand") last.adds.push(e.cell);
    }
  }
  return steps;
}

function durationsFor(steps: Step[]): number[] {
  const expands = steps.filter((s) => s.k === "expand").length || 1;
  const expandDur = Math.min(0.06, Math.max(0.012, 5 / expands));
  return steps.map((s) => {
    switch (s.k) {
      case "expand": return expandDur;
      case "path": return 0.8;
      case "move": return 0.3;
      case "detect": return 1.4;
      case "mapUpdate": return 0.8;
      case "replanStart": return 0.6;
      case "replanFail": return 1.2;
      case "resume": return 0.5;
      case "noPath": return 1.0;
      case "done": return 0.1;
    }
  });
}

export function buildSearchTimeline(r: SearchResult, start: Cell): Timeline {
  const steps = searchSteps(r, "plan");
  if (r.goal_reached) {
    steps.push({ k: "path", path: r.path, variant: "plan", cost: r.total_cost });
    for (const c of r.path.slice(1)) steps.push({ k: "move", to: c });
    steps.push({ k: "done", ok: true, message: `Delivered: ${r.path_length} moves, cost ${r.total_cost}.` });
  } else {
    steps.push({ k: "noPath" });
    steps.push({ k: "done", ok: false, message: r.message });
  }
  return { mode: "search", steps, durations: durationsFor(steps), start };
}

export function buildTrolleyTimeline(rep: TrolleyReport): Timeline {
  const steps: Step[] = searchSteps(rep.initial_plan, "plan");
  if (rep.initial_plan.goal_reached) {
    steps.push({ k: "path", path: rep.initial_plan.path, variant: "plan", cost: rep.initial_plan.total_cost });
  }
  let det = 0;
  for (const e of rep.events) {
    switch (e.type) {
      case "ROBOT_MOVED":
        steps.push({ k: "move", to: e.robot! });
        break;
      case "OBSTACLE_DETECTED":
        steps.push({ k: "detect", obstacle: e.cell!, robot: e.robot! });
        break;
      case "MAP_UPDATED":
        steps.push({ k: "mapUpdate", obstacle: e.cell! });
        break;
      case "REPLANNING_STARTED": {
        steps.push({ k: "replanStart", from: rep.detections[det].robot_position });
        steps.push(...searchSteps(rep.detections[det].replan, "replan"));
        break;
      }
      case "NEW_PATH_FOUND":
        steps.push({ k: "path", path: e.path!, variant: "revised", cost: e.cost ?? null });
        det++;
        break;
      case "REPLANNING_FAILED":
        steps.push({ k: "replanFail", robot: e.robot! });
        det++;
        break;
      case "ROBOT_RESUMED":
        steps.push({ k: "resume" });
        break;
      case "PLANNING_FAILED":
        steps.push({ k: "noPath" });
        break;
      default:
        break;
    }
  }
  steps.push({ k: "done", ok: rep.goal_reached, message: rep.message });
  return { mode: "trolley", steps, durations: durationsFor(steps), start: rep.start };
}

// ----------------------------------------------------------------------------- visual state

export type Status =
  | "ready" | "searching" | "planned" | "moving" | "detected" | "replanning"
  | "delivered" | "failed" | "nopath";

export interface CellValues { g?: number; h?: number; f?: number; depth?: number; order: number }

export interface VisualState {
  frontier: Set<number>;
  explored: Map<number, CellValues>;
  current: Cell | null;
  expandedCount: number;
  phase: Phase;
  plan: Cell[] | null;
  original: Cell[] | null; // the superseded plan, after a replan
  robot: Cell;
  moves: number;
  costSoFar: number;
  detected: Cell[];
  replans: number;
  status: Status;
  message: string;
  detection: { obstacle: Cell; robot: Cell } | null;
}

export function computeVisual(tl: Timeline, index: number, grid: string[]): VisualState {
  const v: VisualState = {
    frontier: new Set(), explored: new Map(), current: null, expandedCount: 0, phase: "plan",
    plan: null, original: null, robot: tl.start, moves: 0, costSoFar: 0, detected: [], replans: 0,
    status: "ready", message: "", detection: null,
  };
  const n = Math.min(index, tl.steps.length);
  for (let i = 0; i < n; i++) {
    const s = tl.steps[i];
    switch (s.k) {
      case "expand": {
        const k = key(s.cell);
        v.frontier.delete(k);
        v.explored.set(k, { g: s.g, h: s.h, f: s.f, depth: s.depth, order: v.expandedCount++ });
        for (const a of s.adds) if (!v.explored.has(key(a))) v.frontier.add(key(a));
        v.current = s.cell;
        v.phase = s.phase;
        v.status = s.phase === "replan" ? "replanning" : "searching";
        break;
      }
      case "path":
        if (s.variant === "revised") { v.original = v.original ?? v.plan; v.replans++; }
        v.plan = s.path;
        v.current = null;
        v.status = "planned";
        v.message = s.variant === "revised" ? `Revised route found, cost ${s.cost}.` : `Route planned, cost ${s.cost}.`;
        break;
      case "move": {
        v.robot = s.to;
        v.moves++;
        v.costSoFar += CELL_INFO[grid[s.to[0]][s.to[1]] as Sym]?.cost ?? 0;
        v.status = "moving";
        break;
      }
      case "detect":
        v.detected = [...v.detected, s.obstacle];
        v.detection = { obstacle: s.obstacle, robot: s.robot };
        v.status = "detected";
        v.message = `Trolley detected at (${s.obstacle.join(", ")}). Robot stopped at (${s.robot.join(", ")}).`;
        break;
      case "mapUpdate":
        v.message = `Known map updated: (${s.obstacle.join(", ")}) marked impassable.`;
        break;
      case "replanStart":
        v.frontier = new Set();
        v.explored = new Map();
        v.expandedCount = 0;
        v.status = "replanning";
        v.message = `Replanning with A* from the robot's current cell (${s.from.join(", ")}).`;
        break;
      case "replanFail":
        v.replans++;
        v.status = "failed";
        v.current = null;
        v.message = "No alternative route. The destination is unreachable, so the robot stays stopped.";
        break;
      case "resume":
        v.status = "moving";
        break;
      case "noPath":
        v.status = "nopath";
        v.current = null;
        v.message = "No route exists to the destination on the known map.";
        break;
      case "done":
        v.status = s.ok ? "delivered" : v.status === "failed" ? "failed" : "nopath";
        v.message = s.message;
        break;
    }
  }
  return v;
}
