"""My Jarvis Voice — local Kokoro TTS engine.

A zero-config, offline text-to-speech HTTP server built on the open-weight
Kokoro-82M model (Apache-2.0). This is the *agent integration seam*: any
program on this machine can POST text and hear the Mac speak, with no API
keys and no network once the model files are present.

API
---
  GET  /health             -> {"status","model_ready","port","model_dir","voices"}
  GET  /voices             -> {"voices":[...]}  (id + human label + agent)
  POST /speak              {"text","voice","speed"} -> synth + play on speakers
  POST /synthesize         {"text","voice","speed"} -> audio/wav bytes
  POST /download-model     -> begin background download of model files
  GET  /download-progress  -> {"downloading","done","downloaded","total","error","files"}

Voices (Kokoro id -> agent / OpenAI-style alias)
  am_echo  Jarvis  (echo)      am_onyx Atlas (onyx)
  bm_fable Ben     (fable)     af_nova Nova  (nova)
  plus pass-through for any other Kokoro voice id, and aliases
  alloy/shimmer -> sensible Kokoro fallbacks.

Model files (~350 MB, NOT committed to the repo) are downloaded on first run
into the app data dir, or read from MYJARVIS_MODEL_DIR if set:
  kokoro-v1.0.onnx  (~325 MB)   voices-v1.0.bin (~28 MB)
Source: github.com/thewh1teagle/kokoro-onnx releases, tag model-files-v1.0.

Run:  python3 engine/kokoro_server.py [--port 8765]
Deps: kokoro_onnx, soundfile, numpy  (see engine/requirements.txt)
"""

from __future__ import annotations

import argparse
import io
import json
import os
import platform
import shutil
import subprocess
import sys
import tempfile
import threading
import urllib.request
import wave
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

SAMPLE_RATE = 24000
DEFAULT_PORT = int(os.environ.get("MYJARVIS_VOICE_PORT", "8787"))

# Canonical open-weight model release (verified Apache-2.0, Kokoro-82M).
MODEL_BASE = (
    "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0"
)
MODEL_FILES = {
    "kokoro-v1.0.onnx": f"{MODEL_BASE}/kokoro-v1.0.onnx",
    "voices-v1.0.bin": f"{MODEL_BASE}/voices-v1.0.bin",
}

# Agent <-> voice catalogue. The app's Settings maps an agent to one of these.
# Full MyJarvis roster. Kokoro ids + OpenAI-style aliases are kept in sync with
# the dashboard source of truth (functions/api/voice OPENAI_TO_KOKORO).
VOICES = [
    {"id": "am_echo", "label": "Jarvis", "agent": "jarvis", "alias": "echo"},
    {"id": "am_onyx", "label": "Atlas", "agent": "atlas", "alias": "onyx"},
    {"id": "bm_fable", "label": "Ben", "agent": "ben", "alias": "fable"},
    {"id": "af_nova", "label": "Nova", "agent": "nova", "alias": "nova"},
    {"id": "bf_emma", "label": "Emma", "agent": "emma", "alias": "alloy"},
    {"id": "af_aoede", "label": "Cleo", "agent": "cleo", "alias": "shimmer"},
    {"id": "am_michael", "label": "Kai", "agent": "kai", "alias": "am_michael"},
    {"id": "am_adam", "label": "Dave", "agent": "dave", "alias": "am_adam"},
    {"id": "am_liam", "label": "Leo", "agent": "leo", "alias": "am_liam"},
]
# OpenAI-style + agent-name aliases -> Kokoro ids, so existing voice ids keep
# working. alloy/shimmer map to DISTINCT voices (bf_emma/af_aoede) — matching
# the dashboard — so Emma and Cleo no longer collide with Jarvis and Nova.
ALIASES = {
    # OpenAI-style
    "echo": "am_echo",
    "onyx": "am_onyx",
    "fable": "bm_fable",
    "nova": "af_nova",
    "alloy": "bf_emma",
    "shimmer": "af_aoede",
    # agent-name
    "jarvis": "am_echo",
    "atlas": "am_onyx",
    "ben": "bm_fable",
    "emma": "bf_emma",
    "cleo": "af_aoede",
    "kai": "am_michael",
    "dave": "am_adam",
    "leo": "am_liam",
}
DEFAULT_VOICE = "am_echo"


