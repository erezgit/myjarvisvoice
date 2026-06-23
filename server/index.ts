import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

/**
 * Load OPTIONAL local configuration.
 *
 * My Jarvis Voice runs fully offline with zero required configuration, so this
 * only reads optional overrides (e.g. API_PORT, VOICE_ENGINE_URL) from a local
 * .env if one exists. It never reads from or migrates any machine-wide secrets
 * file, and there are no cloud keys to load.
 *
 * Lookup order (first existing wins):
 *   1. <repo-root>/.env        — dev overrides, resolved relative to this file
 *   2. $DATA_DIR/config.env    — overrides set alongside the app data dir
 */
function loadServerConfig(): void {
  let repoEnvPath = "";
  try {
    const moduleDir = path.dirname(fileURLToPath(import.meta.url));
    repoEnvPath = path.resolve(moduleDir, "..", ".env");
  } catch {
    /* ignore */
  }
  const dataDir = process.env.DATA_DIR;
  const candidates = [repoEnvPath, dataDir ? path.join(dataDir, "config.env") : ""].filter(Boolean);

  for (const envFile of candidates) {
    if (!fs.existsSync(envFile)) continue;
    try {
      const content = fs.readFileSync(envFile, "utf-8");
      let count = 0;
      for (const rawLine of content.split("\n")) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
        if (!match) continue;
        const key = match[1];
        let value = match[2].trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
          count++;
        }
      }
      if (count) console.log(`[config] Loaded ${count} optional override(s) from ${envFile}`);
      return;
    } catch {
      /* ignore — config is optional */
    }
  }
}

loadServerConfig();
import { exec, spawn } from "child_process";
import db, { initSchema } from "./db.js";
import { parseFilters } from "./filters.js";

const app = express();
const PORT = parseInt(process.env.API_PORT || "3001", 10);

// Local Kokoro engine — the offline voice backend. No cloud, no keys.
// Defaults to the bundled sidecar's stable port; override with VOICE_ENGINE_URL.
const VOICE_ENGINE_URL =
  process.env.VOICE_ENGINE_URL || "http://127.0.0.1:8787";

