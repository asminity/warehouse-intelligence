import { useLayoutEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Cell } from "../../types/api";
import { cellToWorld, hash01 } from "../../lib/grid";
import { crowdTexture, hazardTexture, meshFenceTexture } from "../Materials/textures";

const CAGE_H = 1.05;

function useInstances(
  ref: React.RefObject<THREE.InstancedMesh | null>,
  cells: Cell[],
  rows: number,
  cols: number,
  place: (x: number, z: number, cell: Cell, m: THREE.Matrix4) => void,
) {
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return; // nothing rendered for this zone type on the current map
    const m = new THREE.Matrix4();
    cells.forEach((cell, i) => {
      const [x, z] = cellToWorld(cell, rows, cols);
      place(x, z, cell, m);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cells, rows, cols]);
}

/** Restricted zones: hazard-striped floor inside a red welded-mesh safety cage. */
export function RestrictedZones({ cells, rows, cols }: { cells: Cell[]; rows: number; cols: number }) {
  const floor = useRef<THREE.InstancedMesh>(null);
  const cage = useRef<THREE.InstancedMesh>(null);
  useInstances(floor, cells, rows, cols, (x, z, _c, m) => m.makeRotationX(-Math.PI / 2).setPosition(x, 0.008, z));
  useInstances(cage, cells, rows, cols, (x, z, _c, m) => m.makeTranslation(x, CAGE_H / 2, z));
  if (!cells.length) return null;
  return (
    <group>
      <instancedMesh ref={floor} args={[undefined, undefined, cells.length]} receiveShadow>
        <planeGeometry args={[0.98, 0.98]} />
        <meshStandardMaterial map={hazardTexture()} roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={cage} args={[undefined, undefined, cells.length]} castShadow>
        <boxGeometry args={[0.98, CAGE_H, 0.98]} />
        <meshStandardMaterial map={meshFenceTexture()} alphaTest={0.4} side={THREE.DoubleSide}
                              metalness={0.4} roughness={0.5} emissive="#5a1214" />
      </instancedMesh>
    </group>
  );
}

/** Crowded aisles: amber floor marking plus warehouse staff in hi-vis vests (cost 4 to cross). */
export function CrowdedZones({ cells, rows, cols }: { cells: Cell[]; rows: number; cols: number }) {
  const floor = useRef<THREE.InstancedMesh>(null);
  const body = useRef<THREE.InstancedMesh>(null);
  const head = useRef<THREE.InstancedMesh>(null);
  const legs = useRef<THREE.InstancedMesh>(null);
  useInstances(floor, cells, rows, cols, (x, z, _c, m) => m.makeRotationX(-Math.PI / 2).setPosition(x, 0.01, z));

  // One worker per crowded cell, placed deterministically; they sway slightly.
  const people = cells.map(([r, c]) => {
    const [x, z] = cellToWorld([r, c], rows, cols);
    return {
      x: x + (hash01(r, c, 1) - 0.5) * 0.4,
      z: z + (hash01(r, c, 2) - 0.5) * 0.4,
      rot: hash01(r, c, 3) * Math.PI * 2,
      phase: hash01(r, c, 4) * 6.28,
      tall: 0.92 + hash01(r, c, 5) * 0.14,
    };
  });

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3(1, 1, 1);
  useFrame(({ clock }) => {
    if (!body.current || !head.current || !legs.current) return;
    const t = clock.elapsedTime;
    people.forEach((w, i) => {
      const sway = Math.sin(t * 1.3 + w.phase) * 0.05;
      q.setFromEuler(e.set(0, w.rot + sway * 3, sway * 0.4));
      body.current!.setMatrixAt(i, m.compose(p.set(w.x, 0.6 * w.tall, w.z), q, s.set(1, w.tall, 1)));
      head.current!.setMatrixAt(i, m.compose(p.set(w.x + sway * 0.4, 0.98 * w.tall, w.z), q, s.set(1, 1, 1)));
      legs.current!.setMatrixAt(i, m.compose(p.set(w.x, 0.22 * w.tall, w.z), q, s.set(1, w.tall, 1)));
    });
    body.current.instanceMatrix.needsUpdate = true;
    head.current.instanceMatrix.needsUpdate = true;
    legs.current.instanceMatrix.needsUpdate = true;
  });

  if (!cells.length) return null;
  return (
    <group>
      <instancedMesh ref={floor} args={[undefined, undefined, cells.length]}>
        <planeGeometry args={[0.98, 0.98]} />
        <meshStandardMaterial map={crowdTexture()} transparent depthWrite={false} roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={legs} args={[undefined, undefined, cells.length]} castShadow frustumCulled={false}>
        <boxGeometry args={[0.2, 0.44, 0.13]} />
        <meshStandardMaterial color="#27303d" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={body} args={[undefined, undefined, cells.length]} castShadow frustumCulled={false}>
        <capsuleGeometry args={[0.13, 0.26, 4, 10]} />
        <meshStandardMaterial color="#ff9d1c" emissive="#7a3d00" emissiveIntensity={0.35} roughness={0.55} />
      </instancedMesh>
      <instancedMesh ref={head} args={[undefined, undefined, cells.length]} castShadow frustumCulled={false}>
        <sphereGeometry args={[0.085, 14, 12]} />
        <meshStandardMaterial color="#f3d23a" roughness={0.4} />
      </instancedMesh>
    </group>
  );
}
