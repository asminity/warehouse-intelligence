import { create } from "zustand";
import { api } from "../services/api";
import type { AlgorithmId, Cell, CompareResponse, ScenarioSummary, SearchResult, TrolleyReport } from "../types/api";
import { paintCell, type Sym } from "../lib/grid";
import { buildSearchTimeline, buildTrolleyTimeline, type Timeline } from "../lib/timeline";

export type View = "simulator" | "trolley" | "compare";
export type CameraPreset = "perspective" | "iso" | "top";
export type Tool = Sym | "inspect";

export interface Toast { id: number; tone: "info" | "ok" | "warn" | "error"; text: string }

/** Progress (0..1) through the current step. Mutated every frame; deliberately not React state. */
export const clock = { progress: 0 };

interface SimState {
  view: View;
  scenarios: ScenarioSummary[];
  scenarioName: string;
  baseGrid: string[];
  grid: string[];
  algorithm: AlgorithmId;
  tool: Tool;
  hover: Cell | null;
  selected: Cell | null;
  camera: CameraPreset;
  cameraNonce: number;
  sensorRange: number;
  lowRacks: boolean;
  busy: boolean;

  searchResult: SearchResult | null;
  trolleyReport: TrolleyReport | null;
  compare: CompareResponse | null;
  visibleRoutes: string[];

  timeline: Timeline | null;
  index: number;
  playing: boolean;
  speed: number;

  toasts: Toast[];

  init: () => Promise<void>;
  setView: (v: View) => void;
  loadScenario: (name: string) => Promise<void>;
  resetMap: () => void;
  setAlgorithm: (a: AlgorithmId) => void;
  setTool: (t: Tool) => void;
  paint: (cell: Cell) => void;
  setHover: (c: Cell | null) => void;
  select: (c: Cell | null) => void;
  setCamera: (p: CameraPreset) => void;
  setSensorRange: (n: number) => void;
  toggleRoute: (name: string) => void;
  toggleLowRacks: () => void;

  runSearch: () => Promise<void>;
  runTrolley: () => Promise<void>;
  runCompare: () => Promise<void>;

  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  stepForward: () => void;
  stepBack: () => void;
  seek: (i: number) => void;
  replay: () => void;
  advance: () => void;
  setSpeed: (s: number) => void;

  toast: (tone: Toast["tone"], text: string) => void;
  dismiss: (id: number) => void;
}

let toastId = 0;

