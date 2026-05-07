# 0002: Architecture Overview and Module Boundaries

## Status

Accepted

## Context

The playground needs physics, rendering, interaction, audio, UI state, and static publishing concerns. The app should stay approachable for contributors while leaving room for deeper simulation kernels later.

## Decision

Use a client-only architecture with these boundaries:

- `src/app`: app shell, boot flow, global UI wiring.
- `src/features/playground`: simulation presets, controls, and scene lifecycle.
- `src/features/physics`: PBD state, constraints, solvers, and WASM bridge.
- `src/features/rendering`: Three.js renderer, cameras, materials, and picking helpers.
- `src/features/audio`: Web Audio collision synthesis.
- `src/lib`: shared utilities, build metadata, persistence, and errors.
- `wasm`: C++ source for the compact WASM physics kernel.
- `public`: static WASM, icons, manifest, and service worker assets.

## Consequences

- Simulation code can be tested without WebGL/WebGPU.
- Rendering can fall back from WebGPU to WebGL without touching physics.
- A future upstream PositionBasedDynamics WASM module can replace the compact kernel behind the same bridge.

## Alternatives Considered

- Single-file toy implementation: rejected because interaction, audio, rendering, and physics would become hard to test.
- Backend-owned simulation: rejected by ADR 0001.
