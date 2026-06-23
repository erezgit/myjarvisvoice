import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "crm.db");

// Ensure data directory exists
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);

// Production PRAGMAs
db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");
db.pragma("busy_timeout = 5000");
db.pragma("foreign_keys = ON");
db.pragma("cache_size = -64000"); // 64MB

export function initSchema() {
  db.exec(`
    -- Members (team/staff)
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT UNIQUE DEFAULT (lower(hex(randomblob(16)))),
      email TEXT UNIQUE NOT NULL,
      password TEXT,
      first_name TEXT NOT NULL DEFAULT '',
      last_name TEXT NOT NULL DEFAULT '',
      avatar TEXT, -- JSON: { src, title, path }
      role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('admin', 'manager', 'member')),
      administrator INTEGER NOT NULL DEFAULT 0,
      disabled INTEGER NOT NULL DEFAULT 0
    );

    -- Tags
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#ccc'
    );

    -- Companies
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL DEFAULT '',
      logo TEXT, -- JSON: { src, title, path }
      sector TEXT DEFAULT '',
      size INTEGER DEFAULT 1,
      linkedin_url TEXT DEFAULT '',
      website TEXT DEFAULT '',
      phone_number TEXT DEFAULT '',
      address TEXT DEFAULT '',
      zipcode TEXT DEFAULT '',
      city TEXT DEFAULT '',
      state_abbr TEXT DEFAULT '',
      country TEXT DEFAULT '',
      description TEXT DEFAULT '',
      revenue TEXT DEFAULT '',
      tax_identifier TEXT DEFAULT '',
      context_links TEXT, -- JSON array
      nb_contacts INTEGER DEFAULT 0,
      member_id INTEGER REFERENCES members(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Contacts
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL DEFAULT '',
      last_name TEXT NOT NULL DEFAULT '',
      title TEXT DEFAULT '',
      company_id INTEGER REFERENCES companies(id),
      company_name TEXT DEFAULT '',
      email_jsonb TEXT DEFAULT '[]', -- JSON array of { email, type }
      phone_jsonb TEXT DEFAULT '[]', -- JSON array of { phone, type }
      avatar TEXT, -- JSON: { src, title }
      gender TEXT DEFAULT '',
      background TEXT DEFAULT '',
      linkedin_url TEXT,
      tags TEXT DEFAULT '[]', -- JSON array of tag IDs
      first_seen TEXT DEFAULT (datetime('now')),
      last_seen TEXT DEFAULT (datetime('now')),
      last_contact_at TEXT,
      has_newsletter INTEGER DEFAULT 0,
      nb_tasks INTEGER DEFAULT 0,
      lifecycle_stage TEXT DEFAULT 'new_lead',
      status TEXT DEFAULT '',
      lead_source TEXT,
      activity_status TEXT DEFAULT 'none',
      qualification_status TEXT DEFAULT 'select',
      readiness_to_book TEXT,
      lost_reason TEXT,
      lead_bio TEXT,
      followup_prompt TEXT,
      followup_date TEXT,
      date_of_birth TEXT,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      utm_content TEXT,
      utm_term TEXT,
      manychat_id TEXT,
      client_preferences TEXT, -- JSON
      member_id INTEGER REFERENCES members(id)
    );

    -- Contact Notes
    CREATE TABLE IF NOT EXISTS contact_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      member_id INTEGER REFERENCES members(id),
      text TEXT DEFAULT '',
      status TEXT DEFAULT '',
      date TEXT DEFAULT (datetime('now')),
      attachments TEXT DEFAULT '[]' -- JSON array
    );

    -- Tasks
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      member_id INTEGER REFERENCES members(id),
      type TEXT DEFAULT '',
      text TEXT DEFAULT '',
      due_date TEXT DEFAULT (datetime('now')),
      done_date TEXT
    );

    -- Orders
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      member_id INTEGER REFERENCES members(id),
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'shipped', 'completed', 'cancelled')),
      order_date TEXT DEFAULT (datetime('now')),
      order_number TEXT,
      description TEXT,
      expected_delivery TEXT,
      completed_date TEXT,
      total_amount REAL,
      open_balance REAL,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Summary views
    -- contacts already has denormalized company_name, so no JOIN needed
    CREATE VIEW IF NOT EXISTS contacts_summary AS
    SELECT * FROM contacts;

    CREATE VIEW IF NOT EXISTS companies_summary AS
    SELECT
      co.*,
      (SELECT COUNT(*) FROM contacts WHERE company_id = co.id) AS nb_contacts
    FROM companies co;

    CREATE VIEW IF NOT EXISTS orders_summary AS
    SELECT
      o.*,
      c.first_name AS contact_first_name,
      c.last_name AS contact_last_name,
      m.first_name AS member_first_name,
      m.last_name AS member_last_name
    FROM orders o
    LEFT JOIN contacts c ON o.contact_id = c.id
    LEFT JOIN members m ON o.member_id = m.id;

    -- Automations
    CREATE TABLE IF NOT EXISTS automations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      prompt TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL DEFAULT 'owner',
      max_budget_usd REAL NOT NULL DEFAULT 2.0,
      max_turns INTEGER NOT NULL DEFAULT 30,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'paused', 'archived')),
      heartbeat_seconds INTEGER,
      scheduled_end TEXT,
      schedule_cron TEXT,
      last_run_at TEXT,
      user_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Automation Runs
    CREATE TABLE IF NOT EXISTS automation_runs (
      id TEXT PRIMARY KEY,
      automation_id INTEGER NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
      started_by TEXT NOT NULL DEFAULT 'owner',
      status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued', 'running', 'completed', 'failed')),
      session_id TEXT,
      result_text TEXT,
      cost_usd REAL,
      error_message TEXT,
      queued_at TEXT DEFAULT (datetime('now')),
      started_at TEXT,
      completed_at TEXT
    );

    -- KB Pages
    CREATE TABLE IF NOT EXISTS kb_pages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      icon TEXT DEFAULT 'FileText',
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Page Content (structured JSON content for React pages)
    CREATE TABLE IF NOT EXISTS page_content (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      page_slug TEXT NOT NULL UNIQUE,
      content TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Seed default owner (idempotent — no-op if already exists)
    INSERT OR IGNORE INTO members (id, user_id, email, first_name, last_name, role, administrator)
    VALUES (1, 'owner', 'owner@local', 'Owner', '', 'admin', 1);

    -- (KB pages seeded via seedQMKnowledgeBase and seedQMRoadmap functions)

    -- (All page content seeded via QM-specific functions below)

    -- Meetings
    CREATE TABLE IF NOT EXISTS meetings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      duration TEXT DEFAULT '',
      location TEXT DEFAULT '',
      attendees TEXT DEFAULT '[]', -- JSON array of names
      recording TEXT DEFAULT '',
      summary TEXT DEFAULT '',
      content TEXT DEFAULT '{}', -- JSON: decisions, action_items, open_questions, deep_dives, timeline, financial_model, contacts
      status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('scheduled', 'completed', 'cancelled', 'live')),
      meeting_url TEXT DEFAULT '',
      bot_id TEXT DEFAULT '',
      chat_session_id TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Meeting Transcript (real-time from Recall.ai webhook)
    CREATE TABLE IF NOT EXISTS meeting_transcript (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bot_id TEXT NOT NULL,
      speaker_name TEXT DEFAULT '',
      speaker_id TEXT DEFAULT '',
      is_host INTEGER DEFAULT 0,
      words TEXT DEFAULT '',
      start_timestamp TEXT DEFAULT '',
      end_timestamp TEXT DEFAULT '',
      event_type TEXT DEFAULT 'transcript.data',
      raw_payload TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_transcript_bot ON meeting_transcript(bot_id, created_at);

    -- Meeting Board Items (AI-generated insights during live meeting)
    CREATE TABLE IF NOT EXISTS meeting_board_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_id INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'key_point',
      title TEXT DEFAULT '',
      content TEXT DEFAULT '{}',
      status TEXT DEFAULT 'pending',
      cycle_number INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Q&A Entries (Michaela's question/answer log)
    CREATE TABLE IF NOT EXISTS qa_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      answer TEXT NOT NULL DEFAULT '',
      customer TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'validated', 'published', 'rejected', 'done')),
      sources TEXT DEFAULT '[]',
      classification TEXT DEFAULT 'public' CHECK(classification IN ('public', 'internal', 'restricted')),
      confidence INTEGER DEFAULT 0,
      rating INTEGER DEFAULT 0,
      feedback TEXT DEFAULT '',
      category TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Migrations for existing databases (safe to run multiple times)

  // Migration: Add meeting recording columns
  const meetingCols = db.prepare("PRAGMA table_info(meetings)").all() as { name: string }[];
  const meetingColNames = new Set(meetingCols.map((c) => c.name));
  if (!meetingColNames.has("meeting_url")) db.exec("ALTER TABLE meetings ADD COLUMN meeting_url TEXT DEFAULT ''");
  if (!meetingColNames.has("bot_id")) db.exec("ALTER TABLE meetings ADD COLUMN bot_id TEXT DEFAULT ''");
  if (!meetingColNames.has("chat_session_id")) db.exec("ALTER TABLE meetings ADD COLUMN chat_session_id TEXT DEFAULT ''");

  // Migration: Add 'live' status to meetings CHECK constraint
  // SQLite can't ALTER CHECK constraints — test if 'live' is already allowed, recreate if not
  try {
    db.exec("INSERT INTO meetings (title, date, status) VALUES ('__migration_test__', datetime('now'), 'live')");
    db.exec("DELETE FROM meetings WHERE title = '__migration_test__'");
  } catch {
    db.exec(`
      CREATE TABLE IF NOT EXISTS meetings_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        duration TEXT DEFAULT '',
        location TEXT DEFAULT '',
        attendees TEXT DEFAULT '[]',
        recording TEXT DEFAULT '',
        summary TEXT DEFAULT '',
        content TEXT DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('scheduled', 'completed', 'cancelled', 'live')),
        meeting_url TEXT DEFAULT '',
        bot_id TEXT DEFAULT '',
        chat_session_id TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
      );
      INSERT INTO meetings_new SELECT id, title, date, duration, location, attendees, recording, summary, content, status,
        COALESCE(meeting_url, ''), COALESCE(bot_id, ''), COALESCE(chat_session_id, ''), created_at FROM meetings;
      DROP TABLE meetings;
      ALTER TABLE meetings_new RENAME TO meetings;
    `);
  }

  const automationCols = db.prepare("PRAGMA table_info(automations)").all() as { name: string }[];
  const colNames = new Set(automationCols.map((c) => c.name));
  if (!colNames.has("heartbeat_seconds")) db.exec("ALTER TABLE automations ADD COLUMN heartbeat_seconds INTEGER");
  if (!colNames.has("scheduled_end")) db.exec("ALTER TABLE automations ADD COLUMN scheduled_end TEXT");
  if (!colNames.has("schedule_cron")) db.exec("ALTER TABLE automations ADD COLUMN schedule_cron TEXT");
  if (!colNames.has("last_run_at")) db.exec("ALTER TABLE automations ADD COLUMN last_run_at TEXT");
  if (!colNames.has("user_id")) db.exec("ALTER TABLE automations ADD COLUMN user_id TEXT");

  // Migration: Add 'done' status to qa_entries CHECK constraint
  // SQLite can't ALTER CHECK constraints, so we recreate the table if needed
  try {
    // Test if 'done' is already allowed
    db.exec("INSERT INTO qa_entries (question, status) VALUES ('__migration_test__', 'done')");
    db.exec("DELETE FROM qa_entries WHERE question = '__migration_test__'");
  } catch {
    // 'done' not allowed — recreate table with updated constraint
    db.exec(`
      CREATE TABLE IF NOT EXISTS qa_entries_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question TEXT NOT NULL,
        answer TEXT NOT NULL DEFAULT '',
        customer TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'validated', 'published', 'rejected', 'done')),
        sources TEXT DEFAULT '[]',
        classification TEXT DEFAULT 'public' CHECK(classification IN ('public', 'internal', 'restricted')),
        confidence INTEGER DEFAULT 0,
        rating INTEGER DEFAULT 0,
        feedback TEXT DEFAULT '',
        category TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
      INSERT INTO qa_entries_new SELECT * FROM qa_entries;
      DROP TABLE qa_entries;
      ALTER TABLE qa_entries_new RENAME TO qa_entries;
    `);
  }

  // Seed KB pages with parameterized inserts (avoids backtick issues with esbuild)
  seedDatabaseGuide();
  seedBuildGuide();

  // (Old founders meetings removed — QM meetings seeded via seedQMMeetings)
  // seedQMRoadmap(); — removed from live app
  seedQMKnowledgeBase();

  // Seed QM-specific automations (replaces generic sample automations)
  seedQMAutomations();

  // Seed QM discovery session meetings
  seedQMMeetings();

  // Seed Micaela's initial tickets
  seedTickets();

  // Seed Memory page tab content (real data for Micaela)
  seedMemoryContent();

  // seedAgentCreatedContent(); — cloud-cowork removed from live app
}

function seedDatabaseGuide() {
  const insert = db.prepare(
    "INSERT OR IGNORE INTO page_content (page_slug, content) VALUES (?, ?)"
  );

  const guide = {
    title: "Database API Guide",
    subtitle: "How the agent connects to the CRM database",
    category: "Technical",
    sections: [
      {
        type: "markdown",
        title: "Quick Reference",
        data: {
          content: [
            "## API — http://localhost:3001",
            "",
            "Generic REST API. Every table uses the same pattern:",
            "",
            "- **GET** /api/{table} — list all rows",
            "- **GET** /api/{table}/{id} — get one row",
            "- **POST** /api/{table} — create (JSON body)",
            "- **PUT** /api/{table}/{id} — update (JSON body)",
            "- **DELETE** /api/{table}/{id} — delete",
            "- **Filter:** ?filter={\"field@op\":\"value\"} — ops: eq, neq, gt, gte, lt, lte, is, in, ilike",
            "",
            "The UI auto-refreshes via SSE when data changes. No extra steps needed.",
            "",
            "## Tables",
            "",
            "contacts, companies, tasks, contact_notes, orders, members, tags, kb_pages, page_content, automations, meetings",
            "",
            "## Rules",
            "",
            "- Tasks and orders REQUIRE a contact_id — create a contact first if needed",
            "- email_jsonb and phone_jsonb are JSON arrays, not plain strings",
            "- KB pages need both a kb_pages entry (sidebar) and a page_content entry (data)",
            "- Do NOT read every table before acting. Just create/update what the user asks for.",
          ].join("\n"),
        },
      },
    ],
  };

  insert.run("kb-doc/database-guide", JSON.stringify(guide));
}

function seedBuildGuide() {
  const insert = db.prepare(
    "INSERT OR IGNORE INTO page_content (page_slug, content) VALUES (?, ?)"
  );

  const guide = {
    title: "Desktop Build & Release Guide",
    subtitle: "How to build DMG installers for macOS",
    category: "Technical",
    sections: [
      {
        type: "markdown",
        title: "Build Process",
        data: {
          content: [
            "## Prerequisites",
            "",
            "- Rust toolchain (rustup)",
            "- Node.js 22+",
            "- For Intel builds: `rustup target add x86_64-apple-darwin`",
            "",
            "## Step 1: Build Frontend",
            "",
            "```bash",
            "cd my-jarvis/my-jarvis-desktop",
            "npm run build",
            "```",
            "",
            "## Step 2: Bundle Agent",
            "",
            "```bash",
            "# Apple Silicon (M1/M2/M3) — default on ARM Mac",
            "node scripts/bundle-agent.js",
            "",
            "# Intel (x64) — cross-compile from ARM Mac",
            "TARGET_ARCH=x64 node scripts/bundle-agent.js",
            "```",
            "",
            "## Step 3: Build DMG",
            "",
            "```bash",
            "# Apple Silicon (M1/M2/M3)",
            "npx tauri build",
            "# Output: src-tauri/target/release/bundle/dmg/My Jarvis_0.1.0_aarch64.dmg",
            "",
            "# Intel (x64)",
            "TARGET_ARCH=x64 npx tauri build --target x86_64-apple-darwin",
            "# If bundle_dmg.sh fails, create DMG manually:",
            "```",
            "",
            "## Manual DMG (when Tauri bundler fails for x64)",
            "",
            "```bash",
            "STAGING=$(mktemp -d)",
            'cp -R "src-tauri/target/x86_64-apple-darwin/release/bundle/macos/My Jarvis.app" "$STAGING/"',
            'ln -s /Applications "$STAGING/Applications"',
            'hdiutil create -volname "My Jarvis" -srcfolder "$STAGING" -ov -format UDZO \\',
            '  "src-tauri/target/x86_64-apple-darwin/release/bundle/dmg/My Jarvis_0.1.0_x64.dmg"',
            'rm -rf "$STAGING"',
            "```",
            "",
            "## Installation (user side)",
            "",
            "1. Open the DMG, drag My Jarvis to Applications",
            "2. Run this command to bypass Gatekeeper (unsigned app):",
            "```bash",
            "xattr -cr /Applications/My\\\\ Jarvis.app",
            "```",
            "3. Open My Jarvis from Applications",
            "",
            "## Who gets which DMG?",
            "",
            "- **Apple Silicon (M1/M2/M3/M4):** aarch64.dmg",
            "- **Intel (older Macs):** x64.dmg",
            "- Yaron: Intel (x64)",
          ].join("\n"),
        },
      },
    ],
  };

  insert.run("kb-doc/build-guide", JSON.stringify(guide));
}

