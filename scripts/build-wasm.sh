#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT_DIR/wasm/pbd_kernel.cpp"
OUT_DIR="$ROOT_DIR/public/wasm"
OUT="$OUT_DIR/pbd_kernel.wasm"

mkdir -p "$OUT_DIR"

CLANGXX="${CLANGXX:-}"

if [[ -z "$CLANGXX" ]] && [[ -x "/opt/homebrew/opt/llvm/bin/clang++" ]]; then
  CLANGXX="/opt/homebrew/opt/llvm/bin/clang++"
fi

if [[ -z "$CLANGXX" ]] && command -v brew >/dev/null 2>&1; then
  LLVM_PREFIX="$(brew --prefix llvm 2>/dev/null || true)"
  if [[ -n "$LLVM_PREFIX" && -x "$LLVM_PREFIX/bin/clang++" ]]; then
    CLANGXX="$LLVM_PREFIX/bin/clang++"
  fi
fi

if [[ -z "$CLANGXX" ]] && command -v clang++ >/dev/null 2>&1; then
  CLANGXX="$(command -v clang++)"
fi

if [[ -z "$CLANGXX" ]]; then
  if [[ -f "$OUT" ]]; then
    echo "clang++ not found; keeping existing $OUT"
    exit 0
  fi

  echo "clang++ is required to build $OUT" >&2
  exit 1
fi

"$CLANGXX" \
  --target=wasm32 \
  -O3 \
  -std=c++17 \
  -nostdlib \
  -fno-exceptions \
  -fno-rtti \
  -Wl,--no-entry \
  -Wl,--export-all \
  -Wl,--export-memory \
  -Wl,--initial-memory=131072 \
  -Wl,--max-memory=16777216 \
  -Wl,--allow-undefined \
  "$SRC" \
  -o "$OUT"

echo "built $OUT"
