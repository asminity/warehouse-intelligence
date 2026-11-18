import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Cell } from "../../types/api";
import { cellToWorld, key } from "../../lib/grid";
import type { VisualState } from "../../lib/timeline";

export const EXPLORE_COLORS = {
  planOld: new THREE.Color("#163f66"),
  planNew: new THREE.Color("#4fb7ff"),
  replanOld: new THREE.Color("#5a3a06"),
  replanNew: new THREE.Color("#ffb21a"),
  frontier: new THREE.Color("#e9f1ff"),
};

/**
 * Search overlay replayed from backend events: explored cells glow by recency,
 * frontier cells are outlined pale, the cell being expanded gets a light column.
 */
export function Exploration({ visual, rows, cols }: { visual: VisualState | null; rows: number; cols: number }) {
  const tiles = useRef<THREE.InstancedMesh>(null);
  const front = useRef<THREE.InstancedMesh>(null);
  const beam = useRef<THREE.Group>(null);
  const count = rows * cols;
  const cells = useMemo(() => {
    const out: Cell[] = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push([r, c]);
    return out;
  }, [rows, cols]);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
    const col = new THREE.Color();
    const rot = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
    const replan = visual?.phase === "replan";
    const n = Math.max(1, visual?.expandedCount ?? 1);
    cells.forEach((cell, i) => {
      const k = key(cell);
      const [x, z] = cellToWorld(cell, rows, cols);
      const ex = visual?.explored.get(k);
      if (ex) {
        const recency = Math.pow(ex.order / n, 1.6);
        col.copy(replan ? EXPLORE_COLORS.replanOld : EXPLORE_COLORS.planOld)
          .lerp(replan ? EXPLORE_COLORS.replanNew : EXPLORE_COLORS.planNew, 0.25 + 0.75 * recency);
        tiles.current!.setMatrixAt(i, m.copy(rot).setPosition(x, 0.018, z));
        tiles.current!.setColorAt(i, col);
      } else {
        tiles.current!.setMatrixAt(i, hidden);
        tiles.current!.setColorAt(i, col.set("#000"));
      }
      front.current!.setMatrixAt(i, visual?.frontier.has(k) ? m.copy(rot).setPosition(x, 0.02, z) : hidden);
    });
    tiles.current!.instanceMatrix.needsUpdate = true;
    if (tiles.current!.instanceColor) tiles.current!.instanceColor.needsUpdate = true;
    front.current!.instanceMatrix.needsUpdate = true;
  }, [visual, cells, rows, cols]);

  useFrame(({ clock }) => {
    if (!beam.current) return;
    const cur = visual?.current;
    beam.current.visible = !!cur;
    if (cur) {
      const [x, z] = cellToWorld(cur, rows, cols);
      beam.current.position.set(x, 0, z);
      beam.current.scale.y = 0.9 + Math.sin(clock.elapsedTime * 12) * 0.1;
    }
  });

  const beamColor = visual?.phase === "replan" ? "#ffb21a" : "#7fd0ff";
  return (
    <group>
      <instancedMesh ref={tiles} args={[undefined, undefined, count]} frustumCulled={false} renderOrder={2}>
        <planeGeometry args={[0.9, 0.9]} />
        <meshBasicMaterial transparent opacity={0.62} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={front} args={[undefined, undefined, count]} frustumCulled={false} renderOrder={3}>
        <ringGeometry args={[0.3, 0.37, 4, 1, Math.PI / 4]} />
        <meshBasicMaterial color={EXPLORE_COLORS.frontier} transparent opacity={0.85} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <group ref={beam} visible={false}>
        <mesh position-y={0.9}>
          <cylinderGeometry args={[0.3, 0.42, 1.8, 24, 1, true]} />
          <meshBasicMaterial color={beamColor} transparent opacity={0.16} depthWrite={false} side={THREE.DoubleSide}
                             blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} position-y={0.024}>
          <planeGeometry args={[0.92, 0.92]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.85} toneMapped={false} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}