// (Founders meetings #1 and #2 removed — not in live data. seedQMRoadmap removed — not in live data.)
function seedQMAutomations() {
  const insert = db.prepare(
    `INSERT OR IGNORE INTO automations (id, name, prompt, created_by, max_budget_usd, max_turns, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  // ─── Automation 1: Update Insights (Insights Analyst) ───
  insert.run(
    1,
    "Update Insights",
    `You are the Insights Analyst for Quantum Machines' technical support operation. Your job is to analyze all tickets (qa_entries) and produce a comprehensive insights report that helps the team understand patterns, gaps, and opportunities in customer support.\n\nSTEP 1 — GATHER ALL TICKETS\nFetch every ticket from the database:\ncurl http://localhost:3001/api/qa_entries\n\nRead each ticket carefully. Pay attention to:\n- Status distribution (how many draft vs validated vs published vs rejected)\n- Category distribution (hardware_specs, code_examples, system_config, multi_chassis, software_integration, etc.)\n- Confidence scores — are we answering with high confidence or are there knowledge gaps?\n- Customer patterns — which customers ask the most? What topics do they focus on?\n- Sources used — are answers well-sourced or thin on references?\n- Ratings and feedback — any tickets with low ratings or negative feedback?\n\nSTEP 2 — GATHER KNOWLEDGE BASE STATE\nFetch all KB pages to understand what knowledge we have:\ncurl http://localhost:3001/api/page_content\n\nCount how many KB docs exist, which categories are covered, and identify gaps — topics that customers ask about but we don't have KB coverage for.\n\nSTEP 3 — ANALYZE AND PRODUCE INSIGHTS\nBuild a structured insights report with these sections:\n\n1. **KPI Summary** (kpi_cards section type):\n   - Total tickets, Validated rate (%), Average confidence, Top category, Coverage gaps count\n\n2. **Category Breakdown** (table section type):\n   - For each category: ticket count, avg confidence, status breakdown, trend\n\n3. **Knowledge Gaps** (open_questions section type):\n   - Topics customers asked about where confidence was low (<7) or KB coverage is missing\n   - Each gap should describe what knowledge is needed and which customers need it\n\n4. **Customer Activity** (table section type):\n   - Per-customer breakdown: ticket count, categories, avg confidence, last active\n\n5. **Recommendations** (decisions section type):\n   - Actionable recommendations based on the analysis\n   - E.g., "Create KB doc for MW-FEM frequency ranges — 3 tickets reference this with low confidence"\n   - Mark as "agreed" if clearly needed, "directional" if it's a suggestion\n\nSTEP 4 — SAVE THE REPORT\nUpdate (or create) the insights page in page_content:\n\nFirst check if it exists:\ncurl http://localhost:3001/api/page_content\n\nIf a page with slug "kb-doc/insights-report" exists, UPDATE it with the new content (use PUT with the id).\nIf it doesn't exist, CREATE it:\ncurl -X POST http://localhost:3001/api/page_content -H "Content-Type: application/json" -d '{"page_slug":"kb-doc/insights-report","content":{"title":"Insights Report","subtitle":"Auto-generated analysis of Q&A activity and knowledge gaps","category":"Operations","sections":[...your sections here...]}}'\n\nThe sections array must use valid section types from the registry: kpi_cards, table, open_questions, decisions, markdown, checklist, key_value, timeline, contacts, deep_dives, action_items, debates, transcript.\n\nSTEP 5 — SUMMARIZE\nAfter saving, provide a brief summary of key findings:\n- How many tickets analyzed\n- Top insight or most important finding\n- Most urgent knowledge gap\n- Any tickets that need immediate attention (low confidence, negative feedback)\n\nBe thorough but concise. The report should tell the team exactly where to focus their energy.`,
    "owner",
    3.0,
    40,
    "active"
  );

  // ─── Automation 2: Deep Research ───
  insert.run(
    2,
    "Deep Research",
    `You are a research agent for Quantum Machines. The user needs a comprehensive technical research document on a specific topic related to the OPX 1000.

STEP 1: Search the knowledge base:
curl http://localhost:3001/api/page_content

STEP 2: Search public documentation at docs.quantum-machines.co and quantum-machines.co for additional information.

STEP 3: Compile a FULL RESEARCH DOCUMENT with:
- Executive Summary
- Detailed Technical Analysis
- Code Examples (QUA language)
- Sources and References (with URLs)
- Confidence Assessment (what was found vs what is missing)
- Recommended Next Steps

STEP 4: Save as a new KB page:
curl -X POST http://localhost:3001/api/page_content -H "Content-Type: application/json" -d '{"page_slug":"kb-doc/research-[topic]","content":"{...sections-based content...}"}'

STEP 5: Log in Q&A entries:
curl -X POST http://localhost:3001/api/qa_entries -H "Content-Type: application/json" -d '{"question":"[research topic]","answer":"[summary of findings]","status":"draft","category":"research","confidence":8}'

Be thorough. Check multiple sources. Document what you found AND what you could not find.`,
    "owner",
    5.0,
    60,
    "active"
  );

  // ─── Automation 3: Validate & Fact-Check ───
  insert.run(
    3,
    "Validate & Fact-Check",
    `You are a fact-checking agent for Quantum Machines. The user has drafted an answer to a customer question and needs it validated.

STEP 1: Read the draft answer provided by the user.

STEP 2: Search the knowledge base for relevant sources:
curl http://localhost:3001/api/page_content

STEP 3: For each claim in the draft:
- Check if it is supported by KB sources
- Flag any inaccuracies or unsupported claims
- Note if any sources are classified (Internal/Restricted)

STEP 4: Provide a VALIDATION REPORT:
- Accuracy Score (1-10)
- Claims Verified (list with source)
- Claims Unverified (list — need SME input)
- Classification Warnings (if restricted sources needed)
- Suggested Corrections (if any)
- Recommended Confidence Level

Be precise. Only mark claims as verified if you have a specific source.`,
    "owner",
    2.0,
    30,
    "active"
  );

  // ─── Automation 4: Create Daily Summary ───
  insert.run(
    4,
    "Create daily summary.",
    "Go through the tickets of today and create a new page in the knowledge base with a daily summary of today.",
    "owner",
    2.0,
    30,
    "active"
  );

  // ─── Automation 5: Update Insights ───
  insert.run(
    5,
    "Update Insights",
    `STEP 1: Read the latest Q&A tickets:
curl http://localhost:3001/api/qa_entries

STEP 2: Read the current Insights page content. Find the page_content entry with page_slug containing "insights" or look at the Insights page:
curl http://localhost:3001/api/page_content

STEP 3: Analyze the latest ticket data and update the Insights page with the new information:
- Update KPI totals (total Q&As, validated count, avg confidence, top category)
- Update the category breakdown based on current ticket distribution
- Update recent activity with the latest tickets
- Identify any new knowledge gaps (low confidence or missing sources)
- Recalculate metrics based on current data

Use PUT to update the Insights page_content entry with the refreshed data:
curl -X PUT http://localhost:3001/api/page_content/{id} -H "Content-Type: application/json" -d "{...updated content...}"`,
    "owner",
    2.0,
    30,
    "active"
  );
}

