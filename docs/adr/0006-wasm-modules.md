# 0006: WASM Modules

## Status

Accepted

## Context

The project intent calls for Position-Based Dynamics backed by C++ compiled to WASM. The full upstream PositionBasedDynamics library is powerful but large, has native dependencies, and is not ideal for a first static Pages payload.

GitHub Pages cannot set COOP/COEP headers, so threaded WASM and SharedArrayBuffer are not reliable for v1.

## Decision

Ship a compact C++ WASM kernel for the hot distance-constraint projection loop:

- Source: `wasm/pbd_kernel.cpp`.
- Output: `public/wasm/pbd_kernel.wasm`.
- Build: `scripts/build-wasm.sh` using `clang++ --target=wasm32`.
- Runtime bridge: `src/features/physics/wasmKernel.ts`.

The TypeScript engine owns scene setup, integration, collision projection, tearing, and interaction constraints. The WASM kernel owns repeated distance projection over typed arrays.

## Consequences

- v1 honestly uses C++ compiled to WASM for PBD constraint solving.
- The app remains Pages-compatible without special headers.
- The kernel boundary is small enough to replace with a larger upstream PositionBasedDynamics build later.

## Alternatives Considered

- Full upstream PositionBasedDynamics WASM port in v1: deferred because dependency size and Pages header constraints would slow delivery.
- Pure TypeScript solver: rejected because the project explicitly wants WASM in the physics path.
