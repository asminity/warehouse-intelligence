import { useMemo, useRef } from "react";
import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { Cell } from "../../types/api";
import { cellToWorld } from "../../lib/grid";

type LineRef = { material: { dashOffset: number } } | null;

/** A route drawn as a floor strip with moving chevron-like dashes along the direction of travel. */
export function Route({ path, rows, cols, color, width = 0.12, dashed = false, flowing = true, offset = 0, y = 0.05, pattern, glow = true }: {
  path: Cell[]; rows: number; cols: number; color: string; width?: number;
  dashed?: boolean; flowing?: boolean; offset?: number; y?: number;
  pattern?: [number, number] | null; glow?: boolean;
}) {
  const ref = useRef<LineRef>(null);
  const points = useMemo(
    () => path.map((c) => {
      const [x, z] = cellToWorld(c, rows, cols);
      return [x + offset, y, z + offset] as [number, number, number];
    }),
    [path, rows, cols, offset, y],
  );
  useFrame((_, dt) => {
    if (flowing && ref.current) ref.current.material.dashOffset -= dt * 1.2;
  });
  if (points.length < 2) return null;
  return (
    <group>
      {!dashed && glow && (
        <Line points={points} color={color} lineWidth={width * 2.2} worldUnits transparent opacity={0.22}
              depthWrite={false} toneMapped={false} />
      )}
      <Line
        ref={ref as never}
        points={points}
        color={color}
        lineWidth={width}
        worldUnits
        dashed={dashed || flowing || !!pattern}
        dashSize={pattern ? pattern[0] : dashed ? 0.18 : 0.42}
        gapSize={pattern ? pattern[1] : dashed ? 0.14 : 0.12}
        toneMapped={false}
        transparent
        opacity={dashed ? 0.7 : 1}
        depthWrite={false}
      />
    </group>
  );
}
