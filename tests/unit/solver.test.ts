import { describe, expect, it } from "vitest";
import { createPreset } from "../../src/features/physics/presets";
import { PbdSolver } from "../../src/features/physics/solver";
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
});

function currentLength(positions: Float32Array, a: number, b: number): number {
  const ai = a * 3;
  const bi = b * 3;

  return Math.hypot(
    positions[ai]! - positions[bi]!,
    positions[ai + 1]! - positions[bi + 1]!,
    positions[ai + 2]! - positions[bi + 2]!,
  );
}
