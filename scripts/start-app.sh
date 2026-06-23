#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Launch My Jarvis Voice as the NATIVE DESKTOP APP (Tauri).
#
#   This is the ONLY supported way to run the app. Do NOT open it as a web page
#   in a browser (http://localhost:1420 is an internal dev URL for the desktop
#   shell, not the product). The product is the native window this script opens.
#
# Starts three things and opens the window:
#   1) local Kokoro voice engine   (:8787)
#   2) SQLite API server           (:3001)
#   3) the Tauri desktop window    (compiles the Rust shell on first run, ~2–5 min;
#      it also starts the Vite dev server it loads from)
# Ctrl-C stops everything.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# The desktop shell is built with Rust. Without cargo there is no app to open —
# do NOT fall back to a browser; install Rust instead.
if ! command -v cargo >/dev/null 2>&1; then
  echo "ERROR: the My Jarvis Voice desktop app is built with Rust, but 'cargo' was not found."
  echo "Install the Rust toolchain, then re-run this script:"
  echo "    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
  echo "    (open a new shell so 'cargo' is on PATH)"
  exit 1
fi

ENGINE_PY="${ENGINE_PY:-engine/.venv/bin/python}"
if [ ! -x "$ENGINE_PY" ]; then
  echo "Engine venv missing — run ./engine/setup.sh first."
  exit 1
fi

echo "[1/3] starting local Kokoro engine on :8787"
"$ENGINE_PY" engine/kokoro_server.py --port 8787 &
E=$!

echo "[2/3] starting API server on :3001"
API_PORT=3001 npm run dev:server &
S=$!

# Clean up the background processes when the app window closes / Ctrl-C.
trap 'kill $E $S 2>/dev/null || true' INT TERM EXIT

echo "[3/3] building + opening the desktop window (first run compiles Rust, please wait)"
# 'tauri dev' starts its own Vite (beforeDevCommand) and opens the native window.
npm run tauri dev
