# 0013: Testing Strategy

## Status

Accepted

## Context

The riskiest v1 behavior is simulation stability, WASM initialization, static build correctness, and browser interaction.

## Decision

Use layered local tests:

- Vitest unit tests for physics utilities, presets, storage, and WASM fallback behavior.
- Playwright smoke/e2e test for page load, app launch, WASM ready state, and one pointer interaction.
- `scripts/smoke.sh` builds, serves `docs/`, and runs the Playwright smoke test.
- `make test`, `make build`, and `make smoke` are wired into pre-push hooks.

## Consequences

- Checks stay local because the project uses no GitHub Actions.
- The smoke test validates the committed Pages artifact path.

## Alternatives Considered

- Visual regression suite: deferred until visual design stabilizes.
- GitHub Actions: rejected by project constraints.
