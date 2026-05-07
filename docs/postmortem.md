# Postmortem

## What Was Built

`pbd-playground` v0.1.0 is a static GitHub Pages soft-body sandbox with cloth, jelly, rope, and hair presets. It includes drag, twist, tear, Web Audio collision feedback, WebGPU/WebGL rendering, a compact C++ WASM PBD constraint kernel, local settings, PWA assets, ADRs, local hooks, unit tests, and Playwright smoke coverage.

Live app: https://baditaflorin.github.io/pbd-playground/

Repository: https://github.com/baditaflorin/pbd-playground

## Was Mode A Correct?

Yes. The simulation, rendering, audio, settings, and version display all work client-side. A runtime backend would add operations burden without improving v1. Mode B is also unnecessary because there is no external dataset.

## What Worked

- GitHub Pages from `main` `/docs` worked from the first scaffold.
- Lazy-loading the playground kept the initial JS payload small.
- A compact C++ WASM kernel was enough to put physics work on the WASM path without requiring special Pages headers.
- Playwright smoke caught the headless WebGPU performance problem early.

## What Did Not Work

- Apple Clang did not support the WASM target; the build script now prefers Homebrew LLVM.
- Headless Chromium WebGPU was too slow for smoke tests, so smoke forces WebGL with `?renderer=webgl`.
- The full upstream PositionBasedDynamics C++ library was too large to port safely inside v1.

## Surprises

- GitHub Pages API setup needed nested `source[branch]` and `source[path]` fields.
- Vite preview can collide with unrelated local projects, so smoke now chooses a free port.

## Accepted Tech Debt

- The v1 WASM kernel covers distance constraints only; collisions, tearing, and interaction constraints live in TypeScript.
- Mesh rendering is intentionally simple and recomputes normals each frame.
- The service worker uses a compact cache-first strategy without a generated asset manifest.

## Next Improvements

1. Port a larger subset of upstream PositionBasedDynamics into the WASM boundary.
2. Move physics to a Web Worker with a non-threaded WASM module for smoother rendering.
3. Add saved scenes and shareable URL-encoded presets.

## Time Spent vs Estimate

Estimated: one focused implementation session for v0.1.0.

Actual: one focused implementation session, with extra time spent on WASM toolchain detection and smoke-test stability.
