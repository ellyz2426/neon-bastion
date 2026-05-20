// Neon Bastion - VR Tower Defense
// Main entry point — v2 with combo, minimap, difficulty, screen shake

import {
  World,
  Color,
  Vector3,
  Raycaster,
  Vector2,
  Mesh,
  PlaneGeometry,
  MeshBasicMaterial,
  BoxGeometry,
  RingGeometry,
  DoubleSide,
  PointLight,
} from "@iwsdk/core";
import {
  TowerType,
  TOWER_DEFS,
  GamePhase,
  GRID_SIZE,
  CELL_SIZE,
  GRID_OFFSET,
  MAP_LAYOUT,
  CELL_EMPTY,
  CELL_PATH,
  CELL_SPAWN,
  CELL_CORE,
  CELL_TOWER,
  gridToWorld,
  worldToGrid,
  createInitialState,
  type GameStateData,
} from "./constants";
import { createEnvironment, animateEnvironment } from "./environment";
import {
  createTower,
  upgradeTower,
  getUpgradeCost,
  getSellValue,
  animateTowers,
  type Tower,
} from "./towers";
import {
  createEnemy,
  updateEnemies,
  type Enemy,
} from "./enemies";
import {
  firePulse,
  fireLaser,
  fireFrost,
  fireTesla,
  fireMissile,
  updateProjectiles,
  clearAllProjectiles,
} from "./projectiles";
import {
  generateWave,
  getWaveHPMultiplier,
  type WaveDefinition,
} from "./waves";
import { createHUD } from "./hud";
import { createMinimap, updateMinimap } from "./minimap";
import { createComboState, registerKill, updateCombo, type ComboState } from "./combo";
import { Difficulty, DIFFICULTY_SETTINGS, type DifficultySettings } from "./difficulty";
import {
  initAudio,
  playTowerPlace,
  playCoreHit,
  playWaveStart,
  playWaveComplete,
  playGameOver,
  playVictory,
  playUpgrade,
  playSell,
  playSelect,
  playBuildPhaseStart,
  startMusic,
  stopMusic,
  setMusicIntensity,
} from "./audio";
import {
  updateTrails,
  clearTrails,
  spawnTrail,
  updateFloatingScores,
  clearFloatingScores,
  createDamageVignette,
  flashDamageVignette,
  updateDamageVignette,
} from "./effects";
import {
  createAchievements,
  checkAchievements,
  createGameStats,
  loadStats,
  saveStats,
  loadAchievementState,
  saveAchievements,
  type Achievement,
  type GameStats,
} from "./achievements";

// ─── Global State ───
let gameState: GameStateData;
let towers: Tower[] = [];
let enemies: Enemy[] = [];
let gridState: number[][];
let scene: any;
let camera: any;
let world: any;

let hoveredCell: [number, number] | null = null;
let hoverIndicator: Mesh | null = null;
let rangePreview: Mesh | null = null;
let selectedPlacedTower: Tower | null = null;

let currentWave: WaveDefinition | null = null;
let spawnQueue: WaveDefinition["enemies"] = [];
let waveStartTime = 0;

let hud: ReturnType<typeof createHUD>;
let envData: ReturnType<typeof createEnvironment>;
let combo: ComboState;
let difficulty: DifficultySettings = DIFFICULTY_SETTINGS[Difficulty.Normal];
let achievements: Achievement[] = createAchievements();
let stats: GameStats = loadStats();
let sessionStats: GameStats = createGameStats();
let coreHPAtWaveStart = 20;

const raycaster = new Raycaster();
const mouse = new Vector2();
let groundPlane: Mesh;

// Screen shake
let shakeIntensity = 0;
let shakeDecay = 5;
let cameraBasePos = new Vector3(0, 12, 10);

// ─── Initialization ───

