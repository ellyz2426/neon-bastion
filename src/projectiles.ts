// Neon Bastion - Projectiles & Effects System

import {
  Group,
  Mesh,
  BoxGeometry,
  SphereGeometry,
  CylinderGeometry,
  MeshBasicMaterial,
  LineBasicMaterial,
  BufferGeometry,
  Float32BufferAttribute,
  Line,
  Points,
  PointsMaterial,
  Color,
  Vector3,
  AdditiveBlending,
} from "@iwsdk/core";
import { TowerType } from "./constants";
import type { Tower } from "./towers";
import type { Enemy } from "./enemies";
import { damageEnemy, applySlowEffect } from "./enemies";
import {
  playTowerShoot,
  playLaserShoot,
  playTeslaZap,
  playFrostHit,
  playMissileShoot,
  playMissileExplode,
  playEnemyHit,
  playEnemyDeath,
  playBossDeath,
} from "./audio";

// ─── Projectile Types ───

export interface Projectile {
  mesh: Mesh | Group;
  position: Vector3;
  velocity: Vector3;
  damage: number;
  tower: Tower;
  target: Enemy | null;
  alive: boolean;
  age: number;
  maxAge: number;
  type: TowerType;
  splashRadius?: number;
  chainTargets?: number;
}

export interface LaserBeam {
  line: Line;
  tower: Tower;
  target: Enemy;
  duration: number;
  age: number;
  damage: number;
}

export interface ChainLightning {
  lines: Line[];
  targets: Enemy[];
  duration: number;
  age: number;
  damage: number;
}

export interface Explosion {
  mesh: Mesh;
  age: number;
  maxAge: number;
  position: Vector3;
  maxScale: number;
}

export interface FloatingText {
  mesh: Mesh;
  age: number;
  maxAge: number;
}

const projectiles: Projectile[] = [];
const laserBeams: LaserBeam[] = [];
const chainLightnings: ChainLightning[] = [];
const explosions: Explosion[] = [];
const floatingTexts: FloatingText[] = [];
const deathParticles: { points: Points; age: number; maxAge: number }[] = [];

export function getProjectiles() { return projectiles; }
export function getLaserBeams() { return laserBeams; }

// ─── Fire Functions ───

export function firePulse(tower: Tower, target: Enemy, scene: any) {
  const start = tower.group.position.clone();
  start.y += 0.7;
  const dir = target.group.position.clone().sub(start).normalize();

  const bulletGeo = new SphereGeometry(0.08, 6, 6);
  const bulletMat = new MeshBasicMaterial({ color: tower.def.color });
  const bullet = new Mesh(bulletGeo, bulletMat);
  bullet.position.copy(start);
  scene.add(bullet);

  const speed = 15;
  projectiles.push({
    mesh: bullet,
    position: start.clone(),
    velocity: dir.multiplyScalar(speed),
    damage: tower.currentDamage * (tower.buffed ? 1.3 : 1),
    tower,
    target,
    alive: true,
    age: 0,
    maxAge: 3,
    type: TowerType.Pulse,
  });

  playTowerShoot(tower.def.color);
}

export function fireLaser(tower: Tower, target: Enemy, scene: any) {
  const start = tower.group.position.clone();
  start.y += 1.1;
  const end = target.group.position.clone();
  end.y += 0.5;

  const geo = new BufferGeometry().setFromPoints([start, end]);
  const mat = new LineBasicMaterial({
    color: tower.def.color,
    transparent: true,
    opacity: 0.8,
  });
  const line = new Line(geo, mat);
  scene.add(line);

  const damage = tower.currentDamage * (tower.buffed ? 1.3 : 1);
  laserBeams.push({
    line,
    tower,
    target,
    duration: 0.3,
    age: 0,
    damage,
  });

  // Apply damage immediately
  const killed = damageEnemy(target, damage);
  if (killed) {
    spawnDeathEffect(target, scene);
  } else {
    playEnemyHit();
  }

  playLaserShoot();
}

export function fireFrost(tower: Tower, target: Enemy, scene: any, enemies: Enemy[]) {
  // Area effect - hit all enemies in range
  const towerPos = tower.group.position;
  const range = tower.currentRange;
  const damage = tower.currentDamage * (tower.buffed ? 1.3 : 1);

  enemies.forEach((enemy) => {
    if (!enemy.alive) return;
    const dist = towerPos.distanceTo(enemy.group.position);
    if (dist <= range) {
      const killed = damageEnemy(enemy, damage);
      applySlowEffect(enemy, 2.0);
      if (killed) {
        spawnDeathEffect(enemy, scene);
      }
    }
  });

  // Frost wave visual
  const waveGeo = new SphereGeometry(0.5, 8, 8);
  const waveMat = new MeshBasicMaterial({
    color: tower.def.color,
    transparent: true,
    opacity: 0.4,
  });
  const wave = new Mesh(waveGeo, waveMat);
  wave.position.copy(towerPos);
  wave.position.y += 0.7;
  scene.add(wave);

  explosions.push({
    mesh: wave,
    age: 0,
    maxAge: 0.5,
    position: towerPos.clone(),
    maxScale: range * 0.5,
  });

  playFrostHit();
}

