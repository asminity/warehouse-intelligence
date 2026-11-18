import { Suspense, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { cellToWorld, findAll } from "../lib/grid";
import { useVisual } from "../hooks/useVisual";
import { clock, useSim } from "../store/useSim";
import { Building } from "./Warehouse/Building";
import { Racks } from "./Shelves/Racks";
import { CrowdedZones, RestrictedZones } from "./Warehouse/Zones";
import { Stations } from "./Warehouse/Stations";
import { Exploration } from "./Warehouse/Exploration";
import { Route } from "./Warehouse/Routes";
import { Trolley, type TrolleyState } from "./Obstacles/Trolley";
import { Robot } from "./Robot/Robot";
import { Interaction } from "./Controls/Interaction";
import { CameraRig } from "./Controls/CameraRig";
import { algoColor, algoDash } from "../lib/grid";

/** Advances the playback clock by real time × speed; steps come from the timeline. */
function PlaybackDriver() {
  useFrame((_, dt) => {
    let s = useSim.getState();
    if (!s.playing || !s.timeline) return;
    clock.progress += (Math.min(dt, 0.1) * s.speed) / s.timeline.durations[s.index];
    let guard = 0;
    while (clock.progress >= 1 && guard++ < 50) {
      clock.progress -= 1;
      s.advance();
      s = useSim.getState();
      if (!s.playing || !s.timeline) { clock.progress = 0; break; }
    }
  });
  return null;
}

function Lights({ rows, cols }: { rows: number; cols: number }) {
  const ext = Math.max(rows, cols) / 2 + 4;
  return (
    <>
      <hemisphereLight args={["#c9dcff", "#202631", 0.75]} />
      <directionalLight
        position={[-ext * 0.6, ext * 1.4, ext * 0.5]}
        intensity={2.1}
        color="#fff4e2"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-ext}
        shadow-camera-right={ext}
        shadow-camera-top={ext}
        shadow-camera-bottom={-ext}
        shadow-camera-far={ext * 4}
      />
      <directionalLight position={[ext, ext * 0.6, -ext]} intensity={0.35} color="#7fa8ff" />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2.2} color="#ffffff" position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[14, 2, 1]} />
        <Lightformer form="rect" intensity={0.9} color="#9cc2ff" position={[-8, 3, -4]} rotation-y={Math.PI / 2} scale={[10, 3, 1]} />
        <Lightformer form="rect" intensity={0.6} color="#ffd38a" position={[8, 2, 6]} rotation-y={-Math.PI / 2} scale={[8, 2, 1]} />
      </Environment>
    </>
  );
}

function World() {
  const grid = useSim((s) => s.grid);
  const view = useSim((s) => s.view);
  const tool = useSim((s) => s.tool);
  const lowRacks = useSim((s) => s.lowRacks);
  const compare = useSim((s) => s.compare);
  const visibleRoutes = useSim((s) => s.visibleRoutes);
  const timeline = useSim((s) => s.timeline);
  const index = useSim((s) => s.index);
  const visual = useVisual();

  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const cells = useMemo(() => ({
    shelves: findAll(grid, "#"),
    restricted: findAll(grid, "X"),
    crowded: findAll(grid, "~"),
    trolleys: findAll(grid, "T"),
    start: findAll(grid, "S")[0],
    goal: findAll(grid, "G")[0],
  }), [grid]);

  if (!rows || !cells.start || !cells.goal) return null;

  const step = timeline?.steps[index];
  const movingTo = step?.k === "move" ? step.to : null;
  const robotAt = visual?.robot ?? cells.start;
  const detected = visual?.detected ?? [];
  const trolleyState = (c: [number, number]): TrolleyState => {
    if (view !== "trolley") return "ghost";
    return detected.some((d) => d[0] === c[0] && d[1] === c[1]) ? "detected" : "unknown";
  };

  return (
    <group>
      <Building rows={rows} cols={cols} />
      <Racks cells={cells.shelves} rows={rows} cols={cols} low={lowRacks} />
      <RestrictedZones cells={cells.restricted} rows={rows} cols={cols} />
      <CrowdedZones cells={cells.crowded} rows={rows} cols={cols} />
      <Stations start={cells.start} goal={cells.goal} rows={rows} cols={cols} />
      {cells.trolleys.map((t) => {
        const [x, z] = cellToWorld(t, rows, cols);
        return <Trolley key={`${t[0]}-${t[1]}`} x={x} z={z} state={trolleyState(t)} />;
      })}

      {view !== "compare" && <Exploration visual={visual} rows={rows} cols={cols} />}
      {view !== "compare" && visual?.original && (
        <Route path={visual.original} rows={rows} cols={cols} color="#7f9cc4" dashed flowing={false} width={0.07} y={0.045} />
      )}
      {view !== "compare" && visual?.plan && (
        <Route path={visual.plan} rows={rows} cols={cols} color={visual.original ? "#f2a900" : "#3ea6ff"} width={0.16} />
      )}
      {view === "compare" && compare?.results.map((r, i) =>
        r.goal_reached && visibleRoutes.includes(r.algorithm) ? (
          <Route key={r.algorithm} path={r.path} rows={rows} cols={cols} color={algoColor(r.algorithm)}
                 pattern={algoDash(r.algorithm)} flowing={false} glow={false}
                 width={0.085} offset={(i - 1.5) * 0.12} y={0.05 + i * 0.004} />
        ) : null,
      )}

      <Robot at={robotAt} to={movingTo} rows={rows} cols={cols} status={visual?.status ?? "ready"} />
      <Interaction rows={rows} cols={cols} editable={view !== "compare"} />
      <CameraRig rows={rows} cols={cols} painting={view !== "compare" && tool !== "inspect"} />
    </group>
  );
}

export default function Scene() {
  const grid = useSim((s) => s.grid);
  const rows = grid.length || 10;
  const cols = grid[0]?.length || 10;
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ fov: 38, position: [0, 18, 20], near: 0.1, far: 200 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      onPointerMissed={() => useSim.getState().select(null)}
    >
      <color attach="background" args={["#0c121c"]} />
      <fog attach="fog" args={["#0c121c", 28, 75]} />
      <Suspense fallback={null}>
        <Lights rows={rows} cols={cols} />
        <World />
      </Suspense>
      <PlaybackDriver />
    </Canvas>
  );
}
