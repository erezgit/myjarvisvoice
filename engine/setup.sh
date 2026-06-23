#!/usr/bin/env bash
# Create a local Python venv for the My Jarvis Voice engine and install deps.
set -euo pipefail
cd "$(dirname "$0")"
PYTHON="${PYTHON:-python3}"
"$PYTHON" -m venv .venv
./.venv/bin/pip install --upgrade pip
./.venv/bin/pip install -r requirements.txt
echo "Engine ready. Start it with:  ./.venv/bin/python kokoro_server.py"
