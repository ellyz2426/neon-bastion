// Neon Bastion - Holodeck Environment

import {
  Group,
  Mesh,
  BoxGeometry,
  PlaneGeometry,
  SphereGeometry,
  CylinderGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  LineBasicMaterial,
  LineSegments,
  EdgesGeometry,
  Color,
  Vector3,
  PointLight,
  AmbientLight,
  Fog,
  DoubleSide,
  AdditiveBlending,
  BufferGeometry,
  Float32BufferAttribute,
  Points,
  PointsMaterial,
} from "@iwsdk/core";
import {
  GRID_SIZE,
  CELL_SIZE,
  GRID_OFFSET,
  MAP_LAYOUT,
  CELL_PATH,
  CELL_SPAWN,
  CELL_CORE,
  gridToWorld,
} from "./constants";

export function createEnvironment(scene: any): {
  gridGroup: Group;
  coreGroup: Group;
  coreLight: PointLight;
  cellMeshes: (Mesh | null)[][];
  pathMeshes: Mesh[];
} {
  const gridGroup = new Group();
  const cellMeshes: (Mesh | null)[][] = [];
  const pathMeshes: Mesh[] = [];

  // Ambient light
  const ambient = new AmbientLight(0x111122, 0.4);
  scene.add(ambient);

  // Fog for depth
  scene.fog = new Fog(0x000011, 15, 50);
  scene.background = new Color(0x000011);

  // ─── Floor Grid ───
  const floorSize = GRID_SIZE * CELL_SIZE + 8;
  const floorGeo = new PlaneGeometry(floorSize, floorSize);
  const floorMat = new MeshBasicMaterial({
    color: 0x000822,
    transparent: true,
    opacity: 0.8,
  });
  const floor = new Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.01;
  scene.add(floor);

  // Grid lines on floor
  const gridLineGeo = new BufferGeometry();
  const gridLinePositions: number[] = [];
  const gridExtent = (GRID_SIZE * CELL_SIZE) / 2 + 1;
  for (let i = -10; i <= 10; i++) {
    const pos = i * CELL_SIZE;
    // Horizontal
    gridLinePositions.push(-gridExtent * 2, 0, pos, gridExtent * 2, 0, pos);
    // Vertical
    gridLinePositions.push(pos, 0, -gridExtent * 2, pos, 0, gridExtent * 2);
  }
  gridLineGeo.setAttribute("position", new Float32BufferAttribute(gridLinePositions, 3));
  const gridLineMat = new LineBasicMaterial({ color: 0x112244, transparent: true, opacity: 0.3 });
  const gridLines = new LineSegments(gridLineGeo, gridLineMat);
  scene.add(gridLines);

  // ─── Game Grid Cells ───
  let coreGroup = new Group();
  let coreLight = new PointLight(0x00ffff, 2, 12);

  for (let row = 0; row < GRID_SIZE; row++) {
    cellMeshes[row] = [];
    for (let col = 0; col < GRID_SIZE; col++) {
      const cellType = MAP_LAYOUT[row][col];
      const [x, y, z] = gridToWorld(row, col);

      if (cellType === CELL_CORE) {
        // Core - the thing to defend
        coreGroup = createCore(x, z);
        scene.add(coreGroup);
        coreLight.position.set(x, 2, z);
        scene.add(coreLight);
        cellMeshes[row][col] = null;
      } else if (cellType === CELL_PATH) {
        const pathMesh = createPathCell(x, z);
        gridGroup.add(pathMesh);
        pathMeshes.push(pathMesh);
        cellMeshes[row][col] = pathMesh;
      } else if (cellType === CELL_SPAWN) {
        const spawnMesh = createSpawnCell(x, z);
        gridGroup.add(spawnMesh);
        cellMeshes[row][col] = spawnMesh;
      } else {
        // Empty cell - buildable
        const emptyMesh = createEmptyCell(x, z);
        gridGroup.add(emptyMesh);
        cellMeshes[row][col] = emptyMesh;
      }
    }
  }

  scene.add(gridGroup);

  // ─── Starfield / Particles ───
  createStarfield(scene);

  // ─── Perimeter Walls ───
  createPerimeterWalls(scene);

  // Accent lights at corners
  const cornerPositions = [
    [-gridExtent, gridExtent],
    [gridExtent, gridExtent],
    [-gridExtent, -gridExtent],
    [gridExtent, -gridExtent],
  ];
  cornerPositions.forEach(([cx, cz]) => {
    const light = new PointLight(0x4444ff, 0.5, 15);
    light.position.set(cx, 3, cz);
    scene.add(light);
  });

  return { gridGroup, coreGroup, coreLight, cellMeshes, pathMeshes };
}

