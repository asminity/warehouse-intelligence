import { Check, Circle, X } from "lucide-react";
import { useSim } from "../../store/useSim";
import type { VisualState } from "../../lib/timeline";
import { CELL_INFO, key, symAt } from "../../lib/grid";
import { EXPLAIN } from "../../lib/explain";
import { Row, Section, Stat, fmt, fmtCell } from "../ui/primitives";

const STATUS_TEXT: Record<VisualState["status"], { text: string; tone?: "go" | "stop" | "amber" | "route" }> = {
  ready: { text: "Ready" },
  searching: { text: "Searching", tone: "route" },
  planned: { text: "Route planned", tone: "route" },
  moving: { text: "Delivering", tone: "go" },
  detected: { text: "Stopped: obstacle", tone: "stop" },
  replanning: { text: "Replanning", tone: "amber" },
  delivered: { text: "Delivered", tone: "go" },
  failed: { text: "Unreachable", tone: "stop" },
  nopath: { text: "No route", tone: "stop" },
};

export function RobotPanel({ visual }: { visual: VisualState | null }) {
  const st = STATUS_TEXT[visual?.status ?? "ready"];
  return (
    <Section title="Robot">
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Stat label="Status" value={<span className="text-base">{st.text}</span>} tone={st.tone} />
        <Stat label="Position" value={fmtCell(visual?.robot)} />
        <Stat label="Moves so far" value={fmt(visual?.moves ?? 0)} />
        <Stat label="Cost so far" value={fmt(visual?.costSoFar ?? 0)} />
      </div>
    </Section>
  );
}

export function RunPanel() {
  const r = useSim((s) => s.searchResult);
  if (!r) {
    return (
      <Section title="Search result">
        <p className="text-sm text-mute">Choose an algorithm and press <span className="text-ink">Run search</span>. The Python planner returns the route and every expansion, and the warehouse replays them.</p>
      </Section>
    );
  }
  return (
    <Section title={`${r.algorithm} result`} aside={<span className={`text-xs font-semibold ${r.goal_reached ? "text-go" : "text-stop"}`}>{r.goal_reached ? "Goal reached" : "No route"}</span>}>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Stat label="Path length" value={r.path_length === null ? "–" : `${r.path_length} moves`} />
        <Stat label="Total cost" value={fmt(r.total_cost)} tone="amber" />
        <Stat label="Nodes expanded" value={r.nodes_expanded} />
        <Stat label="Search time" value={`${r.execution_time_ms.toFixed(3)} ms`} />
      </div>
      <p className="text-xs text-mute mt-3">Time is the median of 5 runs on the server with event recording off.</p>
    </Section>
  );
}

export function CellPanel({ visual }: { visual: VisualState | null }) {
  const sel = useSim((s) => s.selected);
  const grid = useSim((s) => s.grid);
  const view = useSim((s) => s.view);
  if (!sel || !grid.length) {
    return (
      <Section title="Cell">
        <p className="text-sm text-mute">Select a cell in the warehouse to see its type, cost{view !== "compare" ? " and search values" : ""}.</p>
      </Section>
    );
  }
  const sym = symAt(grid, sel);
  const info = CELL_INFO[sym];
  const vals = visual?.explored.get(key(sel));
  const onFrontier = visual?.frontier.has(key(sel));
  return (
    <Section title={`Cell ${fmtCell(sel)}`}>
      <Row label="Type">{info.label}</Row>
      <Row label="Entry cost">{info.cost ?? "Impassable"}</Row>
      <Row label="Traversal">{info.passable}</Row>
      {vals && (
        <div className="mt-3 pt-3 border-t border-line">
          <div className="text-xs text-mute mb-2">Expanded as node {vals.order + 1}</div>
          {vals.f !== undefined ? (
            <div className="grid grid-cols-3 gap-2 text-center">
              {([["g(n)", vals.g, "cost so far"], ["h(n)", vals.h, "distance to go"], ["f(n)", vals.f, "g + h"]] as const).map(([k, v, hint]) => (
                <div key={k} className="rounded-[4px] bg-raised py-2">
                  <div className="num text-lg font-semibold">{v}</div>
                  <div className="text-[11px] text-mute">{k}, {hint}</div>
                </div>
              ))}
            </div>
          ) : vals.h !== undefined ? (
            <Row label="h(n), Manhattan distance">{vals.h}</Row>
          ) : (
            <Row label="Depth (moves from start)">{vals.depth}</Row>
          )}
        </div>
      )}
      {!vals && onFrontier && <p className="text-xs text-mute mt-2">On the frontier: discovered but not yet expanded.</p>}
    </Section>
  );
}

