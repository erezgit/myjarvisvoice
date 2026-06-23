# My Jarvis Voice

A lightweight, **fully local** desktop voice app. It pairs a clean home‑feed UI
(a fork of the *Tori* desktop app) with a **bundled, offline Kokoro text‑to‑speech
engine** — so your Mac can talk with **zero cloud, zero API keys, zero config**.

It's also an **agent integration seam**: any program on the machine can `POST`
text to a local HTTP API and hear it spoken through the speakers. Hand this repo
to another machine's coding agent, run it, and that machine can talk.

> Voice model: [Kokoro‑82M](https://huggingface.co/hexgrad/Kokoro-82M) (Apache‑2.0
> open weights). The ~350 MB model files are **downloaded on first run** and are
> **not** part of this repository.

---

## What's inside

| Piece | Path | Role |
|------|------|------|
| **Voice engine** | `engine/kokoro_server.py` | Local Kokoro TTS HTTP server (the agent API). Port **8787**. |
| **App server** | `server/` | Express + SQLite backend for the feed; proxies voice to the engine. Port **3001**. |
| **Frontend** | `src/` | React 19 + Vite home feed & settings (the Tori UI, unchanged). |
| **Desktop shell** | `src-tauri/` | Tauri 2 wrapper (optional native build). |

Everything talks locally:

```
 Frontend (Vite :1420)  ──/api──▶  App server (:3001)  ──/synthesize──▶  Kokoro engine (:8787)  ──▶  🔊 speakers
```

---

## Quick start — the desktop app

> **My Jarvis Voice is a native desktop app. Run it as the app — not in a
> browser.** `http://localhost:1420` is an internal dev URL the desktop shell
> loads from; it is not the product. The product is the **native window**.

Requirements: **Node 18+**, **Python 3.10–3.12**, **Rust toolchain (`cargo`)**
for the desktop shell, macOS (the engine plays via `afplay`).

```bash
git clone https://github.com/erezgit/myjarvisvoice.git
cd myjarvisvoice

# 1. JS deps
npm install

# 2. Python voice engine (creates engine/.venv, auto-picks a 3.10–3.12 python)
./engine/setup.sh

# 3. Download the voice model once (~350 MB)
engine/.venv/bin/python engine/kokoro_server.py --port 8787 &
curl -X POST http://localhost:8787/download-model
until curl -s http://localhost:8787/health | grep -q '"model_ready": true'; do sleep 3; done
kill %1 2>/dev/null || true

# 4. Launch the DESKTOP APP (first run compiles the Rust shell, ~2–5 min)
./scripts/start-app.sh
```

`./scripts/start-app.sh` starts the engine (:8787) + API server (:3001) and
opens the **native window**. (No Rust? Install it:
`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`.)

The app is a compact, single-window **voice feed** (Open-Whisper style): the
body shows today's spoken messages, and a slim bottom bar has three controls —
**Home**, **Likes**, and **Settings**. Open **Settings** to pick and **preview**
any local voice. To make the app speak, an agent or script POSTs to
`http://localhost:3001/api/voice` (`{ "message", "voice"?, "agent"? }`) — the
message appears as a new card and plays. The one-command agent flow is in
[`AGENTS.md`](./AGENTS.md).

> **Coding agents:** read [`AGENTS.md`](./AGENTS.md) — it tells you to launch the
> desktop app and start a voice conversation with the user (beginning with a
> "can you hear me?" handshake), never to open a browser.

---

## The local voice API

The engine is the integration seam. Default base URL: `http://localhost:8787`.
(The app server also proxies model management at `/api/voice-engine/*`.)

| Method | Endpoint | Body | Result |
|--------|----------|------|--------|
| `GET`  | `/health` | — | `{ status, model_ready, port, model_dir, voices }` |
| `GET`  | `/voices` | — | list of voices (id, label, agent, alias) |
| `POST` | `/speak` | `{ text, voice?, speed? }` | synthesize **and play on the speakers** |
| `POST` | `/synthesize` | `{ text, voice?, speed? }` | returns `audio/wav` bytes |
| `POST` | `/download-model` | — | begin background download of model files |
| `GET`  | `/download-progress` | — | `{ downloading, done, downloaded, total, error }` |

```bash
curl -X POST http://localhost:8787/speak \
  -H 'content-type: application/json' \
  -d '{"text":"hello from the open source app","voice":"am_echo"}'
```

### Voices

| Kokoro id | Agent | Alias |
|-----------|-------|-------|
| `am_echo` | Jarvis | `echo` |
| `am_onyx` | Atlas | `onyx` |
| `bm_fable` | Ben | `fable` |
| `af_nova` | Nova | `nova` |

You can pass either the Kokoro id (`am_echo`) or an OpenAI‑style alias
(`echo`, `onyx`, `fable`, `nova`, `alloy`, `shimmer`); the engine maps them.
Any other valid Kokoro voice id from `voices-v1.0.bin` is passed through.

---

## Configuration

**None required.** The app runs offline with no `.env`. See `.env.example` for
optional overrides (ports, model directory).

## Privacy

100% local. No telemetry, no accounts, no network calls except the one‑time
model download from the public Kokoro release. Generated audio never leaves the
machine.

## License

MIT (this code) — see [LICENSE](LICENSE). The Kokoro‑82M model weights are
Apache‑2.0 and downloaded separately at runtime.
