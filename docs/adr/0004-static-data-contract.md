# 0004: Static Data Contract

## Status

Accepted

## Context

Mode A has no external dataset. The public app still needs static metadata for build version, repository links, PayPal link, and optional demo defaults.

## Decision

Use in-repo static metadata only:

- `package.json` is the source of truth for semantic version.
- Vite injects build metadata at compile time.
- The app may fetch the public GitHub commits API to display the latest `main` commit, with an embedded build commit fallback.
- Demo presets are TypeScript constants, not fetched data.

No `/data` contract is required in v1.

## Consequences

- There is no freshness model, schema migration, or artifact release process.
- The app remains usable offline after the first service-worker cache.
- GitHub API failures degrade to embedded build metadata.

## Alternatives Considered

- Static JSON metadata file: rejected because TypeScript constants and Vite defines are sufficient.
- Mode B data artifacts: rejected by ADR 0001.
