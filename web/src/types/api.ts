// Typed contracts for the FastAPI backend (server/schemas.py).

export type Cell = [number, number];
export type AlgorithmId = "bfs" | "dfs" | "greedy" | "astar";
export type AlgorithmName = "BFS" | "DFS" | "Greedy" | "A*";

export interface SearchEvent {
  type: "NODE_EXPANDED" | "NODE_DISCOVERED" | "GOAL_FOUND" | "NO_PATH";
  cell?: Cell;
  parent?: Cell;
  path?: Cell[];
  g?: number;
  h?: number;
  f?: number;
  depth?: number;
  frontier?: number;
}

export interface SearchResult {
  algorithm: AlgorithmName;
  goal_reached: boolean;
  path: Cell[];
  path_length: number | null;
  total_cost: number | null;
  nodes_expanded: number;
  max_frontier_size: number;
  execution_time_ms: number;
  explored: Cell[];
  events: SearchEvent[];
  message: string;
}

export interface ScenarioSummary {
  name: string;
  description: string;
  rows: number;
  cols: number;
}

export interface Scenario extends ScenarioSummary {
  grid: string[];
  start: Cell;
  goal: Cell;
  trolleys: Cell[];
}

export interface CompareResponse {
  results: SearchResult[];
  findings: string;
}

export interface TrolleyEvent {
  type:
    | "INITIAL_PLAN"
    | "PLANNING_FAILED"
    | "ROBOT_MOVED"
    | "OBSTACLE_DETECTED"
    | "ROBOT_STOPPED"
    | "MAP_UPDATED"
    | "REPLANNING_STARTED"
    | "NEW_PATH_FOUND"
    | "REPLANNING_FAILED"
    | "ROBOT_RESUMED"
    | "DELIVERY_COMPLETED";
  cell?: Cell;
  robot?: Cell;
  step?: number;
  path?: Cell[];
  cost?: number;
  goal_reached?: boolean;
}

export interface Detection {
  step: number;
  robot_position: Cell;
  obstacle: Cell;
  replan: SearchResult;
}

export interface TrolleyReport {
  scenario: string;
  start: Cell;
  goal: Cell;
  initial_plan: SearchResult;
  detections: Detection[];
  executed_path: Cell[];
  goal_reached: boolean;
  replans: number;
  executed_moves: number;
  executed_cost: number;
  total_nodes_expanded: number;
  events: TrolleyEvent[];
  message: string;
}
