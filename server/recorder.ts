// Meeting recorder routes — start and stop recording a meeting on this Mac.
//
//   POST /api/record/start   { title? }  → { meeting_id, dir }
//   POST /api/record/stop                → { meeting_id, dir }
//   GET  /api/record/status              → { recording, meeting_id?, chunks, transcribed, last_meeting_id? }
//   GET  /api/record/transcript?meeting_id=&after=  → { meeting, rows } — the app's live panel
//   GET  /api/record/list                → [{ id, title, status, started_at, ended_at, lines }] — newest first
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
// The recorder cuts at every pause (one chunk per sentence); this is only the CAP,
// for someone who talks 12 s without stopping (Erez, 6 Oct: "as fast as whisper can").
const CHUNK_SECONDS = "12";

let current: { meetingId: number; dir: string } | null = null;
// The panel keeps showing a meeting after Stop — the transcriber is still
// finishing its last chunks then — so remember which one it was.
let lastMeetingId: number | null = null;

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

/** After a server restart, find a recording that is still running so Stop and the
 *  live panel keep working — otherwise the recorder runs on, unreachable. */
function adoptRunningRecording() {
  try {
    for (const name of fs.readdirSync(ROOT)) {
      const dir = path.join(ROOT, name);
      const id = Number(name.split("-")[0]);
      if (!id || fs.existsSync(path.join(dir, "done")) || !alive(recorderPid(dir))) continue;
      current = { meetingId: id, dir };
      lastMeetingId = id;
      console.log(`[record] adopted running recording ${id} → ${dir}`);
      return;
    }
  } catch {}
}

/** A recording's folder on this Mac, by meeting id — null for one made elsewhere. */
function dirFor(meetingId: number): string | null {
  if (current?.meetingId === meetingId) return current.dir;
  try {
    const name = fs.readdirSync(ROOT).find((n) => n.startsWith(`${meetingId}-`));
    return name ? path.join(ROOT, name) : null;
  } catch { return null; }
}

/** The transcriber's local lines — what the app shows. Read from disk, never from Neon. */
function localLines(dir: string, after: number) {
  const file = path.join(dir, "lines.jsonl");
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l))
    .filter((r) => r.seq > after)
    .map((r) => ({ id: r.seq, speaker_name: r.speaker_name, is_host: r.is_host, words: r.words, start_ts: r.start_ts, end_ts: r.end_ts, language: r.language }));
}

// Push, don't poll: when the live recording's lines.jsonl grows, tell the app at once.
let watched: { dir: string; w: fs.FSWatcher } | null = null;
function watchLines(dir: string, broadcast: (resource: string) => void) {
  if (watched?.dir === dir) return;
  watched?.w.close();
  watched = { dir, w: fs.watch(dir, (_ev, name) => { if (name === "lines.jsonl") broadcast("recording"); }) };
}

export function registerRecorderRoutes(app: Express, broadcast: (resource: string) => void = () => {}) {
  adoptRunningRecording();
  if (current) watchLines(current.dir, broadcast);
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
        // meetings.bot_id is UNIQUE — one recorder id per recording, all prefixed mjv-recorder.
        `INSERT INTO meetings (title, meeting_url, bot_id, status, started_at, notes)
         VALUES ($1, 'local://mjv-recorder', $2, 'recording', now(), 'Recorded on Erez''s Mac by My Jarvis Voice')
         RETURNING id`,
        [title, `mjv-recorder-${Date.now()}`],
      );
      const meetingId = Number(row.id);
      const dir = path.join(ROOT, `${meetingId}-${new Date().toISOString().replace(/[:.]/g, "-")}`);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "title"), JSON.stringify(title));

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
      lastMeetingId = meetingId;
      watchLines(dir, broadcast);
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
    if (!current) return res.json({ recording: false, last_meeting_id: lastMeetingId });
    const { meetingId, dir } = current;
    let transcribed = 0;
    try { transcribed = JSON.parse(fs.readFileSync(path.join(dir, "transcribed.json"), "utf8")).length; } catch {}
    res.json({
      recording: alive(recorderPid(dir)), meeting_id: meetingId, dir,
      chunks: lineCount(path.join(dir, "chunks.jsonl")), transcribed, last_meeting_id: lastMeetingId,
    });
  });

  // Every recording made on this Mac, newest first — the app's Recordings page.
  app.get("/api/record/list", async (_req, res) => {
    try {
      const rows = await sql(
        `SELECT m.id, m.title, m.status, m.started_at, m.ended_at, count(t.id)::int AS lines
           FROM meetings m LEFT JOIN meeting_transcript t ON t.meeting_id = m.id
          WHERE m.bot_id LIKE 'mjv-recorder%'
          GROUP BY m.id ORDER BY m.id DESC LIMIT 500`,
      );
      res.json(rows);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Rows the transcriber has written, newer than `after` (a meeting_transcript id).
  // The app polls this while its panel is open; ordering by time is the client's job,
  // because the two tracks land chunk by chunk, not in speaking order.
  app.get("/api/record/transcript", async (req, res) => {
    let meetingId = Number(req.query.meeting_id ?? current?.meetingId ?? lastMeetingId ?? 0);
    const after = Number(req.query.after ?? 0) || 0;
    try {
      // After a server restart nothing is remembered — fall back to the newest recording.
      if (!Number.isFinite(meetingId) || meetingId <= 0) {
        const [latest] = await sql(`SELECT id FROM meetings WHERE bot_id LIKE 'mjv-recorder%' ORDER BY id DESC LIMIT 1`);
        if (!latest) return res.status(404).json({ error: "no recording yet" });
        meetingId = Number(latest.id);
      }
      // A recording made on this Mac is served from its own folder — instant, and immune
      // to Neon. Status comes from the folder too: no `done` file means still recording.
      const dir = dirFor(meetingId);
      const local = dir ? localLines(dir, after) : null;
      if (dir && local) {
        const done = fs.existsSync(path.join(dir, "done"));
        const transcribing = done && !alive(recorderPid(dir)) && lineCount(path.join(dir, "chunks.jsonl")) >
          (() => { try { return JSON.parse(fs.readFileSync(path.join(dir, "transcribed.json"), "utf8")).length; } catch { return 0; } })();
        let title = `Recording ${meetingId}`;
        try { title = JSON.parse(fs.readFileSync(path.join(dir, "title"), "utf8")); } catch {}
        return res.json({ meeting: { id: meetingId, title, status: !done || transcribing ? "recording" : "ended" }, rows: local });
      }
      const [meeting] = await sql(`SELECT id, title, status, started_at, ended_at FROM meetings WHERE id = $1`, [meetingId]);
      if (!meeting) return res.status(404).json({ error: `no meeting ${meetingId}` });
      const rows = await sql(
        `SELECT id, speaker_name, is_host, words, start_ts, end_ts, raw->>'language' AS language
           FROM meeting_transcript WHERE meeting_id = $1 AND id > $2 ORDER BY id LIMIT 1000`,
        [meetingId, after],
      );
      res.json({ meeting, rows });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
}
