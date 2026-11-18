import { useMemo } from "react";
import { useSim } from "../store/useSim";
import { computeVisual, type VisualState } from "../lib/timeline";

/** Cumulative visual state at the current playback index (recomputed only when it changes). */
export function useVisual(): VisualState | null {
  const timeline = useSim((s) => s.timeline);
  const index = useSim((s) => s.index);
  const grid = useSim((s) => s.grid);
  return useMemo(() => (timeline ? computeVisual(timeline, index, grid) : null), [timeline, index, grid]);
}
