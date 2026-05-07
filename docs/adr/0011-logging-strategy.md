# 0011: Logging Strategy

## Status

Accepted

## Context

Mode A has no server logs. Browser console output should help local debugging without polluting production sessions.

## Decision

- Production code avoids routine console logging.
- Recoverable user-facing errors are shown in the app status/toast area.
- Unexpected startup errors are logged once with a compact message.
- Tests fail on page errors during smoke checks.

## Consequences

- Users are not exposed to noisy console output.
- Debugging remains possible when initialization fails.

## Alternatives Considered

- Client log collection: rejected because v1 uses no analytics or telemetry.
