import { describe, expect, it } from "vitest";
import { createPreset } from "../../src/features/physics/presets";
import type { PresetKind } from "../../src/features/playground/settings";

const presets: PresetKind[] = ["cloth", "jelly", "rope", "hair"];

describe("PBD presets", () => {
  it.each(presets)("creates a stable %s particle graph", (preset) => {
    const state = createPreset(preset);

    expect(state.positions.length).toBeGreaterThan(0);
    expect(state.positions.length).toBe(state.previous.length);
    expect(state.positions.length / 3).toBe(state.inverseMasses.length);
    expect(state.constraints.length).toBeGreaterThan(10);
    expect([...state.positions].every(Number.isFinite)).toBe(true);
    expect(state.constraints.every((constraint) => constraint.rest > 0)).toBe(true);
  });

  it("pins at least one particle in anchored presets", () => {
    for (const preset of ["cloth", "rope", "hair"] satisfies PresetKind[]) {
      const state = createPreset(preset);

      expect([...state.inverseMasses].some((inverseMass) => inverseMass === 0)).toBe(true);
    }
  });

  it("creates surface indices for mesh presets", () => {
    expect(createPreset("cloth").surfaceIndices?.length).toBeGreaterThan(0);
    expect(createPreset("jelly").surfaceIndices?.length).toBeGreaterThan(0);
    expect(createPreset("rope").surfaceIndices).toBeNull();
  });
});
