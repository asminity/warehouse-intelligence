import { Html } from "@react-three/drei";
import type { Cell } from "../../types/api";
import { cellToWorld } from "../../lib/grid";
import { hazardTexture } from "../Materials/textures";

function Pad({ x, z, color }: { x: number; z: number; color: string }) {
  return (
    <group position={[x, 0, z]}>
      <mesh rotation-x={-Math.PI / 2} position-y={0.012} receiveShadow>
        <ringGeometry args={[0.36, 0.46, 48]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} toneMapped={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={0.01}>
        <planeGeometry args={[0.96, 0.96]} />
        <meshStandardMaterial color={color} transparent opacity={0.16} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function Label({ text, tone, y = 1.25 }: { text: string; tone: "start" | "goal" | "warn" | "muted"; y?: number }) {
  return (
    <Html position={[0, y, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
      <div className={`scene-label scene-label--${tone}`}>{text}</div>
    </Html>
  );
}

/** Packing station at the start and a dispatch dock gate over the destination. */
export function Stations({ start, goal, rows, cols }: { start: Cell; goal: Cell; rows: number; cols: number }) {
  const [sx, sz] = cellToWorld(start, rows, cols);
  const [gx, gz] = cellToWorld(goal, rows, cols);
  const stripes = hazardTexture("#1a1d22", "#f2a900");
  return (
    <group>
      <Pad x={sx} z={sz} color="#2bc48a" />
      <group position={[sx, 0, sz]}>
        <Label text="Packing station" tone="start" y={1.1} />
      </group>

      <Pad x={gx} z={gz} color="#f2a900" />
      <group position={[gx, 0, gz]}>
        {[-0.47, 0.47].map((dx) => (
          <mesh key={dx} position={[dx, 0.7, 0]} castShadow>
            <boxGeometry args={[0.07, 1.4, 0.07]} />
            <meshStandardMaterial map={stripes} roughness={0.5} />
          </mesh>
        ))}
        <mesh position={[0, 1.43, 0]} castShadow>
          <boxGeometry args={[1.02, 0.09, 0.09]} />
          <meshStandardMaterial map={stripes} roughness={0.5} />
        </mesh>
        <mesh position={[0, 1.31, 0]}>
          <boxGeometry args={[0.5, 0.12, 0.03]} />
          <meshStandardMaterial color="#2bc48a" emissive="#2bc48a" emissiveIntensity={1.4} toneMapped={false} />
        </mesh>
        <Label text="Dispatch" tone="goal" y={1.85} />
      </group>
    </group>
  );
}
