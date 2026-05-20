// Neon Bastion - Tower System

import {
  Group,
  Mesh,
  BoxGeometry,
  CylinderGeometry,
  SphereGeometry,
  ConeGeometry,
  OctahedronGeometry,
  RingGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  LineBasicMaterial,
  LineSegments,
  EdgesGeometry,
  Color,
  Vector3,
  PointLight,
  DoubleSide,
} from "@iwsdk/core";
import {
  TowerType,
  TowerDef,
  TOWER_DEFS,
  CELL_SIZE,
  gridToWorld,
} from "./constants";

export interface Tower {
  type: TowerType;
  row: number;
  col: number;
  level: number; // 0-3
  group: Group;
  turretGroup: Group;
  rangeIndicator: Mesh | null;
  lastFireTime: number;
  target: any | null;
  def: TowerDef;
  currentDamage: number;
  currentRange: number;
  currentFireRate: number;
  light: PointLight;
  buffed: boolean;
}

export function createTower(type: TowerType, row: number, col: number): Tower {
  const def = TOWER_DEFS[type];
  const [x, _, z] = gridToWorld(row, col);
  const group = new Group();
  group.position.set(x, 0, z);

  // Base platform
  const baseGeo = new CylinderGeometry(0.6, 0.7, 0.2, 8);
  const baseMat = new MeshStandardMaterial({
    color: 0x1a2a3a,
    emissive: new Color(def.color).multiplyScalar(0.2),
    metalness: 0.8,
    roughness: 0.3,
  });
  const base = new Mesh(baseGeo, baseMat);
  base.position.y = 0.1;
  group.add(base);

  // Tower body varies by type
  const turretGroup = new Group();
  turretGroup.position.y = 0.2;

  switch (type) {
    case TowerType.Pulse:
      createPulseTurret(turretGroup, def.color);
      break;
    case TowerType.Laser:
      createLaserTurret(turretGroup, def.color);
      break;
    case TowerType.Frost:
      createFrostTurret(turretGroup, def.color);
      break;
    case TowerType.Tesla:
      createTeslaTurret(turretGroup, def.color);
      break;
    case TowerType.Missile:
      createMissileTurret(turretGroup, def.color);
      break;
    case TowerType.Shield:
      createShieldTurret(turretGroup, def.color);
      break;
  }

  group.add(turretGroup);

  // Tower light
  const light = new PointLight(def.color, 0.5, 4);
  light.position.set(0, 1.5, 0);
  group.add(light);

  // Range indicator (hidden by default)
  const rangeGeo = new RingGeometry(def.range - 0.1, def.range, 32);
  const rangeMat = new MeshBasicMaterial({
    color: def.color,
    transparent: true,
    opacity: 0.15,
    side: DoubleSide,
  });
  const rangeIndicator = new Mesh(rangeGeo, rangeMat);
  rangeIndicator.rotation.x = -Math.PI / 2;
  rangeIndicator.position.set(x, 0.02, z);
  rangeIndicator.visible = false;

  return {
    type,
    row,
    col,
    level: 0,
    group,
    turretGroup,
    rangeIndicator,
    lastFireTime: 0,
    target: null,
    def,
    currentDamage: def.damage,
    currentRange: def.range,
    currentFireRate: def.fireRate,
    light,
    buffed: false,
  };
}

function createPulseTurret(group: Group, color: number) {
  // Cylindrical body with energy tip
  const bodyGeo = new CylinderGeometry(0.2, 0.3, 0.8, 8);
  const bodyMat = new MeshStandardMaterial({
    color: 0x222244,
    emissive: new Color(color).multiplyScalar(0.3),
    metalness: 0.7,
    roughness: 0.3,
  });
  const body = new Mesh(bodyGeo, bodyMat);
  body.position.y = 0.4;
  group.add(body);

  // Barrel
  const barrelGeo = new CylinderGeometry(0.06, 0.08, 0.5, 8);
  const barrelMat = new MeshBasicMaterial({ color });
  const barrel = new Mesh(barrelGeo, barrelMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.7, -0.3);
  group.add(barrel);

  // Energy tip
  const tipGeo = new SphereGeometry(0.1, 8, 8);
  const tipMat = new MeshBasicMaterial({ color });
  const tip = new Mesh(tipGeo, tipMat);
  tip.position.set(0, 0.7, -0.55);
  group.add(tip);
}

