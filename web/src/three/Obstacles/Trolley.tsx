import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Label } from "../Warehouse/Stations";

export type TrolleyState = "unknown" | "detected" | "ghost";

/**
 * A picking trolley: steel deck, caster wheels, push handle and a stack of totes.
 * "unknown"  – physically present but not on the robot's map (Trolley Lab, before detection)
 * "detected" – on the robot's known map: red warning ring and beacon
 * "ghost"    – shown in the planner views, where trolleys are ignored by design
 */
export function Trolley({ x, z, state }: { x: number; z: number; state: TrolleyState }) {
  const ring = useRef<THREE.Mesh>(null);
  const beacon = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ring.current) {
      const s = 1 + ((t * 0.9) % 1) * 0.5;
      ring.current.scale.set(s, s, s);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = state === "detected" ? 0.8 * (1 - ((t * 0.9) % 1)) : 0.35;
    }
    if (beacon.current) beacon.current.emissiveIntensity = state === "detected" ? 1.5 + Math.sin(t * 9) * 1.3 : 0.2;
  });
  const ghost = state === "ghost";
  const steel = (
    <meshStandardMaterial color="#9aa6b4" metalness={0.75} roughness={0.32} transparent={ghost} opacity={ghost ? 0.4 : 1} />
  );
  return (
    <group position={[x, 0, z]} rotation-y={0.35}>
      {state !== "ghost" && (
        <mesh position={[0, 0.4, 0]} renderOrder={19}>
          <boxGeometry args={[0.74, 0.8, 0.52]} />
          <meshBasicMaterial color="#e5484d" transparent opacity={state === "detected" ? 0.5 : 0.22}
                             depthWrite={false} depthFunc={THREE.GreaterDepth} toneMapped={false} />
        </mesh>
      )}
      {/* deck */}
      <mesh position={[0, 0.17, 0]} castShadow={!ghost}>
        <boxGeometry args={[0.72, 0.05, 0.5]} />
        {steel}
      </mesh>
      {/* casters */}
      {[[-0.3, -0.19], [0.3, -0.19], [-0.3, 0.19], [0.3, 0.19]].map(([dx, dz]) => (
        <mesh key={`${dx}${dz}`} position={[dx, 0.065, dz]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.06, 0.06, 0.04, 16]} />
          <meshStandardMaterial color="#1b1f25" roughness={0.8} transparent={ghost} opacity={ghost ? 0.4 : 1} />
        </mesh>
      ))}
      {/* handle */}
      {[-0.2, 0.2].map((dz) => (
        <mesh key={dz} position={[-0.34, 0.5, dz]} castShadow={!ghost}>
          <cylinderGeometry args={[0.015, 0.015, 0.66, 8]} />
          {steel}
        </mesh>
      ))}
      <mesh position={[-0.34, 0.83, 0]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.02, 0.02, 0.44, 8]} />
        <meshStandardMaterial color="#e5484d" roughness={0.5} transparent={ghost} opacity={ghost ? 0.4 : 1} />
      </mesh>
      {/* totes */}
      {[0, 1].map((i) => (
        <mesh key={i} position={[0.06, 0.29 + i * 0.2, 0]} castShadow={!ghost}>
          <boxGeometry args={[0.5 - i * 0.04, 0.19, 0.4 - i * 0.04]} />
          <meshStandardMaterial color={i ? "#2d63b4" : "#c9a06b"} roughness={0.7} transparent={ghost} opacity={ghost ? 0.4 : 1} />
        </mesh>
      ))}
      {state === "detected" && (
        <mesh position={[0.06, 0.66, 0]}>
          <cylinderGeometry args={[0.045, 0.06, 0.1, 16]} />
          <meshStandardMaterial ref={beacon} color="#e5484d" emissive="#ff2d36" toneMapped={false} />
        </mesh>
      )}
      <mesh ref={ring} rotation-x={-Math.PI / 2} position-y={0.02}>
        <ringGeometry args={[0.44, 0.5, 40]} />
        <meshBasicMaterial color="#e5484d" transparent opacity={0.4} toneMapped={false} depthWrite={false} />
      </mesh>
      <group rotation-y={-0.35}>
        {state === "unknown" && <Label text="Trolley, unknown to robot" tone="muted" y={1.05} />}
        {state === "detected" && <Label text="Trolley detected" tone="warn" y={1.05} />}
        {state === "ghost" && <Label text="Trolley, ignored by planner" tone="muted" y={1.05} />}
      </group>
    </group>
  );
}