function createCore(x: number, z: number): Group {
  const group = new Group();
  group.position.set(x, 0, z);

  // Inner sphere
  const innerGeo = new SphereGeometry(0.5, 16, 16);
  const innerMat = new MeshBasicMaterial({ color: 0x00ffff });
  const inner = new Mesh(innerGeo, innerMat);
  inner.position.y = 1.2;
  group.add(inner);

  // Outer wireframe
  const outerGeo = new SphereGeometry(0.7, 8, 8);
  const outerEdges = new EdgesGeometry(outerGeo);
  const outerWire = new LineSegments(
    outerEdges,
    new LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.5 })
  );
  outerWire.position.y = 1.2;
  group.add(outerWire);

  // Base pedestal
  const baseGeo = new CylinderGeometry(0.8, 1.0, 0.3, 8);
  const baseMat = new MeshStandardMaterial({
    color: 0x004466,
    emissive: 0x002233,
    metalness: 0.8,
    roughness: 0.3,
  });
  const base = new Mesh(baseGeo, baseMat);
  base.position.y = 0.15;
  group.add(base);

  // Floating ring
  const ringGeo = new CylinderGeometry(0.9, 0.9, 0.05, 32);
  const ringMat = new MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.4,
  });
  const ring = new Mesh(ringGeo, ringMat);
  ring.position.y = 0.8;
  group.add(ring);

  // Health indicator column
  const colGeo = new CylinderGeometry(0.05, 0.05, 1.5, 8);
  const colMat = new MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.3 });
  for (let i = 0; i < 4; i++) {
    const col = new Mesh(colGeo, colMat);
    const angle = (i / 4) * Math.PI * 2;
    col.position.set(Math.cos(angle) * 0.6, 0.8, Math.sin(angle) * 0.6);
    group.add(col);
  }

  return group;
}

function createPathCell(x: number, z: number): Mesh {
  const geo = new PlaneGeometry(CELL_SIZE * 0.9, CELL_SIZE * 0.9);
  const mat = new MeshBasicMaterial({
    color: 0x112244,
    transparent: true,
    opacity: 0.5,
    side: DoubleSide,
  });
  const mesh = new Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.005, z);
  return mesh;
}

function createSpawnCell(x: number, z: number): Mesh {
  const geo = new PlaneGeometry(CELL_SIZE * 0.9, CELL_SIZE * 0.9);
  const mat = new MeshBasicMaterial({
    color: 0x441111,
    transparent: true,
    opacity: 0.6,
    side: DoubleSide,
  });
  const mesh = new Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.005, z);

  // Add spawn marker
  const markerGeo = new CylinderGeometry(0.3, 0.4, 0.1, 6);
  const markerMat = new MeshBasicMaterial({
    color: 0xff2222,
    transparent: true,
    opacity: 0.6,
  });
  const marker = new Mesh(markerGeo, markerMat);
  marker.position.set(x, 0.1, z);
  mesh.parent?.add(marker);

  return mesh;
}

function createEmptyCell(x: number, z: number): Mesh {
  const geo = new PlaneGeometry(CELL_SIZE * 0.85, CELL_SIZE * 0.85);
  const mat = new MeshBasicMaterial({
    color: 0x0a1a2a,
    transparent: true,
    opacity: 0.3,
    side: DoubleSide,
  });
  const mesh = new Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.003, z);
  return mesh;
}

function createStarfield(scene: any) {
  const count = 500;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 80;
    positions[i * 3 + 1] = Math.random() * 30 + 5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
  const mat = new PointsMaterial({
    color: 0x4466aa,
    size: 0.08,
    transparent: true,
    opacity: 0.6,
  });
  const stars = new Points(geo, mat);
  scene.add(stars);
}

function createPerimeterWalls(scene: any) {
  const wallHeight = 6;
  const wallDist = GRID_SIZE * CELL_SIZE / 2 + 5;

  // Four walls as wireframe planes
  const directions = [
    { pos: [0, wallHeight / 2, -wallDist], rot: [0, 0, 0] },
    { pos: [0, wallHeight / 2, wallDist], rot: [0, Math.PI, 0] },
    { pos: [-wallDist, wallHeight / 2, 0], rot: [0, Math.PI / 2, 0] },
    { pos: [wallDist, wallHeight / 2, 0], rot: [0, -Math.PI / 2, 0] },
  ];

  directions.forEach(({ pos, rot }) => {
    const geo = new PlaneGeometry(wallDist * 2, wallHeight, 8, 4);
    const edges = new EdgesGeometry(geo);
    const wire = new LineSegments(
      edges,
      new LineBasicMaterial({ color: 0x1a2a44, transparent: true, opacity: 0.2 })
    );
    wire.position.set(pos[0], pos[1], pos[2]);
    wire.rotation.set(rot[0], rot[1], rot[2]);
    scene.add(wire);
  });
}

// Animate environment elements
export function animateEnvironment(
  time: number,
  coreGroup: Group,
  coreLight: PointLight,
  coreHP: number,
  maxCoreHP: number,
  pathMeshes: Mesh[]
) {
  // Rotate core
  if (coreGroup.children.length > 0) {
    const inner = coreGroup.children[0];
    inner.rotation.y = time * 0.5;
    // Wireframe ring
    if (coreGroup.children[1]) {
      coreGroup.children[1].rotation.y = -time * 0.3;
      coreGroup.children[1].rotation.x = Math.sin(time * 0.5) * 0.2;
    }
    // Floating ring
    if (coreGroup.children[3]) {
      coreGroup.children[3].position.y = 0.8 + Math.sin(time * 2) * 0.1;
      coreGroup.children[3].rotation.y = time * 0.8;
    }
  }

  // Core color based on health
  const hpRatio = coreHP / maxCoreHP;
  const coreColor = new Color().setHSL(hpRatio * 0.5, 1, 0.5);
  coreLight.color.copy(coreColor);
  coreLight.intensity = 1.5 + Math.sin(time * 3) * 0.5;

  if (coreGroup.children[0]) {
    (coreGroup.children[0] as Mesh).material = new MeshBasicMaterial({ color: coreColor });
  }

  // Pulse path cells
  pathMeshes.forEach((mesh, i) => {
    const mat = mesh.material as MeshBasicMaterial;
    const pulse = Math.sin(time * 2 + i * 0.3) * 0.15 + 0.4;
    mat.opacity = pulse;
  });
}
