// Neon Bastion - HUD & UI System

import {
  TowerType,
  TOWER_DEFS,
  GamePhase,
  type GameStateData,
} from "./constants";
import { getUpgradeCost, getSellValue, type Tower } from "./towers";
import { getWaveDescription } from "./waves";

let hudContainer: HTMLDivElement | null = null;
let towerPanel: HTMLDivElement | null = null;
let infoPanel: HTMLDivElement | null = null;
let waveInfo: HTMLDivElement | null = null;
let titleScreen: HTMLDivElement | null = null;
let gameOverScreen: HTMLDivElement | null = null;
let towerInfo: HTMLDivElement | null = null;
let selectedTowerPanel: HTMLDivElement | null = null;
let notification: HTMLDivElement | null = null;
let pauseOverlay: HTMLDivElement | null = null;

let onTowerSelect: ((type: TowerType) => void) | null = null;
let onStartGame: (() => void) | null = null;
let onStartWave: (() => void) | null = null;
let onUpgradeTower: (() => void) | null = null;
let onSellTower: (() => void) | null = null;
let onRestartGame: (() => void) | null = null;
let onTogglePause: (() => void) | null = null;

const TOWER_KEYS: Record<string, TowerType> = {
  "1": TowerType.Pulse,
  "2": TowerType.Laser,
  "3": TowerType.Frost,
  "4": TowerType.Tesla,
  "5": TowerType.Missile,
  "6": TowerType.Shield,
};

