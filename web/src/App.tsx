import { lazy, Suspense, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useSim, type Tool } from "./store/useSim";
import { useVisual } from "./hooks/useVisual";
import { Sidebar } from "./components/layout/Sidebar";
import { TopBar } from "./components/layout/TopBar";
import { Timeline } from "./components/layout/Timeline";
import { Toasts } from "./components/layout/Toasts";
import { SceneBoundary } from "./components/layout/SceneBoundary";
import { Legend, StatusBanner, ToolPalette, ViewControls } from "./components/simulator/ViewportOverlays";
import { CellPanel, ExplainPanel, RobotPanel, RunPanel, TrolleySequence, TrolleyStats } from "./components/simulator/InspectorPanels";
import { CompareCharts, ComparePanel, ComparisonTable } from "./components/analytics/CompareViews";
import { Segmented } from "./components/ui/primitives";

const Scene = lazy(() => import("./three/Scene"));

const TOOL_KEYS: Record<string, Tool> = { v: "inspect", "1": ".", "2": "~", "3": "#", "4": "X", "5": "T", "6": "S", "7": "G" };

function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, select, textarea") || e.metaKey || e.ctrlKey || e.altKey) return;
      const s = useSim.getState();
      const k = e.key.toLowerCase();
      if (e.key === " ") { e.preventDefault(); s.togglePlay(); }
      else if (e.key === "ArrowRight") s.stepForward();
      else if (e.key === "ArrowLeft") s.stepBack();
      else if (k === "r") s.replay();
      else if (k === "l") s.toggleLowRacks();
      else if (k === "8") s.setCamera("perspective");
      else if (k === "9") s.setCamera("iso");
      else if (k === "0") s.setCamera("top");
      else if (k === "escape") s.select(null);
      else if (TOOL_KEYS[k] && s.view !== "compare") {
        const t = TOOL_KEYS[k];
        if (s.view === "trolley" && t !== "inspect" && t !== "T") return;
        s.setTool(t);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

function Viewport() {
  const view = useSim((s) => s.view);
  const busy = useSim((s) => s.busy);
  const ready = useSim((s) => s.grid.length > 0);
  const scenario = useSim((s) => s.scenarioName);
  const visual = useVisual();
  return (
    <div className="relative flex-1 min-h-[320px] bg-bay overflow-hidden">
      {ready ? (
        <SceneBoundary resetKey={scenario}>
          <Suspense fallback={<SceneLoading />}>
            <Scene />
          </Suspense>
        </SceneBoundary>
      ) : (
        <SceneLoading />
      )}
      {view === "simulator" && <ToolPalette />}
      {view === "trolley" && <ToolPalette tools={["inspect", "T"]} />}
      <ViewControls />
      {view !== "compare" && <StatusBanner visual={visual} busy={busy} />}
      <Legend mode={view === "simulator" ? "search" : view === "trolley" ? "trolley" : "compare"} />
    </div>
  );
}

function SceneLoading() {
  return (
    <div className="absolute inset-0 flex items-center justify-center gap-2 text-mute text-sm">
      <Loader2 size={16} className="animate-spin" /> Loading the warehouse…
    </div>
  );
}

function Inspector() {
  const view = useSim((s) => s.view);
  const visual = useVisual();
  return (
    <aside aria-label="Inspector" className="w-[320px] shrink-0 border-l border-line bg-panel overflow-y-auto scroll-thin max-[1100px]:w-full max-[1100px]:border-l-0 max-[1100px]:border-t">
      {view === "simulator" && (<><RunPanel /><RobotPanel visual={visual} /><CellPanel visual={visual} /><ExplainPanel /></>)}
      {view === "trolley" && (<><TrolleySequence visual={visual} /><TrolleyStats /><RobotPanel visual={visual} /><CellPanel visual={visual} /></>)}
      {view === "compare" && (<><ComparePanel /><CellPanel visual={null} /></>)}
    </aside>
  );
}

function CompareDock() {
  const compare = useSim((s) => s.compare);
  const [tab, setTab] = useState<"table" | "charts">("table");
  if (!compare) {
    return (
      <div className="border-t border-line bg-shell px-5 py-4 text-sm text-mute">
        The comparison table and charts appear here after you run all four algorithms.
      </div>
    );
  }
  return (
    <div className="border-t border-line bg-shell px-5 pt-3 pb-4 h-[236px] flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <Segmented label="Comparison view" size="sm" value={tab} onChange={setTab}
                   options={[{ value: "table", label: "Table" }, { value: "charts", label: "Charts" }]} />
        <span className="text-xs text-mute">Same map, separate copies. Times are server medians of 5 runs.</span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto scroll-thin">
        {tab === "table" ? <ComparisonTable results={compare.results} /> : <CompareCharts results={compare.results} />}
      </div>
    </div>
  );
}

export default function App() {
  const view = useSim((s) => s.view);
  useShortcuts();
  useEffect(() => { void useSim.getState().init(); }, []);

  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar />
        <div className="flex-1 min-h-0 flex max-[1100px]:flex-col max-[1100px]:overflow-y-auto">
          <main className="flex-1 min-w-0 flex flex-col max-[1100px]:min-h-[70vh]">
            <Viewport />
            {view === "compare" ? <CompareDock /> : <Timeline />}
          </main>
          <Inspector />
        </div>
      </div>
      <Toasts />
    </div>
  );
}
