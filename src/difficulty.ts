// Neon Bastion - Difficulty Settings

export enum Difficulty {
  Easy = "easy",
  Normal = "normal",
  Hard = "hard",
  Endless = "endless",
}

export interface DifficultySettings {
  name: string;
  maxWaves: number;
  startCredits: number;
  coreHP: number;
  enemyHPMult: number;
  enemySpeedMult: number;
  creditMult: number;
  description: string;
}

export const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultySettings> = {
  [Difficulty.Easy]: {
    name: "EASY",
    maxWaves: 20,
    startCredits: 300,
    coreHP: 30,
    enemyHPMult: 0.7,
    enemySpeedMult: 0.85,
    creditMult: 1.3,
    description: "Relaxed pace, more resources",
  },
  [Difficulty.Normal]: {
    name: "NORMAL",
    maxWaves: 30,
    startCredits: 200,
    coreHP: 20,
    enemyHPMult: 1.0,
    enemySpeedMult: 1.0,
    creditMult: 1.0,
    description: "Balanced challenge",
  },
  [Difficulty.Hard]: {
    name: "HARD",
    maxWaves: 40,
    startCredits: 150,
    coreHP: 15,
    enemyHPMult: 1.5,
    enemySpeedMult: 1.2,
    creditMult: 0.8,
    description: "For tower defense veterans",
  },
  [Difficulty.Endless]: {
    name: "ENDLESS",
    maxWaves: 999,
    startCredits: 200,
    coreHP: 20,
    enemyHPMult: 1.0,
    enemySpeedMult: 1.0,
    creditMult: 1.0,
    description: "How long can you survive?",
  },
};
