// Neon Bastion - VR Tower Defense
// Core game constants and types

// ─── Grid / Map ───
export const GRID_SIZE = 9; // 9x9 grid
export const CELL_SIZE = 2.0;
export const GRID_OFFSET = -((GRID_SIZE - 1) * CELL_SIZE) / 2;
export const GRID_Y = 0.01; // slightly above floor

// Cell types
export const CELL_EMPTY = 0;
export const CELL_PATH = 1;
export const CELL_SPAWN = 2;
export const CELL_CORE = 3;
export const CELL_TOWER = 4;
export const CELL_BLOCKED = 5;

// ─── Tower Definitions ───
export enum TowerType {
  Pulse = "pulse",
  Laser = "laser",
  Frost = "frost",
  Tesla = "tesla",
  Missile = "missile",
  Shield = "shield",
}

export interface TowerDef {
  type: TowerType;
  name: string;
  cost: number;
  range: number;
  damage: number;
  fireRate: number; // shots per second
  color: number; // hex color
  description: string;
  upgradeCosts: number[];
  upgradeDamage: number[];
  upgradeRange: number[];
  upgradeFireRate: number[];
  special?: string;
}

export const TOWER_DEFS: Record<TowerType, TowerDef> = {
  [TowerType.Pulse]: {
    type: TowerType.Pulse,
    name: "Pulse Tower",
    cost: 50,
    range: 5,
    damage: 10,
    fireRate: 2,
    color: 0x00ffff,
    description: "Basic energy tower. Reliable damage.",
    upgradeCosts: [40, 80, 150],
    upgradeDamage: [15, 22, 35],
    upgradeRange: [5.5, 6, 7],
    upgradeFireRate: [2.5, 3, 4],
  },
  [TowerType.Laser]: {
    type: TowerType.Laser,
    name: "Laser Tower",
    cost: 100,
    range: 7,
    damage: 25,
    fireRate: 0.8,
    color: 0xff0044,
    description: "High damage beam. Slow firing rate.",
    upgradeCosts: [75, 150, 300],
    upgradeDamage: [40, 60, 100],
    upgradeRange: [8, 9, 11],
    upgradeFireRate: [1.0, 1.2, 1.5],
  },
  [TowerType.Frost]: {
    type: TowerType.Frost,
    name: "Frost Tower",
    cost: 75,
    range: 4,
    damage: 5,
    fireRate: 1.5,
    color: 0x44ccff,
    description: "Slows enemies in area. Low damage.",
    upgradeCosts: [60, 120, 200],
    upgradeDamage: [8, 12, 18],
    upgradeRange: [4.5, 5.5, 6.5],
    upgradeFireRate: [2, 2.5, 3],
    special: "slow",
  },
  [TowerType.Tesla]: {
    type: TowerType.Tesla,
    name: "Tesla Tower",
    cost: 125,
    range: 5,
    damage: 15,
    fireRate: 1.2,
    color: 0xaa44ff,
    description: "Chain lightning hits multiple targets.",
    upgradeCosts: [100, 200, 350],
    upgradeDamage: [22, 35, 55],
    upgradeRange: [5.5, 6, 7],
    upgradeFireRate: [1.5, 1.8, 2.2],
    special: "chain",
  },
  [TowerType.Missile]: {
    type: TowerType.Missile,
    name: "Missile Tower",
    cost: 150,
    range: 8,
    damage: 40,
    fireRate: 0.5,
    color: 0xff8800,
    description: "Splash damage missiles. Long range.",
    upgradeCosts: [120, 240, 400],
    upgradeDamage: [60, 90, 150],
    upgradeRange: [9, 10, 12],
    upgradeFireRate: [0.6, 0.75, 1.0],
    special: "splash",
  },
  [TowerType.Shield]: {
    type: TowerType.Shield,
    name: "Shield Gen",
    cost: 200,
    range: 4,
    damage: 0,
    fireRate: 0,
    color: 0x44ff88,
    description: "Boosts nearby towers. +30% damage.",
    upgradeCosts: [150, 300, 500],
    upgradeDamage: [0, 0, 0],
    upgradeRange: [5, 6, 8],
    upgradeFireRate: [0, 0, 0],
    special: "buff",
  },
};

// ─── Enemy Definitions ───
export enum EnemyType {
  Drone = "drone",
  Tank = "tank",
  Swarm = "swarm",
  Phaser = "phaser",
  Shielded = "shielded",
  Boss = "boss",
}

