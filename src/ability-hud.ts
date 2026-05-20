// Neon Bastion - Ability HUD Bar

import type { Ability } from "./abilities";

let abilityBar: HTMLDivElement | null = null;

export function createAbilityBar() {
  const style = document.createElement("style");
  style.textContent = `
    .nb-ability-bar {
      position: fixed;
      bottom: 100px;
      left: 10px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      z-index: 1000;
      font-family: 'Orbitron', 'Share Tech Mono', monospace;
    }
    .nb-ability-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      background: rgba(0, 8, 20, 0.85);
      border: 1px solid rgba(0, 255, 255, 0.2);
      border-radius: 4px;
      color: #00ffff;
      font-size: 10px;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
      overflow: hidden;
    }
    .nb-ability-btn:hover:not(.on-cooldown) {
      border-color: rgba(0, 255, 255, 0.6);
      background: rgba(0, 20, 40, 0.9);
    }
    .nb-ability-btn.on-cooldown {
      opacity: 0.5;
      cursor: default;
    }
    .nb-ability-key {
      font-weight: 700;
      font-size: 12px;
      width: 20px;
      text-align: center;
    }
    .nb-ability-name {
      flex: 1;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .nb-ability-cost {
      color: #ffcc00;
      font-size: 9px;
    }
    .nb-ability-cooldown-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 2px;
      background: #00ffff;
      transition: width 0.3s;
    }
  `;
  document.head.appendChild(style);

  abilityBar = document.createElement("div");
  abilityBar.className = "nb-ability-bar";
  document.body.appendChild(abilityBar);
}

export function updateAbilityBar(abilities: Ability[], credits: number, isWave: boolean) {
  if (!abilityBar) return;
  if (!isWave) {
    abilityBar.style.display = "none";
    return;
  }
  abilityBar.style.display = "flex";

  abilityBar.innerHTML = abilities.map((a) => {
    const onCooldown = a.currentCooldown > 0;
    const canAfford = credits >= a.cost;
    const colorHex = `#${a.color.toString(16).padStart(6, "0")}`;
    const cdPct = onCooldown ? (a.currentCooldown / a.cooldown * 100) : 0;

    return `
      <div class="nb-ability-btn ${onCooldown ? "on-cooldown" : ""}" style="border-color:${colorHex}40">
        <span class="nb-ability-key" style="color:${colorHex}">[${a.key}]</span>
        <span class="nb-ability-name" style="color:${onCooldown ? "#666" : canAfford ? colorHex : "#666"}">${a.name}</span>
        <span class="nb-ability-cost">${onCooldown ? Math.ceil(a.currentCooldown) + "s" : "⚡" + a.cost}</span>
        <div class="nb-ability-cooldown-bar" style="width:${cdPct}%;background:${colorHex}"></div>
      </div>
    `;
  }).join("");
}
