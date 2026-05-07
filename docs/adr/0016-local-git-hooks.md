# 0016: Local Git Hooks

## Status

Accepted

## Context

The project explicitly avoids GitHub Actions. Quality gates must run locally.

## Decision

Use plain `.githooks/` scripts wired by `make install-hooks`.

Hooks:

- `pre-commit`: ESLint, Prettier check, TypeScript check, and `gitleaks protect --staged`.
- `commit-msg`: Conventional Commits validation.
- `pre-push`: `make test`, `make build`, `make smoke`.
- `post-merge` and `post-checkout`: rebuild WASM when source exists.

## Consequences

- Contributors can inspect and run hook scripts directly.
- Local setup is explicit and documented.

## Alternatives Considered

- Lefthook: viable, but plain scripts avoid an extra tool for v1.