async function init() {
  const container = document.getElementById("scene-container") as HTMLDivElement;

  // Detect XR support
  let hasXR = false;
  if (typeof navigator !== "undefined" && (navigator as any).xr) {
    try {
      hasXR = await (navigator as any).xr.isSessionSupported("immersive-vr");
    } catch {}
  }

  // Create world
  world = await World.create(container, {
    xr: hasXR,
    render: {
      near: 0.01,
      far: 100,
      camera: {
        position: [0, 12, 10],
        lookAt: [0, 0, 0],
      },
    },
    input: {
      canvasPointerEvents: true,
    },
    features: {
      locomotion: {
        browserControls: true,
      },
      physics: true,
    },
  });

  scene = world.scene;
  camera = (world as any).camera || (world as any).renderer?.camera;

  // Init audio on first interaction
  let audioInitialized = false;
  const initAudioOnInteraction = () => {
    if (!audioInitialized) {
      initAudio();
      audioInitialized = true;
    }
  };
  document.addEventListener("click", initAudioOnInteraction);
  document.addEventListener("keydown", initAudioOnInteraction);

  // Init game state
  gameState = createInitialState();
  gridState = MAP_LAYOUT.map((row) => [...row]);
  combo = createComboState();

  // Create environment
  envData = createEnvironment(scene);

  // Invisible ground plane for raycasting
  const groundGeo = new PlaneGeometry(50, 50);
  const groundMat = new MeshBasicMaterial({ visible: false, side: DoubleSide });
  groundPlane = new Mesh(groundGeo, groundMat);
  groundPlane.rotation.x = -Math.PI / 2;
  groundPlane.position.y = 0.01;
  scene.add(groundPlane);

  // Hover indicator
  const hoverGeo = new PlaneGeometry(CELL_SIZE * 0.85, CELL_SIZE * 0.85);
  const hoverMat = new MeshBasicMaterial({
    color: 0x00ff88,
    transparent: true,
    opacity: 0.3,
    side: DoubleSide,
  });
  hoverIndicator = new Mesh(hoverGeo, hoverMat);
  hoverIndicator.rotation.x = -Math.PI / 2;
  hoverIndicator.position.y = 0.02;
  hoverIndicator.visible = false;
  scene.add(hoverIndicator);

  // Range preview
  const rangeGeo = new RingGeometry(4.9, 5, 32);
  const rangeMat = new MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.15,
    side: DoubleSide,
  });
  rangePreview = new Mesh(rangeGeo, rangeMat);
  rangePreview.rotation.x = -Math.PI / 2;
  rangePreview.position.y = 0.015;
  rangePreview.visible = false;
  scene.add(rangePreview);

  // Create minimap
  createMinimap();

  // Create damage vignette
  createDamageVignette();

  // Load achievements
  loadAchievementState(achievements);

  // Create HUD
  hud = createHUD({
    onTowerSelect: selectTowerType,
    onStartGame: () => startGame(Difficulty.Normal),
    onStartWave: startNextWave,
    onUpgradeTower: tryUpgradeSelectedTower,
    onSellTower: trySellSelectedTower,
    onRestartGame: () => startGame(Difficulty.Normal),
    onTogglePause: togglePause,
  });

  // Mouse events
  container.addEventListener("mousemove", onMouseMove);
  container.addEventListener("click", onMouseClick);
  container.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    gameState.selectedTower = null;
    selectedPlacedTower = null;
    hud.hideSelectedTower();
    hideRangePreview();
    towers.forEach((t) => { if (t.rangeIndicator) t.rangeIndicator.visible = false; });
  });

  // Difficulty selection keys on title screen
  document.addEventListener("keydown", (e) => {
    if (gameState.phase === GamePhase.Title) {
      if (e.key === "1") startGame(Difficulty.Easy);
      if (e.key === "2") startGame(Difficulty.Normal);
      if (e.key === "3") startGame(Difficulty.Hard);
      if (e.key === "4") startGame(Difficulty.Endless);
    }
  });

  // Game loop
  let lastTime = performance.now();
  function gameLoop() {
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    if (gameState.phase !== GamePhase.Title && !gameState.isPaused) {
      update(dt, now / 1000);
    }

    // Animate environment always
    animateEnvironment(
      now / 1000,
      envData.coreGroup,
      envData.coreLight,
      gameState.coreHP,
      gameState.maxCoreHP,
      envData.pathMeshes
    );

    // Screen shake
    if (shakeIntensity > 0.001 && camera) {
      const sx = (Math.random() - 0.5) * shakeIntensity;
      const sy = (Math.random() - 0.5) * shakeIntensity;
      camera.position.x = cameraBasePos.x + sx;
      camera.position.y = cameraBasePos.y + sy;
      shakeIntensity *= Math.exp(-shakeDecay * dt);
    }

    // Update minimap
    updateMinimap(gridState, towers, enemies);

    // Update visual effects
    updateTrails(dt, scene);
    updateFloatingScores(dt);
    updateDamageVignette(gameState.coreHP, gameState.maxCoreHP);

    hud.update(gameState);
    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
}

