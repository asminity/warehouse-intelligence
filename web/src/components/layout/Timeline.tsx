import { useMemo } from "react";
import { Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import { useSim } from "../../store/useSim";
import type { Step } from "../../lib/timeline";
import { IconButton, Segmented } from "../ui/primitives";

function describe(step: Step | undefined): string {
  if (!step) return "Finished.";
  switch (step.k) {
    case "expand": {
      const vals = step.f !== undefined ? `  g ${step.g}  h ${step.h}  f ${step.f}` : step.h !== undefined ? `  h ${step.h}` : step.depth !== undefined ? `  depth ${step.depth}` : "";
      return `${step.phase === "replan" ? "Replanning: e" : "E"}xpanding (${step.cell.join(", ")})${vals}`;
    }
    case "path": return step.variant === "revised" ? "New route found" : "Route returned by the search";
    case "move": return `Moving to (${step.to.join(", ")})`;
    case "detect": return `Obstacle detected at (${step.obstacle.join(", ")}). Robot stops.`;
    case "mapUpdate": return "Updating the robot's known map";
    case "replanStart": return `Starting A* from (${step.from.join(", ")})`;
    case "replanFail": return "Replanning failed: no alternative route";
    case "resume": return "Robot resumes";
    case "noPath": return "No route found";
    case "done": return step.message;
  }
}

export function Timeline() {
  const tl = useSim((s) => s.timeline);
  const index = useSim((s) => s.index);
  const playing = useSim((s) => s.playing);
  const speed = useSim((s) => s.speed);
  const { togglePlay, stepForward, stepBack, replay, seek, setSpeed } = useSim.getState();
  const total = tl?.steps.length ?? 0;

  // Markers for key moments: route found, detection, failure
  const marks = useMemo(() => {
    if (!tl) return [];
    return tl.steps.flatMap((s, i) =>
      s.k === "detect" || s.k === "replanFail" ? [{ i, color: "var(--color-stop)" }]
      : s.k === "path" ? [{ i, color: s.variant === "revised" ? "var(--color-amber)" : "var(--color-route)" }]
      : []);
  }, [tl]);

  return (
    <div className="flex items-center gap-3 h-16 px-4 border-t border-line bg-shell">
      <div className="flex items-center gap-0.5">
        <IconButton label="Step back (←)" onClick={stepBack} disabled={!tl}><SkipBack size={17} /></IconButton>
        <button
          onClick={togglePlay}
          disabled={!tl}
          aria-label={playing ? "Pause (space)" : "Play (space)"}
          title={playing ? "Pause (space)" : "Play (space)"}
          className="size-10 mx-1 rounded-full bg-ink text-shell inline-flex items-center justify-center hover:bg-white disabled:bg-raised disabled:text-mute"
        >
          {playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
        </button>
        <IconButton label="Step forward (→)" onClick={stepForward} disabled={!tl}><SkipForward size={17} /></IconButton>
        <IconButton label="Replay (R)" onClick={replay} disabled={!tl}><RotateCcw size={16} /></IconButton>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-xs mb-0.5">
          <span className="text-soft truncate">{tl ? describe(index < total ? tl.steps[index] : undefined) : "Run a search to replay its events here."}</span>
          <span className="num text-mute shrink-0 ml-3">{tl ? `Event ${Math.min(index, total)} of ${total}` : ""}</span>
        </div>
        <div className="relative">
          <input
            type="range"
            className="scrubber"
            min={0}
            max={total}
            value={Math.min(index, total)}
            disabled={!tl}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="Playback position"
          />
          {marks.map((m) => (
            <span key={m.i} className="absolute top-[15px] w-[3px] h-[7px] rounded-sm pointer-events-none"
                  style={{ left: `calc(${(m.i / Math.max(1, total)) * 100}% - 1px)`, background: m.color }} />
          ))}
        </div>
      </div>

      <Segmented
        label="Playback speed"
        size="sm"
        value={speed}
        onChange={setSpeed}
        options={[0.5, 1, 2, 4].map((v) => ({ value: v, label: `${v}×` }))}
      />
    </div>
  );
}
