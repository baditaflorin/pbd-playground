# 0010: GitHub Pages Publishing Strategy

## Status

Accepted

## Context

The public app must be available from the first commit and continue to work as a static site. The repo also needs ADRs and docs under `docs/`, while GitHub Pages can publish from either repository root or `/docs` on `main`.

## Decision

Publish GitHub Pages from `main` branch `/docs`.

Vite builds the app into `docs/` with:

- `base: "/pbd-playground/"`.
- Hashed assets under `docs/assets/`.
- `docs/index.html` as the app shell.
- `docs/404.html` copied from `index.html` for SPA fallback.
- `emptyOutDir: false`, plus a targeted clean script that removes generated app assets without deleting `docs/adr`.

The repository does **not** gitignore `docs/`, because it is the Pages publish directory.

## Consequences

- The GitHub Pages URL is stable: `https://baditaflorin.github.io/pbd-playground/`.
- Human documentation and the generated app share `docs/`, so build cleanup must be selective.
- Rollback is a normal git revert of the publishing commit.

## Alternatives Considered

- **Root publishing**: rejected because source files, config, and package metadata should not be the public site root.
- **`gh-pages` branch**: rejected to keep the Pages artifact visible in `main` without Actions.
