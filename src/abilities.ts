// Neon Bastion - Special Abilities (Player Active Skills)

import {
  Mesh,
  SphereGeometry,
  MeshBasicMaterial,
  Vector3,
  RingGeometry,
  DoubleSide,
} from "@iwsdk/core";
import type { Enemy } from "./enemies";
import { damageEnemy } from "./enemies";
import { playMissileExplode, playTeslaZap, playFrostHit } from "./audio";

export enum AbilityType {
  AirStrike = "airstrike",
  FreezeAll = "freezeall",
  ChainLightning = "chainlightning",
  Repair = "repair",
}

export interface Ability {
  type: AbilityType;
  name: string;
  description: string;
  cooldown: number; // seconds
  currentCooldown: number;
  cost: number;
  key: string;
  color: number;
}

export function createAbilities(): Ability[] {
  return [
    {
      type: AbilityType.AirStrike,
      name: "Air Strike",
      description: "Deal massive damage in target area",
      cooldown: 30,
      currentCooldown: 0,
      cost: 100,
      key: "Q",
      color: 0xff8800,
    },
    {
      type: AbilityType.FreezeAll,
      name: "Frost Nova",
      description: "Freeze all enemies for 3 seconds",
      cooldown: 45,
      currentCooldown: 0,
      cost: 75,
      key: "W",
      color: 0x44ccff,
    },
    {
      type: AbilityType.ChainLightning,
      name: "Tesla Storm",
      description: "Chain lightning hits all enemies",
      cooldown: 35,
      currentCooldown: 0,
      cost: 80,
      key: "E",
      color: 0xaa44ff,
    },
    {
      type: AbilityType.Repair,
      name: "Repair Core",
      description: "Restore 5 core HP",
      cooldown: 60,
      currentCooldown: 0,
      cost: 150,
      key: "R",
      color: 0x00ff88,
    },
  ];
}

export function useAbility(
  ability: Ability,
  enemies: Enemy[],
  scene: any,
  coreHP: number,
  maxCoreHP: number,
  targetPos?: Vector3
): { creditsSpent: number; coreHPRestored: number; kills: number; rewards: number } {
  let kills = 0;
  let rewards = 0;
  let coreHPRestored = 0;

  ability.currentCooldown = ability.cooldown;

  switch (ability.type) {
    case AbilityType.AirStrike: {
      const center = targetPos || new Vector3(0, 0, 0);
      const radius = 5;
      const damage = 200;

      // Visual
      const blastGeo = new SphereGeometry(0.5, 8, 8);
      const blastMat = new MeshBasicMaterial({
        color: ability.color,
        transparent: true,
        opacity: 0.6,
      });
      const blast = new Mesh(blastGeo, blastMat);
      blast.position.copy(center);
      blast.position.y = 0.5;
      scene.add(blast);

      // Expand and fade
      let age = 0;
      const animate = () => {
        age += 0.016;
        if (age > 0.5) {
          scene.remove(blast);
          return;
        }
        const scale = radius * (age / 0.5);
        blast.scale.set(scale, scale, scale);
        blastMat.opacity = 0.6 * (1 - age / 0.5);
        requestAnimationFrame(animate);
      };
      animate();

      enemies.forEach((e) => {
        if (!e.alive) return;
        const dist = center.distanceTo(e.group.position);
        if (dist <= radius) {
          const dmg = Math.floor(damage * (1 - dist / radius));
          const killed = damageEnemy(e, dmg);
          if (killed) {
            kills++;
            rewards += e.def.reward;
          }
        }
      });

      playMissileExplode();
      break;
    }

    case AbilityType.FreezeAll: {
      enemies.forEach((e) => {
        if (!e.alive) return;
        e.slowTimer = 3;
        e.speed = e.baseSpeed * 0.1;
      });

      // Visual frost wave
      const waveGeo = new RingGeometry(0, 15, 32);
      const waveMat = new MeshBasicMaterial({
        color: ability.color,
        transparent: true,
        opacity: 0.3,
        side: DoubleSide,
      });
      const wave = new Mesh(waveGeo, waveMat);
      wave.rotation.x = -Math.PI / 2;
      wave.position.y = 0.5;
      scene.add(wave);

      let age = 0;
      const animate = () => {
        age += 0.016;
        if (age > 1) {
          scene.remove(wave);
          return;
        }
        waveMat.opacity = 0.3 * (1 - age);
        requestAnimationFrame(animate);
      };
      animate();

      playFrostHit();
      break;
    }

    case AbilityType.ChainLightning: {
      const damage = 50;
      enemies.forEach((e) => {
        if (!e.alive) return;
        const killed = damageEnemy(e, damage);
        if (killed) {
          kills++;
          rewards += e.def.reward;
        }
      });

      playTeslaZap();
      break;
    }

    case AbilityType.Repair: {
      coreHPRestored = Math.min(5, maxCoreHP - coreHP);
      break;
    }
  }

  return { creditsSpent: ability.cost, coreHPRestored, kills, rewards };
}

export function updateAbilityCooldowns(abilities: Ability[], dt: number) {
  abilities.forEach((a) => {
    if (a.currentCooldown > 0) {
      a.currentCooldown = Math.max(0, a.currentCooldown - dt);
    }
  });
}