def model_dir() -> Path:
    """Where model files live. Env override wins; else per-OS app data dir."""
    env = os.environ.get("MYJARVIS_MODEL_DIR")
    if env:
        return Path(env).expanduser()
    if platform.system() == "Darwin":
        base = Path.home() / "Library" / "Application Support" / "MyJarvisVoice"
    elif platform.system() == "Windows":
        base = Path(os.environ.get("APPDATA", Path.home())) / "MyJarvisVoice"
    else:
        base = Path(
            os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share")
        ) / "MyJarvisVoice"
    return base / "models"


def model_paths() -> tuple[Path, Path]:
    d = model_dir()
    return d / "kokoro-v1.0.onnx", d / "voices-v1.0.bin"


def model_ready() -> bool:
    onnx, voices = model_paths()
    # Guard against truncated/partial downloads with a coarse size floor.
    return (
        onnx.exists()
        and voices.exists()
        and onnx.stat().st_size > 100_000_000
        and voices.stat().st_size > 10_000_000
    )


def resolve_voice(voice: str | None) -> str:
    if not voice:
        return DEFAULT_VOICE
    v = voice.strip()
    if v in {e["id"] for e in VOICES}:
        return v
    if v in ALIASES:
        return ALIASES[v]
    # Unknown but plausibly a real Kokoro id (e.g. af_bella) — pass through.
    return v


# --- engine (lazy) -----------------------------------------------------------

_engine = None
_engine_lock = threading.Lock()
_play_lock = threading.Lock()  # serialize afplay so voices queue, never overlap


def get_engine():
    global _engine
    with _engine_lock:
        if _engine is None:
            from kokoro_onnx import Kokoro

            onnx, voices = model_paths()
            if not model_ready():
                raise RuntimeError(
                    "model files missing — POST /download-model first"
                )
            _engine = Kokoro(str(onnx), str(voices))
        return _engine


def synth_wav(text: str, voice: str, speed: float) -> bytes:
    """Synthesize text to in-memory WAV bytes (24 kHz mono PCM16)."""
    import numpy as np

    eng = get_engine()
    samples, sr = eng.create(
        text, voice=resolve_voice(voice), speed=speed, lang="en-us"
    )
    pcm16 = np.clip(np.asarray(samples) * 32767.0, -32768, 32767).astype("<i2")
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm16.tobytes())
    return buf.getvalue()


def play_wav_bytes(wav: bytes) -> None:
    """Play WAV on the machine's speakers, serialized across callers."""
    tmp = Path(tempfile.gettempdir()) / f"mjv-{os.getpid()}-{threading.get_ident()}.wav"
    tmp.write_bytes(wav)
    try:
        with _play_lock:
            if platform.system() == "Darwin":
                subprocess.run(["afplay", str(tmp)], check=True)
            elif shutil.which("aplay"):
                subprocess.run(["aplay", "-q", str(tmp)], check=True)
            elif shutil.which("ffplay"):
                subprocess.run(
                    ["ffplay", "-nodisp", "-autoexit", "-loglevel", "quiet", str(tmp)],
                    check=True,
                )
            else:
                raise RuntimeError("no audio player found (afplay/aplay/ffplay)")
    finally:
        try:
            tmp.unlink()
        except OSError:
            pass


# --- model download (background, with progress) ------------------------------

_dl = {
    "downloading": False,
    "done": model_ready(),
    "downloaded": 0,
    "total": 0,
    "error": None,
    "files": {},
}
_dl_lock = threading.Lock()


