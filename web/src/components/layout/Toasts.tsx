import { CheckCircle2, Info, TriangleAlert, X, XCircle } from "lucide-react";
import { useSim } from "../../store/useSim";

const ICON = { info: Info, ok: CheckCircle2, warn: TriangleAlert, error: XCircle };
const COLOR = { info: "text-route", ok: "text-go", warn: "text-amber", error: "text-stop" };

export function Toasts() {
  const toasts = useSim((s) => s.toasts);
  const dismiss = useSim((s) => s.dismiss);
  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 w-[min(380px,calc(100vw-2rem))]" role="status" aria-live="polite">
      {toasts.map((t) => {
        const Icon = ICON[t.tone];
        return (
          <div key={t.id} className="toast-in flex items-start gap-2.5 rounded-[4px] border border-line-strong bg-panel/95 backdrop-blur px-3 py-2.5 shadow-lg shadow-black/40">
            <Icon size={17} className={`${COLOR[t.tone]} mt-0.5 shrink-0`} />
            <p className="text-sm text-ink flex-1">{t.text}</p>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-mute hover:text-ink"><X size={15} /></button>
          </div>
        );
      })}
    </div>
  );
}
