# 0001: Deployment Mode

## Status

Accepted

## Context

`pbd-playground` is a tactile soft-body physics sandbox. The v1 requirements are real-time simulation, rendering, Web Audio feedback, local preferences, and shareable demos. It does not require accounts, private data, shared writes, secrets, or cross-device persistence.

GitHub Pages is the preferred public surface. Pages can serve static HTML, JavaScript, WASM, images, manifests, and service workers from the repository.

## Decision

Use **Mode A: Pure GitHub Pages**.

All runtime behavior runs in the browser:

- C++ PBD constraint kernel compiled to WASM.
- TypeScript scene orchestration and interaction handling.
- Three.js rendering with WebGPU when available and WebGL fallback when needed.
- Web Audio collision synthesis.
- `localStorage` for local preferences.

No backend, container, runtime API, auth, or server-side metrics are part of v1.

## Consequences

- The live app can be served directly from `https://baditaflorin.github.io/pbd-playground/`.
- There are no runtime secrets to manage.
- Browser capability differences must be handled in the client.
- GitHub Pages cannot set COOP/COEP headers, so v1 avoids threaded WASM and SharedArrayBuffer.

## Alternatives Considered

- **Mode B: GitHub Pages + pre-built data**: rejected because v1 has no external dataset.
- **Mode C: Pages frontend + Docker backend**: rejected because simulation, persistence, and audio all work client-side.
