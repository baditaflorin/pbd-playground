import { describe, expect, it } from "vitest";
import { createPreset } from "../../src/features/physics/presets";
import { PbdSolver, collisionFloorY } from "../../src/features/physics/solver";
import type { Obstacle, SimulationState } from "../../src/features/physics/types";
import { TypeScriptDistanceProjector } from "../../src/features/physics/wasmKernel";

describe("PBD solver", () => {
  it("keeps integrated particles finite", () => {
    const state = createPreset("rope");
    const solver = new PbdSolver(state, new TypeScriptDistanceProjector());

    for (let i = 0; i < 20; i += 1) {
      solver.step({
        dt: 1 / 60,
        iterations: 5,
        stiffnessScale: 0.9,
        wind: 0.2,
        grab: null,
        twist: null,
      });
    }

    expect([...state.positions].every(Number.isFinite)).toBe(true);
  });

  it("reduces a stretched distance constraint", () => {
    const state = createPreset("rope");
    const constraint = state.constraints[0]!;
    const bOffset = constraint.b * 3;
    state.positions[bOffset] = state.positions[bOffset]! + constraint.rest * 2;
    const before = Math.abs(
      currentLength(state.positions, constraint.a, constraint.b) - constraint.rest,
    );

    new TypeScriptDistanceProjector().project(
      state.positions,
      state.inverseMasses,
      [constraint],
      1,
    );
    const after = Math.abs(
      currentLength(state.positions, constraint.a, constraint.b) - constraint.rest,
    );

    expect(after).toBeLessThan(before);
  });

  it("removes tearable constraints near a picked point", () => {
    const state = createPreset("cloth");
    const solver = new PbdSolver(state, new TypeScriptDistanceProjector());
    const before = state.constraints.length;
    const removed = solver.tearNear([0, 0.8, 0], 0.5);

    expect(removed).toBeGreaterThan(0);
    expect(state.constraints.length).toBeLessThan(before);
  });

  it("pushes a particle out of a box obstacle along the nearest face", () => {
    const obstacles: Obstacle[] = [
      {
        kind: "box",
        center: [0, 0, 0],
        halfExtents: [0.2, 0.2, 0.2],
      },
    ];
    const state = makeSingleParticleState(0.05, 0.05, 0.05, 0.02, obstacles);
    const solver = new PbdSolver(state, new TypeScriptDistanceProjector());
    solver.step({
      dt: 1 / 60,
      iterations: 4,
      stiffnessScale: 1,
      wind: 0,
      grab: null,
      twist: null,
    });
    // Particle started inside; after the step its centre must lie outside
    // the inflated AABB (half-extent 0.2 + radius 0.02 = 0.22).
    const x = state.positions[0]!;
    const y = state.positions[1]!;
    const z = state.positions[2]!;
    const inside =
      Math.abs(x) <= 0.22 - 1e-4 && Math.abs(y) <= 0.22 - 1e-4 && Math.abs(z) <= 0.22 - 1e-4;
    expect(inside).toBe(false);
  });

  it("keeps a particle on the positive side of a tilted plane obstacle", () => {
    // Plane normal pointing up: y >= 0.4 + radius after resolve.
    const obstacles: Obstacle[] = [{ kind: "plane", normal: [0, 1, 0], offset: 0.4 }];
    const state = makeSingleParticleState(0, 0.3, 0, 0.03, obstacles);
    const solver = new PbdSolver(state, new TypeScriptDistanceProjector());
    solver.step({
      dt: 1 / 60,
      iterations: 4,
      stiffnessScale: 1,
      wind: 0,
      grab: null,
      twist: null,
    });
    expect(state.positions[1]!).toBeGreaterThanOrEqual(0.43 - 1e-4);
  });

  it("respects the world floor even with no obstacles configured", () => {
    const state = makeSingleParticleState(0, collisionFloorY - 0.1, 0, 0.04, []);
    const solver = new PbdSolver(state, new TypeScriptDistanceProjector());
    solver.step({
      dt: 1 / 60,
      iterations: 4,
      stiffnessScale: 1,
      wind: 0,
      grab: null,
      twist: null,
    });
    expect(state.positions[1]!).toBeGreaterThanOrEqual(collisionFloorY + 0.04 - 1e-4);
  });
});

function makeSingleParticleState(
  x: number,
  y: number,
  z: number,
  radius: number,
  obstacles: Obstacle[],
): SimulationState {
  return {
    kind: "rope",
    positions: new Float32Array([x, y, z]),
    previous: new Float32Array([x, y, z]),
    inverseMasses: new Float32Array([1]),
    radii: new Float32Array([radius]),
    constraints: [],
    surfaceIndices: null,
    obstacles,
    tint: "#fff",
    accent: "#fff",
    particleRadius: radius,
    cameraDistance: 1,
    constraintVersion: 0,
  };
}

function currentLength(positions: Float32Array, a: number, b: number): number {
  const ai = a * 3;
  const bi = b * 3;

  return Math.hypot(
    positions[ai]! - positions[bi]!,
    positions[ai + 1]! - positions[bi + 1]!,
    positions[ai + 2]! - positions[bi + 2]!,
  );
}