// ─── Game Flow ───

function startGame(diff: Difficulty) {
  difficulty = DIFFICULTY_SETTINGS[diff];
  gameState = createInitialState();
  gameState.phase = GamePhase.Building;
  gameState.credits = difficulty.startCredits;
  gameState.coreHP = difficulty.coreHP;
  gameState.maxCoreHP = difficulty.coreHP;
  gameState.maxWaves = difficulty.maxWaves;
  gridState = MAP_LAYOUT.map((row) => [...row]);
  combo = createComboState();

  // Clear existing towers and enemies
  towers.forEach((t) => {
    scene.remove(t.group);
    if (t.rangeIndicator) scene.remove(t.rangeIndicator);
  });
  towers = [];
  enemies.forEach((e) => scene.remove(e.group));
  enemies = [];
  clearAllProjectiles(scene);
  clearTrails(scene);
  clearFloatingScores();
  selectedPlacedTower = null;
  sessionStats = createGameStats();
  stats.gamesPlayed++;

  initAudio();
  startMusic();
  setMusicIntensity(0.2);
  playBuildPhaseStart();
  hud.showNotification(`${difficulty.name} MODE — DEFEND THE CORE!`, "#00ffff", 3000);
}

function startNextWave() {
  if (gameState.phase !== GamePhase.Building && gameState.phase !== GamePhase.BetweenWaves) return;

  gameState.wave++;
  gameState.phase = GamePhase.Wave;
  gameState.enemiesKilled = 0;

  currentWave = generateWave(gameState.wave);
  spawnQueue = [...currentWave.enemies];
  waveStartTime = performance.now() / 1000;

  const isBoss = currentWave.isBoss;
  coreHPAtWaveStart = gameState.coreHP;
  setMusicIntensity(isBoss ? 0.9 : 0.4 + gameState.wave * 0.02);
  playWaveStart();

  if (isBoss) {
    hud.showNotification("⚠ BOSS INCOMING ⚠", "#ff0088", 3000);
    triggerShake(0.3);
  } else {
    hud.showNotification(`WAVE ${gameState.wave}`, "#00ffff", 2000);
  }
}

