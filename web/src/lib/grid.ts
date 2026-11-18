// Grid helpers shared by the 3D scene and the UI. These only describe the map;
// all searching happens in Python.
import type { AlgorithmId, AlgorithmName, Cell } from "../types/api";

export type Sym = "." | "~" | "#" | "X" | "S" | "G" | "T";

export const CELL_INFO: Record<Sym, { label: string; cost: number | null; passable: string }> = {
  ".": { label: "Normal aisle", cost: 1, passable: "Passable" },
  "~": { label: "Crowded aisle", cost: 4, passable: "Passable, slow" },
  "#": { label: "Shelf rack", cost: null, passable: "Impassable" },
  X: { label: "Restricted zone", cost: null, passable: "Impassable" },
  S: { label: "Packing station (start)", cost: 1, passable: "Passable" },
  G: { label: "Dispatch area (destination)", cost: 1, passable: "Passable" },
  T: { label: "Trolley", cost: null, passable: "Impassable once detected" },
};

// Categorical colours validated for the dark surface (adjacent-pair CVD + normal-vision checks).
// Blue/violet are close for protan readers, so every use pairs colour with a second cue:
// a per-algorithm line pattern in 3D and the algorithm name on chart axes.
export const ALGORITHMS: { id: AlgorithmId; name: AlgorithmName; color: string; dash: [number, number] | null }[] = [
  { id: "bfs", name: "BFS", color: "#3987e5", dash: null },
  { id: "dfs", name: "DFS", color: "#d95926", dash: [0.34, 0.16] },
  { id: "greedy", name: "Greedy", color: "#9085e9", dash: [0.07, 0.11] },
  { id: "astar", name: "A*", color: "#199e70", dash: [0.6, 0.08] },
];

export const algoDash = (name: string) => ALGORITHMS.find((a) => a.name === name)?.dash ?? null;

export const algoColor = (name: string) => ALGORITHMS.find((a) => a.name === name)?.color ?? "#3ea6ff";

export const symAt = (grid: string[], [r, c]: Cell): Sym => grid[r][c] as Sym;

export function findAll(grid: string[], sym: Sym): Cell[] {
  const out: Cell[] = [];
  grid.forEach((row, r) => [...row].forEach((ch, c) => ch === sym && out.push([r, c])));
  return out;
}

export const key = ([r, c]: Cell) => r * 1000 + c;
export const sameCell = (a: Cell | null | undefined, b: Cell | null | undefined) =>
  !!a && !!b && a[0] === b[0] && a[1] === b[1];

/** World position of a cell centre. One cell = one world unit; grid centred on the origin. */
export function cellToWorld([r, c]: Cell, rows: number, cols: number): [number, number] {
  return [c - cols / 2 + 0.5, r - rows / 2 + 0.5];
}

export function worldToCell(x: number, z: number, rows: number, cols: number): Cell | null {
  const c = Math.floor(x + cols / 2);
  const r = Math.floor(z + rows / 2);
  return r >= 0 && r < rows && c >= 0 && c < cols ? [r, c] : null;
}

/** Edit a cell, enforcing the map rules. Returns the new grid or an error message. */
export function paintCell(grid: string[], cell: Cell, sym: Sym): string[] | string {
  const [r, c] = cell;
  const cur = grid[r][c] as Sym;
  if (cur === sym) return grid;
  const rows = grid.map((row) => [...row]);
  if (sym === "S" || sym === "G") {
    if (cur === "S" || cur === "G") return "Start and destination can't share a cell.";
    if (cur === "#" || cur === "X" || cur === "T") {
      return `Can't place the ${sym === "S" ? "start" : "destination"} inside a ${CELL_INFO[cur].label.toLowerCase()}.`;
    }
    for (const row of rows) {
      const i = row.indexOf(sym);
      if (i >= 0) row[i] = ".";
    }
    rows[r][c] = sym;
  } else {
    if (cur === "S" || cur === "G") return "Move the start or destination with its own tool before painting over it.";
    rows[r][c] = sym;
  }
  return rows.map((row) => row.join(""));
}

export function gridStats(grid: string[]) {
  let passable = 0, shelves = 0, restricted = 0, crowded = 0, trolleys = 0;
  for (const row of grid)
    for (const ch of row) {
      if (ch === "#") shelves++;
      else if (ch === "X") restricted++;
      else if (ch === "T") trolleys++;
      else passable++;
      if (ch === "~") crowded++;
    }
  return { total: grid.length * grid[0].length, passable, shelves, restricted, crowded, trolleys };
}

/** Deterministic pseudo-random in [0,1) from a cell, for stable decoration. */
export function hash01(r: number, c: number, salt = 0) {
  let h = (r * 374761393 + c * 668265263 + salt * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