export function fireTesla(tower: Tower, target: Enemy, scene: any, enemies: Enemy[]) {
  const damage = tower.currentDamage * (tower.buffed ? 1.3 : 1);
  const chainCount = 2 + tower.level;

  // Find chain targets
  const targets: Enemy[] = [target];
  let current = target;

  for (let i = 0; i < chainCount; i++) {
    let closest: Enemy | null = null;
    let closestDist = 4; // chain range

    enemies.forEach((e) => {
      if (!e.alive || targets.includes(e)) return;
      const d = current.group.position.distanceTo(e.group.position);
      if (d < closestDist) {
        closestDist = d;
        closest = e;
      }
    });

    if (closest) {
      targets.push(closest);
      current = closest;
    } else {
      break;
    }
  }

  // Create lightning lines
  const lines: Line[] = [];
  let prevPos = tower.group.position.clone();
  prevPos.y += 1.4;

  targets.forEach((t, i) => {
    const endPos = t.group.position.clone();
    endPos.y += 0.5;

    // Jagged lightning path
    const points: Vector3[] = [prevPos.clone()];
    const segments = 5;
    for (let s = 1; s < segments; s++) {
      const lerp = s / segments;
      const p = prevPos.clone().lerp(endPos, lerp);
      p.x += (Math.random() - 0.5) * 0.5;
      p.y += (Math.random() - 0.5) * 0.3;
      p.z += (Math.random() - 0.5) * 0.5;
      points.push(p);
    }
    points.push(endPos.clone());

    const geo = new BufferGeometry().setFromPoints(points);
    const mat = new LineBasicMaterial({
      color: tower.def.color,
      transparent: true,
      opacity: 0.9,
    });
    const line = new Line(geo, mat);
    scene.add(line);
    lines.push(line);

    // Damage with falloff
    const d = Math.floor(damage * (1 - i * 0.2));
    const killed = damageEnemy(t, d);
    if (killed) {
      spawnDeathEffect(t, scene);
    } else {
      playEnemyHit();
    }

    prevPos = endPos;
  });

  chainLightnings.push({
    lines,
    targets,
    duration: 0.2,
    age: 0,
    damage,
  });

  playTeslaZap();
}

export function fireMissile(tower: Tower, target: Enemy, scene: any) {
  const start = tower.group.position.clone();
  start.y += 0.8;
  const dir = target.group.position.clone().sub(start).normalize();

  const missileGroup = new Group();
  const bodyGeo = new CylinderGeometry(0.04, 0.06, 0.3, 6);
  const bodyMat = new MeshBasicMaterial({ color: tower.def.color });
  const body = new Mesh(bodyGeo, bodyMat);
  body.rotation.x = Math.PI / 2;
  missileGroup.add(body);

  // Trail glow
  const trailGeo = new SphereGeometry(0.08, 4, 4);
  const trailMat = new MeshBasicMaterial({
    color: 0xff4400,
    transparent: true,
    opacity: 0.6,
  });
  const trail = new Mesh(trailGeo, trailMat);
  trail.position.z = 0.2;
  missileGroup.add(trail);

  missileGroup.position.copy(start);
  scene.add(missileGroup);

  const speed = 8;
  projectiles.push({
    mesh: missileGroup,
    position: start.clone(),
    velocity: dir.multiplyScalar(speed),
    damage: tower.currentDamage * (tower.buffed ? 1.3 : 1),
    tower,
    target,
    alive: true,
    age: 0,
    maxAge: 5,
    type: TowerType.Missile,
    splashRadius: 2.5 + tower.level * 0.5,
  });

  playMissileShoot();
}

// ─── Update Loop ───

