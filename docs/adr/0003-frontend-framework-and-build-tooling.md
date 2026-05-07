# 0003: Frontend Framework and Build Tooling

## Status

Accepted

## Context

The main experience is a canvas-heavy physics tool with a compact control surface. The app benefits from TypeScript strictness and Vite's WASM/static asset handling, but it does not need a heavy component framework in v1.

## Decision

Use strict TypeScript, Vite, Three.js, and small DOM modules.

Supporting tools:

- `vite` for development and production builds.
- `three` for WebGPU/WebGL rendering.
- `zod` for persisted settings validation.
- `lucide` for control icons.
- `vitest` for unit tests.
- `@playwright/test` for smoke/e2e checks.
- `eslint` and `prettier` for local quality gates.

## Consequences

- Initial app shell can stay small and lazy-load the large renderer chunk after a user action.
- DOM code remains explicit and lightweight.
- Contributors avoid framework-specific indirection for physics code.

## Alternatives Considered

- React: useful, but unnecessary for v1's small UI surface.
- Svelte/Vue: also viable, but would add another runtime concept without solving a v1 pain.
