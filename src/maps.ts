// Neon Bastion - Multiple Map Layouts

import { CELL_EMPTY, CELL_PATH, CELL_SPAWN, CELL_CORE, CELL_BLOCKED } from "./constants";

export interface MapDef {
  name: string;
  layout: number[][];
  paths: number[][][];
  description: string;
}

// Map 1: Cross (default) - 4 spawn points, paths converge on center
const CROSS_LAYOUT: number[][] = [
  [0, 0, 0, 0, 2, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 0, 0, 0, 0],
  [2, 1, 1, 0, 1, 0, 1, 1, 2],
  [0, 0, 1, 0, 3, 0, 1, 0, 0],
  [0, 0, 1, 0, 1, 0, 1, 0, 0],
  [0, 0, 0, 0, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 2, 0, 0, 0, 0],
];

const CROSS_PATHS: number[][][] = [
  [[0,4],[1,4],[2,4],[3,4],[4,4]],
  [[3,0],[3,1],[3,2],[4,2],[4,3],[4,4]],
  [[3,8],[3,7],[3,6],[4,6],[4,5],[4,4]],
  [[8,4],[7,4],[6,4],[5,4],[4,4]],
];

// Map 2: Spiral - enemies spiral inward
const SPIRAL_LAYOUT: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0, 2],
  [0, 0, 0, 0, 0, 0, 0, 0, 1],
  [0, 1, 1, 1, 1, 1, 0, 0, 1],
  [0, 1, 0, 0, 0, 1, 0, 0, 1],
  [0, 1, 0, 3, 0, 1, 0, 0, 1],
  [0, 1, 0, 0, 1, 1, 0, 0, 1],
  [0, 1, 1, 1, 1, 0, 0, 0, 1],
  [0, 0, 0, 0, 0, 0, 0, 0, 1],
  [2, 1, 1, 1, 1, 1, 1, 1, 1],
];

const SPIRAL_PATHS: number[][][] = [
  // Top-right spawn
  [[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,8],[7,8],[8,8],[8,7],[8,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],
   [7,0],[6,0],[6,1],[6,2],[6,3],[6,4],[5,4],[5,3],[5,2],[5,1],[4,1],[3,1],[2,1],[2,2],[2,3],[2,4],[2,5],
   [3,5],[3,4],[3,3],[4,3]],
  // Bottom-left spawn
  [[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,6],[8,7],[8,8],[7,8],[6,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8],
   [0,7],[0,6],[0,5],[0,4],[0,3],[0,2],[0,1],[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[6,0],[6,1],[6,2],[6,3],
   [6,4],[5,4],[5,3],[5,2],[5,1],[4,1],[3,1],[2,1],[2,2],[2,3],[2,4],[2,5],[3,5],[3,4],[3,3],[4,3]],
];

// Map 3: Diamond - central defense, 4 diagonal paths
const DIAMOND_LAYOUT: number[][] = [
  [2, 0, 0, 0, 0, 0, 0, 0, 2],
  [0, 1, 0, 0, 0, 0, 0, 1, 0],
  [0, 0, 1, 0, 0, 0, 1, 0, 0],
  [0, 0, 0, 1, 0, 1, 0, 0, 0],
  [0, 0, 0, 0, 3, 0, 0, 0, 0],
  [0, 0, 0, 1, 0, 1, 0, 0, 0],
  [0, 0, 1, 0, 0, 0, 1, 0, 0],
  [0, 1, 0, 0, 0, 0, 0, 1, 0],
  [2, 0, 0, 0, 0, 0, 0, 0, 2],
];

const DIAMOND_PATHS: number[][][] = [
  [[0,0],[1,1],[2,2],[3,3],[4,4]],
  [[0,8],[1,7],[2,6],[3,5],[4,4]],
  [[8,0],[7,1],[6,2],[5,3],[4,4]],
  [[8,8],[7,7],[6,6],[5,5],[4,4]],
];

export const MAPS: MapDef[] = [
  {
    name: "CROSS",
    layout: CROSS_LAYOUT,
    paths: CROSS_PATHS,
    description: "Classic cross layout — 4 approach paths",
  },
  {
    name: "SPIRAL",
    layout: SPIRAL_LAYOUT,
    paths: SPIRAL_PATHS,
    description: "Long winding path — more tower opportunities",
  },
  {
    name: "DIAMOND",
    layout: DIAMOND_LAYOUT,
    paths: DIAMOND_PATHS,
    description: "Diagonal attack — tight defense area",
  },
];

export function getRandomMap(): MapDef {
  return MAPS[Math.floor(Math.random() * MAPS.length)];
}