function seedQMKnowledgeBase() {
  const insert = db.prepare(
    "INSERT OR IGNORE INTO page_content (page_slug, content) VALUES (?, ?)"
  );

  // a) OPX 1000 Product Overview
  const opx1000 = {
    title: "OPX 1000 — Product Overview",
    subtitle: "Quantum Machines' flagship quantum control platform",
    category: "Product",
    sections: [
      {
        type: "markdown",
        title: "Overview",
        data: {
          content: [
            "## OPX 1000 — Quantum Machines' Flagship Platform",
            "",
            "The OPX 1000 is QM's advanced quantum control platform. Key capabilities:",
            "",
            "- **PPU**: 16-core Pulse Processing Unit",
            "- **Modules**: Up to 8 per chassis (LF-FEM or MW-FEM)",
            "- **QSync**: Synchronization via Cat6 RJ45",
            "- **Connectivity**: All-to-all optical data connectivity",
            "- **Active reset latency**: < 100ns (MW-FEM), < 160ns (general PPU)",
            "- **DGX-Quantum integration**: < 4-5μs round-trip",
          ].join("\n"),
        },
      },
      {
        type: "key_value",
        title: "Specifications",
        data: {
          "Output channels per chassis": "Up to 24 analog + 24 digital",
          "Modules per chassis": "Up to 8 (LF-FEM or MW-FEM)",
          "PPU cores": "16 per module",
          "Active reset (MW-FEM)": "< 100ns",
          "Active reset (General PPU)": "< 160ns",
          "Sync": "QSync via Cat6 RJ45",
          "Data transfer": "Optical (4 ports per chassis)",
          "Max direct sync": "5 chassis (hierarchical beyond)",
        },
      },
      {
        type: "key_value",
        title: "Key URLs",
        data: {
          "Product Page": "quantum-machines.co/products/opx1000/",
          "Documentation": "docs.quantum-machines.co",
          "GitHub": "github.com/qua-platform",
          "QUA Language": "docs.quantum-machines.co/1.1.7/qm-qua-sdk/",
          "Request Full Spec": "quantum-machines.co/request-the-full-opx1000-spec-sheet/",
        },
      },
      {
        type: "table",
        title: "Product Comparison",
        data: {
          headers: ["Product", "Status", "Focus"],
          rows: [
            ["OPX 1000", "Current — PRIMARY FOCUS", "Advanced quantum control"],
            ["OPX+", "Legacy — deprioritize", "Previous generation"],
            ["Octave", "Legacy — deprioritize", "RF upconversion"],
          ],
        },
      },
    ],
  };
  insert.run("kb-doc/opx-1000", JSON.stringify(opx1000));

  // b) Multi-Chassis Communication Research
  const multiChassis = {
    title: "Multi-Chassis Communication & Latency Research",
    subtitle: "How OPX 1000 solves cross-chassis coordination — February 2026",
    category: "Research",
    sections: [
      {
        type: "markdown",
        title: "Answer Summary",
        data: {
          content: [
            "## Multi-Chassis Communication",
            "",
            "Multi-chassis communication is achieved through QSync synchronization + all-to-all optical connectivity. Multiple units operate as a single unified system. QUA code is identical regardless of chassis distribution.",
            "",
            "**Key specs:**",
            "- QSync via Cat6 RJ45",
            "- Up to 5 direct chassis sync (hierarchical beyond)",
            "- 4 optical ports per chassis",
            "- PPU: 16-core per module, ultra-fast arbitrary feedback across chassis",
          ].join("\n"),
        },
      },
      {
        type: "markdown",
        title: "QUA Programming",
        data: {
          content: [
            "## QUA Code — Identical Across Chassis",
            "",
            "QUA code remains identical whether elements are on the same or different chassis.",
            "",
            "**Key commands:**",
            "- `align(element1, element2)` — synchronization",
            "- `wait(duration, elements)` — timing",
            "- `if_/elif_/else_` — conditionals across chassis",
            "- `switch_/case_` — multi-way branching",
            "- `play(pulse, element, condition)` — conditional pulses",
            "- `measure()` — measurements",
            "",
            "Flow control has implicit alignment — elements in `for_/while_/if_` auto-align.",
          ].join("\n"),
        },
      },
      {
        type: "markdown",
        title: "Broadcast Operations (QOP 3.3+)",
        data: {
          content: [
            "## Broadcast Operations — CRITICAL for Cross-Chassis",
            "",
            "- `broadcast.and_(*values)` — AND of boolean results across controllers",
            "- `broadcast.or_(*values)` — OR of boolean results across controllers",
            "- `broadcast.xor_(*values)` — XOR of boolean results across controllers",
            "",
            "**Required for sharing boolean measurement results across controllers.**",
            "",
            "Pattern: measure locally → assign to bool → `broadcast.and_()` → all chassis can use result.",
            "",
            "Used in: error correction, syndrome detection, repeat-until-success protocols.",
          ].join("\n"),
        },
      },
      {
        type: "key_value",
        title: "Latency Specifications",
        data: {
          "Active Reset (MW-FEM)": "< 100ns",
          "Active Reset (General PPU)": "< 160ns",
          "DGX-Quantum round-trip": "< 4-5μs",
          "Cross-chassis align": "Several clock cycles (tens of ns)",
          "Broadcast operations": "Tens of nanoseconds",
          "Note": "Specific inter-chassis conditional latency not in public docs",
        },
      },
      {
        type: "table",
        title: "Sources",
        data: {
          headers: ["Source", "Type", "Key Finding"],
          rows: [
            ["OPX1000 Product Page", "Public", "Multi-chassis capabilities overview"],
            ["OPX1000 Installation Guide", "Public", "Clustering setup and cable topology"],
            ["PPU Technology Page", "Public", "16-core architecture details"],
            ["QUA Language API", "Public", "Synchronization primitives"],
            ["Timing in QUA Guide", "Public", "Deterministic vs non-deterministic alignment"],
            ["qua-platform GitHub", "Public", "Code examples with align and measure"],
          ],
        },
      },
      {
        type: "markdown",
        title: "Confidence Assessment",
        data: {
          content: [
            "## Confidence: 8/10",
            "",
            "**High confidence (9-10):** Architecture, QSync, active reset latency, unified programming model.",
            "",
            "**Medium confidence (7-8):** Inter-chassis conditional latency is 'ultra-fast' but no specific number.",
            "",
            "**Requires follow-up:** Request Full OPX1000 Spec Sheet for precise inter-chassis latency.",
          ].join("\n"),
        },
      },
    ],
  };
  insert.run("kb-doc/multi-chassis", JSON.stringify(multiChassis));

  // c) OPX Simulator Integration Opportunity
  const simulator = {
    title: "OPX Simulator Integration Opportunity",
    subtitle: "Connect Claude directly to the OPX Simulator for execution + analysis",
    category: "Product",
    sections: [
      {
        type: "markdown",
        title: "Vision",
        data: {
          content: [
            "## Two-Layer Intelligence",
            "",
            "Connect Claude Code/Agent SDK to OPX Simulator.",
            "",
            "- **Layer 1 (Knowledge Base):** Answers questions from docs",
            "- **Layer 2 (System Integration):** Executes code, analyzes live results, debugs runtime errors",
            "",
            "Combined: user goes from question → working, validated code in minutes.",
          ].join("\n"),
        },
      },
      {
        type: "table",
        title: "Use Cases",
        data: {
          headers: ["Use Case", "Description", "Value"],
          rows: [
            ["Interactive Quantum Algorithm Dev", "Describe experiment → Claude generates QUA code → executes → analyzes results → suggests optimizations", "10x faster iteration"],
            ["Debugging Multi-Chassis Programs", "Read code → identify issues → suggest broadcast fixes → run corrected code → compare timing", "Hours to minutes"],
            ["Result Analysis", "Read simulation output → parse measurements → generate plots → explain results", "Automated interpretation"],
            ["Code Optimization", "Analyze existing QUA → identify inefficiencies → generate optimized version → compare", "20-50% improvement"],
            ["Experiment Validation", "Read error correction code → simulate with error rates → plot logical vs physical error rate", "Automated verification"],
          ],
        },
      },
      {
        type: "table",
        title: "Required Tools",
        data: {
          headers: ["Tool", "Purpose"],
          rows: [
            ["execute_qua_simulation", "Execute QUA code on OPX Simulator"],
            ["get_simulation_results", "Retrieve measurement/waveform/timing results"],
            ["read_simulator_logs", "Read execution logs and errors"],
            ["analyze_waveforms", "FFT/envelope/phase/timing analysis"],
            ["validate_qua_code", "Static analysis before execution"],
          ],
        },
      },
      {
        type: "markdown",
        title: "Implementation Phases",
        data: {
          content: [
            "## Implementation Timeline",
            "",
            "- **Phase 1 (Week 1-2):** Basic execution — install simulator, create execute + results tools, test with Rabi oscillation",
            "- **Phase 2 (Week 3):** Log analysis — error parsing, fix suggestions",
            "- **Phase 3 (Week 4):** Waveform analysis — FFT, envelope detection, visualization",
            "- **Phase 4 (Week 5):** Code validation + optimization",
            "- **Phase 5 (Week 6+):** Multi-simulation comparison, parameter sweeps, protocol library",
          ].join("\n"),
        },
      },
    ],
  };
  insert.run("kb-doc/opx-simulator", JSON.stringify(simulator));

  // d) Knowledge Sources Map
  const knowledgeSources = {
    title: "Knowledge Sources Map",
    subtitle: "12 data sources organized by priority and access level",
    category: "Operations",
    sections: [
      {
        type: "table",
        title: "High Priority Sources",
        data: {
          headers: ["Source", "Access", "Type", "Status"],
          rows: [
            ["GitHub (qua-platform)", "Public", "Code examples SDK API integration", "Ready"],
            ["Core Documentation", "Public", "Foundational product docs guides", "Ready"],
            ["API Documentation", "Public", "QUA language reference endpoints", "Ready"],
            ["Spec Sheets", "Internal", "Hardware specs performance metrics", "Needs PDF parsing"],
            ["Slack Chat History", "Internal", "Real Q&A threads SME responses", "Needs Slack API setup"],
            ["JIRA", "Restricted", "Feature requests timelines status", "Needs Atlassian API"],
            ["Confluence", "Restricted", "PRDs Q&A docs architecture", "Needs Atlassian API"],
          ],
        },
      },
      {
        type: "table",
        title: "Medium & Low Priority Sources",
        data: {
          headers: ["Source", "Access", "Type", "Status"],
          rows: [
            ["Technical Decks", "Restricted", "Confidential deep-dive presentations", "Needs manual upload"],
            ["QM Website", "Public", "Product overviews use cases", "Ready"],
            ["Blog Posts", "Public", "Technical content announcements", "Ready"],
            ["Seminar Videos", "Public", "Recordings demos", "Future phase"],
            ["Email History", "Internal", "Sales correspondence", "Not essential per Michaela"],
          ],
        },
      },
      {
        type: "decisions",
        title: "Integration Priorities",
        data: [
          {
            title: "#1 Slack Integration",
            description: "Technical teams communicate primarily via Slack. Contains highest-value Q&A threads and SME responses. Key channels: #product-team #customer-success #technical-support",
            status: "agreed",
          },
          {
            title: "#2 JIRA + Confluence (Single Integration)",
            description: "Both Atlassian products — single integration point. JIRA: feature requests timelines. Confluence: PRDs Q&A docs. CRITICAL: mostly confidential requires classification tagging.",
            status: "agreed",
          },
          {
            title: "Email History — Not Essential",
            description: "Sales team uses email but technical discussions happen on Slack. Limited value for technical agent.",
            status: "agreed",
          },
        ],
      },
    ],
  };
  insert.run("kb-doc/knowledge-sources", JSON.stringify(knowledgeSources));

  // e) SME Directory
  const smeDirectory = {
    title: "Subject Matter Experts (SMEs)",
    subtitle: "Key technical experts — who to escalate to and when",
    category: "Operations",
    sections: [
      {
        type: "contacts",
        title: "Expert Profiles",
        data: [
          {
            name: "Director of Product",
            status: "Frequently Consulted",
            description: "Broad hardware/product knowledge. Go-to for product strategy, technical guidance, cross-domain questions.",
          },
          {
            name: "PM — OPX 1000",
            status: "Hardware Specialist",
            description: "Microwave FEM specialist. Go-to for hardware specifications, analog performance, frequency ranges, power output.",
          },
          {
            name: "Oded (Head of Architecture)",
            status: "Architecture Expert",
            description: "Hardware architecture expert. Go-to for system integration, multi-chassis design, technical architecture decisions.",
          },
          {
            name: "PM — Software",
            status: "Software Specialist",
            description: "Calibration frameworks, multi-user interfaces, third-party software integrations. Go-to for QUA programming, SDK questions, Qualibrate.",
          },
        ],
      },
      {
        type: "markdown",
        title: "Escalation Guide",
        data: {
          content: [
            "## When to Escalate",
            "",
            "- Agent has low confidence (< 6/10)",
            "- Question involves unreleased features or roadmap",
            "- Customer needs measurements not in public docs",
            "- Answer requires Restricted/JIRA/Confluence sources",
            "",
            "## How to Escalate",
            "",
            "1. Note the question and what the agent found",
            "2. Identify which SME has the domain expertise",
            "3. Send via Slack with context",
            "4. Once answered, add to Q&A log as validated answer",
          ].join("\n"),
        },
      },
    ],
  };
  insert.run("kb-doc/sme-directory", JSON.stringify(smeDirectory));

  // f) Michaela's Workflow
  const workflow = {
    title: "Technical Support Workflow",
    subtitle: "8-step process from customer question to validated knowledge",
    category: "Operations",
    sections: [
      {
        type: "timeline",
        title: "The 8-Step Workflow",
        data: [
          { date: "Step 1", title: "Question Ingestion", description: "Customer-facing team receives technical question via meeting, email, or chat. Could be something to validate or something unknown." },
          { date: "Step 2", title: "Private Agent Interaction", description: "Ask the agent privately. Agent acts as knowledgeable teammate emulating SME expertise." },
          { date: "Step 3", title: "Agent Research", description: "Agent searches all knowledge sources: spec sheets, GitHub, docs, Slack, JIRA, Confluence. Compiles comprehensive answer. ~80% of questions fully answerable." },
          { date: "Step 4", title: "Response Generation", description: "Agent provides answer in SME technical language. Formatted ready to copy-paste into customer email. Low confidence flagged for SME review." },
          { date: "Step 5", title: "Human Validation", description: "Review answer privately. Validate accuracy and appropriateness. Edit or request SME clarification if needed." },
          { date: "Step 6", title: "Publish to Slack", description: "Post Q&A to Product Team Slack channel. Format: Question + Agent Answer + Sources cited. Visibility to entire technical team." },
          { date: "Step 7", title: "Team Feedback", description: "Team reacts with thumbs up/down. Active discussions below Q&A. Additional context from team. Validated answers become trusted knowledge." },
          { date: "Step 8", title: "Continuous Learning", description: "Agent monitors validated Q&As. Builds library of vetted answers. Improves future responses based on feedback." },
        ],
      },
      {
        type: "key_value",
        title: "Success Metrics",
        data: {
          "Customer says 'thank you' with no follow-up": "The answer was complete and clear",
          "Positive customer experience": "QM perceived as technically competent",
          "Sales impact": "Technical responses support deal progression",
          "Trust building": "Consistent accurate responsive communication",
          "SME interruption reduction": "Key experts freed from repetitive questions",
          "Response speed": "Minutes instead of days",
          "Messaging consistency": "Same accurate answer regardless of who asks",
          "Knowledge base growth": "Validated Q&A library grows over time",
        },
      },
    ],
  };
  insert.run("kb-doc/workflow", JSON.stringify(workflow));

  // g) Broadcast Operations Addendum
  const broadcastOps = {
    title: "Broadcast Operations — Cross-Chassis Data Sharing",
    subtitle: "REQUIRED for sharing measurement results across OPX 1000 chassis",
    category: "Research",
    sections: [
      {
        type: "markdown",
        title: "Critical Clarification",
        data: {
          content: [
            "## Broadcast vs Align",
            "",
            "The broadcast commands (`broadcast.and_()`, `broadcast.or_()`, `broadcast.xor_()`) are **REQUIRED** for true cross-chassis data sharing.",
            "",
            "`align()` handles temporal synchronization but **broadcast is needed for sharing boolean measurement results across controllers**.",
            "",
            "Available from QOP 3.3+.",
          ].join("\n"),
        },
      },
      {
        type: "markdown",
        title: "Code Example — Multi-Chassis Conditional",
        data: {
          content: [
            "## Pattern",
            "",
            "1. Measure qubits on different chassis",
            "2. Assign to local booleans",
            "3. `broadcast.and_(state1, state2)` to share across chassis",
            "4. `align()` for temporal sync",
            "5. Both chassis can use combined state for conditional logic",
            "",
            "Repeat-until-success protocols use `while_()` + `broadcast.and_()` for hardware-level loops across chassis.",
          ].join("\n"),
        },
      },
      {
        type: "table",
        title: "When to Use What",
        data: {
          headers: ["Operation", "Use When", "Cross-Chassis?"],
          rows: [
            ["align()", "Temporal synchronization — wait for all elements", "Yes but no data sharing"],
            ["broadcast.and_()", "Share AND of boolean results across chassis", "Yes — REQUIRED for cross-chassis data"],
            ["broadcast.or_()", "Share OR of boolean results across chassis", "Yes — error detection across chassis"],
            ["broadcast.xor_()", "Share XOR of boolean results across chassis", "Yes — parity checking"],
            ["if_() with local bool", "Conditional on local measurement only", "No — local controller only"],
            ["if_() with broadcast result", "Conditional on cross-chassis measurement", "Yes — after broadcast"],
          ],
        },
      },
    ],
  };
  insert.run("kb-doc/broadcast-ops", JSON.stringify(broadcastOps));
}