export const useSim = create<SimState>((set, get) => {
  const fail = (e: unknown) => {
    set({ busy: false });
    get().toast("error", e instanceof Error ? e.message : "Something went wrong.");
  };

  const startTimeline = (timeline: Timeline) => {
    clock.progress = 0;
    set({ timeline, index: 0, playing: true });
  };

  /** Results are tied to a map; any edit invalidates all of them. */
  const clearResults = () => {
    clock.progress = 0;
    set({ searchResult: null, trolleyReport: null, compare: null, timeline: null, index: 0, playing: false });
  };

  return {
    view: "simulator",
    scenarios: [],
    scenarioName: "default",
    baseGrid: [],
    grid: [],
    algorithm: "astar",
    tool: "inspect",
    hover: null,
    selected: null,
    camera: "perspective",
    cameraNonce: 0,
    sensorRange: 1,
    lowRacks: false,
    busy: false,
    searchResult: null,
    trolleyReport: null,
    compare: null,
    visibleRoutes: ["BFS", "DFS", "Greedy", "A*"],
    timeline: null,
    index: 0,
    playing: false,
    speed: 1,
    toasts: [],

    init: async () => {
      try {
        const scenarios = await api.scenarios();
        set({ scenarios });
        await get().loadScenario("default");
      } catch (e) {
        fail(e);
      }
    },

    setView: (view) => {
      const s = get();
      const timeline =
        view === "simulator" && s.searchResult
          ? buildSearchTimeline(s.searchResult, s.searchResult.path[0] ?? findStart(s.grid))
          : view === "trolley" && s.trolleyReport
            ? buildTrolleyTimeline(s.trolleyReport)
            : null;
      clock.progress = 0;
      set({ view, timeline, index: timeline ? timeline.steps.length : 0, playing: false, tool: "inspect" });
    },

    loadScenario: async (name) => {
      try {
        set({ busy: true });
        const sc = await api.scenario(name);
        clearResults();
        set({ scenarioName: name, baseGrid: sc.grid, grid: sc.grid, selected: null, busy: false,
              cameraNonce: get().cameraNonce + 1 });
      } catch (e) {
        fail(e);
      }
    },

    resetMap: () => {
      clearResults();
      set({ grid: get().baseGrid, selected: null });
      get().toast("info", "Map reset to the original scenario.");
    },

    setAlgorithm: (algorithm) => set({ algorithm }),
    setTool: (tool) => set({ tool }),

    paint: (cell) => {
      const { tool, grid } = get();
      if (tool === "inspect") return;
      const next = paintCell(grid, cell, tool);
      if (typeof next === "string") return get().toast("warn", next);
      if (next === grid) return;
      clearResults();
      set({ grid: next });
    },

    setHover: (hover) => set({ hover }),
    select: (selected) => set({ selected }),
    setCamera: (camera) => set({ camera, cameraNonce: get().cameraNonce + 1 }),
    setSensorRange: (sensorRange) => set({ sensorRange }),
    toggleRoute: (name) => {
      const v = get().visibleRoutes;
      set({ visibleRoutes: v.includes(name) ? v.filter((x) => x !== name) : [...v, name] });
    },

    toggleLowRacks: () => set({ lowRacks: !get().lowRacks }),

    runSearch: async () => {
      const { grid, algorithm } = get();
      try {
        set({ busy: true });
        const r = await api.search(grid, algorithm);
        set({ searchResult: r, busy: false });
        startTimeline(buildSearchTimeline(r, findStart(grid)));
      } catch (e) {
        fail(e);
      }
    },

    runTrolley: async () => {
      const { grid, sensorRange } = get();
      if (!grid.some((row) => row.includes("T"))) {
        get().toast("warn", "Place a trolley first: pick the Trolley tool and click a cell on the robot's route.");
        return;
      }
      try {
        set({ busy: true });
        const rep = await api.trolley(grid, sensorRange);
        set({ trolleyReport: rep, busy: false });
        startTimeline(buildTrolleyTimeline(rep));
      } catch (e) {
        fail(e);
      }
    },

    runCompare: async () => {
      try {
        set({ busy: true });
        const compare = await api.compare(get().grid);
        set({ compare, busy: false });
      } catch (e) {
        fail(e);
      }
    },

    play: () => {
      const { timeline, index } = get();
      if (!timeline) return;
      if (index >= timeline.steps.length) { clock.progress = 0; set({ index: 0 }); }
      set({ playing: true });
    },
    pause: () => set({ playing: false }),
    togglePlay: () => (get().playing ? get().pause() : get().play()),
    stepForward: () => {
      const { timeline, index } = get();
      if (!timeline) return;
      clock.progress = 0;
      set({ playing: false, index: Math.min(timeline.steps.length, index + 1) });
    },
    stepBack: () => {
      clock.progress = 0;
      set({ playing: false, index: Math.max(0, get().index - 1) });
    },
    seek: (i) => {
      const tl = get().timeline;
      if (!tl) return;
      clock.progress = 0;
      set({ index: Math.max(0, Math.min(tl.steps.length, i)) });
    },
    replay: () => {
      clock.progress = 0;
      set({ index: 0, playing: true });
    },
    advance: () => {
      const { timeline, index } = get();
      if (!timeline) return;
      const next = index + 1;
      set(next >= timeline.steps.length ? { index: timeline.steps.length, playing: false } : { index: next });
    },
    setSpeed: (speed) => set({ speed }),

    toast: (tone, text) => {
      const id = ++toastId;
      set({ toasts: [...get().toasts.slice(-3), { id, tone, text }] });
      window.setTimeout(() => get().dismiss(id), tone === "error" ? 7000 : 4200);
    },
    dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  };
});

// Development-only handle for browser testing (stripped from production builds).
if (import.meta.env.DEV) (window as unknown as { __sim: typeof useSim }).__sim = useSim;

function findStart(grid: string[]): Cell {
  for (let r = 0; r < grid.length; r++) {
    const c = grid[r].indexOf("S");
    if (c >= 0) return [r, c];
  }
  return [0, 0];
}
