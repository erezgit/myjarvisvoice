#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# STABLE launcher for My Jarvis Voice.
#
# Unlike start-app.sh (which runs `tauri dev` and kills everything via a trap
# when the launching shell dies), this starts each piece as its OWN detached
# process (setsid + nohup). Nothing shares a lifecycle, so stopping one — or the
# terminal that launched them — does NOT take the app down. It just keeps running.
#
# Requires the debug binary to already be built once:
#   (cd src-tauri && cargo build)   — or a prior `npm run tauri dev`.
#
#   ./scripts/start-stable.sh          launch (idempotent-ish)
#   ./scripts/start-stable.sh stop     stop everything
# ─────────────────────────────────────────────────────────────────────────────
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
RUN="$ROOT/.run"; mkdir -p "$RUN"
ENGINE_PY="${ENGINE_PY:-engine/.venv/bin/python}"
BIN="src-tauri/target/debug/tauri-app"

up() { lsof -iTCP:"$1" -sTCP:LISTEN -n >/dev/null 2>&1; }
# Detach a process into its OWN session (macOS has no `setsid`, so use python's
# os.setsid + execvp). This makes each piece independent — no shared trap, and
# signals to the launching shell's process group never reach it.
spawn() { # logname cmd...
  local name="$1"; shift
  nohup python3 - "$RUN/$name.log" "$@" >/dev/null 2>&1 <<'PY' &
import os, sys
os.setsid()
log = sys.argv[1]; cmd = sys.argv[2:]
fd = os.open(log, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o644)
os.dup2(fd, 1); os.dup2(fd, 2)
os.execvp(cmd[0], cmd)
PY
  disown
}

if [ "${1:-}" = "stop" ]; then
  pkill -f "engine/kokoro_server.py" 2>/dev/null
  pkill -f "tsx server/index.ts" 2>/dev/null
  pkill -f "$ROOT.*vite" 2>/dev/null
  pkill -f "target/debug/tauri-app" 2>/dev/null
  echo "stopped."
  exit 0
fi

# 1) Kokoro voice engine (:8787)
up 8787 || spawn engine "$ENGINE_PY" engine/kokoro_server.py --port 8787
# 2) SQLite API (:3001)
up 3001 || spawn api env API_PORT=3001 npx tsx server/index.ts
# 3) Vite dev server the window loads from (:1420)
up 1420 || spawn vite npx vite --host 127.0.0.1 --port 1420

echo "waiting for services…"
for i in $(seq 1 120); do
  up 8787 && up 3001 && up 1420 && break
  sleep 1
done

# 4) The native window — run the prebuilt binary directly (no `tauri dev`, no trap)
if ! pgrep -f "target/debug/tauri-app" >/dev/null 2>&1; then
  if [ -x "$BIN" ]; then
    spawn window "$BIN"
  else
    echo "ERROR: $BIN not built. Run: (cd src-tauri && cargo build)"
    exit 1
  fi
fi

echo "launched (detached). engine:8787 api:3001 vite:1420 + window. logs in $RUN/"
