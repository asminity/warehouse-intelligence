import { useMemo, useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { Cell } from "../../types/api";
import { cellToWorld, sameCell, worldToCell } from "../../lib/grid";
import { useSim } from "../../store/useSim";

function Outline({ cell, rows, cols, color, y = 0.03 }: { cell: Cell; rows: number; cols: number; color: string; y?: number }) {
  const geo = useMemo(() => {
    const h = 0.48;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute([-h, 0, -h, h, 0, -h, h, 0, h, -h, 0, h], 3));
    return g;
  }, []);
  const [x, z] = cellToWorld(cell, rows, cols);
  return (
    <lineLoop geometry={geo} position={[x, y, z]} renderOrder={5}>
      <lineBasicMaterial color={color} toneMapped={false} depthTest={false} transparent />
    </lineLoop>
  );
}

/** Invisible pick plane over the grid: hover, select, and paint-drag in edit mode. */
export function Interaction({ rows, cols, editable }: { rows: number; cols: number; editable: boolean }) {
  const hover = useSim((s) => s.hover);
  const selected = useSim((s) => s.selected);
  const tool = useSim((s) => s.tool);
  const dragging = useRef(false);
  const lastPainted = useRef<Cell | null>(null);

  const toCell = (e: ThreeEvent<PointerEvent>) => worldToCell(e.point.x, e.point.z, rows, cols);
  const painting = editable && tool !== "inspect";

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    const c = toCell(e);
    const s = useSim.getState();
    if (!sameCell(c, s.hover)) s.setHover(c);
    if (painting && dragging.current && c && !sameCell(c, lastPainted.current) && tool !== "S" && tool !== "G") {
      lastPainted.current = c;
      s.paint(c);
    }
  };
  const onDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return;
    const c = toCell(e);
    if (!c) return;
    e.stopPropagation();
    const s = useSim.getState();
    if (painting) {
      dragging.current = true;
      lastPainted.current = c;
      s.paint(c);
    }
    s.select(c);
  };
  const end = () => { dragging.current = false; lastPainted.current = null; };

  return (
    <group>
      <mesh
        rotation-x={-Math.PI / 2}
        position-y={0.002}
        onPointerMove={onMove}
        onPointerDown={onDown}
        onPointerUp={end}
        onPointerLeave={() => { end(); useSim.getState().setHover(null); }}
      >
        <planeGeometry args={[cols, rows]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {hover && <Outline cell={hover} rows={rows} cols={cols} color={painting ? "#f2a900" : "#cfe3ff"} />}
      {selected && <Outline cell={selected} rows={rows} cols={cols} color="#f2a900" y={0.035} />}
    </group>
  );
}
