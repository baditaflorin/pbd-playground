# 0014: Error Handling Conventions

## Status

Accepted

## Context

The app initializes browser APIs that may fail: WebGPU, WebGL, Web Audio, WASM loading, and localStorage.

## Decision

- Browser capability failures degrade when possible.
- WebGPU falls back to WebGL.
- WASM failure falls back to a TypeScript distance solver and marks status as degraded.
- Audio failures disable sound without blocking simulation.
- User-visible failures use concise status messages.
- Typed errors include enough context for tests and debugging.

## Consequences

- The playground remains usable on a broad range of browsers.
- Tests can assert degraded states without relying on a specific GPU stack.

## Alternatives Considered

- Hard-failing without WebGPU or WASM: rejected because Pages visitors use varied browsers and devices.
