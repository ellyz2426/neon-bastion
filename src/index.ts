// Neon Bastion - VR Tower Defense
// Main entry point

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
  damageEnemy,
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

// ─── Global State ───
let gameState: GameStateData;
let towers: Tower[] = [];
let enemies: Enemy[] = [];
let gridState: number[][];
let scene: any;
let camera: any;

let hoveredCell: [number, number] | null = null;
let hoverIndicator: Mesh | null = null;
let rangePreview: Mesh | null = null;
let selectedPlacedTower: Tower | null = null;

let currentWave: WaveDefinition | null = null;
let spawnQueue: WaveDefinition["enemies"] = [];
let spawnTimer = 0;
let waveStartTime = 0;

let hud: ReturnType<typeof createHUD>;
let envData: ReturnType<typeof createEnvironment>;

const raycaster = new Raycaster();
const mouse = new Vector2();
let groundPlane: Mesh;

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
  const world = await World.create(container, {
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
  const initAudioOnClick = () => {
    if (!audioInitialized) {
      initAudio();
      audioInitialized = true;
    }
  };
  document.addEventListener("click", initAudioOnClick, { once: false });
  document.addEventListener("keydown", initAudioOnClick, { once: false });

  // Init game state
  gameState = createInitialState();
  gridState = MAP_LAYOUT.map((row) => [...row]);

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

  // Create HUD
  hud = createHUD({
    onTowerSelect: selectTowerType,
    onStartGame: startGame,
    onStartWave: startNextWave,
    onUpgradeTower: tryUpgradeSelectedTower,
    onSellTower: trySellSelectedTower,
    onRestartGame: restartGame,
    onTogglePause: togglePause,
  });

  // Mouse events
  container.addEventListener("mousemove", onMouseMove);
  container.addEventListener("click", onMouseClick);
  container.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    // Right-click to deselect
    gameState.selectedTower = null;
    selectedPlacedTower = null;
    hud.hideSelectedTower();
    hideRangePreview();
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

    hud.update(gameState);
    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
}

// ─── Game Flow ───

function startGame() {
  gameState = createInitialState();
  gameState.phase = GamePhase.Building;
  gridState = MAP_LAYOUT.map((row) => [...row]);

  // Clear existing towers and enemies
  towers.forEach((t) => {
    scene.remove(t.group);
    if (t.rangeIndicator) scene.remove(t.rangeIndicator);
  });
  towers = [];
  enemies.forEach((e) => scene.remove(e.group));
  enemies = [];
  clearAllProjectiles(scene);
  selectedPlacedTower = null;

  initAudio();
  startMusic();
  setMusicIntensity(0.2);
  playBuildPhaseStart();
  hud.showNotification("DEFEND THE CORE!", "#00ffff", 3000);
}

function startNextWave() {
  if (gameState.phase !== GamePhase.Building && gameState.phase !== GamePhase.BetweenWaves) return;

  gameState.wave++;
  gameState.phase = GamePhase.Wave;
  gameState.enemiesKilled = 0;

  currentWave = generateWave(gameState.wave);
  spawnQueue = [...currentWave.enemies];
  spawnTimer = 0;
  waveStartTime = performance.now() / 1000;

  const isBoss = currentWave.isBoss;
  setMusicIntensity(isBoss ? 0.9 : 0.4 + gameState.wave * 0.02);
  playWaveStart();

  if (isBoss) {
    hud.showNotification("⚠ BOSS INCOMING ⚠", "#ff0088", 3000);
  } else {
    hud.showNotification(`WAVE ${gameState.wave}`, "#00ffff", 2000);
  }
}

function onWaveComplete() {
  if (!currentWave) return;

  gameState.phase = GamePhase.BetweenWaves;
  gameState.credits += currentWave.bonusCredits;
  gameState.score += currentWave.bonusCredits * 2;

  // Check victory
  if (gameState.wave >= gameState.maxWaves) {
    gameState.phase = GamePhase.Victory;
    stopMusic();
    playVictory();
    hud.showNotification("VICTORY!", "#00ff88", 5000);
    return;
  }

  setMusicIntensity(0.2);
  playWaveComplete();
  playBuildPhaseStart();
  hud.showNotification(`WAVE CLEAR! +⚡${currentWave.bonusCredits}`, "#00ff88", 2500);
}

function onCoreDamaged(damage: number) {
  gameState.coreHP = Math.max(0, gameState.coreHP - damage);
  playCoreHit();

  // Screen shake effect via core light
  envData.coreLight.intensity = 5;
  setTimeout(() => { envData.coreLight.intensity = 2; }, 100);

  if (gameState.coreHP <= 0) {
    gameState.phase = GamePhase.GameOver;
    stopMusic();
    playGameOver();
    hud.showNotification("CORE DESTROYED", "#ff4444", 5000);
  }
}

function restartGame() {
  startGame();
}

function togglePause() {
  if (gameState.phase === GamePhase.Wave || gameState.phase === GamePhase.Building || gameState.phase === GamePhase.BetweenWaves) {
    gameState.isPaused = !gameState.isPaused;
  }
}

// ─── Tower Placement ───

function selectTowerType(type: TowerType) {
  if (gameState.credits < TOWER_DEFS[type].cost) return;
  gameState.selectedTower = gameState.selectedTower === type ? null : type;
  selectedPlacedTower = null;
  hud.hideSelectedTower();
  playSelect();

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

  // Place tower
  const tower = createTower(gameState.selectedTower, row, col);
  scene.add(tower.group);
  if (tower.rangeIndicator) scene.add(tower.rangeIndicator);
  towers.push(tower);

  gridState[row][col] = CELL_TOWER;
  gameState.credits -= def.cost;
  gameState.score += 10;

  // Check for shield buff
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

  // Remove tower
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
  // Reset all buffs
  towers.forEach((t) => { t.buffed = false; });

  // Apply shield generator buffs
  const shields = towers.filter((t) => t.type === TowerType.Shield);
  shields.forEach((shield) => {
    towers.forEach((t) => {
      if (t === shield) return;
      const dist = shield.group.position.distanceTo(t.group.position);
      if (dist <= shield.currentRange) {
        t.buffed = true;
      }
    });
  });
}

// ─── Tower AI ───

function updateTowerAI(dt: number, time: number) {
  towers.forEach((tower) => {
    if (tower.type === TowerType.Shield) return; // Shields don't shoot

    // Find target - closest enemy in range
    let bestTarget: Enemy | null = null;
    let bestDist = tower.currentRange;

    enemies.forEach((enemy) => {
      if (!enemy.alive) return;
      const dist = tower.group.position.distanceTo(enemy.group.position);
      if (dist < bestDist) {
        bestDist = dist;
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
    const hpMult = getWaveHPMultiplier(gameState.wave);
    const enemy = createEnemy(spawn.type, spawn.pathIndex, hpMult);
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

  // Raycast to ground
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

        // Color based on buildability
        const canBuild = gridState[row][col] === CELL_EMPTY && gameState.selectedTower;
        const mat = hoverIndicator.material as MeshBasicMaterial;
        mat.color.setHex(canBuild ? 0x00ff88 : 0xff4444);
        mat.opacity = canBuild ? 0.3 : 0.15;
      }

      // Update range preview position
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

  // Try to place tower
  if (gameState.selectedTower && gridState[row][col] === CELL_EMPTY) {
    placeTower(row, col);
    return;
  }

  // Try to select placed tower
  if (gridState[row][col] === CELL_TOWER) {
    const tower = towers.find((t) => t.row === row && t.col === col);
    if (tower) {
      selectedPlacedTower = tower;
      gameState.selectedTower = null;

      // Show range indicator
      towers.forEach((t) => {
        if (t.rangeIndicator) t.rangeIndicator.visible = false;
      });
      if (tower.rangeIndicator) tower.rangeIndicator.visible = true;

      hud.showSelectedTower(tower);
      playSelect();
    }
    return;
  }

  // Deselect
  if (gridState[row][col] !== CELL_EMPTY) {
    selectedPlacedTower = null;
    gameState.selectedTower = null;
    hud.hideSelectedTower();
    towers.forEach((t) => {
      if (t.rangeIndicator) t.rangeIndicator.visible = false;
    });
  }
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
      if (!e.reachedCore) {
        // Was killed by towers
      }
      return false;
    }
    return true;
  });

  // Tower AI
  updateTowerAI(dt, time);

  // Update projectiles
  const { kills, rewards } = updateProjectiles(dt, enemies, scene);
  gameState.totalEnemiesKilled += kills;
  gameState.enemiesKilled += kills;
  gameState.credits += rewards;
  gameState.score += kills * 50 + rewards;

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
