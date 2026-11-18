import { Box, Eye, Layers, MousePointer2, Rotate3d, ScanLine, TriangleAlert, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useSim, type Tool } from "../../store/useSim";
import type { VisualState } from "../../lib/timeline";
import { IconButton } from "../ui/primitives";

const TOOLS: { id: Tool; label: string; swatch: string; key: string }[] = [
  { id: "inspect", label: "Inspect cells", swatch: "", key: "V" },
  { id: ".", label: "Normal aisle (cost 1)", swatch: "#4a4f57", key: "1" },
  { id: "~", label: "Crowded aisle (cost 4)", swatch: "#b07a12", key: "2" },
  { id: "#", label: "Shelf rack", swatch: "#2d63b4", key: "3" },
  { id: "X", label: "Restricted zone", swatch: "#c8343a", key: "4" },
  { id: "T", label: "Trolley (unknown to robot)", swatch: "#e5484d", key: "5" },
  { id: "S", label: "Move start", swatch: "#2bc48a", key: "6" },
  { id: "G", label: "Move destination", swatch: "#f2a900", key: "7" },
];

export function ToolPalette({ tools }: { tools?: Tool[] }) {
  const tool = useSim((s) => s.tool);
  const setTool = useSim((s) => s.setTool);
  const list = tools ? TOOLS.filter((t) => tools.includes(t.id)) : TOOLS;
  return (
    <div role="toolbar" aria-label="Floor editing tools"
         className="absolute top-3 left-3 flex flex-col gap-0.5 p-1 rounded-[5px] bg-shell/90 border border-line backdrop-blur">
      {list.map((t) => (
        <IconButton key={t.id} label={`${t.label} (${t.key})`} active={tool === t.id} onClick={() => setTool(t.id)}>
          {t.id === "inspect" ? (
            <MousePointer2 size={16} />
          ) : (
            <span className="size-4 rounded-[2px] border border-white/25" style={{ background: t.swatch }}>
              {t.id === "T" && <span className="block text-[9px] font-bold leading-4 text-center text-white">T</span>}
              {t.id === "S" && <span className="block text-[9px] font-bold leading-4 text-center text-[#08130d]">S</span>}
              {t.id === "G" && <span className="block text-[9px] font-bold leading-4 text-center text-[#1b1300]">G</span>}
            </span>
          )}
        </IconButton>
      ))}
    </div>
  );
}

export function ViewControls() {
  const camera = useSim((s) => s.camera);
  const setCamera = useSim((s) => s.setCamera);
  const low = useSim((s) => s.lowRacks);
  const toggleLow = useSim((s) => s.toggleLowRacks);
  return (
    <div className="absolute top-3 right-3 flex items-center gap-0.5 p-1 rounded-[5px] bg-shell/90 border border-line backdrop-blur">
      <IconButton label="Perspective view (8)" active={camera === "perspective"} onClick={() => setCamera("perspective")}><Rotate3d size={16} /></IconButton>
      <IconButton label="Isometric view (9)" active={camera === "iso"} onClick={() => setCamera("iso")}><Box size={16} /></IconButton>
      <IconButton label="Top-down view (0)" active={camera === "top"} onClick={() => setCamera("top")}><ScanLine size={16} /></IconButton>
      <span className="w-px h-6 bg-line mx-0.5" />
      <IconButton label={low ? "Show full-height racks (L)" : "Lower racks to see the aisles (L)"} active={low} onClick={toggleLow}>
        {low ? <Layers size={16} /> : <Eye size={16} />}
      </IconButton>
    </div>
  );
}

export function Legend({ mode }: { mode: "search" | "trolley" | "compare" }) {
  const items: { label: string; el: React.ReactNode }[] = mode === "compare" ? [] : [
    { label: "Explored", el: <span className="size-3 rounded-[2px] bg-gradient-to-r from-[#163f66] to-[#4fb7ff]" /> },
    { label: "Frontier", el: <span className="size-3 rounded-[2px] border-2 border-[#e9f1ff]" /> },
    { label: "Expanding", el: <span className="size-3 rounded-[2px] bg-white" /> },
    { label: mode === "trolley" ? "Original route" : "Route", el: <span className="w-4 h-1 rounded bg-route" /> },
  ];
  if (mode === "trolley") {
    items.push({ label: "Revised route", el: <span className="w-4 h-1 rounded bg-amber" /> });
    items.push({ label: "Replan search", el: <span className="size-3 rounded-[2px] bg-gradient-to-r from-[#5a3a06] to-[#ffb21a]" /> });
  }
  items.push(
    { label: "Crowded, cost 4", el: <span className="size-3 rounded-[2px] border border-dashed border-amber bg-amber/30" /> },
    { label: "Restricted", el: <span className="size-3 rounded-[2px]" style={{ background: "repeating-linear-gradient(45deg,#c8343a 0 3px,#e9e4d8 3px 6px)" }} /> },
  );
  return (
    <div className="absolute bottom-3 left-3 flex flex-wrap gap-x-4 gap-y-1.5 max-w-[calc(100%-1.5rem)] px-3 py-2 rounded-[5px] bg-shell/90 border border-line backdrop-blur text-xs text-soft">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">{i.el}{i.label}</span>
      ))}
    </div>
  );
}

/** One banner at the top of the viewport describing the current moment. */
export function StatusBanner({ visual, busy }: { visual: VisualState | null; busy: boolean }) {
  if (busy) {
    return <Banner tone="info" icon={<Loader2 size={16} className="animate-spin" />} text="Planning on the server…" />;
  }
  if (!visual) return null;
  const { status, message } = visual;
  if (status === "detected") return <Banner tone="stop" pulse icon={<TriangleAlert size={16} />} text={message} />;
  if (status === "replanning") return <Banner tone="amber" icon={<Loader2 size={16} className="animate-spin" />} text={message || "Replanning…"} />;
  if (status === "failed" || status === "nopath") return <Banner tone="stop" icon={<XCircle size={16} />} text={message} />;
  if (status === "delivered") return <Banner tone="go" icon={<CheckCircle2 size={16} />} text={message} />;
  return null;
}

function Banner({ tone, icon, text, pulse }: { tone: "info" | "stop" | "amber" | "go"; icon: React.ReactNode; text: string; pulse?: boolean }) {
  const tones = {
    info: "border-route/50 text-ink",
    stop: "border-stop bg-[#3a1014]/95 text-[#ffdcdd]",
    amber: "border-amber/70 text-ink",
    go: "border-go/60 text-ink",
  };
  const iconTone = { info: "text-route", stop: "text-stop", amber: "text-amber", go: "text-go" };
  return (
    <div role="status" className={`absolute top-3 left-1/2 -translate-x-1/2 max-w-[min(620px,calc(100%-14rem))] flex items-center gap-2.5 px-3.5 py-2 rounded-[5px] border bg-shell/95 backdrop-blur text-sm font-medium ${tones[tone]} ${pulse ? "alert-pulse" : ""}`}>
      <span className={iconTone[tone]}>{icon}</span>
      <span>{text}</span>
    </div>
  );
}
