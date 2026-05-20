// Neon Bastion - Wave Management System

import { EnemyType, type GameStateData } from "./constants";

export interface WaveDefinition {
  enemies: { type: EnemyType; count: number; pathIndex: number; delay: number }[];
  spawnInterval: number; // seconds between spawns
  bonusCredits: number;
  isBoss: boolean;
}

export function generateWave(waveNum: number): WaveDefinition {
  const isBoss = waveNum % 5 === 0 && waveNum > 0;

  if (isBoss) {
    return generateBossWave(waveNum);
  }

  const enemies: WaveDefinition["enemies"] = [];
  const difficulty = 1 + waveNum * 0.3;

  // Base enemy count scales with wave
  const baseCount = Math.floor(3 + waveNum * 1.2);

  // Determine available enemy types based on wave
  const availableTypes: EnemyType[] = [EnemyType.Drone];
  if (waveNum >= 3) availableTypes.push(EnemyType.Swarm);
  if (waveNum >= 5) availableTypes.push(EnemyType.Tank);
  if (waveNum >= 8) availableTypes.push(EnemyType.Phaser);
  if (waveNum >= 12) availableTypes.push(EnemyType.Shielded);

  // Number of active paths increases with wave
  const activePaths = Math.min(4, 1 + Math.floor(waveNum / 3));

  // Distribute enemies across paths
  for (let pathIdx = 0; pathIdx < activePaths; pathIdx++) {
    const pathCount = Math.floor(baseCount / activePaths) + (pathIdx < baseCount % activePaths ? 1 : 0);

    for (let i = 0; i < pathCount; i++) {
      // Weight toward tougher enemies in later waves
      let typeIdx = 0;
      const roll = Math.random();
      if (roll > 0.8 && availableTypes.length > 1) {
        typeIdx = availableTypes.length - 1;
      } else if (roll > 0.5 && availableTypes.length > 1) {
        typeIdx = Math.floor(Math.random() * (availableTypes.length - 1)) + 1;
      } else {
        typeIdx = Math.floor(Math.random() * Math.min(2, availableTypes.length));
      }

      enemies.push({
        type: availableTypes[typeIdx],
        count: 1,
        pathIndex: pathIdx,
        delay: i * (1.5 / difficulty),
      });
    }
  }

  // Sort by delay for proper spawn ordering
  enemies.sort((a, b) => a.delay - b.delay);

  return {
    enemies,
    spawnInterval: Math.max(0.3, 1.5 / difficulty),
    bonusCredits: Math.floor(20 + waveNum * 5),
    isBoss: false,
  };
}

function generateBossWave(waveNum: number): WaveDefinition {
  const enemies: WaveDefinition["enemies"] = [];

  // Boss comes with escorts
  const escortCount = Math.floor(waveNum / 5);
  const activePaths = Math.min(4, 1 + Math.floor(waveNum / 5));

  // Spawn escorts first
  for (let i = 0; i < escortCount * 2; i++) {
    const pathIdx = i % activePaths;
    enemies.push({
      type: i % 2 === 0 ? EnemyType.Drone : EnemyType.Tank,
      count: 1,
      pathIndex: pathIdx,
      delay: i * 0.8,
    });
  }

  // Boss on random path
  const bossPath = Math.floor(Math.random() * activePaths);
  enemies.push({
    type: EnemyType.Boss,
    count: 1,
    pathIndex: bossPath,
    delay: escortCount * 1.0 + 1,
  });

  // More escorts after boss
  for (let i = 0; i < escortCount; i++) {
    enemies.push({
      type: EnemyType.Shielded,
      count: 1,
      pathIndex: (bossPath + 1 + i) % activePaths,
      delay: escortCount * 1.0 + 2 + i * 0.5,
    });
  }

  return {
    enemies,
    spawnInterval: 0.8,
    bonusCredits: Math.floor(50 + waveNum * 10),
    isBoss: true,
  };
}

export function getWaveHPMultiplier(waveNum: number): number {
  return 1 + waveNum * 0.15;
}

export function getWaveDescription(waveNum: number, maxWaves: number): string {
  if (waveNum % 5 === 0 && waveNum > 0) {
    return `⚠ BOSS WAVE ${waveNum}/${maxWaves}`;
  }
  if (waveNum >= maxWaves - 2) {
    return `FINAL WAVES ${waveNum}/${maxWaves}`;
  }
  return `Wave ${waveNum}/${maxWaves}`;
}
