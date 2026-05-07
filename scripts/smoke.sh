#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

npm run build

mkdir -p tmp
PORT="$(node -e "const net=require('node:net'); const s=net.createServer(); s.listen(0,'127.0.0.1',()=>{console.log(s.address().port); s.close();});")"
BASE_URL="http://127.0.0.1:${PORT}/pbd-playground/"

npx vite preview --host 127.0.0.1 --port "$PORT" --strictPort >tmp/smoke-server.log 2>&1 &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

SERVER_READY=0
for _ in {1..60}; do
  if curl -fsS "$BASE_URL" 2>/dev/null | grep -q 'pbd-playground'; then
    SERVER_READY=1
    break
  fi
  sleep 0.25
done

if [[ "$SERVER_READY" != "1" ]]; then
  echo "Smoke preview server did not become ready. Log follows:" >&2
  cat tmp/smoke-server.log >&2
  exit 1
fi

BASE_URL="$BASE_URL" npx playwright test tests/e2e/smoke.spec.ts
