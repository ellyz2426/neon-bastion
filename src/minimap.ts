// Neon Bastion - Minimap/Radar System

import {
  GRID_SIZE,
  CELL_SIZE,
  GRID_OFFSET,
  MAP_LAYOUT,
  CELL_PATH,
  CELL_SPAWN,
  CELL_CORE,
  CELL_TOWER,
} from "./constants";
import type { Tower } from "./towers";
import type { Enemy } from "./enemies";

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
const MINIMAP_SIZE = 140;
const CELL_PX = MINIMAP_SIZE / GRID_SIZE;

export function createMinimap() {
  canvas = document.createElement("canvas");
  canvas.width = MINIMAP_SIZE;
  canvas.height = MINIMAP_SIZE;
  canvas.style.cssText = `
    position: fixed;
    top: 60px;
    left: 10px;
    border: 1px solid rgba(0, 255, 255, 0.3);
    border-radius: 4px;
    background: rgba(0, 8, 20, 0.85);
    z-index: 1000;
    image-rendering: pixelated;
  `;
  document.body.appendChild(canvas);
  ctx = canvas.getContext("2d")!;
}

export function updateMinimap(
  gridState: number[][],
  towers: Tower[],
  enemies: Enemy[]
) {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

  // Draw grid cells
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const x = col * CELL_PX;
      const y = row * CELL_PX;
      const cell = gridState[row][col];

      if (cell === CELL_PATH) {
        ctx.fillStyle = "rgba(17, 34, 68, 0.6)";
        ctx.fillRect(x, y, CELL_PX, CELL_PX);
      } else if (cell === CELL_SPAWN) {
        ctx.fillStyle = "rgba(255, 34, 34, 0.5)";
        ctx.fillRect(x, y, CELL_PX, CELL_PX);
      } else if (cell === CELL_CORE) {
        ctx.fillStyle = "#00ffff";
        ctx.fillRect(x + 2, y + 2, CELL_PX - 4, CELL_PX - 4);
      }
    }
  }

  // Draw towers
  towers.forEach((t) => {
    const x = t.col * CELL_PX + CELL_PX / 2;
    const y = t.row * CELL_PX + CELL_PX / 2;
    ctx!.fillStyle = `#${t.def.color.toString(16).padStart(6, "0")}`;
    ctx!.beginPath();
    ctx!.arc(x, y, CELL_PX / 3, 0, Math.PI * 2);
    ctx!.fill();
  });

  // Draw enemies
  enemies.forEach((e) => {
    if (!e.alive) return;
    const wx = e.group.position.x;
    const wz = e.group.position.z;
    const col = (wx - GRID_OFFSET) / CELL_SIZE;
    const row = (wz - GRID_OFFSET) / CELL_SIZE;
    const x = col * CELL_PX;
    const y = row * CELL_PX;

    ctx!.fillStyle = `#${e.def.color.toString(16).padStart(6, "0")}`;
    const size = e.type === "boss" ? 5 : 3;
    ctx!.fillRect(x - size / 2, y - size / 2, size, size);
  });

  // Border glow
  ctx.strokeStyle = "rgba(0, 255, 255, 0.15)";
  ctx.lineWidth = 1;
  ctx.strokeRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
}