def _download_worker() -> None:
    onnx, voices = model_paths()
    onnx.parent.mkdir(parents=True, exist_ok=True)
    targets = [(onnx, MODEL_FILES["kokoro-v1.0.onnx"]), (voices, MODEL_FILES["voices-v1.0.bin"])]
    try:
        # First pass: learn total size for an accurate progress bar.
        total = 0
        sizes = {}
        for path, url in targets:
            req = urllib.request.Request(url, method="HEAD")
            with urllib.request.urlopen(req, timeout=60) as r:
                n = int(r.headers.get("Content-Length", "0"))
                sizes[path.name] = n
                total += n
        with _dl_lock:
            _dl["total"] = total
        downloaded = 0
        for path, url in targets:
            tmp = path.with_suffix(path.suffix + ".part")
            with urllib.request.urlopen(url, timeout=120) as r, open(tmp, "wb") as f:
                while True:
                    chunk = r.read(1 << 20)
                    if not chunk:
                        break
                    f.write(chunk)
                    downloaded += len(chunk)
                    with _dl_lock:
                        _dl["downloaded"] = downloaded
                        _dl["files"][path.name] = f.tell()
            tmp.replace(path)
        with _dl_lock:
            _dl["downloading"] = False
            _dl["done"] = model_ready()
    except Exception as e:  # noqa: BLE001 — surface any failure to the client
        with _dl_lock:
            _dl["downloading"] = False
            _dl["error"] = str(e)


def start_download() -> dict:
    with _dl_lock:
        if _dl["downloading"]:
            return {"started": False, "reason": "already downloading"}
        if model_ready():
            _dl["done"] = True
            return {"started": False, "reason": "already present"}
        _dl.update(downloading=True, done=False, downloaded=0, total=0, error=None, files={})
    threading.Thread(target=_download_worker, daemon=True).start()
    return {"started": True}


# --- HTTP --------------------------------------------------------------------


class Handler(BaseHTTPRequestHandler):
    server_version = "MyJarvisVoice/1.0"

    def log_message(self, *args):  # quieter logs
        sys.stderr.write("[engine] " + (args[0] % args[1:]) + "\n")

    def _json(self, code: int, obj: dict):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _body(self) -> dict:
        n = int(self.headers.get("Content-Length", "0"))
        if not n:
            return {}
        try:
            return json.loads(self.rfile.read(n) or b"{}")
        except json.JSONDecodeError:
            return {}

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        if self.path.startswith("/health"):
            self._json(200, {
                "status": "ok",
                "model_ready": model_ready(),
                "port": self.server.server_address[1],
                "model_dir": str(model_dir()),
                "voices": [v["id"] for v in VOICES],
            })
        elif self.path.startswith("/voices"):
            self._json(200, {"voices": VOICES})
        elif self.path.startswith("/download-progress"):
            with _dl_lock:
                self._json(200, dict(_dl))
        else:
            self._json(404, {"error": "not found"})

    def do_POST(self):
        if self.path.startswith("/download-model"):
            self._json(200, start_download())
            return
        if self.path.startswith("/speak"):
            b = self._body()
            text = (b.get("text") or "").strip()
            if not text:
                self._json(400, {"error": "text required"})
                return
            try:
                wav = synth_wav(text, b.get("voice"), float(b.get("speed", 1.0)))
                play_wav_bytes(wav)
                self._json(200, {
                    "ok": True,
                    "voice": resolve_voice(b.get("voice")),
                    "bytes": len(wav),
                })
            except Exception as e:  # noqa: BLE001
                self._json(500, {"error": str(e)})
            return
        if self.path.startswith("/synthesize"):
            b = self._body()
            text = (b.get("text") or "").strip()
            if not text:
                self._json(400, {"error": "text required"})
                return
            try:
                wav = synth_wav(text, b.get("voice"), float(b.get("speed", 1.0)))
                self.send_response(200)
                self.send_header("Content-Type", "audio/wav")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Content-Length", str(len(wav)))
                self.end_headers()
                self.wfile.write(wav)
            except Exception as e:  # noqa: BLE001
                self._json(500, {"error": str(e)})
            return
        self._json(404, {"error": "not found"})


def main():
    ap = argparse.ArgumentParser(description="My Jarvis Voice — local Kokoro engine")
    ap.add_argument("--port", type=int, default=DEFAULT_PORT)
    ap.add_argument("--host", default="127.0.0.1")
    args = ap.parse_args()
    srv = ThreadingHTTPServer((args.host, args.port), Handler)
    print(
        f"[engine] My Jarvis Voice on http://{args.host}:{args.port} "
        f"(model_ready={model_ready()}, model_dir={model_dir()})",
        flush=True,
    )
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