function createLaserTurret(group: Group, color: number) {
  // Tall narrow tower with lens
  const bodyGeo = new CylinderGeometry(0.15, 0.25, 1.2, 6);
  const bodyMat = new MeshStandardMaterial({
    color: 0x332222,
    emissive: new Color(color).multiplyScalar(0.2),
    metalness: 0.8,
    roughness: 0.2,
  });
  const body = new Mesh(bodyGeo, bodyMat);
  body.position.y = 0.6;
  group.add(body);

  // Focusing lens
  const lensGeo = new SphereGeometry(0.12, 16, 16);
  const lensMat = new MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });
  const lens = new Mesh(lensGeo, lensMat);
  lens.position.set(0, 1.1, -0.2);
  group.add(lens);

  // Side fins
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const finGeo = new BoxGeometry(0.02, 0.4, 0.15);
    const finMat = new MeshBasicMaterial({ color, transparent: true, opacity: 0.5 });
    const fin = new Mesh(finGeo, finMat);
    fin.position.set(Math.cos(angle) * 0.2, 0.8, Math.sin(angle) * 0.2);
    group.add(fin);
  }
}

function createFrostTurret(group: Group, color: number) {
  // Crystal-like form
  const bodyGeo = new OctahedronGeometry(0.35, 0);
  const bodyMat = new MeshStandardMaterial({
    color: 0x224455,
    emissive: new Color(color).multiplyScalar(0.3),
    metalness: 0.5,
    roughness: 0.1,
    transparent: true,
    opacity: 0.8,
  });
  const body = new Mesh(bodyGeo, bodyMat);
  body.position.y = 0.7;
  group.add(body);

  // Wireframe overlay
  const wireGeo = new EdgesGeometry(bodyGeo);
  const wire = new LineSegments(
    wireGeo,
    new LineBasicMaterial({ color, transparent: true, opacity: 0.8 })
  );
  wire.position.y = 0.7;
  group.add(wire);

  // Small orbiting crystals
  for (let i = 0; i < 3; i++) {
    const crystalGeo = new OctahedronGeometry(0.08, 0);
    const crystalMat = new MeshBasicMaterial({ color });
    const crystal = new Mesh(crystalGeo, crystalMat);
    const angle = (i / 3) * Math.PI * 2;
    crystal.position.set(Math.cos(angle) * 0.5, 0.7, Math.sin(angle) * 0.5);
    crystal.userData.orbitAngle = angle;
    group.add(crystal);
  }
}

function createTeslaTurret(group: Group, color: number) {
  // Tesla coil shape
  const baseBodyGeo = new CylinderGeometry(0.25, 0.35, 0.5, 8);
  const baseBodyMat = new MeshStandardMaterial({
    color: 0x222233,
    emissive: new Color(color).multiplyScalar(0.2),
    metalness: 0.7,
    roughness: 0.3,
  });
  const baseBody = new Mesh(baseBodyGeo, baseBodyMat);
  baseBody.position.y = 0.25;
  group.add(baseBody);

  // Coil rings
  for (let i = 0; i < 4; i++) {
    const ringGeo = new CylinderGeometry(0.25 - i * 0.03, 0.25 - i * 0.03, 0.03, 16);
    const ringMat = new MeshBasicMaterial({ color, transparent: true, opacity: 0.6 });
    const ring = new Mesh(ringGeo, ringMat);
    ring.position.y = 0.6 + i * 0.2;
    group.add(ring);
  }

  // Top electrode
  const topGeo = new SphereGeometry(0.15, 8, 8);
  const topMat = new MeshBasicMaterial({ color });
  const top = new Mesh(topGeo, topMat);
  top.position.y = 1.4;
  group.add(top);
}

function createMissileTurret(group: Group, color: number) {
  // Box launcher with tubes
  const bodyGeo = new BoxGeometry(0.5, 0.4, 0.5);
  const bodyMat = new MeshStandardMaterial({
    color: 0x332211,
    emissive: new Color(color).multiplyScalar(0.2),
    metalness: 0.7,
    roughness: 0.4,
  });
  const body = new Mesh(bodyGeo, bodyMat);
  body.position.y = 0.5;
  group.add(body);

  // Missile tubes
  const tubePositions = [
    [-0.12, 0.12], [0.12, 0.12], [-0.12, -0.12], [0.12, -0.12],
  ];
  tubePositions.forEach(([tx, tz]) => {
    const tubeGeo = new CylinderGeometry(0.06, 0.06, 0.3, 8);
    const tubeMat = new MeshBasicMaterial({ color, transparent: true, opacity: 0.7 });
    const tube = new Mesh(tubeGeo, tubeMat);
    tube.position.set(tx, 0.8, tz);
    group.add(tube);
  });

  // Radar dish
  const dishGeo = new ConeGeometry(0.15, 0.08, 8);
  const dishMat = new MeshBasicMaterial({ color: 0x444444 });
  const dish = new Mesh(dishGeo, dishMat);
  dish.position.set(0, 0.9, 0);
  group.add(dish);
}

