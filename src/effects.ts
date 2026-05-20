// Neon Bastion - Particle Trail & Visual Effects

import {
  Group,
  Mesh,
  SphereGeometry,
  MeshBasicMaterial,
  Color,
  Vector3,
  BufferGeometry,
  Float32BufferAttribute,
  Points,
  PointsMaterial,
} from "@iwsdk/core";

// ─── Trail particles that follow enemies ───

interface TrailParticle {
  mesh: Mesh;
  position: Vector3;
  velocity: Vector3;
  life: number;
  maxLife: number;
}

const trails: TrailParticle[] = [];
const MAX_TRAILS = 200;

export function spawnTrail(position: Vector3, color: number, count: number = 1) {
  for (let i = 0; i < count; i++) {
    if (trails.length >= MAX_TRAILS) {
      // Recycle oldest
      const old = trails.shift()!;
      old.mesh.position.copy(position);
      old.velocity.set(
        (Math.random() - 0.5) * 1,
        Math.random() * 2,
        (Math.random() - 0.5) * 1
      );
      old.life = 0;
      old.maxLife = 0.3 + Math.random() * 0.5;
      (old.mesh.material as MeshBasicMaterial).color.setHex(color);
      (old.mesh.material as MeshBasicMaterial).opacity = 1;
      old.mesh.visible = true;
      trails.push(old);
    } else {
      const geo = new SphereGeometry(0.03, 4, 4);
      const mat = new MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1,
      });
      const mesh = new Mesh(geo, mat);
      mesh.position.copy(position);

      trails.push({
        mesh,
        position: position.clone(),
        velocity: new Vector3(
          (Math.random() - 0.5) * 1,
          Math.random() * 2,
          (Math.random() - 0.5) * 1
        ),
        life: 0,
        maxLife: 0.3 + Math.random() * 0.5,
      });
    }
  }
}

export function updateTrails(dt: number, scene: any) {
  for (let i = trails.length - 1; i >= 0; i--) {
    const t = trails[i];
    t.life += dt;

    if (t.life >= t.maxLife) {
      scene.remove(t.mesh);
      trails.splice(i, 1);
      continue;
    }

    if (!t.mesh.parent) {
      scene.add(t.mesh);
    }

    t.position.add(t.velocity.clone().multiplyScalar(dt));
    t.velocity.y -= 3 * dt; // gravity
    t.mesh.position.copy(t.position);

    const lifePct = t.life / t.maxLife;
    (t.mesh.material as MeshBasicMaterial).opacity = 1 - lifePct;
    const scale = 1 - lifePct * 0.5;
    t.mesh.scale.set(scale, scale, scale);
  }
}

export function clearTrails(scene: any) {
  trails.forEach((t) => scene.remove(t.mesh));
  trails.length = 0;
}

// ─── Floating Score Popup ───

interface FloatingScore {
  element: HTMLDivElement;
  life: number;
  maxLife: number;
}

const floatingScores: FloatingScore[] = [];

export function spawnFloatingScore(
  x: number,
  y: number,
  text: string,
  color: string = "#00ffcc"
) {
  const el = document.createElement("div");
  el.textContent = text;
  el.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y}px;
    color: ${color};
    font-family: 'Orbitron', monospace;
    font-size: 14px;
    font-weight: 700;
    text-shadow: 0 0 8px ${color};
    pointer-events: none;
    z-index: 1200;
    transition: transform 0.5s ease-out, opacity 0.5s ease-out;
  `;
  document.body.appendChild(el);

  // Animate up
  requestAnimationFrame(() => {
    el.style.transform = `translateY(-40px)`;
    el.style.opacity = "0";
  });

  floatingScores.push({
    element: el,
    life: 0,
    maxLife: 0.8,
  });
}

export function updateFloatingScores(dt: number) {
  for (let i = floatingScores.length - 1; i >= 0; i--) {
    const fs = floatingScores[i];
    fs.life += dt;
    if (fs.life >= fs.maxLife) {
      fs.element.remove();
      floatingScores.splice(i, 1);
    }
  }
}

export function clearFloatingScores() {
  floatingScores.forEach((fs) => fs.element.remove());
  floatingScores.length = 0;
}

// ─── Damage Vignette Effect ───

let vignette: HTMLDivElement | null = null;

export function createDamageVignette() {
  vignette = document.createElement("div");
  vignette.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    pointer-events: none;
    z-index: 900;
    transition: opacity 0.3s;
    opacity: 0;
    box-shadow: inset 0 0 100px rgba(255, 0, 0, 0.5);
  `;
  document.body.appendChild(vignette);
}

export function flashDamageVignette() {
  if (!vignette) return;
  vignette.style.opacity = "1";
  setTimeout(() => {
    if (vignette) vignette.style.opacity = "0";
  }, 200);
}

export function updateDamageVignette(coreHP: number, maxCoreHP: number) {
  if (!vignette) return;
  const hpRatio = coreHP / maxCoreHP;
  if (hpRatio < 0.3) {
    vignette.style.opacity = String(0.3 * (1 - hpRatio / 0.3));
    vignette.style.boxShadow = `inset 0 0 80px rgba(255, 0, 0, ${0.4 * (1 - hpRatio / 0.3)})`;
  }
}
