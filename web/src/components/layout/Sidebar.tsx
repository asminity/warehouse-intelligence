import { useState } from "react";
import { BarChart3, Box, PanelLeftClose, PanelLeftOpen, TriangleAlert } from "lucide-react";
import { useSim, type View } from "../../store/useSim";

const NAV: { id: View; label: string; hint: string; icon: typeof Box }[] = [
  { id: "simulator", label: "Simulator", hint: "Edit the floor and run one algorithm", icon: Box },
  { id: "trolley", label: "Trolley lab", hint: "Obstacle detection and replanning", icon: TriangleAlert },
  { id: "compare", label: "Compare", hint: "All four algorithms on one map", icon: BarChart3 },
];

export function Mark() {
  return (
    <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
      <rect x="1" y="1" width="30" height="30" rx="5" fill="#141c28" stroke="#2f3e55" />
      <path d="M6 22h20M6 16h20M6 10h20" stroke="#233044" strokeWidth="1" />
      <path d="M8 22V12h8v6h8" fill="none" stroke="#3ea6ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="20" y="15" width="7" height="6" rx="1.5" fill="#f2a900" />
    </svg>
  );
}

export function Sidebar() {
  const view = useSim((s) => s.view);
  const setView = useSim((s) => s.setView);
  const [open, setOpen] = useState(() => window.innerWidth > 1280);

  return (
    <nav aria-label="Main" className={`flex flex-col bg-shell border-r border-line transition-[width] duration-200 ${open ? "w-56" : "w-[60px]"}`}>
      <div className="flex items-center gap-2.5 h-14 px-3.5 border-b border-line">
        <Mark />
        {open && (
          <div className="leading-tight min-w-0">
            <div className="font-cond font-bold text-[15px] tracking-wide">Warehouse Intelligence</div>
            <div className="text-[11px] text-mute">Route planning lab</div>
          </div>
        )}
      </div>
      <ul className="flex-1 py-3 px-2 space-y-1">
        {NAV.map(({ id, label, hint, icon: Icon }) => {
          const on = view === id;
          return (
            <li key={id}>
              <button
                onClick={() => setView(id)}
                title={open ? hint : `${label}: ${hint}`}
                aria-current={on ? "page" : undefined}
                className={`relative w-full flex items-center gap-3 h-10 px-2.5 rounded-[4px] text-sm transition-colors
                  ${on ? "bg-raised text-ink" : "text-mute hover:text-ink hover:bg-raised/60"}`}
              >
                {on && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-amber" />}
                <Icon size={18} className={on ? "text-amber" : ""} />
                {open && <span className="font-medium">{label}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 h-11 px-4 border-t border-line text-mute hover:text-ink text-sm"
        aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
      >
        {open ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
        {open && "Collapse"}
      </button>
    </nav>
  );
}