function createShieldTurret(group: Group, color: number) {
  // Domed shield generator
  const bodyGeo = new CylinderGeometry(0.3, 0.35, 0.5, 8);
  const bodyMat = new MeshStandardMaterial({
    color: 0x223322,
    emissive: new Color(color).multiplyScalar(0.3),
    metalness: 0.6,
    roughness: 0.3,
  });
  const body = new Mesh(bodyGeo, bodyMat);
  body.position.y = 0.25;
  group.add(body);

  // Shield dome
  const domeGeo = new SphereGeometry(0.4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const domeMat = new MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.2,
    side: DoubleSide,
  });
  const dome = new Mesh(domeGeo, domeMat);
  dome.position.y = 0.5;
  group.add(dome);

  // Wireframe dome
  const domeWire = new LineSegments(
    new EdgesGeometry(domeGeo),
    new LineBasicMaterial({ color, transparent: true, opacity: 0.4 })
  );
  domeWire.position.y = 0.5;
  group.add(domeWire);

  // Antenna
  const antGeo = new CylinderGeometry(0.02, 0.02, 0.6, 4);
  const antMat = new MeshBasicMaterial({ color });
  const ant = new Mesh(antGeo, antMat);
  ant.position.y = 0.9;
  group.add(ant);
}

export function upgradeTower(tower: Tower): boolean {
  if (tower.level >= 3) return false;
  const upgradeCost = tower.def.upgradeCosts[tower.level];
  tower.level++;
  tower.currentDamage = tower.def.upgradeDamage[tower.level - 1];
  tower.currentRange = tower.def.upgradeRange[tower.level - 1];
  tower.currentFireRate = tower.def.upgradeFireRate[tower.level - 1];

  // Visual upgrade - scale up slightly and brighten
  const scale = 1 + tower.level * 0.1;
  tower.turretGroup.scale.set(scale, scale, scale);
  tower.light.intensity = 0.5 + tower.level * 0.3;

  // Update range indicator
  if (tower.rangeIndicator) {
    const rangeGeo = new RingGeometry(tower.currentRange - 0.1, tower.currentRange, 32);
    tower.rangeIndicator.geometry.dispose();
    tower.rangeIndicator.geometry = rangeGeo;
  }

  return true;
}

export function getUpgradeCost(tower: Tower): number | null {
  if (tower.level >= 3) return null;
  return tower.def.upgradeCosts[tower.level];
}

export function getSellValue(tower: Tower): number {
  let total = tower.def.cost;
  for (let i = 0; i < tower.level; i++) {
    total += tower.def.upgradeCosts[i];
  }
  return Math.floor(total * 0.6);
}

export function animateTowers(towers: Tower[], time: number) {
  towers.forEach((tower) => {
    // Rotate turret toward target
    if (tower.target) {
      const targetPos = tower.target.group.position;
      const dx = targetPos.x - tower.group.position.x;
      const dz = targetPos.z - tower.group.position.z;
      const angle = Math.atan2(dx, -dz);
      tower.turretGroup.rotation.y += (angle - tower.turretGroup.rotation.y) * 0.1;
    }

    // Type-specific animations
    switch (tower.type) {
      case TowerType.Frost: {
        // Orbit crystals
        const crystals = tower.turretGroup.children.filter(
          (c) => c.userData.orbitAngle !== undefined
        );
        crystals.forEach((c) => {
          c.userData.orbitAngle += 0.02;
          c.position.x = Math.cos(c.userData.orbitAngle) * 0.5;
          c.position.z = Math.sin(c.userData.orbitAngle) * 0.5;
        });
        break;
      }
      case TowerType.Tesla: {
        // Pulse coil rings
        tower.turretGroup.children.forEach((child, i) => {
          if (i >= 2 && i <= 5) {
            const s = 1 + Math.sin(time * 4 + i) * 0.1;
            child.scale.set(s, 1, s);
          }
        });
        break;
      }
      case TowerType.Shield: {
        // Pulse dome
        if (tower.turretGroup.children[1]) {
          const s = 1 + Math.sin(time * 2) * 0.05;
          tower.turretGroup.children[1].scale.set(s, s, s);
          const mat = tower.turretGroup.children[1] as Mesh;
          if ((mat as any).material) {
            (mat as any).material.opacity = 0.15 + Math.sin(time * 3) * 0.05;
          }
        }
        break;
      }
    }

    // Light pulse
    tower.light.intensity = 0.4 + Math.sin(time * 2 + tower.row + tower.col) * 0.2;
  });
}