function onWaveComplete() {
  if (!currentWave) return;

  gameState.phase = GamePhase.BetweenWaves;
  const bonus = Math.floor(currentWave.bonusCredits * difficulty.creditMult);
  gameState.credits += bonus;
  gameState.score += bonus * 2;

  // Track stats
  sessionStats.totalWaves++;
  sessionStats.totalCreditsEarned += bonus;
  if (gameState.coreHP >= coreHPAtWaveStart) {
    sessionStats.perfectWaves++;
  }
  stats.totalWaves++;
  if (gameState.wave > stats.highestWave) stats.highestWave = gameState.wave;
  if (gameState.score > stats.highScore) stats.highScore = gameState.score;

  // Check achievements
  const newAchievements = checkAchievements(achievements, { ...stats, ...sessionStats });
  newAchievements.forEach((a) => {
    hud.showNotification(`${a.icon} ${a.name} UNLOCKED!`, "#ffcc00", 3000);
  });
  saveStats(stats);
  saveAchievements(achievements);

  // Check victory
  if (gameState.wave >= gameState.maxWaves) {
    gameState.phase = GamePhase.Victory;
    stats.gamesWon++;
    saveStats(stats);
    saveAchievements(achievements);
    stopMusic();
    playVictory();
    hud.showNotification("VICTORY!", "#00ff88", 5000);
    return;
  }

  setMusicIntensity(0.2);
  playWaveComplete();
  playBuildPhaseStart();

  const comboBonus = combo.totalBonusCredits > 0 ? ` (combo +⚡${combo.totalBonusCredits})` : "";
  hud.showNotification(`WAVE CLEAR! +⚡${bonus}${comboBonus}`, "#00ff88", 2500);
}

function onCoreDamaged(damage: number) {
  gameState.coreHP = Math.max(0, gameState.coreHP - damage);
  playCoreHit();
  triggerShake(0.5);
  flashDamageVignette();

  if (gameState.coreHP <= 0) {
    gameState.phase = GamePhase.GameOver;
    stopMusic();
    playGameOver();
    triggerShake(1.5);
    hud.showNotification("CORE DESTROYED", "#ff4444", 5000);
  }
}

function togglePause() {
  if (gameState.phase === GamePhase.Wave || gameState.phase === GamePhase.Building || gameState.phase === GamePhase.BetweenWaves) {
    gameState.isPaused = !gameState.isPaused;
  }
}

function triggerShake(intensity: number) {
  shakeIntensity = Math.max(shakeIntensity, intensity);
}

// ─── Tower Placement ───

function selectTowerType(type: TowerType) {
  if (gameState.credits < TOWER_DEFS[type].cost) return;
  gameState.selectedTower = gameState.selectedTower === type ? null : type;
  selectedPlacedTower = null;
  hud.hideSelectedTower();
  playSelect();
  towers.forEach((t) => { if (t.rangeIndicator) t.rangeIndicator.visible = false; });

  if (gameState.selectedTower) {
    updateRangePreview();
  } else {
    hideRangePreview();
  }
}

function placeTower(row: number, col: number) {
  if (!gameState.selectedTower) return;

  const def = TOWER_DEFS[gameState.selectedTower];
  if (gameState.credits < def.cost) return;
  if (gridState[row][col] !== CELL_EMPTY) return;

  const tower = createTower(gameState.selectedTower, row, col);
  scene.add(tower.group);
  if (tower.rangeIndicator) scene.add(tower.rangeIndicator);
  towers.push(tower);

  gridState[row][col] = CELL_TOWER;
  gameState.credits -= def.cost;
  gameState.score += 10;

  applyShieldBuffs();
  playTowerPlace();
}

function tryUpgradeSelectedTower() {
  if (!selectedPlacedTower) return;
  const cost = getUpgradeCost(selectedPlacedTower);
  if (cost === null || gameState.credits < cost) return;

  gameState.credits -= cost;
  upgradeTower(selectedPlacedTower);
  gameState.score += 20;
  applyShieldBuffs();
  playUpgrade();
  hud.showSelectedTower(selectedPlacedTower);
}

function trySellSelectedTower() {
  if (!selectedPlacedTower) return;
  const value = getSellValue(selectedPlacedTower);
  gameState.credits += value;

  scene.remove(selectedPlacedTower.group);
  if (selectedPlacedTower.rangeIndicator) scene.remove(selectedPlacedTower.rangeIndicator);
  gridState[selectedPlacedTower.row][selectedPlacedTower.col] = CELL_EMPTY;
  towers = towers.filter((t) => t !== selectedPlacedTower);

  applyShieldBuffs();
  playSell();
  selectedPlacedTower = null;
  hud.hideSelectedTower();
  hideRangePreview();
}

