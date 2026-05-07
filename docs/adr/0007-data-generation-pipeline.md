# 0007: Data Generation Pipeline

## Status

Accepted as not applicable

## Context

Mode B projects require an offline data-generation pipeline. This project is Mode A and has no external dataset.

## Decision

Do not create a data-generation pipeline in v1.

## Consequences

- `make data` is intentionally absent.
- There are no generated data artifacts or release-hosted dumps.

## Alternatives Considered

- Keeping a stub generator: rejected because it would imply a data contract that does not exist.
