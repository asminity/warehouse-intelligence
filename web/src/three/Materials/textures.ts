// Procedural canvas textures, created once and shared. No external image assets.
import * as THREE from "three";

const cache = new Map<string, THREE.Texture>();

function canvasTexture(id: string, size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void,
                       repeat = true): THREE.Texture {
  const hit = cache.get(id);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  cache.set(id, tex);
  return tex;
}

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

/** Polished concrete: mottled grey with fine aggregate speckle and a saw-cut joint. */
export function concreteTexture() {
  return canvasTexture("concrete", 512, (ctx, s) => {
    const rand = rng(7);
    ctx.fillStyle = "#4a4f57";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 70; i++) {
      const x = rand() * s, y = rand() * s, r = 30 + rand() * 90;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const shade = rand() > 0.5 ? "255,255,255" : "0,0,0";
      g.addColorStop(0, `rgba(${shade},${0.025 + rand() * 0.035})`);
      g.addColorStop(1, `rgba(${shade},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = 0; i < 9000; i++) {
      const v = Math.floor(60 + rand() * 80);
      ctx.fillStyle = `rgba(${v},${v},${v + 4},${0.18 + rand() * 0.25})`;
      ctx.fillRect(rand() * s, rand() * s, 1 + rand(), 1 + rand());
    }
    ctx.strokeStyle = "rgba(20,22,26,0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 1); ctx.lineTo(s, 1);
    ctx.moveTo(1, 0); ctx.lineTo(1, s);
    ctx.stroke();
  });
}

/** Diagonal red / off-white hazard stripes for restricted zones. */
export function hazardTexture(colorA = "#c8343a", colorB = "#e9e4d8") {
  return canvasTexture(`hazard-${colorA}-${colorB}`, 128, (ctx, s) => {
    ctx.fillStyle = colorB;
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = colorA;
    const w = s / 4;
    for (let i = -s; i < s * 2; i += w * 2) {
      ctx.beginPath();
      ctx.moveTo(i, 0); ctx.lineTo(i + w, 0); ctx.lineTo(i + w - s, s); ctx.lineTo(i - s, s);
      ctx.closePath();
      ctx.fill();
    }
  });
}

/** Welded wire mesh with transparent holes, for safety cages. */
export function meshFenceTexture() {
  return canvasTexture("fence", 128, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    ctx.strokeStyle = "rgba(225,80,85,0.95)";
    ctx.lineWidth = 3;
    const step = s / 6;
    for (let i = 0; i <= s; i += step) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(s, i); ctx.stroke();
    }
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, s, s);
  });
}

/** Corrugated steel wall cladding. */
export function claddingTexture() {
  return canvasTexture("cladding", 256, (ctx, s) => {
    const grad = ctx.createLinearGradient(0, 0, s, 0);
    for (let i = 0; i <= 8; i++) {
      grad.addColorStop(i / 8, i % 2 ? "#26303d" : "#1c2430");
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = "rgba(255,255,255,0.025)";
    for (let i = 0; i < s; i += s / 8) ctx.fillRect(i, 0, 2, s);
  });
}

/** Floor tape for the crowded aisle: amber with soft scuffs. */
export function crowdTexture() {
  return canvasTexture("crowd", 128, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    ctx.fillStyle = "rgba(242,169,0,0.30)";
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = "rgba(242,169,0,0.9)";
    ctx.lineWidth = 6;
    ctx.setLineDash([14, 10]);
    ctx.strokeRect(6, 6, s - 12, s - 12);
  });
}