export function updateProjectiles(dt: number, enemies: Enemy[], scene: any): {
  kills: number;
  rewards: number;
} {
  let kills = 0;
  let rewards = 0;

  // Update projectiles (pulse, missile)
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    if (!p.alive) continue;

    p.age += dt;
    if (p.age > p.maxAge) {
      p.alive = false;
      scene.remove(p.mesh);
      projectiles.splice(i, 1);
      continue;
    }

    // Move
    p.position.add(p.velocity.clone().multiplyScalar(dt));
    p.mesh.position.copy(p.position);

    // Homing for missiles
    if (p.type === TowerType.Missile && p.target && p.target.alive) {
      const toTarget = p.target.group.position.clone().sub(p.position);
      const dist = toTarget.length();
      if (dist > 0.5) {
        toTarget.normalize();
        p.velocity.lerp(toTarget.multiplyScalar(p.velocity.length()), 0.05);
      }
    }

    // Check collision with enemies
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const dist = p.position.distanceTo(enemy.group.position);
      if (dist < 0.8) {
        if (p.type === TowerType.Missile && p.splashRadius) {
          // Splash damage
          enemies.forEach((e) => {
            if (!e.alive) return;
            const sDist = p.position.distanceTo(e.group.position);
            if (sDist <= p.splashRadius!) {
              const falloff = 1 - sDist / p.splashRadius!;
              const dmg = Math.floor(p.damage * falloff);
              const killed = damageEnemy(e, dmg);
              if (killed) {
                kills++;
                rewards += e.def.reward;
                spawnDeathEffect(e, scene);
              }
            }
          });
          // Explosion visual
          spawnExplosion(p.position.clone(), scene, p.splashRadius);
          playMissileExplode();
        } else {
          // Direct damage
          const killed = damageEnemy(enemy, p.damage);
          if (killed) {
            kills++;
            rewards += enemy.def.reward;
            spawnDeathEffect(enemy, scene);
          } else {
            playEnemyHit();
          }
        }

        p.alive = false;
        scene.remove(p.mesh);
        projectiles.splice(i, 1);
        break;
      }
    }
  }

  // Update laser beams
  for (let i = laserBeams.length - 1; i >= 0; i--) {
    const beam = laserBeams[i];
    beam.age += dt;
    if (beam.age >= beam.duration) {
      scene.remove(beam.line);
      laserBeams.splice(i, 1);
    } else {
      // Fade out
      const mat = beam.line.material as LineBasicMaterial;
      mat.opacity = (1 - beam.age / beam.duration) * 0.8;

      // Update endpoint if target moved
      if (beam.target.alive) {
        const points = [
          beam.tower.group.position.clone().add(new Vector3(0, 1.1, 0)),
          beam.target.group.position.clone().add(new Vector3(0, 0.5, 0)),
        ];
        beam.line.geometry.setFromPoints(points);
      }
    }
  }

  // Update chain lightnings
  for (let i = chainLightnings.length - 1; i >= 0; i--) {
    const cl = chainLightnings[i];
    cl.age += dt;
    if (cl.age >= cl.duration) {
      cl.lines.forEach((l) => scene.remove(l));
      chainLightnings.splice(i, 1);
    } else {
      cl.lines.forEach((l) => {
        const mat = l.material as LineBasicMaterial;
        mat.opacity = (1 - cl.age / cl.duration) * 0.9;
      });
    }
  }

  // Update explosions
  for (let i = explosions.length - 1; i >= 0; i--) {
    const ex = explosions[i];
    ex.age += dt;
    if (ex.age >= ex.maxAge) {
      scene.remove(ex.mesh);
      explosions.splice(i, 1);
    } else {
      const t = ex.age / ex.maxAge;
      const scale = ex.maxScale * t;
      ex.mesh.scale.set(scale, scale, scale);
      const mat = ex.mesh.material as MeshBasicMaterial;
      mat.opacity = 0.4 * (1 - t);
    }
  }

  // Update death particles
  for (let i = deathParticles.length - 1; i >= 0; i--) {
    const dp = deathParticles[i];
    dp.age += dt;
    if (dp.age >= dp.maxAge) {
      scene.remove(dp.points);
      deathParticles.splice(i, 1);
    } else {
      const t = dp.age / dp.maxAge;
      const mat = dp.points.material as PointsMaterial;
      mat.opacity = 1 - t;
      mat.size = 0.15 * (1 - t * 0.5);

      // Expand outward
      const positions = dp.points.geometry.attributes.position;
      for (let j = 0; j < positions.count; j++) {
        const px = positions.getX(j);
        const py = positions.getY(j);
        const pz = positions.getZ(j);
        positions.setXYZ(j, px * 1.02, py + dt * 2, pz * 1.02);
      }
      positions.needsUpdate = true;
    }
  }

  return { kills, rewards };
}

function spawnExplosion(position: Vector3, scene: any, radius: number) {
  const geo = new SphereGeometry(0.5, 8, 8);
  const mat = new MeshBasicMaterial({
    color: 0xff8800,
    transparent: true,
    opacity: 0.5,
  });
  const mesh = new Mesh(geo, mat);
  mesh.position.copy(position);
  scene.add(mesh);

  explosions.push({
    mesh,
    age: 0,
    maxAge: 0.4,
    position,
    maxScale: radius,
  });
}

function spawnDeathEffect(enemy: Enemy, scene: any) {
  const count = 20;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 0.5;
    positions[i * 3 + 1] = Math.random() * 0.5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
  const mat = new PointsMaterial({
    color: enemy.def.color,
    size: 0.15,
    transparent: true,
    opacity: 1,
  });
  const points = new Points(geo, mat);
  points.position.copy(enemy.group.position);
  scene.add(points);

  deathParticles.push({
    points,
    age: 0,
    maxAge: 0.8,
  });

  if (enemy.type === EnemyType.Boss) {
    playBossDeath();
  } else {
    playEnemyDeath();
  }
}

export function clearAllProjectiles(scene: any) {
  projectiles.forEach((p) => scene.remove(p.mesh));
  projectiles.length = 0;
  laserBeams.forEach((b) => scene.remove(b.line));
  laserBeams.length = 0;
  chainLightnings.forEach((cl) => cl.lines.forEach((l) => scene.remove(l)));
  chainLightnings.length = 0;
  explosions.forEach((e) => scene.remove(e.mesh));
  explosions.length = 0;
  deathParticles.forEach((dp) => scene.remove(dp.points));
  deathParticles.length = 0;
}