export interface EnemyDef {
  type: EnemyType;
  name: string;
  hp: number;
  speed: number; // cells per second
  reward: number;
  color: number;
  scale: number;
  coreDamage: number;
}

export const ENEMY_DEFS: Record<EnemyType, EnemyDef> = {
  [EnemyType.Drone]: {
    type: EnemyType.Drone,
    name: "Drone",
    hp: 30,
    speed: 2.0,
    reward: 10,
    color: 0xff4444,
    scale: 0.3,
    coreDamage: 1,
  },
  [EnemyType.Tank]: {
    type: EnemyType.Tank,
    name: "Tank",
    hp: 150,
    speed: 0.8,
    reward: 30,
    color: 0xff8844,
    scale: 0.55,
    coreDamage: 3,
  },
  [EnemyType.Swarm]: {
    type: EnemyType.Swarm,
    name: "Swarm",
    hp: 15,
    speed: 3.5,
    reward: 5,
    color: 0xffff44,
    scale: 0.2,
    coreDamage: 1,
  },
  [EnemyType.Phaser]: {
    type: EnemyType.Phaser,
    name: "Phaser",
    hp: 50,
    speed: 2.5,
    reward: 25,
    color: 0xcc44ff,
    scale: 0.35,
    coreDamage: 2,
  },
  [EnemyType.Shielded]: {
    type: EnemyType.Shielded,
    name: "Shielded",
    hp: 80,
    speed: 1.5,
    reward: 35,
    color: 0x44ffcc,
    scale: 0.45,
    coreDamage: 2,
  },
  [EnemyType.Boss]: {
    type: EnemyType.Boss,
    name: "Boss",
    hp: 500,
    speed: 0.6,
    reward: 100,
    color: 0xff0088,
    scale: 0.8,
    coreDamage: 10,
  },
};

// ─── Game State ───
export enum GamePhase {
  Title = "title",
  Building = "building",
  Wave = "wave",
  BetweenWaves = "betweenWaves",
  GameOver = "gameOver",
  Victory = "victory",
}

export interface GameStateData {
  phase: GamePhase;
  wave: number;
  maxWaves: number;
  credits: number;
  coreHP: number;
  maxCoreHP: number;
  score: number;
  enemiesAlive: number;
  enemiesKilled: number;
  totalEnemiesKilled: number;
  selectedTower: TowerType | null;
  buildTimer: number;
  buildDuration: number;
  isPaused: boolean;
}

export function createInitialState(): GameStateData {
  return {
    phase: GamePhase.Title,
    wave: 0,
    maxWaves: 30,
    credits: 200,
    coreHP: 20,
    maxCoreHP: 20,
    score: 0,
    enemiesAlive: 0,
    enemiesKilled: 0,
    totalEnemiesKilled: 0,
    selectedTower: null,
    buildTimer: 0,
    buildDuration: 20,
    isPaused: false,
  };
}

// ─── Map Layout ───
// 0=empty, 1=path, 2=spawn, 3=core, 5=blocked
// Enemies path from spawn points (edges) to the core (center)
export const MAP_LAYOUT: number[][] = [
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

// Paths from each spawn to the core — these are defaults, overridden by map selection
export let PATHS: number[][][] = [
  // North spawn (0,4) → core (4,4)
  [[0,4],[1,4],[2,4],[3,4],[4,4]],
  // West spawn (3,0) → core (4,4)
  [[3,0],[3,1],[3,2],[4,2],[4,3],[4,4]],
  // East spawn (3,8) → core (4,4)
  [[3,8],[3,7],[3,6],[4,6],[4,5],[4,4]],
  // South spawn (8,4) → core (4,4)
  [[8,4],[7,4],[6,4],[5,4],[4,4]],
];

export function setPaths(newPaths: number[][][]) {
  PATHS = newPaths;
}

// Convert grid coords to world position
export function gridToWorld(row: number, col: number): [number, number, number] {
  return [
    GRID_OFFSET + col * CELL_SIZE,
    GRID_Y,
    GRID_OFFSET + row * CELL_SIZE,
  ];
}

export function worldToGrid(x: number, z: number): [number, number] {
  const col = Math.round((x - GRID_OFFSET) / CELL_SIZE);
  const row = Math.round((z - GRID_OFFSET) / CELL_SIZE);
  return [
    Math.max(0, Math.min(GRID_SIZE - 1, row)),
    Math.max(0, Math.min(GRID_SIZE - 1, col)),
  ];
}
