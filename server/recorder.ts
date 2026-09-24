// Meeting recorder routes — start and stop recording a meeting on this Mac.
//
//   POST /api/record/start   { title? }  → { meeting_id, dir }
//   POST /api/record/stop                → { meeting_id, dir }
//   GET  /api/record/status              → { recording, meeting_id?, chunks, transcribed }
//
// Agents on the Tailormind box reach these through the same reverse tunnel as
// /api/voice. Recording = recorder/build/MeetingRecorder.app (mic + system audio,
// 20 s chunks) → recorder/transcriber.mjs (local whisper-server, per-chunk language)
// → rows in Neon's meeting_transcript. Unlike the rest of this app it needs a cloud
// key: it reads Erez's Neon URL from the jarvis workspace and refuses to start without it.

import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import type { Express } from "express";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP = path.join(REPO, "recorder/build/MeetingRecorder.app");
const TRANSCRIBER = path.join(REPO, "recorder/transcriber.mjs");
const DB_FILE = path.join(os.homedir(), "Workspace/jarvis/integrations/erez-database-url");
const ROOT = path.join(os.homedir(), "Library/Application Support/My Jarvis/recordings");
const WHISPER_URL = "http://127.0.0.1:8178";
const WHISPER_BIN = "/opt/homebrew/bin/whisper-server";
const WHISPER_MODEL = path.join(os.homedir(), "Library/Application Support/ru.starmel.OpenSuperWhisper/whisper-models/ggml-large-v3-turbo.bin");
const VAD_MODEL = "/Applications/OpenSuperWhisper.app/Contents/Resources/ggml-silero-v5.1.2.bin";
const CHUNK_SECONDS = "20";

let current: { meetingId: number; dir: string } | null = null;

function dbUrl(): string | null {
  if (!fs.existsSync(DB_FILE)) return null;
  return fs.readFileSync(DB_FILE, "utf8").match(/^DATABASE_URL=(.*)$/m)?.[1] ?? null;
}

async function sql(query: string, params: unknown[] = []) {
  const url = dbUrl();
  if (!url) throw new Error(`no DATABASE_URL in ${DB_FILE}`);
  const r = await fetch(`https://${new URL(url).hostname}/sql`, {
    method: "POST",
    headers: { "Neon-Connection-String": url, "Content-Type": "application/json" },
    body: JSON.stringify({ query, params }),
  });
  const body = await r.text();
  if (!r.ok) throw new Error(`neon ${r.status}: ${body.slice(0, 300)}`);
  return JSON.parse(body).rows as any[];
}

async function whisperUp(): Promise<boolean> {
  try { await fetch(WHISPER_URL, { signal: AbortSignal.timeout(1000) }); return true; } catch { return false; }
}

async function ensureWhisper(): Promise<void> {
  if (await whisperUp()) return;
  const log = fs.openSync(path.join(ROOT, "whisper-server.log"), "a");
  spawn(WHISPER_BIN, ["-m", WHISPER_MODEL, "--host", "127.0.0.1", "--port", "8178", "-l", "auto", "--vad", "-vm", VAD_MODEL],
    { detached: true, stdio: ["ignore", log, log] }).unref();
  for (let i = 0; i < 60; i++) {
    if (await whisperUp()) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("whisper-server did not come up in 60s");
}

function recorderPid(dir: string): number | null {
  try { return JSON.parse(fs.readFileSync(path.join(dir, "started"), "utf8")).pid; } catch { return null; }
}

function alive(pid: number | null): boolean {
  if (!pid) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

function lineCount(file: string): number {
  try { return fs.readFileSync(file, "utf8").split("\n").filter(Boolean).length; } catch { return 0; }
}

export function registerRecorderRoutes(app: Express) {
  app.post("/api/record/start", async (req, res) => {
    if (current && alive(recorderPid(current.dir))) {
      return res.status(409).json({ error: "already recording", meeting_id: current.meetingId, dir: current.dir });
    }
    if (!dbUrl()) return res.status(503).json({ error: `no Neon URL at ${DB_FILE} — cannot record` });
    if (!fs.existsSync(APP)) return res.status(503).json({ error: `recorder not built: ${APP}` });
    try {
      fs.mkdirSync(ROOT, { recursive: true });
      await ensureWhisper();
      const title = (typeof req.body?.title === "string" && req.body.title.trim()) || `Recorded ${new Date().toLocaleString("en-GB")}`;
      const [row] = await sql(
        `INSERT INTO meetings (title, meeting_url, bot_id, status, started_at, notes)
         VALUES ($1, 'local://mjv-recorder', 'mjv-recorder', 'recording', now(), 'Recorded on Erez''s Mac by My Jarvis Voice')
         RETURNING id`,
        [title],
      );
      const meetingId = Number(row.id);
      const dir = path.join(ROOT, `${meetingId}-${new Date().toISOString().replace(/[:.]/g, "-")}`);
      fs.mkdirSync(dir, { recursive: true });

      // `open -n` makes the recorder its own app, so macOS asks for (and remembers)
      // microphone + system-audio permission for IT, not for this node process.
      spawn("open", ["-n", APP, "--stdout", path.join(dir, "recorder.log"), "--stderr", path.join(dir, "recorder.log"),
        "--args", dir, CHUNK_SECONDS], { stdio: "ignore" });
      const tlog = fs.openSync(path.join(dir, "transcriber.log"), "a");
      spawn(process.execPath, [TRANSCRIBER, dir, String(meetingId)], { detached: true, stdio: ["ignore", tlog, tlog] }).unref();

      // Confirm the recorder actually started before saying so.
      for (let i = 0; i < 50 && !alive(recorderPid(dir)); i++) await new Promise((r) => setTimeout(r, 200));
      if (!alive(recorderPid(dir))) {
        await sql(`UPDATE meetings SET status = 'failed', notes = 'recorder did not start' WHERE id = $1`, [meetingId]);
        return res.status(500).json({ error: "recorder did not start", meeting_id: meetingId, dir });
      }
      current = { meetingId, dir };
      console.log(`[record] started meeting ${meetingId} → ${dir}`);
      res.json({ meeting_id: meetingId, dir, title });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/record/stop", async (_req, res) => {
    if (!current) return res.status(409).json({ error: "not recording" });
    const { meetingId, dir } = current;
    const pid = recorderPid(dir);
    if (pid && alive(pid)) process.kill(pid, "SIGTERM");
    for (let i = 0; i < 25 && alive(pid); i++) await new Promise((r) => setTimeout(r, 200));
    current = null;
    console.log(`[record] stopped meeting ${meetingId}`);
    // The transcriber finishes the remaining chunks and marks the meeting ended.
    res.json({ meeting_id: meetingId, dir, stopped: !alive(pid) });
  });

  app.get("/api/record/status", (_req, res) => {
    if (!current) return res.json({ recording: false });
    const { meetingId, dir } = current;
    let transcribed = 0;
    try { transcribed = JSON.parse(fs.readFileSync(path.join(dir, "transcribed.json"), "utf8")).length; } catch {}
    res.json({
      recording: alive(recorderPid(dir)), meeting_id: meetingId, dir,
      chunks: lineCount(path.join(dir, "chunks.jsonl")), transcribed,
    });
  });
}