function applyShieldBuffs() {
  towers.forEach((t) => { t.buffed = false; });
  const shields = towers.filter((t) => t.type === TowerType.Shield);
  shields.forEach((shield) => {
    towers.forEach((t) => {
      if (t === shield) return;
      const dist = shield.group.position.distanceTo(t.group.position);
      if (dist <= shield.currentRange) t.buffed = true;
    });
  });
}

// ─── Tower AI ───

function updateTowerAI(dt: number, time: number) {
  towers.forEach((tower) => {
    if (tower.type === TowerType.Shield) return;

    // Find target - prioritize: boss > closest to core > closest to tower
    let bestTarget: Enemy | null = null;
    let bestScore = -Infinity;

    enemies.forEach((enemy) => {
      if (!enemy.alive) return;
      const dist = tower.group.position.distanceTo(enemy.group.position);
      if (dist > tower.currentRange) return;

      // Score: prioritize enemies closer to the core, bosses, low HP
      let score = 100 - dist;
      score += enemy.waypointIndex * 10; // further along path = higher priority
      if (enemy.type === "boss") score += 50;
      if (enemy.hp / enemy.maxHp < 0.3) score += 20; // finish off low HP

      if (score > bestScore) {
        bestScore = score;
        bestTarget = enemy;
      }
    });

    tower.target = bestTarget;

    // Fire
    if (bestTarget && tower.currentFireRate > 0) {
      const fireInterval = 1 / tower.currentFireRate;
      if (time - tower.lastFireTime >= fireInterval) {
        tower.lastFireTime = time;

        switch (tower.type) {
          case TowerType.Pulse:
            firePulse(tower, bestTarget, scene);
            break;
          case TowerType.Laser:
            fireLaser(tower, bestTarget, scene);
            break;
          case TowerType.Frost:
            fireFrost(tower, bestTarget, scene, enemies);
            break;
          case TowerType.Tesla:
            fireTesla(tower, bestTarget, scene, enemies);
            break;
          case TowerType.Missile:
            fireMissile(tower, bestTarget, scene);
            break;
        }
      }
    }
  });
}

// ─── Enemy Spawning ───

function updateSpawning(dt: number, time: number) {
  if (spawnQueue.length === 0) return;

  const elapsed = time - waveStartTime;

  while (spawnQueue.length > 0 && spawnQueue[0].delay <= elapsed) {
    const spawn = spawnQueue.shift()!;
    const hpMult = getWaveHPMultiplier(gameState.wave) * difficulty.enemyHPMult;
    const enemy = createEnemy(spawn.type, spawn.pathIndex, hpMult);
    enemy.speed *= difficulty.enemySpeedMult;
    enemy.baseSpeed *= difficulty.enemySpeedMult;
    scene.add(enemy.group);
    enemies.push(enemy);
    gameState.enemiesAlive++;
  }
}

// ─── Mouse Interaction ───

function onMouseMove(event: MouseEvent) {
  const rect = (event.target as HTMLElement).getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  if (!camera) return;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(groundPlane);

  if (intersects.length > 0) {
    const point = intersects[0].point;
    const [row, col] = worldToGrid(point.x, point.z);

    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
      hoveredCell = [row, col];
      const [wx, wy, wz] = gridToWorld(row, col);

      if (hoverIndicator) {
        hoverIndicator.visible = true;
        hoverIndicator.position.set(wx, 0.02, wz);

        const canBuild = gridState[row][col] === CELL_EMPTY && gameState.selectedTower;
        const mat = hoverIndicator.material as MeshBasicMaterial;
        mat.color.setHex(canBuild ? 0x00ff88 : 0xff4444);
        mat.opacity = canBuild ? 0.3 : 0.15;
      }

      if (gameState.selectedTower && rangePreview) {
        rangePreview.visible = true;
        rangePreview.position.set(wx, 0.015, wz);
      }
    } else {
      hoveredCell = null;
      if (hoverIndicator) hoverIndicator.visible = false;
      if (rangePreview) rangePreview.visible = false;
    }
  } else {
    hoveredCell = null;
    if (hoverIndicator) hoverIndicator.visible = false;
    if (rangePreview) rangePreview.visible = false;
  }
}