function seedQMMeetings() {
  const insert = db.prepare(
    `INSERT OR IGNORE INTO meetings (id, title, date, duration, location, attendees, recording, summary, content, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  // Meeting #3 — QM Workflow Discovery Session
  const meeting3Content = {
    decisions: [
      { status: "agreed", title: "Agent acts as private teammate first", description: "Phase 1: Manual workflow with private agent interaction. Team member asks agent privately, validates, then publishes." },
      { status: "agreed", title: "Copy-paste ready formatting", description: "Agent answers must be formatted ready to paste into customer email. No reformatting needed." },
      { status: "agreed", title: "Classification awareness required", description: "Agent must track classification levels of sources. Flag when answer uses confidential information." },
      { status: "agreed", title: "Slack channel for team visibility", description: "Validated Q&As posted to Product Team Slack channel. Team can react and discuss." },
    ],
    action_items: [
      {
        category: "Setup",
        items: [
          "Map all 12 knowledge sources with access levels",
          "Identify top 4 SMEs and their domains",
          "Define classification tagging system",
          "Set up feedback loop mechanism",
        ],
      },
      {
        category: "Integration",
        items: [
          "Connect GitHub repos (public)",
          "Index core documentation",
          "Set up Slack integration (#1 priority)",
          "Set up JIRA+Confluence integration (#2 priority)",
        ],
      },
    ],
    open_questions: [
      { title: "How to handle edge cases not in docs?", description: "Customers often ask for specific frequency ranges or unique experiments not yet documented. Agent must flag these for SME review." },
      { title: "Approval workflow for restricted sources", description: "JIRA and Confluence contain mostly confidential info. Need approval from Product/Architecture before sharing." },
    ],
  };

  insert.run(
    3,
    "QM — Workflow Discovery Session",
    "2026-01-28",
    "1h 30m",
    "Video Call",
    JSON.stringify(["Michaela Eichinger", "Erez"]),
    "",
    "Mapped business problem, knowledge sources, ideal workflow, and success metrics for QM technical support agent",
    JSON.stringify(meeting3Content),
    "completed"
  );

  // Meeting #4 — QM Knowledge Sources & Research Demo
  const meeting4Content = {
    decisions: [
      { status: "agreed", title: "#1 Priority: Slack Integration", description: "Technical teams communicate primarily on Slack. Contains highest-value Q&A threads." },
      { status: "agreed", title: "#2 Priority: JIRA + Confluence", description: "Single Atlassian integration. JIRA: feature requests/timelines. Confluence: PRDs/Q&As." },
      { status: "agreed", title: "Email deprioritized", description: "Technical discussions happen on Slack, not email. Limited value for agent." },
      { status: "agreed", title: "OPX 1000 focus only", description: "Do not focus on Octave or OPX+ (older products)." },
    ],
    deep_dives: [
      {
        title: "Multi-Chassis Research (25 min)",
        points: [
          "QSync + optical connectivity architecture",
          "QUA programming identical across chassis",
          "broadcast.and_()/or_()/xor_() for cross-chassis data sharing",
          "Active reset < 100ns, cross-chassis sync tens of ns",
          "25+ official sources consulted",
        ],
      },
      {
        title: "OPX Simulator Integration",
        points: [
          "System connectivity vs knowledge base connectivity",
          "5 tools: execute, results, logs, waveforms, validate",
          "10x faster iteration for quantum physicists",
          "Combined with KB: question → working validated code in minutes",
        ],
      },
    ],
    contacts: [
      { name: "Michaela Eichinger", status: "Primary User", description: "QM Product Manager. Primary user of the technical support agent." },
    ],
  };

  insert.run(
    4,
    "QM — Knowledge Sources & Research Demo",
    "2026-02-19",
    "2h",
    "Video Call",
    JSON.stringify(["Michaela Eichinger", "Erez"]),
    "",
    "Validated knowledge source priorities, demonstrated deep research capability with multi-chassis communication topic, explored OPX simulator integration",
    JSON.stringify(meeting4Content),
    "completed"
  );
}

function seedTickets() {
  const insert = db.prepare(
    `INSERT OR IGNORE INTO qa_entries (id, question, answer, customer, status, sources, classification, confidence, rating, feedback, category, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  // ─── QM-001: Multi-chassis communication ───
  insert.run(
    1,
    "How is multi-chassis communication solved in OPX 1000? What are the latencies for conditional operations across multiple modules and chassis?",
    `SUMMARY

Multi-chassis communication in the OPX 1000 is achieved through two complementary systems: QSync for deterministic clock synchronization, and all-to-all optical data connectivity for real-time data transfer between chassis.

KEY ARCHITECTURE

QSync Synchronization:
- Synchronization via Cat6 RJ45 cables
- Up to 5 chassis can be directly synchronized (hierarchical beyond that)
- Provides a single unified clock across all synchronized chassis
- Deterministic timing guarantees across all modules

Optical Data Connectivity:
- 4 optical ports per chassis
- All-to-all connectivity between chassis in a cluster
- Used for real-time data transfer (measurement results, conditional state)
- Enables cross-chassis conditional logic

PPU — The Real-Time Processor:
- 16-core Pulse Processing Unit per module
- Up to 8 modules per chassis = 128 PPU cores per chassis
- Executes QUA programs natively on hardware — no host round-trip required
- Handles cross-module AND cross-chassis arbitrary feedback (not just boolean)

LATENCY SPECIFICATIONS

- Active reset (MW-FEM): < 100 ns
- Active reset (General PPU): < 160 ns
- DGX-Quantum integration round-trip: < 4-5 μs
- Cross-chassis align: Several clock cycles (tens of nanoseconds)
- Broadcast operations: Tens of nanoseconds
- Note: Specific inter-chassis conditional latency is not published in public docs

QUA PROGRAMMING — IDENTICAL ACROSS CHASSIS

QUA code is the same whether elements are on the same or different chassis:
- align(element1, element2) — synchronization across any elements
- wait(duration, elements) — timing control
- if_/elif_/else_ — conditionals (with implicit alignment)
- switch_/case_ — multi-way branching
- play(pulse, element, condition) — conditional pulses

Flow control blocks (for_, while_, if_) auto-align all elements — explicit align() calls often not needed.

BROADCAST OPERATIONS (QOP 3.3+) — REQUIRED FOR CROSS-CHASSIS DATA SHARING

For sharing boolean measurement results across chassis, use broadcast operations:
- broadcast.and_(*values) — AND of boolean results across controllers
- broadcast.or_(*values) — OR of boolean results across controllers
- broadcast.xor_(*values) — XOR of boolean results across controllers

Pattern: measure locally → assign to bool → broadcast.and_() → all chassis use result for conditional logic.

Used in: error correction, syndrome detection, repeat-until-success protocols.

CLASSIFICATION: Public
CONFIDENCE: 8/10
Architecture and synchronization well-documented. Specific inter-chassis conditional latency not in public docs — requires spec sheet request.`,
    "IonQ Research",
    "validated",
    JSON.stringify([
      "OPX1000 Product Page — quantum-machines.co/products/opx1000/",
      "PPU Technology Page — quantum-machines.co/blog/ppu-scalable-quantum-control/",
      "QUA Language API — docs.quantum-machines.co/1.1.7/qm-qua-sdk/",
      "Timing in QUA Guide — docs.quantum-machines.co",
      "OPX1000 Installation Guide — docs.quantum-machines.co",
      "qua-platform GitHub — github.com/qua-platform"
    ]),
    "public",
    8,
    0,
    "",
    "multi_chassis",
    "2026-02-19T10:00:00Z"
  );

  // ─── QM-002: Cross-chassis measurement sharing ───
  insert.run(
    2,
    "How do we share measurement results across OPX 1000 chassis for conditional logic? We need to measure on one chassis and make decisions on another.",
    `SUMMARY

You need broadcast operations, available from QOP 3.3+. The broadcast module provides hardware-level operations that share boolean measurement results across OPX 1000 controllers (chassis) in real time, enabling true cross-chassis conditional logic.

THE CORE PROBLEM

align() handles temporal synchronization but does NOT share data. To make conditional decisions based on measurements from a different chassis, you need explicit data sharing — that's what broadcast operations provide.

BROADCAST OPERATIONS (QOP 3.3+)

Three operations available:
- broadcast.and_(*values) — AND of boolean results across all specified controllers
- broadcast.or_(*values) — OR of boolean results across all specified controllers
- broadcast.xor_(*values) — XOR of boolean results across all specified controllers

PATTERN — CROSS-CHASSIS CONDITIONAL LOGIC

Step 1: Measure on each chassis and assign to local booleans
Step 2: Use broadcast.and_() to share results across chassis
Step 3: align() for temporal synchronization
Step 4: All chassis can now use the combined state for conditional logic

TYPICAL USE CASES

- Error correction: Syndrome detection across distributed qubits
- Repeat-until-success: while_() + broadcast.and_() for hardware-level loops across chassis
- Parity checking: broadcast.xor_() for distributed parity computations
- State preparation: Verify qubit state across multiple chassis before proceeding

LATENCY

Broadcast operations complete in tens of nanoseconds — compatible with real-time quantum control requirements.

PREREQUISITE

Requires QOP 3.3+. Check your QOP version before using broadcast operations. Earlier QOP versions require workarounds (sequential communication via host).

CLASSIFICATION: Public
CONFIDENCE: 9/10
Broadcast operations are documented in the QUA Language API. Confirmed via qua-platform GitHub examples.`,
    "IonQ Research",
    "validated",
    JSON.stringify([
      "QUA Language API — docs.quantum-machines.co/1.1.7/qm-qua-sdk/",
      "qua-platform GitHub — github.com/qua-platform",
      "OPX1000 Product Page — quantum-machines.co/products/opx1000/",
      "PPU Technology Page — quantum-machines.co/blog/ppu-scalable-quantum-control/"
    ]),
    "public",
    9,
    0,
    "",
    "multi_chassis",
    "2026-02-19T11:30:00Z"
  );

  // ─── QM-003: PPU latency ───
  insert.run(
    3,
    "What is the latency for real-time feedback loops using the PPU on OPX 1000?",
    `SUMMARY

The OPX 1000 PPU (Pulse Processing Unit) is a 16-core processor designed for ultra-low latency real-time feedback during quantum experiments. It executes QUA programs natively on the hardware, enabling mid-circuit measurements with immediate conditional branching — no round-trip to a host PC required.

KEY SPECIFICATIONS

- PPU cores: 16 per module (LF-FEM or MW-FEM)
- Modules per chassis: Up to 8
- Active reset latency (MW-FEM): < 100 ns
- Active reset latency (General PPU): < 160 ns
- DGX-Quantum integration round-trip: < 4-5 μs

ARCHITECTURE

Each OPX1000 module contains a dedicated 16-core PPU. With up to 8 modules per chassis, a single OPX1000 provides 128 PPU cores operating as a unified system. The PPU handles:

- Real-time pulse generation and measurement
- Mid-circuit conditional branching (if_/else_/switch_/case_)
- Active reset protocols
- Multi-core parallel processing for complex branching logic
- Cross-module arbitrary feedback (not just boolean — full arbitrary data)

COMPETITIVE ADVANTAGE

The DGX-Quantum integration achieves < 4-5 μs round-trip latency for hybrid quantum-classical workloads. This is approximately 1000x better than competing solutions, making it a key differentiator for customers running hybrid algorithms that require classical GPU processing mid-circuit.

CLASSIFICATION: Public
CONFIDENCE: 8/10
PPU specs and active reset latencies are well-documented on the product and technology pages.`,
    "IonQ Research",
    "validated",
    JSON.stringify([
      "OPX1000 Product Page — quantum-machines.co/products/opx1000/",
      "PPU Technology Page — quantum-machines.co/blog/ppu-scalable-quantum-control/",
      "DGX-Quantum Announcement — quantum-machines.co"
    ]),
    "public",
    8,
    0,
    "",
    "hardware_specs",
    "2026-02-19T09:00:00Z"
  );

  // ─── QM-004: OPX Simulator ───
  insert.run(
    4,
    "How do we simulate our QUA programs before deploying to the OPX 1000 hardware?",
    `SUMMARY

The OPX Simulator provides a software-based execution environment for QUA programs without needing physical OPX hardware. It allows you to develop, test, and debug quantum control programs on any development machine, then deploy the same code to hardware with no changes.

SETUP

1. Install the QM package:
   pip install qm-qua

2. Configure with simulation mode:

   from qm.QuantumMachinesManager import QuantumMachinesManager
   from qm.simulate import SimulationConfig

   qmm = QuantumMachinesManager()
   qm = qmm.open_qm(config)

   # Run in simulation mode
   job = qm.simulate(program, SimulationConfig(duration=1000))

3. Analyze results:

   # Get simulated output samples
   samples = job.get_simulated_samples()
   analog = samples.con1.analog

   # Inspect timing and waveforms
   # Plot with matplotlib or your preferred tool

WHAT THE SIMULATOR COVERS

- Full QUA program execution (loops, conditionals, variables)
- Pulse timing and sequencing
- Multi-element coordination (align, wait)
- Waveform output visualization
- State machine progression

WHAT THE SIMULATOR DOES NOT COVER

- Actual analog output signals (no hardware DACs)
- Real measurement data (no physical qubits)
- Precise analog performance characteristics
- Integration latencies with external equipment

WORKFLOW RECOMMENDATION

1. Develop QUA programs against the simulator locally
2. Validate timing, sequencing, and control flow
3. Deploy to OPX hardware for real measurements
4. Same code runs on both — no modifications needed

CLASSIFICATION: Public
CONFIDENCE: 9/10
Simulator usage is well-documented in the official QM docs and GitHub examples.`,
    "Rigetti Computing",
    "validated",
    JSON.stringify([
      "OPX Simulator Documentation — docs.quantum-machines.co",
      "QUA Language API — docs.quantum-machines.co/1.1.7/qm-qua-sdk/",
      "qua-platform GitHub — github.com/qua-platform",
      "QM Examples Repository — github.com/qua-platform/qua-libs"
    ]),
    "public",
    9,
    0,
    "",
    "software_integration",
    "2026-02-19T14:00:00Z"
  );

  // ─── QM-005: Output channel specs ───
  insert.run(
    5,
    "What are the output channel specifications for the OPX 1000? How many analog and digital channels per chassis?",
    `SUMMARY

Each OPX 1000 chassis supports up to 8 front-end modules (FEMs), with two module types available: LF-FEM for low-frequency control and MW-FEM for microwave-frequency control. The total channel count depends on your module configuration.

SPECIFICATIONS PER CHASSIS

- Up to 8 modules per chassis (any mix of LF-FEM and MW-FEM)
- Up to 24 analog output channels
- Up to 24 digital output channels
- 4 optical ports for inter-chassis data connectivity
- QSync port (Cat6 RJ45) for multi-chassis synchronization

MODULE TYPES

LF-FEM (Low Frequency Front-End Module):
- Designed for baseband and low-frequency pulse generation
- Direct analog output without upconversion

MW-FEM (Microwave Front-End Module):
- Designed for microwave-frequency control signals
- Integrated upconversion for GHz-range pulses
- Active reset latency: < 100 ns

Note: Specific frequency ranges and detailed analog specifications for each module type are available in the full spec sheet. For precise numbers, we recommend requesting the full OPX1000 specification sheet at quantum-machines.co/request-the-full-opx1000-spec-sheet/.

CLASSIFICATION: Public
CONFIDENCE: 7/10
Channel counts and module types are publicly documented. Detailed analog specs (frequency ranges, power output, phase coherence) require the full spec sheet.`,
    "Nordic Quantum",
    "draft",
    JSON.stringify([
      "OPX1000 Product Page — quantum-machines.co/products/opx1000/",
      "OPX1000 Installation Guide — docs.quantum-machines.co",
      "Request Full Spec Sheet — quantum-machines.co/request-the-full-opx1000-spec-sheet/"
    ]),
    "public",
    7,
    0,
    "MW-FEM frequency ranges are internal — direct customer to request full spec sheet rather than guessing at specific GHz values.",
    "hardware_specs",
    "2026-02-20T09:00:00Z"
  );
}

function seedMemoryContent() {
  const insert = db.prepare(
    "INSERT OR IGNORE INTO page_content (page_slug, content) VALUES (?, ?)"
  );

  // id=11, slug="memory/goal" — uses markdown + kpi_cards sections
  insert.run(
    "memory/goal",
    JSON.stringify({
      title: "Mission & Goal",
      sections: [
        {
          type: "markdown",
          title: "What We're Building",
          data: {
            content: "## QM Technical Support AI\n\nHelping Quantum Machines' customer-facing team answer technical questions about the OPX 1000 faster and better.\n\n**The problem:** Knowledge is siloed in 4 busy SMEs and scattered across Slack, JIRA, Confluence, and docs.\n\n**The solution:** An AI colleague that builds institutional memory — every question answered makes the next one easier.",
          },
        },
        {
          type: "kpi_cards",
          title: "Success Metrics",
          data: [
            { label: "Response time target", value: "Minutes", subtext: "from days" },
            { label: "Confidence threshold", value: "≥ 7/10", subtext: "on 80% of answers" },
            { label: "Copy-paste ready", value: "100%", subtext: "of answers" },
            { label: "KB coverage", value: "Growing", subtext: "every session" },
          ],
        },
      ],
    })
  );

  // id=12, slug="memory/profile" — uses key_value (pairs format) + contacts sections
  insert.run(
    "memory/profile",
    JSON.stringify({
      title: "User Profile",
      sections: [
        {
          type: "key_value",
          title: "About Micaela",
          data: {
            pairs: [
              { key: "Name", value: "Micaela Eichinger" },
              { key: "Role", value: "Product Manager at Quantum Machines" },
              { key: "Product Focus", value: "OPX 1000 (NOT Octave or OPX+)" },
              { key: "Working Style", value: "Direct, detail-oriented, prefers structured answers she can copy-paste to customers" },
              { key: "Values", value: "Accuracy over speed — would rather flag uncertainty than guess" },
            ],
          },
        },
        {
          type: "contacts",
          title: "Key Customers",
          data: [
            { name: "IonQ Research", status: "Active", description: "Multi-chassis and PPU latency questions. QM-001, QM-002, QM-003." },
            { name: "Rigetti Computing", status: "Active", description: "OPX Simulator integration. QM-004." },
            { name: "Nordic Quantum", status: "Active", description: "Output channel specs. QM-005." },
          ],
        },
      ],
    })
  );

  // id=13, slug="memory/principles" — uses checklist section
  insert.run(
    "memory/principles",
    JSON.stringify({
      title: "Working Principles",
      sections: [
        {
          type: "checklist",
          title: "How We Work Together",
          data: [
            { text: "Search KB first — Always check existing knowledge before answering from general knowledge", checked: true },
            { text: "Cite sources — Every answer includes sources and a confidence score", checked: true },
            { text: "Classification matters — Public, Internal, Restricted. Never share restricted info without flagging it", checked: true },
            { text: "Structured briefs — Answers are formatted ready to copy-paste to customers", checked: true },
            { text: "Log everything — Every Q&A becomes institutional memory via qa_entries", checked: true },
            { text: "Flag uncertainty — If confidence < 6/10, flag for SME review rather than guessing", checked: true },
            { text: "OPX 1000 only — Do not reference Octave or OPX+ (legacy products)", checked: true },
          ],
        },
      ],
    })
  );

  // id=14, slug="memory/lessons" — uses decisions section
  insert.run(
    "memory/lessons",
    JSON.stringify({
      title: "Lessons Learned",
      sections: [
        {
          type: "decisions",
          title: "Accumulated Wisdom",
          data: [
            {
              title: "MW-FEM frequency specs are internal",
              description: "Don't guess at specific GHz ranges. Direct customers to request the full spec sheet at quantum-machines.co/request-the-full-opx1000-spec-sheet/",
              status: "agreed",
            },
            {
              title: "Broadcast operations are essential for multi-chassis",
              description: "align() handles timing but NOT data sharing. Always mention broadcast.and_() / broadcast.or_() / broadcast.xor_() for cross-chassis state sharing. Available from QOP 3.3+.",
              status: "agreed",
            },
            {
              title: "DGX-Quantum latency is a key differentiator",
              description: "< 4-5μs round-trip for hybrid quantum-classical workloads. Approximately 1000x better than competing solutions. Lead with this for hybrid algorithm customers.",
              status: "agreed",
            },
            {
              title: "QUA implicit alignment in flow control",
              description: "for_/while_/if_ blocks auto-align all elements inside them. Most users don't need explicit align() calls. Simplifies cross-chassis programming.",
              status: "agreed",
            },
          ],
        },
      ],
    })
  );
}

export default db;
