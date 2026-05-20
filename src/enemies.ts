// Neon Bastion - Enemy System

import {
  Group,
  Mesh,
  BoxGeometry,
  SphereGeometry,
  CylinderGeometry,
  ConeGeometry,
  OctahedronGeometry,
  TetrahedronGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  LineSegments,
  EdgesGeometry,
  LineBasicMaterial,
  Color,
  Vector3,
  DoubleSide,
} from "@iwsdk/core";
import {
  EnemyType,
  EnemyDef,
  ENEMY_DEFS,
  CELL_SIZE,
  gridToWorld,
  PATHS,
} from "./constants";

export interface Enemy {
  type: EnemyType;
  def: EnemyDef;
  hp: number;
  maxHp: number;
  speed: number;
  baseSpeed: number;
  group: Group;
  healthBar: Mesh;
  healthBarBg: Mesh;
  pathIndex: number; // which path (0-3)
  waypointIndex: number; // current waypoint on path
  progress: number; // 0-1 between waypoints
  alive: boolean;
  reachedCore: boolean;
  slowTimer: number;
  shieldHP: number;
  maxShieldHP: number;
  shieldMesh: Mesh | null;
  phaseTimer: number;
  spawnTime: number;
}

export function createEnemy(
  type: EnemyType,
  pathIndex: number,
  waveMultiplier: number = 1
): Enemy {
  const def = ENEMY_DEFS[type];
  const group = new Group();

  // Scale HP with wave
  const hp = Math.floor(def.hp * waveMultiplier);
  const maxHp = hp;

  // Create visual based on type
  let shieldMesh: Mesh | null = null;

  switch (type) {
    case EnemyType.Drone:
      createDroneVisual(group, def.color);
      break;
    case EnemyType.Tank:
      createTankVisual(group, def.color);
      break;
    case EnemyType.Swarm:
      createSwarmVisual(group, def.color);
      break;
    case EnemyType.Phaser:
      createPhaserVisual(group, def.color);
      break;
    case EnemyType.Shielded:
      shieldMesh = createShieldedVisual(group, def.color);
      break;
    case EnemyType.Boss:
      createBossVisual(group, def.color);
      break;
  }

  // Scale
  const s = def.scale;
  group.scale.set(s, s, s);

  // Health bar
  const hbBgGeo = new BoxGeometry(1.2, 0.12, 0.02);
  const hbBgMat = new MeshBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.8 });
  const healthBarBg = new Mesh(hbBgGeo, hbBgMat);
  healthBarBg.position.y = 2.5 / s;
  group.add(healthBarBg);

  const hbGeo = new BoxGeometry(1.2, 0.1, 0.03);
  const hbMat = new MeshBasicMaterial({ color: 0x00ff44 });
  const healthBar = new Mesh(hbGeo, hbMat);
  healthBar.position.y = 2.5 / s;
  group.add(healthBar);

  // Set initial position
  const path = PATHS[pathIndex % PATHS.length];
  const [startRow, startCol] = path[0];
  const [sx, sy, sz] = gridToWorld(startRow, startCol);
  group.position.set(sx, 0.5, sz);

  // Shield HP for shielded type
  const shieldHP = type === EnemyType.Shielded ? Math.floor(40 * waveMultiplier) : 0;

  return {
    type,
    def,
    hp,
    maxHp,
    speed: def.speed,
    baseSpeed: def.speed,
    group,
    healthBar,
    healthBarBg,
    pathIndex: pathIndex % PATHS.length,
    waypointIndex: 0,
    progress: 0,
    alive: true,
    reachedCore: false,
    slowTimer: 0,
    shieldHP,
    maxShieldHP: shieldHP,
    shieldMesh,
    phaseTimer: 0,
    spawnTime: performance.now() / 1000,
  };
}

function createDroneVisual(group: Group, color: number) {
  // Triangular drone
  const bodyGeo = new TetrahedronGeometry(0.8, 0);
  const bodyMat = new MeshStandardMaterial({
    color: 0x111111,
    emissive: new Color(color).multiplyScalar(0.5),
    metalness: 0.6,
    roughness: 0.4,
  });
  const body = new Mesh(bodyGeo, bodyMat);
  body.position.y = 1;
  body.rotation.y = Math.PI / 4;
  group.add(body);

  // Wireframe
  const wire = new LineSegments(
    new EdgesGeometry(bodyGeo),
    new LineBasicMaterial({ color })
  );
  wire.position.copy(body.position);
  wire.rotation.copy(body.rotation);
  group.add(wire);
}

