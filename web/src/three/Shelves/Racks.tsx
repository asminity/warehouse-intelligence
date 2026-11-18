import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Cell } from "../../types/api";
import { cellToWorld, hash01 } from "../../lib/grid";

export const RACK_LEVELS = [0.1, 0.6];
export const RACK_HEIGHT = 1.12;

const CARTON = ["#9c7a52", "#8c6c46", "#a8865a", "#7f6243", "#b0916a"];
const WRAPPED = "#8e9cad";

/**
 * Selective pallet racking, one bay per shelf cell. Everything is instanced:
 * uprights, beams, wire decks, pallets and cartons are five draw calls in total.
 */
export function Racks({ cells, rows, cols, low }: { cells: Cell[]; rows: number; cols: number; low: boolean }) {
  const up = useRef<THREE.InstancedMesh>(null);
  const beam = useRef<THREE.InstancedMesh>(null);
  const deck = useRef<THREE.InstancedMesh>(null);
  const pallet = useRef<THREE.InstancedMesh>(null);
  const box = useRef<THREE.InstancedMesh>(null);

  const levels = low ? RACK_LEVELS.slice(0, 1) : RACK_LEVELS;
  const height = low ? 0.42 : RACK_HEIGHT;
  const n = cells.length;
  const counts = useMemo(() => ({ up: n * 4, beam: n * levels.length * 2, deck: n * levels.length, box: n * levels.length * 2 }),
    [n, levels.length]);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    const color = new THREE.Color();
    let iu = 0, ib = 0, id = 0, ix = 0;
    for (const cell of cells) {
      const [x, z] = cellToWorld(cell, rows, cols);
      const [r, c] = cell;
      for (const [dx, dz] of [[-0.43, -0.43], [0.43, -0.43], [-0.43, 0.43], [0.43, 0.43]]) {
        up.current!.setMatrixAt(iu++, m.compose(p.set(x + dx, height / 2, z + dz), q.identity(), s.set(1, height, 1)));
      }
      levels.forEach((y, li) => {
        for (const dz of [-0.43, 0.43]) {
          beam.current!.setMatrixAt(ib++, m.compose(p.set(x, y + 0.08, z + dz), q.identity(), s.set(1, 1, 1)));
        }
        deck.current!.setMatrixAt(id++, m.compose(p.set(x, y + 0.115, z), q.identity(), s.set(1, 1, 1)));
        pallet.current!.setMatrixAt(id - 1, m.compose(p.set(x, y + 0.165, z), q.identity(), s.set(1, 1, 1)));
        // one or two loads per level, deterministic per cell
        const two = hash01(r, c, li) > 0.45;
        const loads = two ? [-0.2, 0.2] : [0];
        for (let k = 0; k < 2; k++) {
          if (k >= loads.length || hash01(r, c, li * 7 + k) < 0.3) {
            box.current!.setMatrixAt(ix, m.compose(p.set(0, -50, 0), q.identity(), s.set(0, 0, 0)));
            box.current!.setColorAt(ix++, color.set("#000"));
            continue;
          }
          const w = two ? 0.36 : 0.72;
          const h = 0.18 + hash01(r, c, li * 13 + k) * 0.2;
          const dd = 0.62 + hash01(c, r, li + k) * 0.18;
          box.current!.setMatrixAt(ix, m.compose(p.set(x + loads[k], y + 0.19 + h / 2, z), q.identity(), s.set(w, h, dd)));
          const wrapped = hash01(r, c, 99 + li + k) > 0.9;
          box.current!.setColorAt(ix++, color.set(wrapped ? WRAPPED : CARTON[Math.floor(hash01(r, c, li + 3 * k) * CARTON.length)]));
        }
      });
    }
    for (const ref of [up, beam, deck, pallet, box]) ref.current!.instanceMatrix.needsUpdate = true;
    if (box.current!.instanceColor) box.current!.instanceColor.needsUpdate = true;
    box.current!.computeBoundingSphere();
  }, [cells, rows, cols, levels, height]);

  return (
    <group>
      <instancedMesh ref={up} args={[undefined, undefined, counts.up]} castShadow receiveShadow>
        <boxGeometry args={[0.07, 1, 0.07]} />
        <meshStandardMaterial color="#2d63b4" metalness={0.55} roughness={0.38} />
      </instancedMesh>
      <instancedMesh ref={beam} args={[undefined, undefined, counts.beam]} castShadow>
        <boxGeometry args={[0.94, 0.08, 0.05]} />
        <meshStandardMaterial color="#e2681c" metalness={0.45} roughness={0.42} />
      </instancedMesh>
      <instancedMesh ref={deck} args={[undefined, undefined, counts.deck]} receiveShadow castShadow>
        <boxGeometry args={[0.9, 0.012, 0.86]} />
        <meshStandardMaterial color="#7c8794" metalness={0.7} roughness={0.5} />
      </instancedMesh>
      <instancedMesh ref={pallet} args={[undefined, undefined, counts.deck]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 0.09, 0.78]} />
        <meshStandardMaterial color="#8a6a45" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={box} args={[undefined, undefined, counts.box]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.85} />
      </instancedMesh>
    </group>
  );
}