// Synthesize speech via the local Kokoro engine and return WAV bytes.
// The engine accepts Kokoro ids (am_echo…) and OpenAI-style aliases
// (echo/onyx/fable/nova/alloy/shimmer), so existing UI voice ids keep working.
async function synthesizeViaEngine(
  text: string,
  voice: string,
  speed = 1.0,
): Promise<Buffer> {
  const r = await fetch(`${VOICE_ENGINE_URL}/synthesize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice, speed }),
  });
  if (!r.ok) {
    const detail = await r.text().catch(() => "");
    throw new Error(
      `local voice engine ${VOICE_ENGINE_URL} returned ${r.status}: ${detail}`,
    );
  }
  return Buffer.from(await r.arrayBuffer());
}

app.use(cors());
app.use(express.json());

// =====================
// SSE — push data-change notifications to connected browsers
// =====================
const sseClients = new Set<import("express").Response>();

function broadcast(resource: string) {
  const msg = `data: ${JSON.stringify({ resource })}\n\n`;
  for (const client of sseClients) {
    client.write(msg);
  }
}

app.get("/api/events", (_req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write("\n"); // flush headers
  sseClients.add(res);
  _req.on("close", () => sseClients.delete(res));
});

// Initialize database schema
initSchema();

// JSON columns that need parse/stringify
const JSON_COLUMNS: Record<string, string[]> = {
  contacts: [
    "email_jsonb",
    "phone_jsonb",
    "avatar",
    "tags",
    "client_preferences",
  ],
  companies: ["logo", "context_links"],
  members: ["avatar"],
  contact_notes: ["attachments"],
  orders: [],
  tasks: [],
  tags: [],
  kb_pages: [],
  page_content: ["content"],
  automations: [],
  automation_runs: [],
  meetings: ["attendees", "content"],
  meeting_transcript: [],
  meeting_board_items: ["content"],
  qa_entries: ["sources"],
};

// Tables that have summary views
const SUMMARY_VIEWS: Record<string, string> = {
  contacts: "contacts_summary",
  companies: "companies_summary",
  orders: "orders_summary",
};

// The actual writable table (strip _summary suffix)
function writableTable(resource: string): string {
  return resource.endsWith("_summary")
    ? resource.replace("_summary", "")
    : resource;
}

// Valid resources
const VALID_RESOURCES = new Set([
  "contacts",
  "companies",
  "orders",
  "contact_notes",
  "tasks",
  "members",
  "tags",
  "kb_pages",
  "page_content",
  "contacts_summary",
  "companies_summary",
  "orders_summary",
  "automations",
  "automation_runs",
  "meetings",
  "meeting_transcript",
  "meeting_board_items",
  "qa_entries",
]);

function validateResource(resource: string): boolean {
  return VALID_RESOURCES.has(resource);
}

// Parse a row from SQLite, deserializing JSON columns
function parseRow(resource: string, row: any): any {
  if (!row) return row;
  const base = writableTable(resource);
  const jsonCols = JSON_COLUMNS[base] || [];
  const parsed = { ...row };
  for (const col of jsonCols) {
    if (parsed[col] && typeof parsed[col] === "string") {
      try {
        parsed[col] = JSON.parse(parsed[col]);
      } catch {
        // leave as string if parse fails
      }
    }
  }
  // Convert SQLite integer booleans to JS booleans
  if ("has_newsletter" in parsed)
    parsed.has_newsletter = Boolean(parsed.has_newsletter);
  if ("administrator" in parsed)
    parsed.administrator = Boolean(parsed.administrator);
  if ("disabled" in parsed) parsed.disabled = Boolean(parsed.disabled);
  return parsed;
}

// Serialize data for SQLite, stringifying JSON columns
function serializeData(
  resource: string,
  data: Record<string, any>
): Record<string, any> {
  const base = writableTable(resource);
  const jsonCols = JSON_COLUMNS[base] || [];
  const serialized = { ...data };

  // Remove id from data (it's auto-generated or used in WHERE)
  delete serialized.id;

  for (const col of jsonCols) {
    if (col in serialized && typeof serialized[col] !== "string") {
      serialized[col] = JSON.stringify(serialized[col]);
    }
  }

  // Convert booleans to integers for SQLite
  if ("has_newsletter" in serialized)
    serialized.has_newsletter = serialized.has_newsletter ? 1 : 0;
  if ("administrator" in serialized)
    serialized.administrator = serialized.administrator ? 1 : 0;
  if ("disabled" in serialized)
    serialized.disabled = serialized.disabled ? 1 : 0;

  return serialized;
}

// =====================
// Voice Pal — generate voice, save, play
// =====================

// Create voice_messages table if not exists
db.exec(`CREATE TABLE IF NOT EXISTS voice_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message TEXT NOT NULL,
  voice TEXT DEFAULT 'nova',
  audio_path TEXT,
  duration_ms INTEGER,
  liked INTEGER DEFAULT 0,
  agent TEXT DEFAULT NULL,
  created_at TEXT DEFAULT (datetime('now'))
)`);

// Add liked column if missing (migration for existing DBs)
try { db.exec(`ALTER TABLE voice_messages ADD COLUMN liked INTEGER DEFAULT 0`); } catch {};
// Add agent column if missing (migration for existing DBs)
try { db.exec(`ALTER TABLE voice_messages ADD COLUMN agent TEXT DEFAULT NULL`); } catch {};

// ── Native audio playback ──────────────────────────────────────────────────
// A desktop voice assistant must SPEAK on its own. Playing in the WebView is
// unreliable: WebKit blocks programmatic audio.play() until the page has seen a
// real user gesture in the session, so assistant-initiated messages arrive
// silently until the user clicks. Instead we play the synthesized WAV through
// the OS audio output, server-side — deterministic and gesture-independent.
// Playback is serialized so consecutive messages don't talk over each other.
let playbackChain: Promise<void> = Promise.resolve();
function playAudioFile(filepath: string): void {
  playbackChain = playbackChain
    .then(
      () =>
        new Promise<void>((resolve) => {
          let cmd: string;
          if (process.platform === "darwin") cmd = "afplay";
          else if (process.platform === "linux") cmd = "aplay";
          else return resolve(); // unsupported platform — skip native playback
          const proc = spawn(cmd, [filepath], { stdio: "ignore" });
          proc.on("error", () => resolve()); // player missing — keep the chain alive
          proc.on("exit", () => resolve());
        }),
    )
    .catch(() => {});
}

app.post("/api/voice", async (req, res) => {
  const { message, voice = "am_echo", agent = null, speed = 1.0 } = req.body;
  if (!message) return res.status(400).json({ error: "message required" });

  try {
    // Synthesize locally via the bundled Kokoro engine (offline, no keys).
    const audioDir = path.join(process.env.DATA_DIR || path.join(os.homedir(), "Library", "Application Support", "My Jarvis"), "voice");
    fs.mkdirSync(audioDir, { recursive: true });
    const filename = `voice_${Date.now()}.wav`;
    const filepath = path.join(audioDir, filename);

    const buffer = await synthesizeViaEngine(message, voice, speed);
    fs.writeFileSync(filepath, buffer);

    // Save to DB
    const stmt = db.prepare("INSERT INTO voice_messages (message, voice, audio_path, agent) VALUES (?, ?, ?, ?)");
    const result = stmt.run(message, voice, `/voice/${filename}`, agent);

    // Speak immediately through the Mac's audio output. This is the automatic
    // playback — gesture-independent, unlike the WebView. The broadcast below
    // just refreshes the feed UI; the in-app player is for manual replay.
    playAudioFile(filepath);

    // Broadcast to UI so the new message appears in the feed.
    broadcast("voice_messages");

    res.json({ id: result.lastInsertRowid, message, voice, agent, audio_path: `/voice/${filename}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Voice preview — short clip via the local Kokoro engine.
// Endpoint name kept for UI compatibility; the "xai"/OpenAI voice ids are
// mapped to Kokoro voices by the engine's alias table.
app.post("/api/voice-preview-xai", async (req, res) => {
  const { text, voice = "echo", speed = 1.0 } = req.body;
  if (!text) return res.status(400).json({ error: "text required" });

  // Map legacy live-agent voice names to Kokoro voices.
  const voiceMap: Record<string, string> = {
    Rex: "am_echo",
    Leo: "am_onyx",
    Sal: "am_echo",
    Ara: "af_nova",
    Eve: "af_nova",
  };
  const kokoroVoice = voiceMap[voice] || voice;

  try {
    const buffer = await synthesizeViaEngine(text, kokoroVoice, speed);
    res.set({ "Content-Type": "audio/wav", "Content-Length": buffer.length.toString() });
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Serve voice audio files
app.use("/voice", express.static(path.join(process.env.DATA_DIR || path.join(os.homedir(), "Library", "Application Support", "My Jarvis"), "voice")));

// GET voice messages (optionally filtered by agent)
app.get("/api/voice_messages", (req, res) => {
  const { agent } = req.query;
  if (agent) {
    const rows = db.prepare("SELECT * FROM voice_messages WHERE agent = ? ORDER BY created_at DESC").all(agent);
    res.json(rows);
  } else {
    const rows = db.prepare("SELECT * FROM voice_messages ORDER BY created_at DESC").all();
    res.json(rows);
  }
});

// =====================
// Local voice engine proxy — lets the UI manage the model download and
// check readiness over same-origin, without knowing the engine's port.
// =====================
app.get("/api/voice-engine/health", async (_req, res) => {
  try {
    const r = await fetch(`${VOICE_ENGINE_URL}/health`);
    res.status(r.status).json(await r.json());
  } catch (err: any) {
    res.status(503).json({ status: "unreachable", model_ready: false, error: err.message });
  }
});

app.post("/api/voice-engine/download", async (_req, res) => {
  try {
    const r = await fetch(`${VOICE_ENGINE_URL}/download-model`, { method: "POST" });
    res.status(r.status).json(await r.json());
  } catch (err: any) {
    res.status(503).json({ started: false, error: err.message });
  }
});

app.get("/api/voice-engine/progress", async (_req, res) => {
  try {
    const r = await fetch(`${VOICE_ENGINE_URL}/download-progress`);
    res.status(r.status).json(await r.json());
  } catch (err: any) {
    res.status(503).json({ downloading: false, done: false, error: err.message });
  }
});

// PATCH toggle like on a voice message
app.patch("/api/voice_messages/:id/like", (req, res) => {
  const { id } = req.params;
  const row = db.prepare("SELECT liked FROM voice_messages WHERE id = ?").get(id) as any;
  if (!row) return res.status(404).json({ error: "not found" });
  const newLiked = row.liked ? 0 : 1;
  db.prepare("UPDATE voice_messages SET liked = ? WHERE id = ?").run(newLiked, id);
  broadcast("voice_messages");
  res.json({ id: Number(id), liked: newLiked });
});

// =====================
// PayPal / paywall routes removed — My Jarvis Voice is free and offline.
// (The original cloud app gated usage behind a PayPal checkout; the
// open-source build has no paywall and no payment credentials.)
// =====================

// =====================
// Fixed routes (must be before :resource wildcard)
// =====================

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// POST /api/custom/signup
app.post("/api/custom/signup", (req, res) => {
  try {
    const { email, password, first_name, last_name } = req.body;

    const result = db
      .prepare(
        `INSERT INTO members (email, password, first_name, last_name, role, administrator)
         VALUES (?, ?, ?, ?, 'admin', 1)`
      )
      .run(email, password, first_name, last_name);

    res.json({
      id: result.lastInsertRowid.toString(),
      email,
      password,
    });
  } catch (err: any) {
    console.error("POST /api/custom/signup error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/custom/is-initialized
app.get("/api/custom/is-initialized", (_req, res) => {
  try {
    const row = db
      .prepare("SELECT COUNT(*) as count FROM members")
      .get() as { count: number };
    res.json({ initialized: row.count > 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/custom/members-create
app.post("/api/custom/members-create", (req, res) => {
  try {
    const data = serializeData("members", req.body);
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => "?").join(", ");

    const result = db
      .prepare(
        `INSERT INTO members (${columns.join(", ")}) VALUES (${placeholders})`
      )
      .run(...values);

    const row = db
      .prepare("SELECT * FROM members WHERE id = ?")
      .get(result.lastInsertRowid);
    res.json(parseRow("members", row));
  } catch (err: any) {
    console.error("POST /api/custom/members-create error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/custom/members-update/:id
app.patch("/api/custom/members-update/:id", (req, res) => {
  try {
    const { id } = req.params;
    const data = serializeData("members", req.body);
    const columns = Object.keys(data);
    const values = Object.values(data);

    if (columns.length > 0) {
      const sets = columns.map((col) => `${col} = ?`).join(", ");
      db.prepare(`UPDATE members SET ${sets} WHERE id = ?`).run(...values, id);
    }

    const row = db.prepare("SELECT * FROM members WHERE id = ?").get(id);
    if (!row) {
      return res.status(404).json({ error: "Not found" });
    }
    res.json(parseRow("members", row));
  } catch (err: any) {
    console.error("PATCH /api/custom/members-update error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/custom/update-password/:id
app.patch("/api/custom/update-password/:id", (_req, res) => {
  try {
    // In single-user SQLite mode, password update is a no-op (no real auth)
    res.json(true);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/custom/merge-contacts
app.post("/api/custom/merge-contacts", (req, res) => {
  try {
    const { sourceId, targetId } = req.body;

    // Run merge in a transaction
    const merge = db.transaction(() => {
      const winner = db
        .prepare("SELECT * FROM contacts WHERE id = ?")
        .get(targetId) as any;
      const loser = db
        .prepare("SELECT * FROM contacts WHERE id = ?")
        .get(sourceId) as any;

      if (!winner || !loser) {
        throw new Error("Contact not found");
      }

      // Reassign tasks, notes, orders
      db.prepare("UPDATE tasks SET contact_id = ? WHERE contact_id = ?").run(targetId, sourceId);
      db.prepare("UPDATE contact_notes SET contact_id = ? WHERE contact_id = ?").run(targetId, sourceId);
      db.prepare("UPDATE orders SET contact_id = ? WHERE contact_id = ?").run(targetId, sourceId);

      // Merge JSON arrays
      const parse = (s: string) => { try { return JSON.parse(s || "[]"); } catch { return []; } };
      const mergedEmails = mergeArraysByKey(parse(winner.email_jsonb), parse(loser.email_jsonb), "email");
      const mergedPhones = mergeArraysByKey(parse(winner.phone_jsonb), parse(loser.phone_jsonb), "phone");
      const mergedTags = [...new Set([...parse(winner.tags), ...parse(loser.tags)])];

      db.prepare(
        `UPDATE contacts SET
          email_jsonb = ?, phone_jsonb = ?, tags = ?,
          avatar = COALESCE(?, avatar),
          gender = COALESCE(gender, ?),
          company_id = COALESCE(company_id, ?),
          company_name = COALESCE(company_name, ?),
          linkedin_url = COALESCE(linkedin_url, ?),
          background = COALESCE(background, ?)
        WHERE id = ?`
      ).run(
        JSON.stringify(mergedEmails), JSON.stringify(mergedPhones), JSON.stringify(mergedTags),
        loser.avatar, loser.gender, loser.company_id, loser.company_name,
        loser.linkedin_url, loser.background, targetId
      );

      db.prepare("DELETE FROM contacts WHERE id = ?").run(sourceId);
    });

    merge();
    res.json({ success: true });
  } catch (err: any) {
    console.error("POST /api/custom/merge-contacts error:", err);
    res.status(500).json({ error: err.message });
  }
});

// =====================
// KB Pages Endpoints
// =====================

// GET /api/kb_pages — list all, ordered by sort_order
app.get("/api/kb_pages", (_req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM kb_pages ORDER BY sort_order ASC").all();
    const total = (rows as any[]).length;
    res.set("Content-Range", `kb_pages 0-${Math.max(total - 1, 0)}/${total}`);
    res.set("Access-Control-Expose-Headers", "Content-Range");
    res.json(rows);
  } catch (err: any) {
    console.error("GET /api/kb_pages error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/kb_pages/:id — get one by id
app.get("/api/kb_pages/:id", (req, res) => {
  try {
    const { id } = req.params;
    const row = db.prepare("SELECT * FROM kb_pages WHERE id = ?").get(id);
    if (!row) {
      return res.status(404).json({ error: "Not found" });
    }
    res.json(row);
  } catch (err: any) {
    console.error("GET /api/kb_pages/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/kb_pages — create new
app.post("/api/kb_pages", (req, res) => {
  try {
    const { slug, title, icon, sort_order } = req.body;
    const result = db
      .prepare(
        "INSERT INTO kb_pages (slug, title, icon, sort_order) VALUES (?, ?, ?, ?)"
      )
      .run(slug, title, icon ?? "FileText", sort_order ?? 0);
    const row = db.prepare("SELECT * FROM kb_pages WHERE id = ?").get(result.lastInsertRowid);
    broadcast("kb_pages");
    res.status(201).json(row);
  } catch (err: any) {
    console.error("POST /api/kb_pages error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/kb_pages/:id — update
app.put("/api/kb_pages/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { slug, title, icon, sort_order } = req.body;

    const existing = db.prepare("SELECT * FROM kb_pages WHERE id = ?").get(id);
    if (!existing) {
      return res.status(404).json({ error: "Not found" });
    }

    db.prepare(
      `UPDATE kb_pages SET
        slug = COALESCE(?, slug),
        title = COALESCE(?, title),
        icon = COALESCE(?, icon),
        sort_order = COALESCE(?, sort_order),
        updated_at = datetime('now')
      WHERE id = ?`
    ).run(slug ?? null, title ?? null, icon ?? null, sort_order ?? null, id);

    const row = db.prepare("SELECT * FROM kb_pages WHERE id = ?").get(id);
    broadcast("kb_pages");
    res.json(row);
  } catch (err: any) {
    console.error("PUT /api/kb_pages/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/kb_pages/:id — delete
app.delete("/api/kb_pages/:id", (req, res) => {
  try {
    const { id } = req.params;
    const row = db.prepare("SELECT * FROM kb_pages WHERE id = ?").get(id);
    if (!row) {
      return res.status(404).json({ error: "Not found" });
    }
    db.prepare("DELETE FROM kb_pages WHERE id = ?").run(id);
    broadcast("kb_pages");
    res.json(row);
  } catch (err: any) {
    console.error("DELETE /api/kb_pages/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

// =====================
// File System Endpoints — native file browser
// =====================

const JARVIS_DIR = path.join(os.homedir(), "Documents", "My Jarvis");

// Ensure default folders exist
function ensureJarvisDir() {
  const subfolders = ["Knowledge Base", "Briefs", "Research", "Exports"];
  fs.mkdirSync(JARVIS_DIR, { recursive: true });
  for (const sub of subfolders) {
    fs.mkdirSync(path.join(JARVIS_DIR, sub), { recursive: true });
  }
}
ensureJarvisDir();

// Security: prevent traversal attacks — must be under home dir
function isPathAllowed(p: string): boolean {
  const resolved = path.resolve(p);
  const home = os.homedir();
  return resolved.startsWith(home);
}

// GET /api/files/list?path=... — list directory contents
app.get("/api/files/list", (req, res) => {
  try {
    const dirPath = (req.query.path as string) || JARVIS_DIR;
    if (!isPathAllowed(dirPath)) {
      return res.status(403).json({ error: "Access denied" });
    }
    if (!fs.existsSync(dirPath)) {
      return res.status(404).json({ error: "Directory not found" });
    }

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const items = entries
      .filter((e) => !e.name.startsWith(".")) // hide dotfiles
      .map((entry) => {
        const fullPath = path.join(dirPath, entry.name);
        try {
          const stat = fs.statSync(fullPath);
          return {
            name: entry.name,
            path: fullPath,
            isDirectory: entry.isDirectory(),
            size: stat.size,
            modified: stat.mtime.toISOString(),
            extension: entry.isDirectory()
              ? null
              : path.extname(entry.name).toLowerCase().slice(1) || null,
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      // Sort: folders first, then alphabetical
      .sort((a: any, b: any) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

    res.json({
      path: dirPath,
      parent: path.dirname(dirPath),
      isHome: dirPath === os.homedir(),
      isJarvisDir: dirPath === JARVIS_DIR,
      items,
    });
  } catch (err: any) {
    console.error("GET /api/files/list error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/files/open — open file with default Mac app
app.post("/api/files/open", (req, res) => {
  try {
    const { filePath } = req.body;
    if (!filePath || !isPathAllowed(filePath)) {
      return res.status(403).json({ error: "Access denied" });
    }
    exec(`open "${filePath}"`, (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true });
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/files/reveal — reveal in Finder
app.post("/api/files/reveal", (req, res) => {
  try {
    const { filePath } = req.body;
    if (!filePath || !isPathAllowed(filePath)) {
      return res.status(403).json({ error: "Access denied" });
    }
    exec(`open -R "${filePath}"`, (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true });
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/files/home — get home directory + jarvis dir paths
app.get("/api/files/home", (_req, res) => {
  res.json({
    home: os.homedir(),
    jarvisDir: JARVIS_DIR,
    desktop: path.join(os.homedir(), "Desktop"),
    documents: path.join(os.homedir(), "Documents"),
    downloads: path.join(os.homedir(), "Downloads"),
  });
});


// =====================
// Generic CRUD Endpoints (wildcard :resource — MUST come after fixed routes)
// =====================

// GET /api/:resource - getList
app.get("/api/:resource", (req, res) => {
  try {
    const { resource } = req.params;
    if (!validateResource(resource)) {
      return res.status(400).json({ error: `Invalid resource: ${resource}` });
    }

    // Parse query params
    const sort = req.query.sort
      ? JSON.parse(req.query.sort as string)
      : ["id", "ASC"];
    const range = req.query.range
      ? JSON.parse(req.query.range as string)
      : [0, 24];
    const filter = req.query.filter
      ? JSON.parse(req.query.filter as string)
      : {};

    // Use summary view for list operations
    const table = SUMMARY_VIEWS[resource] || resource;
    const [sortField, sortOrder] = sort;
    const [rangeStart, rangeEnd] = range;
    const limit = rangeEnd - rangeStart + 1;
    const offset = rangeStart;

    // Parse filters
    const { where, params } = parseFilters(filter);

    // Sanitize sort field (basic protection)
    const safeSortField = sortField.replace(/[^a-zA-Z0-9_]/g, "");
    const safeSortOrder = sortOrder === "DESC" ? "DESC" : "ASC";

    // Get total count
    const countResult = db
      .prepare(`SELECT COUNT(*) as total FROM ${table} WHERE ${where}`)
      .get(...params) as { total: number };

    // Get paginated data
    const rows = db
      .prepare(
        `SELECT * FROM ${table} WHERE ${where} ORDER BY ${safeSortField} ${safeSortOrder} LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset) as any[];

    const data = rows.map((row) => parseRow(resource, row));

    // Set headers for ra-data-simple-rest
    res.set(
      "Content-Range",
      `${resource} ${rangeStart}-${Math.min(rangeEnd, countResult.total - 1)}/${countResult.total}`
    );
    res.set("Access-Control-Expose-Headers", "Content-Range");
    res.json(data);
  } catch (err: any) {
    console.error("GET /api/:resource error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/:resource/:id - getOne
app.get("/api/:resource/:id", (req, res) => {
  try {
    const { resource, id } = req.params;
    if (!validateResource(resource)) {
      return res.status(400).json({ error: `Invalid resource: ${resource}` });
    }

    // Use summary view for getOne too
    const table = SUMMARY_VIEWS[resource] || resource;

    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
    if (!row) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json(parseRow(resource, row));
  } catch (err: any) {
    console.error("GET /api/:resource/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/:resource - create
app.post("/api/:resource", (req, res) => {
  try {
    const { resource } = req.params;
    if (!validateResource(resource)) {
      return res.status(400).json({ error: `Invalid resource: ${resource}` });
    }

    const table = writableTable(resource);
    const explicitId = req.body.id; // Capture before serializeData strips it
    const data = serializeData(resource, req.body);
    const columns = Object.keys(data);
    const values = Object.values(data);

    if (columns.length === 0) {
      // Insert with defaults
      const result = db.prepare(`INSERT INTO ${table} DEFAULT VALUES`).run();
      const row = db
        .prepare(`SELECT * FROM ${table} WHERE id = ?`)
        .get(result.lastInsertRowid);
      return res.status(201).json(parseRow(resource, row));
    }

    // If caller provided an explicit id (e.g. TEXT PK like automation_runs), include it in INSERT
    if (explicitId !== undefined && !columns.includes("id")) {
      columns.unshift("id");
      values.unshift(explicitId);
    }

    const placeholders = columns.map(() => "?").join(", ");
    const result = db
      .prepare(
        `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`
      )
      .run(...values);

    // Use explicit id if provided, otherwise lastInsertRowid
    const lookupId = explicitId ?? result.lastInsertRowid;
    const row = db
      .prepare(`SELECT * FROM ${table} WHERE id = ?`)
      .get(lookupId);
    broadcast(resource);
    res.status(201).json(parseRow(resource, row));
  } catch (err: any) {
    console.error("POST /api/:resource error:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/:resource/:id - update
app.put("/api/:resource/:id", (req, res) => {
  try {
    const { resource, id } = req.params;
    if (!validateResource(resource)) {
      return res.status(400).json({ error: `Invalid resource: ${resource}` });
    }

    const table = writableTable(resource);
    const data = serializeData(resource, req.body);
    const columns = Object.keys(data);
    const values = Object.values(data);

    if (columns.length === 0) {
      const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
      return res.json(parseRow(resource, row));
    }

    const sets = columns.map((col) => `${col} = ?`).join(", ");
    db.prepare(`UPDATE ${table} SET ${sets} WHERE id = ?`).run(...values, id);

    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
    if (!row) {
      return res.status(404).json({ error: "Not found" });
    }
    broadcast(resource);
    res.json(parseRow(resource, row));
  } catch (err: any) {
    console.error("PUT /api/:resource/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/:resource/:id - delete
app.delete("/api/:resource/:id", (req, res) => {
  try {
    const { resource, id } = req.params;
    if (!validateResource(resource)) {
      return res.status(400).json({ error: `Invalid resource: ${resource}` });
    }

    const table = writableTable(resource);

    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
    if (!row) {
      return res.status(404).json({ error: "Not found" });
    }

    db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
    broadcast(resource);
    res.json(parseRow(resource, row));
  } catch (err: any) {
    console.error("DELETE /api/:resource/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Bulk update: PUT /api/:resource (updateMany)
app.put("/api/:resource", (req, res) => {
  try {
    const { resource } = req.params;
    if (!validateResource(resource)) {
      return res.status(400).json({ error: `Invalid resource: ${resource}` });
    }

    const table = writableTable(resource);
    const { ids, data } = req.body;

    if (!Array.isArray(ids) || !data) {
      return res.status(400).json({ error: "ids and data required" });
    }

    const serialized = serializeData(resource, data);
    const columns = Object.keys(serialized);
    const values = Object.values(serialized);

    if (columns.length > 0) {
      const sets = columns.map((col) => `${col} = ?`).join(", ");
      const placeholders = ids.map(() => "?").join(",");
      db.prepare(
        `UPDATE ${table} SET ${sets} WHERE id IN (${placeholders})`
      ).run(...values, ...ids);
    }

    res.json(ids);
  } catch (err: any) {
    console.error("PUT /api/:resource (bulk) error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Bulk delete: DELETE /api/:resource (deleteMany)
app.delete("/api/:resource", (req, res) => {
  try {
    const { resource } = req.params;
    if (!validateResource(resource)) {
      return res.status(400).json({ error: `Invalid resource: ${resource}` });
    }

    const table = writableTable(resource);
    const ids = req.query.ids
      ? JSON.parse(req.query.ids as string)
      : req.body?.ids;

    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: "ids required" });
    }

    const placeholders = ids.map(() => "?").join(",");
    db.prepare(`DELETE FROM ${table} WHERE id IN (${placeholders})`).run(
      ...ids
    );

    res.json(ids);
  } catch (err: any) {
    console.error("DELETE /api/:resource (bulk) error:", err);
    res.status(500).json({ error: err.message });
  }
});

function mergeArraysByKey(arr1: any[], arr2: any[], key: string): any[] {
  const map = new Map();
  for (const item of arr1) {
    if (item[key]) map.set(item[key], item);
  }
  for (const item of arr2) {
    if (item[key] && !map.has(item[key])) map.set(item[key], item);
  }
  return Array.from(map.values());
}

// Seed a small demo feed on first run so the home feed isn't empty offline.
// Audio is synthesized best-effort via the local Kokoro engine; if the model
// isn't downloaded yet, rows are inserted as text cards and gain audio the
// next time they're (re)generated.
async function seedVoiceFeed(): Promise<void> {
  const count = (db.prepare("SELECT COUNT(*) AS n FROM voice_messages").get() as any).n;
  if (count > 0) return;
  const demo = [
    { message: "Welcome to My Jarvis Voice — a fully local, open-source voice app. Everything you hear is synthesized on this machine with Kokoro. No cloud, no keys.", voice: "am_echo", agent: "jarvis" },
    { message: "Atlas here. Send any text to the local API and I will speak it through your Mac's speakers.", voice: "am_onyx", agent: "atlas" },
    { message: "Nova reporting. Pick an agent in Settings to change my voice. Echo, Onyx, Fable, and Nova are all available offline.", voice: "af_nova", agent: "nova" },
    { message: "This is Ben. The model files download once, about three hundred fifty megabytes, then voice works forever without a connection.", voice: "bm_fable", agent: "ben" },
  ];
  const audioDir = path.join(process.env.DATA_DIR || path.join(os.homedir(), "Library", "Application Support", "My Jarvis"), "voice");
  fs.mkdirSync(audioDir, { recursive: true });
  const stmt = db.prepare("INSERT INTO voice_messages (message, voice, audio_path, agent) VALUES (?, ?, ?, ?)");
  for (const d of demo) {
    let audioPath: string | null = null;
    try {
      const buf = await synthesizeViaEngine(d.message, d.voice);
      const filename = `seed_${d.agent}_${Date.now()}.wav`;
      fs.writeFileSync(path.join(audioDir, filename), buf);
      audioPath = `/voice/${filename}`;
    } catch {
      // engine/model not ready yet — seed as text card.
    }
    stmt.run(d.message, d.voice, audioPath, d.agent);
  }
  console.log(`[seed] inserted ${demo.length} demo voice messages`);
}

app.listen(PORT, () => {
  console.log(`SQLite API server running on http://localhost:${PORT}`);
  console.log(`Database: ${process.env.DATA_DIR || "data"}/crm.db`);
  console.log(`Local voice engine: ${VOICE_ENGINE_URL}`);
  // Best-effort, slightly delayed so the engine has a moment to come up.
  setTimeout(() => { seedVoiceFeed().catch((e) => console.warn("[seed] failed:", e.message)); }, 1500);
});
