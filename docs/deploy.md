# Deploy

Live app: https://baditaflorin.github.io/pbd-playground/

Repository: https://github.com/baditaflorin/pbd-playground

## Topology

Deployment mode is Mode A: pure GitHub Pages.

GitHub Pages source:

- Branch: `main`
- Path: `/docs`
- Base path: `/pbd-playground/`

## Publish

```bash
npm install
make build
git add docs public src package.json package-lock.json
git commit -m "feat: update playground"
git push
```

GitHub Pages rebuilds from `main` after the push.

## Preview

```bash
make pages-preview
```

Open:

http://127.0.0.1:4173/pbd-playground/

## Rollback

Revert the commit that changed `docs/`, then push `main` again:

```bash
git revert <commit_sha>
git push
```

## Custom Domain

No custom domain is configured in v1.

If a custom domain is added later:

- Add `docs/CNAME`.
- Point DNS to GitHub Pages according to https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site
- Keep the Vite `base` setting aligned with the final hosting path.

## Pages Gotchas

- GitHub Pages does not support `_headers` or `_redirects`.
- The app uses `docs/404.html` as an SPA fallback.
- GitHub Pages cannot set COOP/COEP headers, so v1 avoids threaded WASM.
- Service worker scope is `/pbd-playground/`.
