# 0012: Metrics and Observability

## Status

Accepted

## Context

The project is a static toy hosted on GitHub Pages. Usage analytics are not necessary for v1 success.

## Decision

Use no analytics and no telemetry in v1.

Local observability is limited to:

- visible renderer and WASM status in the app
- FPS and particle/constraint counters
- Playwright smoke checks

## Consequences

- No PII is collected.
- There is no metrics backend to operate.
- Product decisions rely on direct feedback, stars, and issues.

## Alternatives Considered

- Plausible or beacon analytics: deferred until there is a concrete product question worth answering.
