// transcriber — follows a meeting-recorder directory and writes each chunk's text to Neon.
//
//   node recorder/transcriber.mjs <recording-dir> <meeting-id>
//
// Reads <dir>/chunks.jsonl as it grows, sends each chunk to the local whisper-server
// (language auto-detected PER CHUNK, so Hebrew and English switch by themselves), checks
// the text agrees with the language it claims, and inserts one meeting_transcript row per
// chunk. When <dir>/done exists and every chunk is written, marks the meeting ended.
//
// ⛔ A 200 is not a correct result: whisper can return Hebrew speech as fluent English
// nonsense. Every result is checked by counting Hebrew letters and redone in the other
// language if they disagree. Whisper also loops on silence — near-silent chunks are
// skipped (and logged), and a repeated line is collapsed and marked, never deleted.
//
// Zero dependencies: Neon's HTTP SQL endpoint over fetch.

import fs from "fs";
import os from "os";
import path from "path";

const [dir, meetingIdArg] = process.argv.slice(2);
if (!dir || !meetingIdArg) {
  console.error("usage: transcriber.mjs <recording-dir> <meeting-id>");
  process.exit(2);
}
const meetingId = Number(meetingIdArg);
const WHISPER = process.env.WHISPER_URL || "http://127.0.0.1:8178";
const SILENCE_RMS = 0.003;
const SPEAKER = { mic: "Erez", system: "Others" };

const dbFile = path.join(os.homedir(), "Workspace/jarvis/integrations/erez-database-url");
const dbUrl = (fs.readFileSync(dbFile, "utf8").match(/^DATABASE_URL=(.*)$/m) || [])[1];
if (!dbUrl) {
  console.error(`transcriber: no DATABASE_URL in ${dbFile} — FAILING CLOSED`);
  process.exit(1);
}

const log = (s) => console.error(`[transcriber ${new Date().toISOString().slice(11, 19)}] ${s}`);

async function sql(query, params = []) {
  const r = await fetch(`https://${new URL(dbUrl).hostname}/sql`, {
    method: "POST",
    headers: { "Neon-Connection-String": dbUrl, "Content-Type": "application/json" },
    body: JSON.stringify({ query, params }),
  });
  const body = await r.text();
  if (!r.ok) throw new Error(`neon ${r.status}: ${body.slice(0, 300)}`);
  return JSON.parse(body).rows;
}

const HEBREW = /[֐-׿]/g;
const LETTER = /\p{L}/gu;
function hebrewShare(text) {
  const letters = (text.match(LETTER) || []).length;
  return letters ? (text.match(HEBREW) || []).length / letters : 0;
}

/** Collapse a line repeated 3+ times in a row into one, marked. */
function collapseLoops(segments) {
  const out = [];
  for (const s of segments) {
    const prev = out[out.length - 1];
    if (prev && prev.text === s.text) { prev.repeat = (prev.repeat || 1) + 1; prev.end = s.end; continue; }
    out.push({ ...s });
  }
  return out.map((s) => (s.repeat >= 3 ? { ...s, text: `${s.text} [whisper repeated this ×${s.repeat} — likely silence]` } : s));
}

async function whisper(file, language) {
  const form = new FormData();
  form.append("file", new Blob([fs.readFileSync(file)]), path.basename(file));
  form.append("response_format", "verbose_json");
  form.append("temperature", "0");
  form.append("language", language);
  const r = await fetch(`${WHISPER}/inference`, { method: "POST", body: form });
  if (!r.ok) throw new Error(`whisper ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

const LANG_CODE = { hebrew: "he", english: "en" };

async function transcribe(file) {
  const first = await whisper(file, "auto");
  let lang = LANG_CODE[first.language] || first.language;
  let result = first;
  let redone = false;
  const share = hebrewShare(first.text || "");
  // The content must agree with the language whisper claims.
  if (lang === "en" && share > 0.3) { result = await whisper(file, "he"); lang = "he"; redone = true; }
  else if (lang === "he" && (first.text || "").trim() && share < 0.3) { result = await whisper(file, "en"); lang = "en"; redone = true; }
  else if (lang !== "he" && lang !== "en") { result = await whisper(file, "en"); lang = "en"; redone = true; }
  const segments = collapseLoops(
    (result.segments || []).map((s) => ({ start: s.start, end: s.end, text: (s.text || "").trim() })).filter((s) => s.text),
  );
  return { lang, redone, detected: first.language, prob: first.detected_language_probability, segments };
}

// ── main loop ──
const journal = path.join(dir, "chunks.jsonl");
const doneFile = path.join(dir, "done");
const progressFile = path.join(dir, "transcribed.json");
const seen = new Set(fs.existsSync(progressFile) ? JSON.parse(fs.readFileSync(progressFile, "utf8")) : []);

async function processChunk(c) {
  const file = path.join(dir, c.file);
  if (c.rms < SILENCE_RMS) { log(`${c.file} silent (rms ${c.rms.toFixed(4)}) — skipped`); return; }
  const t0 = Date.now();
  const r = await transcribe(file);
  const words = r.segments.map((s) => s.text).join(" ").trim();
  if (!words) { log(`${c.file} no speech`); return; }
  await sql(
    `INSERT INTO meeting_transcript (meeting_id, bot_id, speaker_name, speaker_id, is_host, words, start_ts, end_ts, event_type, raw)
     VALUES ($1, 'mjv-recorder', $2, $3, $4, $5, $6, $7, 'transcript.data', $8)`,
    [meetingId, SPEAKER[c.track] || c.track, c.track, c.track === "mic", words,
     c.start_s, c.start_s + c.dur_s,
     JSON.stringify({ language: r.lang, detected: r.detected, detected_prob: r.prob, redone: r.redone,
                      chunk: c.file, segments: r.segments, source: "mjv-recorder" })],
  );
  log(`${c.file} ${r.lang}${r.redone ? " (redone)" : ""} ${((Date.now() - t0) / 1000).toFixed(1)}s → ${words.slice(0, 80)}`);
}

let failures = 0;
for (;;) {
  const lines = fs.existsSync(journal) ? fs.readFileSync(journal, "utf8").split("\n").filter(Boolean) : [];
  for (const line of lines) {
    const c = JSON.parse(line);
    if (seen.has(c.file)) continue;
    try {
      await processChunk(c);
      seen.add(c.file);
      fs.writeFileSync(progressFile, JSON.stringify([...seen]));
      failures = 0;
    } catch (e) {
      failures++;
      log(`${c.file} FAILED (${failures}): ${e.message}`);
      await new Promise((r) => setTimeout(r, Math.min(30000, 2000 * failures)));
      break; // retry from the top, in order
    }
  }
  const allDone = fs.existsSync(doneFile) && lines.every((l) => seen.has(JSON.parse(l).file));
  if (allDone) {
    await sql(`UPDATE meetings SET status = 'ended', ended_at = now() WHERE id = $1`, [meetingId]);
    log(`meeting ${meetingId} ended — ${seen.size} chunks`);
    process.exit(0);
  }
  await new Promise((r) => setTimeout(r, 1000));
}
