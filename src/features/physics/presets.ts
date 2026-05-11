import type { PresetKind } from "../playground/settings";
import type { DistanceConstraint, Obstacle, SimulationState } from "./types";

/**
 * Scene obstacles for each preset. Built once per file load so the per-scene
 * obstacle layout is data, not code lurking in the solver. The PBD solver
 * iterates over the resulting array and resolves sphere/box/plane collisions.
 */
function clothObstacles(): Obstacle[] {
  return [
    {
      kind: "sphere",
      center: [0.44, -0.32, 0],
      radius: 0.23,
      color: 0xf36f72,
      label: "Hero sphere",
    },
    {
      kind: "box",
      center: [-0.55, -0.42, 0.05],
      halfExtents: [0.13, 0.13, 0.13],
      color: 0xf2c34f,
      label: "Sit pillar",
    },
  ];
}

function jellyObstacles(): Obstacle[] {
  return [
    {
      kind: "sphere",
      center: [0.45, -0.4, -0.1],
      radius: 0.2,
      color: 0xf36f72,
      label: "Bumper",
    },
    {
      kind: "sphere",
      center: [-0.45, -0.42, 0.18],
      radius: 0.16,
      color: 0x6fd3ff,
      label: "Sidekick",
    },
    {
      kind: "box",
      center: [0, -0.55, 0],
      halfExtents: [0.7, 0.04, 0.4],
      color: 0x70e0ad,
      label: "Pedestal",
    },
  ];
}

function ropeObstacles(): Obstacle[] {
  // A diagonal ramp the rope drapes over. The plane normal points up-and-
  // back so the rope rolls down toward the viewer.
  const tilt = Math.PI / 7;
  return [
    {
      kind: "plane",
      normal: [0, Math.cos(tilt), Math.sin(tilt)],
      offset: -0.3 * Math.cos(tilt),
      color: 0x6fd3ff,
      label: "Ramp",
      extent: [1.2, 0.02, 0.7],
    },
    {
      kind: "sphere",
      center: [0.6, -0.18, 0.1],
      radius: 0.14,
      color: 0xf2c34f,
      label: "Pulley",
    },
  ];
}

function hairObstacles(): Obstacle[] {
  // Shoulders + a box the hair brushes against — feels like a head sitting
  // on a table.
  return [
    {
      kind: "sphere",
      center: [-0.55, -0.05, 0],
      radius: 0.18,
      color: 0xf36f72,
      label: "Left shoulder",
    },
    {
      kind: "sphere",
      center: [0.55, -0.05, 0],
      radius: 0.18,
      color: 0xf36f72,
      label: "Right shoulder",
    },
    {
      kind: "box",
      center: [0, -0.42, 0],
      halfExtents: [0.85, 0.04, 0.3],
      color: 0x70e0ad,
      label: "Table",
    },
  ];
}

interface Builder {
  positions: number[];
  previous: number[];
  inverseMasses: number[];
  radii: number[];
  constraints: DistanceConstraint[];
  surfaceIndices: number[];
}

function createBuilder(): Builder {
  return {
    positions: [],
    previous: [],
    inverseMasses: [],
    radii: [],
    constraints: [],
    surfaceIndices: [],
  };
}

function addParticle(
  builder: Builder,
  x: number,
  y: number,
  z: number,
  inverseMass = 1,
  radius = 0.035,
): number {
  const index = builder.positions.length / 3;
  builder.positions.push(x, y, z);
  builder.previous.push(x, y, z);
  builder.inverseMasses.push(inverseMass);
  builder.radii.push(radius);

  return index;
}

function addConstraint(
  builder: Builder,
  a: number,
  b: number,
  stiffness: number,
  tearable = true,
  visual = true,
): void {
  const ai = a * 3;
  const bi = b * 3;
  const dx = builder.positions[ai]! - builder.positions[bi]!;
  const dy = builder.positions[ai + 1]! - builder.positions[bi + 1]!;
  const dz = builder.positions[ai + 2]! - builder.positions[bi + 2]!;

  builder.constraints.push({
    a,
    b,
    rest: Math.hypot(dx, dy, dz),
    stiffness,
    tearable,
    visual,
  });
}

function toState(
  kind: PresetKind,
  builder: Builder,
  details: Pick<SimulationState, "tint" | "accent" | "particleRadius" | "cameraDistance"> & {
    obstacles?: Obstacle[];
  },
): SimulationState {
  const { obstacles, ...visualDetails } = details;
  return {
    kind,
    positions: new Float32Array(builder.positions),
    previous: new Float32Array(builder.previous),
    inverseMasses: new Float32Array(builder.inverseMasses),
    radii: new Float32Array(builder.radii),
    constraints: builder.constraints,
    surfaceIndices:
      builder.surfaceIndices.length > 0 ? new Uint32Array(builder.surfaceIndices) : null,
    constraintVersion: 0,
    obstacles: obstacles ?? [],
    ...visualDetails,
  };
}

