import { Loader2, Play, RotateCcw } from "lucide-react";
import { useSim } from "../../store/useSim";
import { ALGORITHMS } from "../../lib/grid";
import { Button, Segmented } from "../ui/primitives";

const TITLES = {
  simulator: { title: "Simulator", sub: "Paint the floor plan, pick an algorithm and watch it search." },
  trolley: { title: "Trolley lab", sub: "The robot plans with A*, meets a trolley it didn't know about, and replans." },
  compare: { title: "Compare", sub: "BFS, DFS, Greedy and A* on the same map, each on its own copy." },
};

function ScenarioSelect() {
  const scenarios = useSim((s) => s.scenarios);
  const name = useSim((s) => s.scenarioName);
  const load = useSim((s) => s.loadScenario);
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-mute hidden xl:inline">Map</span>
      <select
        value={name}
        onChange={(e) => load(e.target.value)}
        className="h-9 rounded-[4px] bg-raised border border-line-strong px-2.5 text-ink text-sm font-medium"
        aria-label="Scenario"
      >
        {scenarios.map((s) => (
          <option key={s.name} value={s.name}>
            {s.name.replace(/_/g, " ")} ({s.rows}×{s.cols})
          </option>
        ))}
      </select>
    </label>
  );
}

export function TopBar() {
  const view = useSim((s) => s.view);
  const busy = useSim((s) => s.busy);
  const algorithm = useSim((s) => s.algorithm);
  const setAlgorithm = useSim((s) => s.setAlgorithm);
  const sensor = useSim((s) => s.sensorRange);
  const setSensor = useSim((s) => s.setSensorRange);
  const { runSearch, runTrolley, runCompare, resetMap } = useSim.getState();
  const t = TITLES[view];

  return (
    <header className="flex items-center gap-4 h-14 px-4 border-b border-line bg-shell">
      <div className="min-w-0 flex-1">
        <h1 className="font-cond font-bold text-lg leading-tight">{t.title}</h1>
        <p className="text-xs text-mute truncate">{t.sub}</p>
      </div>
      <ScenarioSelect />
      <Button tone="quiet" onClick={resetMap} title="Restore the selected map">
        <RotateCcw size={15} /> <span className="hidden lg:inline">Reset map</span>
      </Button>
      <div className="w-px h-7 bg-line" />
      {view === "simulator" && (
        <>
          <Segmented
            label="Algorithm"
            value={algorithm}
            onChange={setAlgorithm}
            options={ALGORITHMS.map((a) => ({ value: a.id, label: a.name }))}
          />
          <Button tone="primary" onClick={runSearch} disabled={busy}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />} Run search
          </Button>
        </>
      )}
      {view === "trolley" && (
        <>
          <label className="flex items-center gap-2 text-sm text-mute">
            Sensor range
            <Segmented label="Sensor range" size="sm" value={sensor} onChange={setSensor}
                       options={[1, 2, 3].map((n) => ({ value: n, label: `${n} cell${n > 1 ? "s" : ""}` }))} />
          </label>
          <Button tone="primary" onClick={runTrolley} disabled={busy}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />} Run delivery
          </Button>
        </>
      )}
      {view === "compare" && (
        <Button tone="primary" onClick={runCompare} disabled={busy}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />} Run all four
        </Button>
      )}
    </header>
  );
}
