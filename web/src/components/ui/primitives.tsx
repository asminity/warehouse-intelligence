import type { ButtonHTMLAttributes, ReactNode } from "react";

type Tone = "primary" | "ghost" | "quiet";

export function Button({ tone = "ghost", className = "", children, ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone }) {
  const tones: Record<Tone, string> = {
    primary: "bg-amber text-[#16110a] font-semibold hover:bg-[#ffbc1f] disabled:bg-raised disabled:text-mute",
    ghost: "border border-line-strong text-ink hover:bg-raised disabled:text-mute",
    quiet: "text-soft hover:text-ink hover:bg-raised disabled:text-mute",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 h-9 px-3.5 rounded-[4px] text-sm transition-colors ${tones[tone]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function IconButton({ label, active, children, className = "", ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }) {
  return (
    <button
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={`inline-flex items-center justify-center size-9 rounded-[4px] transition-colors
        ${active ? "bg-amber/15 text-amber" : "text-soft hover:text-ink hover:bg-raised"} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Segmented<T extends string | number>({ value, options, onChange, label, size = "md" }: {
  value: T; options: { value: T; label: ReactNode; title?: string }[]; onChange: (v: T) => void; label: string; size?: "sm" | "md";
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-[4px] border border-line-strong p-0.5 bg-shell">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            role="radio"
            aria-checked={on}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={`${size === "sm" ? "h-7 px-2 text-xs" : "h-8 px-3 text-sm"} rounded-[3px] font-cond font-semibold transition-colors
              ${on ? "bg-raised text-ink shadow-[inset_0_-2px_0_var(--color-amber)]" : "text-mute hover:text-ink"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="px-4 py-4 border-b border-line">
      <header className="flex items-center justify-between mb-3">
        <h2 className="panel-title">{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  );
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: "go" | "stop" | "amber" | "route" }) {
  const color = tone === "go" ? "text-go" : tone === "stop" ? "text-stop" : tone === "amber" ? "text-amber" : tone === "route" ? "text-route" : "text-ink";
  return (
    <div className="min-w-0">
      <div className="text-xs text-mute">{label}</div>
      <div className={`num text-xl font-semibold leading-tight mt-0.5 ${color}`}>{value}</div>
    </div>
  );
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 text-sm">
      <span className="text-mute">{label}</span>
      <span className="num text-ink text-right">{children}</span>
    </div>
  );
}

export const fmtCell = (c: [number, number] | null | undefined) => (c ? `(${c[0]}, ${c[1]})` : "–");
export const fmt = (v: number | null | undefined, digits = 0) =>
  v === null || v === undefined ? "–" : digits ? v.toFixed(digits) : String(v);