function gridIndex(x: number, y: number, width: number): number {
  return y * width + x;
}

export function createClothPreset(): SimulationState {
  const builder = createBuilder();
  const width = 24;
  const height = 16;
  const spacing = 0.095;
  const xStart = -((width - 1) * spacing) / 2;
  const yStart = 1.25;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const isPinned = y === 0 && (x % 2 === 0 || x === width - 1);
      const ripple = Math.sin(x * 0.55) * 0.035;
      addParticle(builder, xStart + x * spacing, yStart - y * spacing, ripple, isPinned ? 0 : 1);
    }
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const current = gridIndex(x, y, width);
      if (x + 1 < width) addConstraint(builder, current, gridIndex(x + 1, y, width), 0.9);
      if (y + 1 < height) addConstraint(builder, current, gridIndex(x, y + 1, width), 0.9);
      if (x + 1 < width && y + 1 < height) {
        addConstraint(builder, current, gridIndex(x + 1, y + 1, width), 0.68, true, false);
        addConstraint(
          builder,
          gridIndex(x + 1, y, width),
          gridIndex(x, y + 1, width),
          0.68,
          true,
          false,
        );
      }
      if (x + 2 < width)
        addConstraint(builder, current, gridIndex(x + 2, y, width), 0.22, true, false);
      if (y + 2 < height)
        addConstraint(builder, current, gridIndex(x, y + 2, width), 0.22, true, false);
    }
  }

  for (let y = 0; y < height - 1; y += 1) {
    for (let x = 0; x < width - 1; x += 1) {
      const a = gridIndex(x, y, width);
      const b = gridIndex(x + 1, y, width);
      const c = gridIndex(x, y + 1, width);
      const d = gridIndex(x + 1, y + 1, width);
      builder.surfaceIndices.push(a, c, b, b, c, d);
    }
  }

  return toState("cloth", builder, {
    tint: "#6fd3ff",
    accent: "#ffe082",
    particleRadius: 0.025,
    cameraDistance: 2.45,
    obstacles: clothObstacles(),
  });
}

export function createRopePreset(): SimulationState {
  const builder = createBuilder();
  const count = 38;
  const spacing = 0.075;
  const startX = -((count - 1) * spacing) / 2;

  for (let i = 0; i < count; i += 1) {
    const y = 0.95 + Math.sin(i * 0.42) * 0.05;
    const z = Math.cos(i * 0.33) * 0.08;
    addParticle(builder, startX + i * spacing, y, z, i === 0 ? 0 : 1, 0.04);
  }

  for (let i = 0; i < count - 1; i += 1) {
    addConstraint(builder, i, i + 1, 0.98, true);
    if (i + 2 < count) addConstraint(builder, i, i + 2, 0.18, false, false);
  }

  return toState("rope", builder, {
    tint: "#f1b45b",
    accent: "#70e0ad",
    particleRadius: 0.045,
    cameraDistance: 2.2,
    obstacles: ropeObstacles(),
  });
}

export function createHairPreset(): SimulationState {
  const builder = createBuilder();
  const strands = 18;
  const segments = 14;
  const spacing = 0.055;
  const rootWidth = 1.15;

  for (let strand = 0; strand < strands; strand += 1) {
    const rootX = -rootWidth / 2 + (rootWidth * strand) / (strands - 1);
    const rootZ = Math.sin(strand * 1.7) * 0.05;
    const lean = (strand / (strands - 1) - 0.5) * 0.45;
    const root = builder.positions.length / 3;

    for (let segment = 0; segment < segments; segment += 1) {
      const t = segment / (segments - 1);
      const wave = Math.sin(t * 5 + strand * 0.7) * 0.045;
      addParticle(
        builder,
        rootX + lean * t + wave,
        1.2 - segment * spacing,
        rootZ + Math.cos(t * 4 + strand) * 0.045,
        segment === 0 ? 0 : 1,
        0.026,
      );

      if (segment > 0) addConstraint(builder, root + segment - 1, root + segment, 0.94, true);
      if (segment > 1)
        addConstraint(builder, root + segment - 2, root + segment, 0.18, false, false);
    }
  }

  return toState("hair", builder, {
    tint: "#d4a66a",
    accent: "#f36f72",
    particleRadius: 0.025,
    cameraDistance: 2.0,
    obstacles: hairObstacles(),
  });
}

