import { Download } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell as BarCell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SearchResult } from "../../types/api";
import { algoColor, algoDash } from "../../lib/grid";
import { useSim } from "../../store/useSim";
import { Button, Section, fmt } from "../ui/primitives";

function DashSample({ name }: { name: string }) {
  const dash = algoDash(name);
  return (
    <svg width="26" height="8" aria-hidden className="shrink-0">
      <line x1="1" y1="4" x2="25" y2="4" stroke={algoColor(name)} strokeWidth="3" strokeLinecap="round"
            strokeDasharray={dash ? `${dash[0] * 18} ${dash[1] * 18}` : undefined} />
    </svg>
  );
}

/** Best values are marked with weight + a word, never by colour alone. */
export function ComparisonTable({ results }: { results: SearchResult[] }) {
  const ok = results.filter((r) => r.goal_reached);
  const best = {
    moves: Math.min(...ok.map((r) => r.path_length!)),
    cost: Math.min(...ok.map((r) => r.total_cost!)),
    nodes: Math.min(...ok.map((r) => r.nodes_expanded)),
  };
  const cell = (v: number | null, b: number) =>
    v === null ? <span className="text-mute">–</span> : v === b ? <span className="font-semibold text-ink">{v} <span className="text-[10px] text-amber align-middle">best</span></span> : <span className="text-soft">{v}</span>;
  return (
    <div className="overflow-x-auto scroll-thin">
      <table className="w-full text-sm num">
        <caption className="sr-only">Algorithm comparison on the current map</caption>
        <thead>
          <tr className="text-mute text-xs text-left border-b border-line">
            <th className="font-medium py-2 pr-3">Algorithm</th>
            <th className="font-medium py-2 px-3">Goal reached</th>
            <th className="font-medium py-2 px-3 text-right">Moves</th>
            <th className="font-medium py-2 px-3 text-right">Total cost</th>
            <th className="font-medium py-2 px-3 text-right">Nodes expanded</th>
            <th className="font-medium py-2 px-3 text-right">Max frontier</th>
            <th className="font-medium py-2 pl-3 text-right">Time (ms)</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.algorithm} className="border-b border-line/60">
              <td className="py-2 pr-3"><span className="inline-flex items-center gap-2 font-sans font-semibold"><DashSample name={r.algorithm} />{r.algorithm}</span></td>
              <td className={`py-2 px-3 ${r.goal_reached ? "text-go" : "text-stop"}`}>{r.goal_reached ? "Yes" : "No"}</td>
              <td className="py-2 px-3 text-right">{cell(r.path_length, best.moves)}</td>
              <td className="py-2 px-3 text-right">{cell(r.total_cost, best.cost)}</td>
              <td className="py-2 px-3 text-right">{r.goal_reached ? cell(r.nodes_expanded, best.nodes) : <span className="text-soft">{r.nodes_expanded}</span>}</td>
              <td className="py-2 px-3 text-right text-soft">{r.max_frontier_size}</td>
              <td className="py-2 pl-3 text-right text-soft">{r.execution_time_ms.toFixed(3)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const METRICS: { key: keyof SearchResult; title: string; digits: number }[] = [
  { key: "execution_time_ms", title: "Execution time (ms)", digits: 3 },
  { key: "nodes_expanded", title: "Nodes expanded", digits: 0 },
  { key: "path_length", title: "Path length (moves)", digits: 0 },
  { key: "total_cost", title: "Total path cost", digits: 0 },
];

function MetricChart({ results, metric }: { results: SearchResult[]; metric: (typeof METRICS)[number] }) {
  const data = results.map((r) => ({ name: r.algorithm, value: r[metric.key] as number | null }));
  return (
    <figure className="min-w-0">
      <figcaption className="text-xs text-soft mb-1">{metric.title}</figcaption>
      <div className="h-[150px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 16, right: 4, bottom: 0, left: -18 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="#233044" />
            <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: "#2f3e55" }} tick={{ fill: "#b4c0cf", fontSize: 11 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: "#7d8ca1", fontSize: 10 }} width={44} />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              contentStyle={{ background: "#141c28", border: "1px solid #2f3e55", borderRadius: 4, fontSize: 12 }}
              labelStyle={{ color: "#e4eaf2", fontWeight: 600 }}
              itemStyle={{ color: "#b4c0cf" }}
              formatter={(v) => [v === null || v === undefined ? "No route" : Number(v).toFixed(metric.digits), metric.title]}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={30} isAnimationActive={false}
                 label={{ position: "top", fill: "#b4c0cf", fontSize: 10, formatter: (v: unknown) => (v === null || v === undefined ? "n/a" : Number(v).toFixed(metric.digits)) }}>
              {data.map((d) => <BarCell key={d.name} fill={algoColor(d.name)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

export function CompareCharts({ results }: { results: SearchResult[] }) {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-x-5 gap-y-3">
      {METRICS.map((m) => <MetricChart key={m.key} results={results} metric={m} />)}
    </div>
  );
}

export function exportCsv(results: SearchResult[], scenario: string, findings: string) {
  const header = ["Algorithm", "Goal reached", "Moves", "Total cost", "Nodes expanded", "Max frontier", "Time (ms)"];
  const rows = results.map((r) => [r.algorithm, r.goal_reached ? "Yes" : "No", fmt(r.path_length), fmt(r.total_cost),
    r.nodes_expanded, r.max_frontier_size, r.execution_time_ms.toFixed(4)]);
  const notes = findings.split("\n").map((l) => [`# ${l.replace(/^- /, "")}`]);
  const csv = [header, ...rows, [], [`# Scenario: ${scenario}`], ...notes]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: `comparison_${scenario}.csv` });
  a.click();
  URL.revokeObjectURL(url);
}

export function ComparePanel() {
  const compare = useSim((s) => s.compare);
  const visible = useSim((s) => s.visibleRoutes);
  const toggle = useSim((s) => s.toggleRoute);
  const scenario = useSim((s) => s.scenarioName);
  if (!compare) {
    return (
      <Section title="Findings">
        <p className="text-sm text-mute">Press <span className="text-ink">Run all four</span>. Each algorithm runs on its own copy of this map; the routes appear side by side on the floor.</p>
      </Section>
    );
  }
  return (
    <>
      <Section title="Routes on the floor">
        <ul className="space-y-1">
          {compare.results.map((r) => (
            <li key={r.algorithm}>
              <label className="flex items-center gap-2.5 text-sm py-1 cursor-pointer">
                <input type="checkbox" className="accent-amber size-4" checked={visible.includes(r.algorithm)}
                       onChange={() => toggle(r.algorithm)} disabled={!r.goal_reached} />
                <DashSample name={r.algorithm} />
                <span className="font-semibold w-14">{r.algorithm}</span>
                <span className="num text-mute text-xs">{r.goal_reached ? `${r.path_length} moves, cost ${r.total_cost}` : "no route"}</span>
              </label>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Findings" aside={
        <Button tone="quiet" className="h-7 px-2 text-xs" onClick={() => exportCsv(compare.results, scenario, compare.findings)}>
          <Download size={14} /> Export CSV
        </Button>}>
        <ul className="space-y-2">
          {compare.findings.split("\n").map((l) => (
            <li key={l} className="text-sm text-soft leading-relaxed flex gap-2"><span className="mt-2 size-1.5 rounded-full bg-amber shrink-0" />{l.replace(/^- /, "")}</li>
          ))}
        </ul>
        <p className="text-xs text-mute mt-3">Generated by the Python planner from the measured results. Times are medians of 5 runs.</p>
      </Section>
    </>
  );
}
