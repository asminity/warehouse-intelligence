import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { claddingTexture, concreteTexture } from "../Materials/textures";

const MARGIN = 3;
const WALL_H = 4.2;

/** Floor slab, grid lines, perimeter safety tape, back walls and steel columns. */
export function Building({ rows, cols }: { rows: number; cols: number }) {
  const w = cols + MARGIN * 2;
  const d = rows + MARGIN * 2;

  const floorTex = useMemo(() => {
    const t = concreteTexture().clone();
    t.needsUpdate = true;
    t.repeat.set(w / 4, d / 4);
    return t;
  }, [w, d]);
  const wallTex = useMemo(() => {
    const t = claddingTexture().clone();
    t.needsUpdate = true;
    t.repeat.set(Math.max(w, d) / 2, 1);
    return t;
  }, [w, d]);

  const gridGeo = useMemo(() => {
    const pts: number[] = [];
    const x0 = -cols / 2, z0 = -rows / 2;
    for (let c = 0; c <= cols; c++) pts.push(x0 + c, 0, z0, x0 + c, 0, z0 + rows);
    for (let r = 0; r <= rows; r++) pts.push(x0, 0, z0 + r, x0 + cols, 0, z0 + r);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [rows, cols]);

  // Steel columns along the two back walls
  const columns = useMemo(() => {
    const out: [number, number][] = [];
    for (let x = -w / 2 + 1; x <= w / 2 - 0.5; x += 4) out.push([x, -d / 2 + 0.25]);
    for (let z = -d / 2 + 4; z <= d / 2 - 0.5; z += 4) out.push([-w / 2 + 0.25, z]);
    return out;
  }, [w, d]);
  const colRef = useRef<THREE.InstancedMesh>(null);
  const baseRef = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    columns.forEach(([x, z], i) => {
      colRef.current!.setMatrixAt(i, m.makeTranslation(x, WALL_H / 2, z));
      baseRef.current!.setMatrixAt(i, m.makeTranslation(x, 0.3, z));
    });
    colRef.current!.instanceMatrix.needsUpdate = true;
    baseRef.current!.instanceMatrix.needsUpdate = true;
  }, [columns]);

  const tape = useMemo(() => {
    const x = cols / 2 + 0.12, z = rows / 2 + 0.12;
    return [
      { p: [0, 0.006, -z] as const, s: [cols + 0.36, 0.1] as const },
      { p: [0, 0.006, z] as const, s: [cols + 0.36, 0.1] as const },
      { p: [-x, 0.006, 0] as const, s: [0.1, rows + 0.36] as const },
      { p: [x, 0.006, 0] as const, s: [0.1, rows + 0.36] as const },
    ];
  }, [rows, cols]);

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={floorTex} roughness={0.62} metalness={0.05} color="#9aa1aa" />
      </mesh>
      <lineSegments geometry={gridGeo} position-y={0.004}>
        <lineBasicMaterial color="#8fa3bd" transparent opacity={0.16} />
      </lineSegments>
      {tape.map((t, i) => (
        <mesh key={i} position={t.p as unknown as [number, number, number]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={t.s as unknown as [number, number]} />
          <meshStandardMaterial color="#f2a900" roughness={0.5} />
        </mesh>
      ))}
      {/* back walls */}
      <mesh position={[0, WALL_H / 2, -d / 2]} receiveShadow>
        <planeGeometry args={[w, WALL_H]} />
        <meshStandardMaterial map={wallTex} roughness={0.7} metalness={0.4} />
      </mesh>
      <mesh position={[-w / 2, WALL_H / 2, 0]} rotation-y={Math.PI / 2} receiveShadow>
        <planeGeometry args={[d, WALL_H]} />
        <meshStandardMaterial map={wallTex} roughness={0.7} metalness={0.4} />
      </mesh>
      {/* wall kick plates */}
      <mesh position={[0, 0.25, -d / 2 + 0.02]}>
        <planeGeometry args={[w, 0.5]} />
        <meshStandardMaterial color="#3a4352" roughness={0.6} />
      </mesh>
      <mesh position={[-w / 2 + 0.02, 0.25, 0]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[d, 0.5]} />
        <meshStandardMaterial color="#3a4352" roughness={0.6} />
      </mesh>
      <instancedMesh ref={colRef} args={[undefined, undefined, columns.length]} castShadow>
        <boxGeometry args={[0.32, WALL_H, 0.32]} />
        <meshStandardMaterial color="#4b5668" metalness={0.6} roughness={0.4} />
      </instancedMesh>
      <instancedMesh ref={baseRef} args={[undefined, undefined, columns.length]}>
        <boxGeometry args={[0.38, 0.6, 0.38]} />
        <meshStandardMaterial color="#f2a900" roughness={0.55} />
      </instancedMesh>
    </group>
  );
}
