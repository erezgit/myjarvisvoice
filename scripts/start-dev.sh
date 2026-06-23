#!/usr/bin/env bash
# Start the full My Jarvis Voice stack for local development:
#   1) local Kokoro engine (port 8787)
#   2) SQLite API server   (port 3001)
#   3) Vite frontend       (Tauri dev URL / browser)
# Ctrl-C stops all three.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENGINE_PY="${ENGINE_PY:-engine/.venv/bin/python}"
[ -x "$ENGINE_PY" ] || { echo "Engine venv missing — run ./engine/setup.sh first"; exit 1; }

echo "[1/3] starting local Kokoro engine on :8787"
"$ENGINE_PY" engine/kokoro_server.py --port 8787 &
E=$!
echo "[2/3] starting SQLite API server on :3001"
npm run dev:server &
S=$!
echo "[3/3] starting Vite frontend"
npm run dev &
V=$!

trap 'kill $E $S $V 2>/dev/null || true' INT TERM
wait
