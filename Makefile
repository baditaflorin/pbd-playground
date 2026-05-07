.PHONY: help install-hooks dev build test test-integration smoke lint fmt pages-preview release clean audit hooks-pre-commit hooks-commit-msg hooks-pre-push

help:
	@printf '%s\n' \
		'Targets:' \
		'  make install-hooks     wire .githooks into this repo' \
		'  make dev               run the local Vite dev server' \
		'  make build             build WASM and GitHub Pages output into docs/' \
		'  make test              run unit tests' \
		'  make test-integration  reserved; no integration suite in Mode A v1' \
		'  make smoke             build, serve docs/, and run Playwright smoke' \
		'  make lint              run ESLint, Prettier check, TypeScript, and audit' \
		'  make fmt               autoformat source files' \
		'  make pages-preview     serve the Pages build locally' \
		'  make release           tag the current version locally' \
		'  make clean             remove generated local artifacts'

install-hooks:
	git config core.hooksPath .githooks
	chmod +x .githooks/*

dev:
	npm run dev

build:
	npm run build

test:
	npm run test

test-integration:
	@echo 'No integration tests for Mode A v1.'

smoke:
	npm run smoke

lint:
	npm run lint
	npm run fmt:check
	npm run typecheck
	npm run audit

fmt:
	npm run fmt

pages-preview:
	npm run preview:pages

release: test build smoke
	@git diff --quiet || (echo 'Working tree must be clean before tagging.' >&2; exit 1)
	git tag "v$$(node -p "require('./package.json').version")"

clean:
	rm -rf coverage playwright-report test-results tmp

hooks-pre-commit:
	.githooks/pre-commit

hooks-commit-msg:
	@if [ -z "$(MSG)" ]; then echo 'Usage: make hooks-commit-msg MSG=.git/COMMIT_EDITMSG' >&2; exit 1; fi
	.githooks/commit-msg "$(MSG)"

hooks-pre-push:
	.githooks/pre-push