function createTankVisual(group: Group, color: number) {
  // Heavy cube body
  const bodyGeo = new BoxGeometry(1.2, 1, 1.2);
  const bodyMat = new MeshStandardMaterial({
    color: 0x221111,
    emissive: new Color(color).multiplyScalar(0.3),
    metalness: 0.8,
    roughness: 0.3,
  });
  const body = new Mesh(bodyGeo, bodyMat);
  body.position.y = 1;
  group.add(body);

  // Wireframe
  const wire = new LineSegments(
    new EdgesGeometry(bodyGeo),
    new LineBasicMaterial({ color })
  );
  wire.position.copy(body.position);
  group.add(wire);

  // Armor plates
  const plateGeo = new BoxGeometry(0.2, 0.8, 1.3);
  [-0.7, 0.7].forEach((x) => {
    const plate = new Mesh(
      plateGeo,
      new MeshBasicMaterial({ color, transparent: true, opacity: 0.3 })
    );
    plate.position.set(x, 1, 0);
    group.add(plate);
  });
}

function createSwarmVisual(group: Group, color: number) {
  // Small sphere
  const bodyGeo = new SphereGeometry(0.6, 6, 6);
  const bodyMat = new MeshBasicMaterial({ color });
  const body = new Mesh(bodyGeo, bodyMat);
  body.position.y = 0.8;
  group.add(body);

  // Trail core
  const coreGeo = new SphereGeometry(0.3, 4, 4);
  const coreMat = new MeshBasicMaterial({ color: 0xffffff });
  const core = new Mesh(coreGeo, coreMat);
  core.position.y = 0.8;
  group.add(core);
}

function createPhaserVisual(group: Group, color: number) {
  // Ethereal octahedron
  const bodyGeo = new OctahedronGeometry(0.7, 0);
  const bodyMat = new MeshStandardMaterial({
    color: 0x110022,
    emissive: new Color(color).multiplyScalar(0.6),
    metalness: 0.3,
    roughness: 0.2,
    transparent: true,
    opacity: 0.7,
  });
  const body = new Mesh(bodyGeo, bodyMat);
  body.position.y = 1;
  group.add(body);

  // Glowing wireframe
  const wire = new LineSegments(
    new EdgesGeometry(bodyGeo),
    new LineBasicMaterial({ color, transparent: true, opacity: 0.9 })
  );
  wire.position.copy(body.position);
  group.add(wire);
}

function createShieldedVisual(group: Group, color: number): Mesh {
  // Core body
  const bodyGeo = new CylinderGeometry(0.5, 0.5, 1, 8);
  const bodyMat = new MeshStandardMaterial({
    color: 0x112222,
    emissive: new Color(color).multiplyScalar(0.3),
    metalness: 0.6,
    roughness: 0.3,
  });
  const body = new Mesh(bodyGeo, bodyMat);
  body.position.y = 1;
  group.add(body);

  // Shield bubble
  const shieldGeo = new SphereGeometry(1.0, 12, 12);
  const shieldMat = new MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.2,
    side: DoubleSide,
  });
  const shield = new Mesh(shieldGeo, shieldMat);
  shield.position.y = 1;
  group.add(shield);

  // Shield wireframe
  const shieldWire = new LineSegments(
    new EdgesGeometry(shieldGeo),
    new LineBasicMaterial({ color, transparent: true, opacity: 0.4 })
  );
  shieldWire.position.y = 1;
  group.add(shieldWire);

  return shield;
}