function cubeIndex(x: number, y: number, z: number, size: number): number {
  return z * size * size + y * size + x;
}

export function createJellyPreset(): SimulationState {
  const builder = createBuilder();
  const size = 6;
  const spacing = 0.13;
  const start = -((size - 1) * spacing) / 2;

  for (let z = 0; z < size; z += 1) {
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        addParticle(builder, start + x * spacing, 0.7 + y * spacing, start + z * spacing, 1, 0.035);
      }
    }
  }

  for (let z = 0; z < size; z += 1) {
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const current = cubeIndex(x, y, z, size);
        if (x + 1 < size) addConstraint(builder, current, cubeIndex(x + 1, y, z, size), 0.78);
        if (y + 1 < size) addConstraint(builder, current, cubeIndex(x, y + 1, z, size), 0.78);
        if (z + 1 < size) addConstraint(builder, current, cubeIndex(x, y, z + 1, size), 0.78);
        if (x + 1 < size && y + 1 < size)
          addConstraint(builder, current, cubeIndex(x + 1, y + 1, z, size), 0.35, false, false);
        if (x + 1 < size && z + 1 < size)
          addConstraint(builder, current, cubeIndex(x + 1, y, z + 1, size), 0.35, false, false);
        if (y + 1 < size && z + 1 < size)
          addConstraint(builder, current, cubeIndex(x, y + 1, z + 1, size), 0.35, false, false);
      }
    }
  }

  for (let y = 0; y < size - 1; y += 1) {
    for (let x = 0; x < size - 1; x += 1) {
      const frontA = cubeIndex(x, y, 0, size);
      const frontB = cubeIndex(x + 1, y, 0, size);
      const frontC = cubeIndex(x, y + 1, 0, size);
      const frontD = cubeIndex(x + 1, y + 1, 0, size);
      const backA = cubeIndex(x, y, size - 1, size);
      const backB = cubeIndex(x + 1, y, size - 1, size);
      const backC = cubeIndex(x, y + 1, size - 1, size);
      const backD = cubeIndex(x + 1, y + 1, size - 1, size);
      builder.surfaceIndices.push(frontA, frontB, frontC, frontB, frontD, frontC);
      builder.surfaceIndices.push(backA, backC, backB, backB, backC, backD);
    }
  }

  for (let z = 0; z < size - 1; z += 1) {
    for (let x = 0; x < size - 1; x += 1) {
      const bottomA = cubeIndex(x, 0, z, size);
      const bottomB = cubeIndex(x + 1, 0, z, size);
      const bottomC = cubeIndex(x, 0, z + 1, size);
      const bottomD = cubeIndex(x + 1, 0, z + 1, size);
      const topA = cubeIndex(x, size - 1, z, size);
      const topB = cubeIndex(x + 1, size - 1, z, size);
      const topC = cubeIndex(x, size - 1, z + 1, size);
      const topD = cubeIndex(x + 1, size - 1, z + 1, size);
      builder.surfaceIndices.push(bottomA, bottomC, bottomB, bottomB, bottomC, bottomD);
      builder.surfaceIndices.push(topA, topB, topC, topB, topD, topC);
    }
  }

  for (let z = 0; z < size - 1; z += 1) {
    for (let y = 0; y < size - 1; y += 1) {
      const leftA = cubeIndex(0, y, z, size);
      const leftB = cubeIndex(0, y + 1, z, size);
      const leftC = cubeIndex(0, y, z + 1, size);
      const leftD = cubeIndex(0, y + 1, z + 1, size);
      const rightA = cubeIndex(size - 1, y, z, size);
      const rightB = cubeIndex(size - 1, y + 1, z, size);
      const rightC = cubeIndex(size - 1, y, z + 1, size);
      const rightD = cubeIndex(size - 1, y + 1, z + 1, size);
      builder.surfaceIndices.push(leftA, leftB, leftC, leftB, leftD, leftC);
      builder.surfaceIndices.push(rightA, rightC, rightB, rightB, rightC, rightD);
    }
  }

  return toState("jelly", builder, {
    tint: "#9be66d",
    accent: "#66c7ff",
    particleRadius: 0.028,
    cameraDistance: 2.25,
    obstacles: jellyObstacles(),
  });
}

export function createPreset(kind: PresetKind): SimulationState {
  switch (kind) {
    case "cloth":
      return createClothPreset();
    case "jelly":
      return createJellyPreset();
    case "rope":
      return createRopePreset();
    case "hair":
      return createHairPreset();
  }
}
