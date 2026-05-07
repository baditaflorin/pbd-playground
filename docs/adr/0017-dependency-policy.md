# 0017: Dependency Policy

## Status

Accepted

## Context

The app should feel polished without custom-building solved infrastructure. Dependencies must remain production-ready and static-site compatible.

## Decision

Use established libraries only:

- Three.js for rendering.
- Vite for build/dev.
- Zod for runtime validation.
- Lucide for icons.
- Vitest and Playwright for tests.
- ESLint, TypeScript, and Prettier for quality.

Dependencies are pinned through `package-lock.json`. Security checks use `npm audit` and `gitleaks`.

## Consequences

- The app avoids bespoke rendering, parser, storage validation, and testing infrastructure.
- Dependency updates should be deliberate and tested with smoke checks.

## Alternatives Considered

- Custom rendering or icon systems: rejected because battle-tested libraries exist.
