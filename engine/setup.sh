#!/usr/bin/env bash
# Create a local Python venv for the My Jarvis Voice engine and install deps.
#
# kokoro-onnx / onnxruntime publish wheels for Python 3.10–3.12 only, so we pick
# a compatible interpreter automatically — the system `python3` is often 3.13+,
# which has no wheels and fails to build. Override with PYTHON=... if you like.
set -euo pipefail
cd "$(dirname "$0")"

pick_python() {
  if [ -n "${PYTHON:-}" ]; then echo "$PYTHON"; return; fi
  for c in python3.12 python3.11 python3.10; do
    if command -v "$c" >/dev/null 2>&1; then echo "$c"; return; fi
  done
  # Fall back to a bare python3 only if it is itself 3.10–3.12.
  if command -v python3 >/dev/null 2>&1; then
    v=$(python3 -c 'import sys;print("%d.%d"%sys.version_info[:2])' 2>/dev/null || echo "")
    case "$v" in 3.10|3.11|3.12) echo python3; return;; esac
  fi
  echo ""
}

PYTHON="$(pick_python)"
if [ -z "$PYTHON" ]; then
  echo "ERROR: My Jarvis Voice needs Python 3.10, 3.11, or 3.12 (kokoro-onnx / onnxruntime wheels)."
  echo "Your default python3 is: $(python3 --version 2>&1 || echo 'not found')"
  echo
  echo "Install a compatible version, e.g.:"
  echo "    macOS:  brew install python@3.12"
  echo "    Linux:  sudo apt-get install python3.12 python3.12-venv"
  echo
  echo "Then re-run:  ./engine/setup.sh    (or force one: PYTHON=python3.12 ./engine/setup.sh)"
  exit 1
fi

echo "Using $("$PYTHON" --version 2>&1) ($PYTHON)"
"$PYTHON" -m venv .venv
./.venv/bin/pip install --upgrade pip
./.venv/bin/pip install -r requirements.txt
echo "Engine ready. Start it with:  ./.venv/bin/python kokoro_server.py"
