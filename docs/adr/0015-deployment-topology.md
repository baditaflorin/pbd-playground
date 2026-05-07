# 0015: Deployment Topology

## Status

Accepted

## Context

Mode C deployment artifacts are not required. Mode A deployment is a static GitHub Pages site.

## Decision

Deploy only through GitHub Pages:

- Source branch: `main`.
- Source path: `/docs`.
- Public URL: `https://baditaflorin.github.io/pbd-playground/`.
- Rollback: revert the commit that changed `docs/`.

No `deploy/` directory, Docker Compose, nginx, or server runbook is needed in v1.

## Consequences

- Operations are simple and transparent.
- GitHub Pages limitations apply, including no custom response headers.

## Alternatives Considered

- Docker backend with nginx: rejected by ADR 0001.
