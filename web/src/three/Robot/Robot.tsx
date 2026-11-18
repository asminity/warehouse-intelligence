import { useMemo, useRef } from "react";
import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Cell } from "../../types/api";
import { cellToWorld } from "../../lib/grid";
import type { Status } from "../../lib/timeline";
import { clock } from "../../store/useSim";

const STATUS_COLOR: Record<Status, string> = {
  ready: "#3ea6ff",
  searching: "#3ea6ff",
  planned: "#3ea6ff",
  moving: "#2bc48a",
  detected: "#ff3b45",
  replanning: "#f2a900",
  delivered: "#2bc48a",
  failed: "#ff3b45",
  nopath: "#ff3b45",
};

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const WHEEL_R = 0.085;

/**
 * Autonomous mobile robot (AMR): low graphite chassis, four wheels, front LiDAR,
 * light bar, safety scanner field and a carton on its lift deck.
 * Position comes from the replayed backend path; `to` is the cell it is moving to.
 */
export function Robot({ at, to, rows, cols, status }: { at: Cell; to: Cell | null; rows: number; cols: number; status: Status }) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const wheels = useRef<THREE.Group[]>([]);
  const lidar = useRef<THREE.Mesh>(null);
  const scan = useRef<THREE.Mesh>(null);
  const lightMat = useRef<THREE.MeshStandardMaterial>(null);
  const xray = useRef<THREE.MeshBasicMaterial>(null);
  const heading = useRef<number | null>(null);
  const locator = useRef<THREE.Mesh>(null);
  const last = useRef(new THREE.Vector3());

  const color = useMemo(() => new THREE.Color(STATUS_COLOR[status]), [status]);

  useFrame((_, dt) => {
    if (!root.current) return;
    const [ax, az] = cellToWorld(at, rows, cols);
    let x = ax, z = az;
    if (to) {
      const [bx, bz] = cellToWorld(to, rows, cols);
      const p = ease(Math.min(1, clock.progress));
      x = ax + (bx - ax) * p;
      z = az + (bz - az) * p;
      const target = Math.atan2(bx - ax, bz - az);
      if (heading.current === null) heading.current = target;
      let diff = target - heading.current;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      heading.current += diff * Math.min(1, dt * 12);
    }
    if (heading.current === null) heading.current = 0;
    const moved = last.current.distanceTo(new THREE.Vector3(x, 0, z));
    last.current.set(x, 0, z);
    root.current.position.set(x, 0, z);
    root.current.rotation.y = heading.current;
    for (const w of wheels.current) if (w) w.rotation.x += moved / WHEEL_R;

    const t = performance.now() / 1000;
    if (lidar.current) lidar.current.rotation.y = t * 8;
    if (locator.current) {
      const k = (t * 0.8) % 1;
      locator.current.scale.setScalar(1 + k * 0.6);
      const lm = locator.current.material as THREE.MeshBasicMaterial;
      lm.opacity = 0.75 * (1 - k);
      lm.color.copy(color);
    }
    if (body.current) body.current.position.y = to ? Math.sin(t * 22) * 0.004 : 0;
    if (scan.current) {
      const m = scan.current.material as THREE.MeshBasicMaterial;
      m.opacity = (status === "detected" ? 0.35 : 0.13) + Math.sin(t * 4) * 0.05;
      m.color.copy(status === "detected" ? color : new THREE.Color("#5fd0ff"));
    }
    if (lightMat.current) {
      lightMat.current.emissive.copy(color);
      lightMat.current.color.copy(color);
      lightMat.current.emissiveIntensity = status === "detected" || status === "failed" ? 1.6 + Math.sin(t * 10) : 1.6;
    }
  });

  return (
    <group ref={root}>
      {/* locator ring: pulses in the status colour so the robot is easy to find */}
      <mesh ref={locator} rotation-x={-Math.PI / 2} position-y={0.03}>
        <ringGeometry args={[0.5, 0.56, 48]} />
        <meshBasicMaterial transparent depthWrite={false} toneMapped={false} />
      </mesh>
      {/* contact shadow */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.006}>
        <circleGeometry args={[0.42, 32]} />
        <meshBasicMaterial color="#000" transparent opacity={0.35} depthWrite={false} />
      </mesh>
      {/* safety scanner field, in front of the robot */}
      <mesh ref={scan} rotation-x={-Math.PI / 2} position={[0, 0.02, 0.28]}>
        <circleGeometry args={[0.75, 40, Math.PI / 2 - 0.8, 1.6]} />
        <meshBasicMaterial transparent opacity={0.15} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {/* x-ray silhouette: drawn only where racks hide the robot (reversed depth test) */}
      <mesh position={[0, 0.3, 0]} renderOrder={20}>
        <boxGeometry args={[0.62, 0.56, 0.78]} />
        <meshBasicMaterial ref={xray} color="#9fd8ff" transparent opacity={0.6} depthWrite={false}
                           depthFunc={THREE.GreaterDepth} toneMapped={false} />
      </mesh>
      <group ref={body}>
        <RoundedBox args={[0.6, 0.2, 0.74]} radius={0.07} smoothness={4} position={[0, 0.18, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#2b323d" metalness={0.55} roughness={0.35} />
        </RoundedBox>
        {/* lower skirt */}
        <RoundedBox args={[0.64, 0.07, 0.78]} radius={0.03} smoothness={3} position={[0, 0.095, 0]} castShadow>
          <meshStandardMaterial color="#171b21" roughness={0.7} />
        </RoundedBox>
        {/* amber side stripes */}
        {[-0.302, 0.302].map((dx) => (
          <mesh key={dx} position={[dx, 0.2, 0]}>
            <boxGeometry args={[0.004, 0.035, 0.6]} />
            <meshStandardMaterial color="#f2a900" emissive="#f2a900" emissiveIntensity={0.4} />
          </mesh>
        ))}
        {/* status light bar wrapping the front */}
        <mesh position={[0, 0.235, 0.371]}>
          <boxGeometry args={[0.46, 0.03, 0.01]} />
          <meshStandardMaterial ref={lightMat} toneMapped={false} />
        </mesh>
        {/* front sensor face */}
        <mesh position={[0, 0.15, 0.372]}>
          <boxGeometry args={[0.34, 0.07, 0.01]} />
          <meshStandardMaterial color="#05070a" metalness={0.9} roughness={0.1} />
        </mesh>
        {[-0.1, 0.1].map((dx) => (
          <mesh key={dx} position={[dx, 0.15, 0.379]}>
            <circleGeometry args={[0.018, 16]} />
            <meshStandardMaterial color="#5fd0ff" emissive="#5fd0ff" emissiveIntensity={2} toneMapped={false} />
          </mesh>
        ))}
        {/* lift deck */}
        <RoundedBox args={[0.5, 0.035, 0.6]} radius={0.015} smoothness={2} position={[0, 0.3, 0]} castShadow>
          <meshStandardMaterial color="#5d6878" metalness={0.7} roughness={0.3} />
        </RoundedBox>
        {/* LiDAR puck */}
        <mesh position={[0, 0.32, 0.24]} castShadow>
          <cylinderGeometry args={[0.055, 0.06, 0.05, 24]} />
          <meshStandardMaterial color="#11151a" metalness={0.6} roughness={0.25} />
        </mesh>
        <mesh ref={lidar} position={[0, 0.355, 0.24]}>
          <cylinderGeometry args={[0.045, 0.045, 0.025, 6]} />
          <meshStandardMaterial color="#3a4250" emissive="#5fd0ff" emissiveIntensity={0.6} />
        </mesh>
        {/* carton with tape */}
        <mesh position={[0, 0.455, -0.06]} castShadow>
          <boxGeometry args={[0.38, 0.27, 0.34]} />
          <meshStandardMaterial color="#c49a63" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.592, -0.06]}>
          <boxGeometry args={[0.08, 0.004, 0.345]} />
          <meshStandardMaterial color="#d8c7a0" roughness={0.4} />
        </mesh>
        <mesh position={[0.1, 0.5, 0.111]}>
          <planeGeometry args={[0.1, 0.07]} />
          <meshStandardMaterial color="#f1f1ec" roughness={0.6} />
        </mesh>
      </group>
      {/* wheels */}
      {[[-0.3, 0.24], [0.3, 0.24], [-0.3, -0.24], [0.3, -0.24]].map(([dx, dz], i) => (
        <group key={i} position={[dx, WHEEL_R, dz]} ref={(g) => { if (g) wheels.current[i] = g; }}>
          <mesh rotation-z={Math.PI / 2} castShadow>
            <cylinderGeometry args={[WHEEL_R, WHEEL_R, 0.05, 20]} />
            <meshStandardMaterial color="#121418" roughness={0.9} />
          </mesh>
          <mesh rotation-z={Math.PI / 2} position-x={dx > 0 ? 0.026 : -0.026}>
            <cylinderGeometry args={[0.04, 0.04, 0.004, 12]} />
            <meshStandardMaterial color="#9aa6b4" metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
