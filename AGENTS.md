# AGENTS.md — run the desktop app and talk to the user through it

You are a coding agent on the **user's Mac**. Your job is **not** to run a
one-off engine test. Your job is to **launch the My Jarvis Voice desktop app,
open its window, and start a live voice conversation with the user through it** —
beginning with a "can you hear me?" handshake.

## ⛔ Hard rule: desktop app ONLY — never a web app

Run it as the **native Tauri desktop app**. **Do NOT open it in a browser.**
`http://localhost:1420` is an internal dev URL the desktop shell loads from — it
is **not** the product and you must never point the user at it. The product is
the **native window**. If you can't build the desktop app, fix that (install
Rust) — do not fall back to the browser.

## Prerequisites

- **Node 18+**
- **Python 3.10–3.12** (kokoro-onnx / onnxruntime wheels; `./engine/setup.sh`
  auto-selects a compatible one)
- **Rust toolchain (`cargo`)** — required to build the desktop shell. If it's
  missing: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`,
  then open a new shell.

## Do this, in order

```bash
# 1. install JS deps + the local Python voice engine
npm install
./engine/setup.sh

# 2. download the voice model once (~350 MB) and wait until it is ready
engine/.venv/bin/python engine/kokoro_server.py --port 8787 &   # temporary, for the download
curl -X POST http://localhost:8787/download-model
until curl -s http://localhost:8787/health | grep -q '"model_ready": true'; do sleep 3; done
kill %1 2>/dev/null || true   # stop the temporary engine; start-app.sh will run its own

# 3. LAUNCH THE DESKTOP APP (native window). Run it in the background so you can
#    keep working; first run compiles Rust (~2–5 min) then a Mac window opens.
./scripts/start-app.sh
```

`./scripts/start-app.sh` starts the engine (:8787), the API server (:3001), and
opens the **native desktop window**. Wait until the window is actually open
before the next step.

## Then: greet the user THROUGH the app, and wait for confirmation

Speak to the user by POSTing to the app's voice endpoint. The message appears as
a card in the app's feed and plays through the speakers:

```bash
curl -X POST http://localhost:3001/api/voice \
  -H 'content-type: application/json' \
  -d '{"message":"Hi, I am running inside the My Jarvis Voice app on your Mac. Can you hear me through the app?","voice":"am_echo","agent":"jarvis"}'
```

**Your FIRST message must ask: "Can you hear me through the app?"**

Then **STOP and wait for the user to confirm**. Also tell the user in your
terminal output to look at the My Jarvis Voice window — and, if they don't hear
it play on its own, to click the play button on the newest card.

- ✅ **User says "yes, I can hear you"** → the app works. Continue the
  conversation from here, speaking each reply through `POST /api/voice` (they
  hear you in the app). This is now your voice channel.
- ❌ **User says they can't hear it** → troubleshoot (below) and retry the
  greeting until they confirm. Do **not** proceed until they can hear you.

## Troubleshooting "I can't hear you"

1. **No new card appeared** → the API server (:3001) isn't up. Is the desktop
   window open via `./scripts/start-app.sh`? Check `curl -s http://localhost:3001/api/voice_messages`.
2. **Card appeared but silent** → most often autoplay didn't fire; ask the user
   to click the newest card's **play** button. Also check the Mac's output
   device + volume (the engine plays via `afplay`).
3. **Error about the model** → `curl -X POST http://localhost:8787/download-model`,
   wait for `"model_ready": true` in `http://localhost:8787/health`.
4. **Isolate engine vs app** → confirm the raw engine speaks:
   `curl -X POST http://localhost:8787/speak -H 'content-type: application/json' -d '{"text":"test","voice":"am_echo"}'`.
   If that plays but the app card doesn't, the issue is the server/UI layer, not the engine.

## Reference — the app's voice endpoint

`POST http://localhost:3001/api/voice` `{ "message", "voice"?, "agent"? }`
→ synthesizes locally, plays, and adds a card to the feed.

| voice id | who | alias |
|----------|-----|-------|
| `am_echo` | Jarvis | `echo` |
| `am_onyx` | Atlas | `onyx` |
| `bm_fable` | Ben | `fable` |
| `af_nova` | Nova | `nova` |

You may pass an alias instead of the id. Everything is local — no keys, no
cloud, no telemetry. The lower-level engine API (`:8787` — `/speak`,
`/synthesize`, `/health`, `/download-model`) is documented in `README.md`, but
for talking to the user, use the app endpoint above so it shows in the window.
