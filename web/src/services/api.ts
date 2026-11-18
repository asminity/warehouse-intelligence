import type {
  AlgorithmId,
  CompareResponse,
  Scenario,
  ScenarioSummary,
  SearchResult,
  TrolleyReport,
} from "../types/api";

export class ApiError extends Error {}

async function request<T>(path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Can't reach the planning server. Start it with: uvicorn server.app:app");
  }
  if (!res.ok) {
    let detail = `Request failed (${res.status}).`;
    try {
      const data = await res.json();
      if (typeof data.detail === "string") detail = data.detail;
      else if (Array.isArray(data.detail) && data.detail[0]?.msg) detail = String(data.detail[0].msg);
    } catch {
      /* keep generic message */
    }
    throw new ApiError(detail);
  }
  return (await res.json()) as T;
}

export const api = {
  scenarios: () => request<ScenarioSummary[]>("/api/scenarios"),
  scenario: (name: string) => request<Scenario>(`/api/scenarios/${encodeURIComponent(name)}`),
  search: (grid: string[], algorithm: AlgorithmId) => request<SearchResult>("/api/search", { grid, algorithm }),
  compare: (grid: string[]) => request<CompareResponse>("/api/compare", { grid }),
  trolley: (grid: string[], sensor_range: number) =>
    request<TrolleyReport>("/api/trolley-demo", { grid, sensor_range }),
};