function onMouseClick(event: MouseEvent) {
  if (gameState.phase === GamePhase.Title || gameState.phase === GamePhase.GameOver ||
      gameState.phase === GamePhase.Victory) return;

  initAudio();

  if (!hoveredCell) return;
  const [row, col] = hoveredCell;

  if (gameState.selectedTower && gridState[row][col] === CELL_EMPTY) {
    placeTower(row, col);
    return;
  }

  if (gridState[row][col] === CELL_TOWER) {
    const tower = towers.find((t) => t.row === row && t.col === col);
    if (tower) {
      selectedPlacedTower = tower;
      gameState.selectedTower = null;
      towers.forEach((t) => { if (t.rangeIndicator) t.rangeIndicator.visible = false; });
      if (tower.rangeIndicator) tower.rangeIndicator.visible = true;
      hud.showSelectedTower(tower);
      playSelect();
    }
    return;
  }

  selectedPlacedTower = null;
  gameState.selectedTower = null;
  hud.hideSelectedTower();
  towers.forEach((t) => { if (t.rangeIndicator) t.rangeIndicator.visible = false; });
}

function updateRangePreview() {
  if (!rangePreview || !gameState.selectedTower) return;
  const def = TOWER_DEFS[gameState.selectedTower];
  const newGeo = new RingGeometry(def.range - 0.1, def.range, 32);
  rangePreview.geometry.dispose();
  rangePreview.geometry = newGeo;
  rangePreview.visible = !!hoveredCell;
}

function hideRangePreview() {
  if (rangePreview) rangePreview.visible = false;
}

// ─── Main Update Loop ───

function update(dt: number, time: number) {
  // Spawn enemies
  if (gameState.phase === GamePhase.Wave) {
    updateSpawning(dt, time);
  }

  // Update enemies
  const deadEnemies = updateEnemies(enemies, dt, time);

  // Handle enemies that reached core
  deadEnemies.forEach((e) => {
    if (e.reachedCore) {
      onCoreDamaged(e.def.coreDamage);
    }
  });

  // Remove dead enemies
  enemies = enemies.filter((e) => {
    if (!e.alive) {
      scene.remove(e.group);
      gameState.enemiesAlive--;
      return false;
    }
    return true;
  });

  // Tower AI
  updateTowerAI(dt, time);

  // Update projectiles
  const { kills, rewards } = updateProjectiles(dt, enemies, scene);

  // Process kills with combo system
  if (kills > 0) {
    for (let i = 0; i < kills; i++) {
      const avgReward = Math.floor(rewards / kills);
      const { bonusCredits, scoreMultiplier, comboText } = registerKill(combo, time, avgReward);
      gameState.credits += bonusCredits;
      gameState.score += Math.floor(50 * scoreMultiplier);
      sessionStats.totalKills++;
      stats.totalKills++;
      if (combo.multiplier > sessionStats.maxCombo) sessionStats.maxCombo = combo.multiplier;
      if (combo.multiplier > stats.maxCombo) stats.maxCombo = combo.multiplier;
      if (comboText) {
        hud.showNotification(comboText, "#ffcc00", 1500);
        triggerShake(0.2);
      }
    }
    gameState.totalEnemiesKilled += kills;
    gameState.enemiesKilled += kills;
    gameState.credits += rewards;
    sessionStats.totalCreditsEarned += rewards;
  }

  // Update combo state
  updateCombo(combo, time);

  // Animate towers
  animateTowers(towers, time);

  // Check wave complete
  if (gameState.phase === GamePhase.Wave) {
    if (spawnQueue.length === 0 && enemies.length === 0) {
      onWaveComplete();
    }
  }
}

// ─── Bootstrap ───
init().catch(console.error);
