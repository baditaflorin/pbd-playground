# 0005: Client-Side Storage Strategy

## Status

Accepted

## Context

Users may want the playground to remember their last demo, render quality, audio preference, and simulation sliders. No cross-device sync is required.

## Decision

Use `localStorage` for small preferences validated with `zod`.

Stored values:

- selected preset
- selected tool
- audio enabled
- simulation stiffness
- wind strength
- visual quality

No IndexedDB or OPFS is needed in v1.

## Consequences

- Storage is simple, transparent, and easy to reset.
- Invalid stored values are discarded and replaced by defaults.
- Larger saved scenes would require a future ADR.

## Alternatives Considered

- IndexedDB: rejected for v1 because settings are tiny.
- Server persistence: rejected by ADR 0001.
