import { useEffect, useRef } from "react";
import { CameraControls } from "@react-three/drei";
import { useSim } from "../../store/useSim";

// camera-controls ACTION enum values (NONE = 0, ROTATE = 1, TRUCK = 2, DOLLY = 8 ...)
const ACTION = { NONE: 0, ROTATE: 1, TRUCK: 2, DOLLY: 8 } as const;

/** Orbit / pan / zoom with smooth transitions between three framing presets. */
export function CameraRig({ rows, cols, painting }: { rows: number; cols: number; painting: boolean }) {
  const ref = useRef<CameraControls>(null);
  const preset = useSim((s) => s.camera);
  const nonce = useSim((s) => s.cameraNonce);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const d = Math.max(rows * 1.15, cols * 0.8) + 4;
    const smooth = nonce > 1;
    if (preset === "top") c.setLookAt(0, d * 1.45, 0.001, 0, 0, 0, smooth);
    else if (preset === "iso") c.setLookAt(d * 0.66, d * 1.0, d * 0.66, 0, 0, 0, smooth);
    else c.setLookAt(-d * 0.06, d * 1.08, d * 0.68, 0, 0, 0.4, smooth);
  }, [preset, nonce, rows, cols]);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.mouseButtons.left = painting ? ACTION.NONE : ACTION.ROTATE;
    c.mouseButtons.right = ACTION.TRUCK;
    c.touches.one = painting ? ACTION.NONE : 64; // TOUCH_ROTATE
  }, [painting]);

  return (
    <CameraControls
      ref={ref}
      makeDefault
      smoothTime={0.35}
      minDistance={3}
      maxDistance={70}
      maxPolarAngle={Math.PI / 2.12}
      dollySpeed={0.6}
    />
  );
}
