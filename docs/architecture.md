# Architecture

Live app: https://baditaflorin.github.io/pbd-playground/

Repository: https://github.com/baditaflorin/pbd-playground

## Context

```mermaid
C4Context
title Position-Based Dynamics Playground
Person(visitor, "Visitor", "Plays with soft-body simulations")
System_Ext(githubPages, "GitHub Pages", "Static hosting from main /docs")
System(playground, "pbd-playground", "Client-side PBD, Three.js, Web Audio")
Rel(visitor, githubPages, "Loads")
Rel(githubPages, playground, "Serves static assets")
```

## Container

```mermaid
C4Container
title Static Mode A deployment
Person(visitor, "Visitor")
System_Boundary(pages, "GitHub Pages boundary") {
  Container(shell, "App shell", "TypeScript", "Links, controls, version, lazy loader")
  Container(playground, "Playground chunk", "TypeScript + Three.js", "Simulation lifecycle, rendering, picking")
  Container(wasm, "PBD kernel", "C++ to WASM", "Distance constraint projection")
  Container(sw, "Service worker", "Browser API", "Offline cache")
}
Rel(visitor, shell, "Starts")
Rel(shell, playground, "Dynamically imports")
Rel(playground, wasm, "Projects constraints")
Rel(shell, sw, "Registers")
```

## Module Boundaries

- `src/app` behavior lives in `src/main.ts`.
- `src/features/playground` owns UI-to-simulation orchestration.
- `src/features/physics` owns presets, solver state, constraints, and the WASM bridge.
- `src/features/rendering` owns Three.js renderer selection and scene updates.
- `src/features/audio` owns Web Audio collision synthesis.
- `wasm/pbd_kernel.cpp` is compiled into `public/wasm/pbd_kernel.wasm`.

## GitHub Pages Boundary

Everything under `docs/` is public static output or public documentation. No runtime backend, private token, database, Docker container, nginx config, or GitHub Actions workflow is required for v1.