export function createHUD(callbacks: {
  onTowerSelect: (type: TowerType) => void;
  onStartGame: () => void;
  onStartWave: () => void;
  onUpgradeTower: () => void;
  onSellTower: () => void;
  onRestartGame: () => void;
  onTogglePause: () => void;
}) {
  onTowerSelect = callbacks.onTowerSelect;
  onStartGame = callbacks.onStartGame;
  onStartWave = callbacks.onStartWave;
  onUpgradeTower = callbacks.onUpgradeTower;
  onSellTower = callbacks.onSellTower;
  onRestartGame = callbacks.onRestartGame;
  onTogglePause = callbacks.onTogglePause;

  // Inject styles
  const style = document.createElement("style");
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap');

    .nb-hud {
      position: fixed;
      pointer-events: none;
      z-index: 1000;
      font-family: 'Orbitron', 'Share Tech Mono', monospace;
      color: #00ffff;
    }
    .nb-hud * {
      pointer-events: auto;
    }
    .nb-panel {
      background: rgba(0, 8, 20, 0.85);
      border: 1px solid rgba(0, 255, 255, 0.3);
      border-radius: 4px;
      padding: 10px 14px;
      backdrop-filter: blur(4px);
    }
    .nb-top-bar {
      position: fixed;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 20px;
      align-items: center;
    }
    .nb-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 80px;
    }
    .nb-stat-label {
      font-size: 9px;
      color: rgba(0, 255, 255, 0.5);
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .nb-stat-value {
      font-size: 18px;
      font-weight: 700;
    }
    .nb-tower-panel {
      position: fixed;
      bottom: 15px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }
    .nb-tower-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 8px 12px;
      cursor: pointer;
      border: 1px solid rgba(0, 255, 255, 0.2);
      border-radius: 4px;
      background: rgba(0, 8, 20, 0.85);
      transition: all 0.2s;
      min-width: 65px;
    }
    .nb-tower-btn:hover {
      border-color: rgba(0, 255, 255, 0.6);
      background: rgba(0, 20, 40, 0.9);
      transform: translateY(-3px);
    }
    .nb-tower-btn.selected {
      border-color: #00ffff;
      background: rgba(0, 40, 60, 0.9);
      box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
    }
    .nb-tower-btn.disabled {
      opacity: 0.4;
      pointer-events: none;
    }
    .nb-tower-icon {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      margin-bottom: 4px;
    }
    .nb-tower-name {
      font-size: 8px;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .nb-tower-cost {
      font-size: 10px;
      color: #ffcc00;
      margin-top: 2px;
    }
    .nb-tower-key {
      font-size: 8px;
      color: rgba(255, 255, 255, 0.3);
      margin-top: 2px;
    }
    .nb-wave-btn {
      padding: 10px 24px;
      background: rgba(0, 100, 80, 0.6);
      border: 1px solid #00ff88;
      border-radius: 4px;
      color: #00ff88;
      font-family: 'Orbitron', monospace;
      font-size: 12px;
      cursor: pointer;
      letter-spacing: 2px;
      transition: all 0.2s;
    }
    .nb-wave-btn:hover {
      background: rgba(0, 150, 100, 0.8);
      box-shadow: 0 0 15px rgba(0, 255, 136, 0.4);
    }
    .nb-info-panel {
      position: fixed;
      top: 60px;
      right: 10px;
      min-width: 160px;
    }
    .nb-selected-panel {
      position: fixed;
      bottom: 100px;
      right: 10px;
      min-width: 180px;
    }
    .nb-title-screen {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 8, 0.9);
      z-index: 2000;
    }
    .nb-title {
      font-size: 48px;
      font-weight: 900;
      color: #00ffff;
      text-shadow: 0 0 30px rgba(0, 255, 255, 0.5);
      letter-spacing: 8px;
      margin-bottom: 10px;
    }
    .nb-subtitle {
      font-size: 14px;
      color: rgba(0, 255, 255, 0.5);
      letter-spacing: 4px;
      margin-bottom: 40px;
    }
    .nb-start-btn {
      padding: 15px 50px;
      background: transparent;
      border: 2px solid #00ffff;
      color: #00ffff;
      font-family: 'Orbitron', monospace;
      font-size: 16px;
      cursor: pointer;
      letter-spacing: 4px;
      transition: all 0.3s;
    }
    .nb-start-btn:hover {
      background: rgba(0, 255, 255, 0.1);
      box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
      transform: scale(1.05);
    }
    .nb-controls-hint {
      margin-top: 30px;
      font-size: 10px;
      color: rgba(255, 255, 255, 0.3);
      text-align: center;
      line-height: 1.8;
    }
    .nb-gameover {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.9);
      z-index: 2000;
    }
    .nb-gameover-title {
      font-size: 36px;
      font-weight: 900;
      margin-bottom: 20px;
      letter-spacing: 6px;
    }
    .nb-gameover-stats {
      font-size: 14px;
      margin-bottom: 30px;
      text-align: center;
      line-height: 2;
    }
    .nb-notification {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 24px;
      font-weight: 700;
      letter-spacing: 4px;
      text-shadow: 0 0 20px currentColor;
      transition: opacity 0.5s;
      pointer-events: none;
      z-index: 1500;
    }
    .nb-pause-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.7);
      z-index: 1800;
    }
    .nb-pause-text {
      font-size: 36px;
      font-weight: 900;
      color: #00ffff;
      letter-spacing: 8px;
    }
    .nb-hp-low { color: #ff4444 !important; }
    .nb-hp-warn { color: #ffcc00 !important; }
    .nb-boss-warning {
      color: #ff0088;
      animation: blink 0.5s infinite;
    }
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `;
  document.head.appendChild(style);

  // Create HUD elements
  hudContainer = document.createElement("div");
  hudContainer.className = "nb-hud";
  document.body.appendChild(hudContainer);

  // Top bar
  waveInfo = document.createElement("div");
  waveInfo.className = "nb-top-bar nb-panel";
  hudContainer.appendChild(waveInfo);

  // Tower selection panel
  towerPanel = document.createElement("div");
  towerPanel.className = "nb-tower-panel";
  hudContainer.appendChild(towerPanel);

  // Info panel (right side)
  infoPanel = document.createElement("div");
  infoPanel.className = "nb-info-panel nb-panel";
  infoPanel.style.display = "none";
  hudContainer.appendChild(infoPanel);

  // Selected tower panel
  selectedTowerPanel = document.createElement("div");
  selectedTowerPanel.className = "nb-selected-panel nb-panel";
  selectedTowerPanel.style.display = "none";
  hudContainer.appendChild(selectedTowerPanel);

  // Notification
  notification = document.createElement("div");
  notification.className = "nb-notification";
  notification.style.opacity = "0";
  hudContainer.appendChild(notification);

  // Pause overlay
  pauseOverlay = document.createElement("div");
  pauseOverlay.className = "nb-pause-overlay";
  pauseOverlay.innerHTML = '<div class="nb-pause-text">PAUSED</div>';
  pauseOverlay.style.display = "none";
  hudContainer.appendChild(pauseOverlay);

  // Title screen
  titleScreen = document.createElement("div");
  titleScreen.className = "nb-title-screen";
  titleScreen.innerHTML = `
    <div class="nb-title">NEON BASTION</div>
    <div class="nb-subtitle">VR TOWER DEFENSE</div>
    <button class="nb-start-btn" id="nb-start">START GAME</button>
    <div class="nb-controls-hint">
      WASD — Move &nbsp;|&nbsp; Mouse — Look<br>
      1-6 — Select Tower &nbsp;|&nbsp; Click — Place<br>
      U — Upgrade &nbsp;|&nbsp; X — Sell &nbsp;|&nbsp; SPACE — Start Wave<br>
      ESC — Pause
    </div>
  `;
  document.body.appendChild(titleScreen);

  // Game over screen
  gameOverScreen = document.createElement("div");
  gameOverScreen.className = "nb-gameover";
  gameOverScreen.style.display = "none";
  document.body.appendChild(gameOverScreen);

  // Tower info tooltip
  towerInfo = document.createElement("div");
  towerInfo.className = "nb-panel";
  towerInfo.style.cssText = "position:fixed;display:none;min-width:180px;font-size:11px;z-index:1100;pointer-events:none;";
  document.body.appendChild(towerInfo);

  // Event listeners
  document.getElementById("nb-start")?.addEventListener("click", () => onStartGame?.());

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (TOWER_KEYS[e.key]) {
      onTowerSelect?.(TOWER_KEYS[e.key]);
    }
    if (e.key === " " || e.key === "Enter") {
      onStartWave?.();
    }
    if (e.key === "u" || e.key === "U") {
      onUpgradeTower?.();
    }
    if (e.key === "x" || e.key === "X") {
      onSellTower?.();
    }
    if (e.key === "Escape") {
      onTogglePause?.();
    }
  });

  return {
    update: updateHUD,
    showNotification,
    showTowerInfo: showTowerInfoTooltip,
    hideTowerInfo: hideTowerInfoTooltip,
    showSelectedTower: showSelectedTowerInfo,
    hideSelectedTower: hideSelectedTowerInfo,
  };
}

function updateHUD(state: GameStateData) {
  if (!waveInfo || !towerPanel) return;

  // Title screen
  if (titleScreen) {
    titleScreen.style.display = state.phase === GamePhase.Title ? "flex" : "none";
  }

  // Pause overlay
  if (pauseOverlay) {
    pauseOverlay.style.display = state.isPaused ? "flex" : "none";
  }

  // Game over screen
  if (gameOverScreen) {
    if (state.phase === GamePhase.GameOver || state.phase === GamePhase.Victory) {
      gameOverScreen.style.display = "flex";
      const isVictory = state.phase === GamePhase.Victory;
      gameOverScreen.innerHTML = `
        <div class="nb-gameover-title" style="color:${isVictory ? "#00ff88" : "#ff4444"}">
          ${isVictory ? "VICTORY" : "GAME OVER"}
        </div>
        <div class="nb-gameover-stats" style="color:${isVictory ? "#00ffcc" : "#ff8888"}">
          Score: ${state.score.toLocaleString()}<br>
          Wave: ${state.wave}/${state.maxWaves}<br>
          Enemies Destroyed: ${state.totalEnemiesKilled}
        </div>
        <button class="nb-start-btn" id="nb-restart" style="border-color:${isVictory ? "#00ff88" : "#ff4444"};color:${isVictory ? "#00ff88" : "#ff4444"}">
          PLAY AGAIN
        </button>
      `;
      document.getElementById("nb-restart")?.addEventListener("click", () => onRestartGame?.());
    } else {
      gameOverScreen.style.display = "none";
    }
  }

  // Top bar stats
  const hpClass = state.coreHP <= 5 ? "nb-hp-low" : state.coreHP <= 10 ? "nb-hp-warn" : "";
  const waveDesc = getWaveDescription(state.wave, state.maxWaves);
  const isBossWave = waveDesc.includes("BOSS");

  waveInfo.innerHTML = `
    <div class="nb-stat">
      <span class="nb-stat-label">Core HP</span>
      <span class="nb-stat-value ${hpClass}">${state.coreHP}/${state.maxCoreHP}</span>
    </div>
    <div class="nb-stat">
      <span class="nb-stat-label">Wave</span>
      <span class="nb-stat-value ${isBossWave ? "nb-boss-warning" : ""}">${waveDesc}</span>
    </div>
    <div class="nb-stat">
      <span class="nb-stat-label">Credits</span>
      <span class="nb-stat-value" style="color:#ffcc00">⚡${state.credits}</span>
    </div>
    <div class="nb-stat">
      <span class="nb-stat-label">Score</span>
      <span class="nb-stat-value">${state.score.toLocaleString()}</span>
    </div>
    ${state.phase === GamePhase.Building || state.phase === GamePhase.BetweenWaves ? `
      <button class="nb-wave-btn" id="nb-start-wave">
        ${state.wave === 0 ? "▶ START" : "▶ NEXT WAVE"}
      </button>
    ` : ""}
    ${state.phase === GamePhase.Wave ? `
      <div class="nb-stat">
        <span class="nb-stat-label">Enemies</span>
        <span class="nb-stat-value" style="color:#ff4444">${state.enemiesAlive}</span>
      </div>
    ` : ""}
  `;

  document.getElementById("nb-start-wave")?.addEventListener("click", () => onStartWave?.());

  // Tower panel
  if (state.phase !== GamePhase.Title && state.phase !== GamePhase.GameOver && state.phase !== GamePhase.Victory) {
    towerPanel.style.display = "flex";
    towerPanel.innerHTML = Object.values(TOWER_DEFS).map((def, i) => {
      const canAfford = state.credits >= def.cost;
      const isSelected = state.selectedTower === def.type;
      return `
        <div class="nb-tower-btn ${isSelected ? "selected" : ""} ${!canAfford ? "disabled" : ""}"
             data-tower="${def.type}">
          <div class="nb-tower-icon" style="background:#${def.color.toString(16).padStart(6, "0")}"></div>
          <div class="nb-tower-name">${def.name}</div>
          <div class="nb-tower-cost">⚡${def.cost}</div>
          <div class="nb-tower-key">[${i + 1}]</div>
        </div>
      `;
    }).join("");

    // Tower button click handlers
    towerPanel.querySelectorAll(".nb-tower-btn").forEach((btn) => {
      const type = (btn as HTMLElement).dataset.tower as TowerType;
      btn.addEventListener("click", () => onTowerSelect?.(type));
      btn.addEventListener("mouseenter", (e) => {
        showTowerInfoTooltip(type, (e as MouseEvent).clientX, (e as MouseEvent).clientY);
      });
      btn.addEventListener("mouseleave", () => hideTowerInfoTooltip());
    });
  } else {
    towerPanel.style.display = "none";
  }
}

function showTowerInfoTooltip(type: TowerType, x: number, y: number) {
  if (!towerInfo) return;
  const def = TOWER_DEFS[type];
  towerInfo.innerHTML = `
    <div style="color:#${def.color.toString(16).padStart(6, "0")};font-weight:700;margin-bottom:4px">${def.name}</div>
    <div style="color:rgba(255,255,255,0.6);margin-bottom:6px">${def.description}</div>
    <div>Damage: ${def.damage}</div>
    <div>Range: ${def.range}</div>
    <div>Fire Rate: ${def.fireRate}/s</div>
    ${def.special ? `<div style="color:#ffcc00;margin-top:4px">★ ${def.special}</div>` : ""}
  `;
  towerInfo.style.display = "block";
  towerInfo.style.left = `${x + 10}px`;
  towerInfo.style.top = `${y - 120}px`;
}

function hideTowerInfoTooltip() {
  if (towerInfo) towerInfo.style.display = "none";
}

function showSelectedTowerInfo(tower: Tower) {
  if (!selectedTowerPanel) return;
  const def = tower.def;
  const upgCost = getUpgradeCost(tower);
  const sellVal = getSellValue(tower);
  const colorHex = `#${def.color.toString(16).padStart(6, "0")}`;

  selectedTowerPanel.style.display = "block";
  selectedTowerPanel.innerHTML = `
    <div style="color:${colorHex};font-weight:700;margin-bottom:6px">${def.name} Lv.${tower.level + 1}</div>
    <div style="font-size:10px;line-height:1.6">
      DMG: ${tower.currentDamage}${tower.buffed ? " <span style='color:#44ff88'>+30%</span>" : ""}<br>
      RNG: ${tower.currentRange.toFixed(1)}<br>
      ROF: ${tower.currentFireRate.toFixed(1)}/s
    </div>
    <div style="margin-top:8px;display:flex;gap:6px">
      ${upgCost !== null ? `<button class="nb-wave-btn" id="nb-upgrade" style="font-size:10px;padding:5px 10px">
        UPGRADE ⚡${upgCost} [U]
      </button>` : `<span style="font-size:10px;color:#ffcc00">MAX LEVEL</span>`}
      <button class="nb-wave-btn" id="nb-sell" style="font-size:10px;padding:5px 10px;border-color:#ff4444;color:#ff4444">
        SELL ⚡${sellVal} [X]
      </button>
    </div>
  `;

  document.getElementById("nb-upgrade")?.addEventListener("click", () => onUpgradeTower?.());
  document.getElementById("nb-sell")?.addEventListener("click", () => onSellTower?.());
}

function hideSelectedTowerInfo() {
  if (selectedTowerPanel) selectedTowerPanel.style.display = "none";
}

let notificationTimeout: number | null = null;

function showNotification(text: string, color: string = "#00ffff", duration: number = 2000) {
  if (!notification) return;
  notification.textContent = text;
  notification.style.color = color;
  notification.style.opacity = "1";

  if (notificationTimeout) clearTimeout(notificationTimeout);
  notificationTimeout = window.setTimeout(() => {
    if (notification) notification.style.opacity = "0";
  }, duration);
}
