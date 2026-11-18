import type { AlgorithmId } from "../types/api";

export const EXPLAIN: Record<AlgorithmId, { title: string; how: string; frontier: string; guarantees: string[]; watch: string }> = {
  bfs: {
    title: "Breadth-First Search",
    how: "Expands cells in the order they were discovered, one ring of moves at a time.",
    frontier: "FIFO queue",
    guarantees: [
      "Finds a route with the fewest moves.",
      "Ignores cell costs, so a crowded shortcut can make its route expensive.",
    ],
    watch: "The explored area grows as an even wave from the packing station.",
  },
  dfs: {
    title: "Depth-First Search",
    how: "Follows one direction as far as it can (up, right, down, left), then backtracks.",
    frontier: "LIFO stack",
    guarantees: [
      "Finds a route if one exists on this finite grid.",
      "No guarantee of fewest moves or lowest cost.",
    ],
    watch: "Long corridors explored to the end before it tries anything else.",
  },
  greedy: {
    title: "Greedy Best-First Search",
    how: "Always expands the cell that looks closest to the destination, f(n) = h(n).",
    frontier: "Priority queue on h(n)",
    guarantees: [
      "Usually expands few cells.",
      "Ignores the cost already paid, so its route can be long or expensive.",
    ],
    watch: "A narrow beam heading straight at the dispatch area, even through crowds.",
  },
  astar: {
    title: "A* Search",
    how: "Expands the cell with the lowest f(n) = g(n) + h(n): cost so far plus Manhattan distance to go.",
    frontier: "Priority queue on f(n)",
    guarantees: [
      "Finds the lowest-cost route.",
      "Manhattan distance never overestimates: each move costs at least 1 and covers at most 1 unit of distance.",
    ],
    watch: "Select an explored cell to read its g, h and f values.",
  },
};
