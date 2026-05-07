# 0008: Go Backend Project Layout

## Status

Accepted as not applicable

## Context

Modes B and C may require Go generators or a Go runtime API. ADR 0001 selects Mode A.

## Decision

Do not scaffold Go backend directories in v1.

## Consequences

- No `cmd/`, `internal/`, `pkg/`, `api/`, `configs/`, or Go module are created.
- Backend, Docker, nginx, and server observability requirements are out of scope.

## Alternatives Considered

- Empty Go layout: rejected because it would add maintenance surface without runtime or build-time work.
