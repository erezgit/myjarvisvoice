# AGENTS.md — make this Mac talk

Instructions for a coding agent running **on the consuming machine**. Goal: get
the local voice engine running, then speak text through the speakers. No cloud,
no API keys.

## TL;DR

```bash
# from the repo root, one-time setup
npm install
./engine/setup.sh

# start the voice engine (the only piece you need to make the Mac talk)
engine/.venv/bin/python engine/kokoro_server.py --port 8787 &

# first run only: download the model (~350 MB) and wait until ready
curl -X POST http://localhost:8787/download-model
until curl -s http://localhost:8787/health | grep -q '"model_ready": true'; do sleep 3; done

# speak!
curl -X POST http://localhost:8787/speak \
  -H 'content-type: application/json' \
  -d '{"text":"Hello, I am speaking from a local open-source voice engine.","voice":"am_echo"}'
```

That last call synthesizes locally and plays on the machine's speakers.

## The API (base: `http://localhost:8787`)

- `GET  /health` → `{ "status":"ok", "model_ready":true|false, ... }`
  Always check `model_ready` before speaking.
- `POST /speak` `{ "text", "voice"?, "speed"? }` → plays audio on the speakers,
  returns `{ "ok": true, "voice": "...", "bytes": N }`.
- `POST /synthesize` `{ "text", "voice"?, "speed"? }` → returns `audio/wav`
  bytes (use this if you want the file instead of playback).
- `POST /download-model` → starts the one-time model download (idempotent).
- `GET  /download-progress` → `{ "downloading", "done", "downloaded", "total" }`.

### Voices

| voice (id) | who | alias |
|------------|-----|-------|
| `am_echo`  | Jarvis | `echo` |
| `am_onyx`  | Atlas  | `onyx` |
| `bm_fable` | Ben    | `fable` |
| `af_nova`  | Nova   | `nova` |

`speed` defaults to `1.0` (try `0.9`–`1.2`). You may pass the alias instead of
the id (e.g. `"voice":"nova"`).

## Get the WAV file instead of playback

```bash
curl -X POST http://localhost:8787/synthesize \
  -H 'content-type: application/json' \
  -d '{"text":"save me to a file","voice":"af_nova"}' \
  --output out.wav
```

## Run the full app (optional)

If you want the home‑feed UI too, see `README.md` → start `./scripts/start-dev.sh`
(engine + server + frontend) and open http://localhost:1420. The UI has a
**Download model** button and a Settings page to pick the agent/voice. The app
server also exposes the same engine via same‑origin proxy routes at
`/api/voice-engine/health|download|progress` and speaks via `POST /api/voice`
(`{ "message", "voice" }`).

## Troubleshooting

- **`model files missing` error** → call `POST /download-model`, wait for
  `model_ready: true` in `/health`.
- **No sound** → the engine plays via `afplay` (macOS). On Linux install
  `aplay` or `ffplay`. Use `/synthesize` to get bytes if you can't play.
- **Port in use** → start with `--port <N>` and point callers at it
  (or set `MYJARVIS_VOICE_PORT`).
- **Python deps fail** → use Python 3.10–3.12 (onnxruntime wheels). Re-run
  `./engine/setup.sh`.

## Notes

- Fully offline after the model download. No keys, no accounts, no telemetry.
- Model files (`*.onnx`, `*.bin`) are **not** in the repo; they download to your
  app data dir (override with `MYJARVIS_MODEL_DIR`).