function createBossVisual(group: Group, color: number) {
  // Massive compound shape
  const bodyGeo = new OctahedronGeometry(1.0, 1);
  const bodyMat = new MeshStandardMaterial({
    color: 0x220011,
    emissive: new Color(color).multiplyScalar(0.4),
    metalness: 0.7,
    roughness: 0.3,
  });
  const body = new Mesh(bodyGeo, bodyMat);
  body.position.y = 1.2;
  group.add(body);

  // Wireframe
  const wire = new LineSegments(
    new EdgesGeometry(bodyGeo),
    new LineBasicMaterial({ color })
  );
  wire.position.copy(body.position);
  group.add(wire);

  // Orbiting spikes
  for (let i = 0; i < 6; i++) {
    const spikeGeo = new ConeGeometry(0.15, 0.5, 4);
    const spikeMat = new MeshBasicMaterial({ color });
    const spike = new Mesh(spikeGeo, spikeMat);
    const angle = (i / 6) * Math.PI * 2;
    spike.position.set(Math.cos(angle) * 1.2, 1.2, Math.sin(angle) * 1.2);
    spike.lookAt(new Vector3(0, 1.2, 0));
    spike.userData.orbitAngle = angle;
    spike.userData.orbitRadius = 1.2;
    group.add(spike);
  }

  // Central eye
  const eyeGeo = new SphereGeometry(0.2, 8, 8);
  const eyeMat = new MeshBasicMaterial({ color: 0xffffff });
  const eye = new Mesh(eyeGeo, eyeMat);
  eye.position.y = 1.2;
  group.add(eye);
}

export function updateEnemies(enemies: Enemy[], dt: number, time: number): Enemy[] {
  const deadEnemies: Enemy[] = [];

  enemies.forEach((enemy) => {
    if (!enemy.alive) return;

    // Slow effect countdown
    if (enemy.slowTimer > 0) {
      enemy.slowTimer -= dt;
      enemy.speed = enemy.baseSpeed * 0.4;
      if (enemy.slowTimer <= 0) {
        enemy.speed = enemy.baseSpeed;
      }
    }

    // Phase teleport for Phasers
    if (enemy.type === EnemyType.Phaser) {
      enemy.phaseTimer -= dt;
      if (enemy.phaseTimer <= 0) {
        // Skip ahead 1.5 waypoints
        enemy.progress += 1.5;
        while (enemy.progress >= 1) {
          enemy.progress -= 1;
          enemy.waypointIndex++;
        }
        enemy.phaseTimer = 3 + Math.random() * 2;

        // Flash effect
        enemy.group.children.forEach((c) => {
          if ((c as Mesh).material) {
            const m = (c as Mesh).material as MeshBasicMaterial;
            if (m.opacity !== undefined) {
              m.opacity = 0.1;
              setTimeout(() => { m.opacity = 0.7; }, 200);
            }
          }
        });
      }
    }

    // Shield regeneration for Shielded type
    if (enemy.type === EnemyType.Shielded && enemy.shieldHP < enemy.maxShieldHP) {
      enemy.shieldHP = Math.min(enemy.maxShieldHP, enemy.shieldHP + dt * 5);
      if (enemy.shieldMesh) {
        const mat = enemy.shieldMesh.material as MeshBasicMaterial;
        mat.opacity = 0.05 + (enemy.shieldHP / enemy.maxShieldHP) * 0.2;
      }
    }

    // Move along path
    const path = PATHS[enemy.pathIndex];
    if (enemy.waypointIndex >= path.length - 1) {
      enemy.reachedCore = true;
      enemy.alive = false;
      deadEnemies.push(enemy);
      return;
    }

    const [cr, cc] = path[enemy.waypointIndex];
    const [nr, nc] = path[enemy.waypointIndex + 1];
    const [cx, cy, cz] = gridToWorld(cr, cc);
    const [nx, ny, nz] = gridToWorld(nr, nc);

    enemy.progress += (enemy.speed * dt) / CELL_SIZE;

    if (enemy.progress >= 1) {
      enemy.progress -= 1;
      enemy.waypointIndex++;
      if (enemy.waypointIndex >= path.length - 1) {
        enemy.reachedCore = true;
        enemy.alive = false;
        deadEnemies.push(enemy);
        return;
      }
    }

    // Interpolate position
    const t = enemy.progress;
    const [cr2, cc2] = path[enemy.waypointIndex];
    const nextIdx = Math.min(enemy.waypointIndex + 1, path.length - 1);
    const [nr2, nc2] = path[nextIdx];
    const [cx2, cy2, cz2] = gridToWorld(cr2, cc2);
    const [nx2, ny2, nz2] = gridToWorld(nr2, nc2);

    enemy.group.position.x = cx2 + (nx2 - cx2) * t;
    enemy.group.position.z = cz2 + (nz2 - cz2) * t;
    enemy.group.position.y = 0.5 + Math.sin(time * 3 + enemy.spawnTime) * 0.1;

    // Face movement direction
    const dx = nx2 - cx2;
    const dz = nz2 - cz2;
    if (dx !== 0 || dz !== 0) {
      enemy.group.rotation.y = Math.atan2(dx, -dz);
    }

    // Animate
    animateEnemy(enemy, time);

    // Update health bar
    const hpRatio = enemy.hp / enemy.maxHp;
    enemy.healthBar.scale.x = Math.max(0.01, hpRatio);
    enemy.healthBar.position.x = -(1 - hpRatio) * 0.6;
    const hpColor = hpRatio > 0.5 ? 0x00ff44 : hpRatio > 0.25 ? 0xffff00 : 0xff2222;
    (enemy.healthBar.material as MeshBasicMaterial).color.setHex(hpColor);
  });

  return deadEnemies;
}