export function ExplainPanel() {
  const algorithm = useSim((s) => s.algorithm);
  const e = EXPLAIN[algorithm];
  return (
    <Section title={e.title}>
      <p className="text-sm text-soft leading-relaxed">{e.how}</p>
      <Row label="Frontier">{e.frontier}</Row>
      <ul className="mt-2 space-y-1.5">
        {e.guarantees.map((g) => (
          <li key={g} className="text-sm text-soft flex gap-2"><span className="mt-2 size-1.5 rounded-full bg-amber shrink-0" />{g}</li>
        ))}
      </ul>
      <p className="text-xs text-mute mt-3">{e.watch}</p>
    </Section>
  );
}

type StageState = "done" | "active" | "fail" | "todo";

export function TrolleySequence({ visual }: { visual: VisualState | null }) {
  const rep = useSim((s) => s.trolleyReport);
  const tl = useSim((s) => s.timeline);
  const index = useSim((s) => s.index);
  const steps = tl?.steps ?? [];
  const reached = (pred: (k: string) => boolean) => steps.slice(0, index).some((s) => pred(s.k));
  const detected = reached((k) => k === "detect");
  const updated = reached((k) => k === "mapUpdate");
  const replanStarted = reached((k) => k === "replanStart");
  const failed = reached((k) => k === "replanFail");
  const revised = steps.slice(0, index).some((s) => s.k === "path" && s.variant === "revised");
  const planned = steps.slice(0, index).some((s) => s.k === "path");
  const done = visual?.status === "delivered";

  const stages: { label: string; state: StageState; detail?: string }[] = [
    { label: "Plan with A* on the known map", state: planned ? "done" : rep ? "active" : "todo",
      detail: rep?.initial_plan.goal_reached ? `${rep.initial_plan.path_length} moves, cost ${rep.initial_plan.total_cost}` : undefined },
    { label: "Detect the trolley before entering", state: detected ? "done" : planned ? "active" : "todo",
      detail: rep?.detections[0] ? `at ${fmtCell(rep.detections[0].obstacle)}, step ${rep.detections[0].step}` : rep ? "no trolley on the route" : undefined },
    { label: "Mark it impassable on the known map", state: updated ? "done" : detected ? "active" : "todo" },
    { label: "Replan with A* from the current cell", state: failed ? "fail" : revised ? "done" : replanStarted ? "active" : "todo",
      detail: rep?.detections[0] ? `from ${fmtCell(rep.detections[0].robot_position)}` : undefined },
    { label: failed ? "Report the destination unreachable" : "Resume and deliver", state: failed ? "fail" : done ? "done" : revised ? "active" : "todo" },
  ];

  return (
    <Section title="Replanning sequence">
      <ol className="space-y-2.5">
        {stages.map((s) => (
          <li key={s.label} className="flex gap-2.5">
            <span className={`mt-0.5 size-5 shrink-0 rounded-full inline-flex items-center justify-center border
              ${s.state === "done" ? "bg-go/15 border-go text-go" : s.state === "fail" ? "bg-stop/15 border-stop text-stop"
                : s.state === "active" ? "border-amber text-amber" : "border-line-strong text-mute"}`}>
              {s.state === "done" ? <Check size={12} /> : s.state === "fail" ? <X size={12} /> : <Circle size={6} fill="currentColor" />}
            </span>
            <div className="min-w-0">
              <div className={`text-sm ${s.state === "todo" ? "text-mute" : "text-ink"}`}>{s.label}</div>
              {s.detail && <div className="num text-xs text-mute">{s.detail}</div>}
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}

export function TrolleyStats() {
  const rep = useSim((s) => s.trolleyReport);
  const finished = useSim((s) => !!s.timeline && s.index >= s.timeline.steps.length);
  if (rep && !finished) {
    return (
      <Section title="Experiment">
        <p className="text-sm text-mute">Results appear when the replay reaches the end. Drag the timeline to jump ahead.</p>
      </Section>
    );
  }
  if (!rep) {
    return (
      <Section title="Experiment">
        <p className="text-sm text-mute">
          The trolley is in the warehouse but not on the robot's map. Press <span className="text-ink">Run delivery</span> to watch
          the robot detect it, update its map and replan. Place your own with the trolley tool.
        </p>
      </Section>
    );
  }
  const d = rep.detections[0];
  return (
    <Section title="Experiment" aside={<span className={`text-xs font-semibold ${rep.goal_reached ? "text-go" : "text-stop"}`}>{rep.goal_reached ? "Delivered" : "Unreachable"}</span>}>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Stat label="Replans" value={rep.replans} tone="amber" />
        <Stat label="Nodes expanded" value={rep.total_nodes_expanded} />
        <Stat label="Original plan cost" value={fmt(rep.initial_plan.total_cost)} tone="route" />
        <Stat label="Revised plan cost" value={d ? fmt(d.replan.total_cost) : "–"} tone="amber" />
        <Stat label="Moves driven" value={rep.goal_reached ? rep.executed_moves : "–"} />
        <Stat label="Cost driven" value={rep.goal_reached ? rep.executed_cost : "–"} />
      </div>
      <p className="text-xs text-mute mt-3 leading-relaxed">{rep.message}</p>
    </Section>
  );
}
