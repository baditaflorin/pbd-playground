# 0009: Configuration and Secrets Management

## Status

Accepted

## Context

The app is static and must never contain secrets. Build-time configuration is limited to public base path and public URLs.

## Decision

- No runtime secrets are used.
- `.env*` files are gitignored except `.env.example`.
- Public URLs live in source constants.
- `gitleaks` runs in the pre-commit hook.
- Build metadata is non-secret and may be embedded in the client.

## Consequences

- The frontend can be viewed, forked, and audited without secret risk.
- Any future feature requiring a private token must use an offline build step or a new Mode B/C ADR.

## Alternatives Considered

- Encrypted or obfuscated frontend secrets: rejected because frontend secrets are not secrets.