function animateEnemy(enemy: Enemy, time: number) {
  switch (enemy.type) {
    case EnemyType.Drone: {
      // Wobble
      if (enemy.group.children[0]) {
        enemy.group.children[0].rotation.y = time * 2;
        enemy.group.children[0].rotation.x = Math.sin(time * 3) * 0.2;
      }
      if (enemy.group.children[1]) {
        enemy.group.children[1].rotation.y = time * 2;
        enemy.group.children[1].rotation.x = Math.sin(time * 3) * 0.2;
      }
      break;
    }
    case EnemyType.Boss: {
      // Orbit spikes
      enemy.group.children.forEach((child) => {
        if (child.userData.orbitAngle !== undefined) {
          child.userData.orbitAngle += 0.03;
          const r = child.userData.orbitRadius;
          child.position.x = Math.cos(child.userData.orbitAngle) * r;
          child.position.z = Math.sin(child.userData.orbitAngle) * r;
        }
      });
      // Pulse body
      if (enemy.group.children[0]) {
        const s = 1 + Math.sin(time * 2) * 0.05;
        enemy.group.children[0].scale.set(s, s, s);
      }
      break;
    }
    case EnemyType.Phaser: {
      // Flicker
      if (enemy.group.children[0]) {
        const mat = (enemy.group.children[0] as Mesh).material as MeshStandardMaterial;
        mat.opacity = 0.5 + Math.sin(time * 8) * 0.2;
      }
      break;
    }
  }

  // Slow effect visual
  if (enemy.slowTimer > 0) {
    const flash = Math.sin(time * 10) > 0 ? 0x44ccff : enemy.def.color;
    if (enemy.group.children[0]) {
      const mat = (enemy.group.children[0] as Mesh).material as any;
      if (mat.emissive) mat.emissive.setHex(flash);
    }
  }
}

export function damageEnemy(enemy: Enemy, damage: number): boolean {
  if (!enemy.alive) return false;

  // Shield absorbs damage first
  if (enemy.shieldHP > 0) {
    const absorbed = Math.min(enemy.shieldHP, damage);
    enemy.shieldHP -= absorbed;
    damage -= absorbed;
    if (enemy.shieldMesh) {
      const mat = enemy.shieldMesh.material as MeshBasicMaterial;
      mat.opacity = 0.05 + (enemy.shieldHP / enemy.maxShieldHP) * 0.2;
    }
  }

  enemy.hp -= damage;

  // Flash effect on hit
  enemy.group.children.forEach((c) => {
    if ((c as Mesh).material && (c as any).material.emissive) {
      const origEmissive = (c as any).material.emissive.clone();
      (c as any).material.emissive.setHex(0xffffff);
      setTimeout(() => {
        (c as any).material.emissive.copy(origEmissive);
      }, 50);
    }
  });

  if (enemy.hp <= 0) {
    enemy.alive = false;
    return true; // killed
  }
  return false;
}

export function applySlowEffect(enemy: Enemy, duration: number) {
  enemy.slowTimer = Math.max(enemy.slowTimer, duration);
}
