# MyJarvis Desktop — Database API Guide

A SQLite Express server runs on **http://localhost:3001**. Use `curl` to query and write data.
The UI updates automatically via SSE when data changes.

---

## How to Query

```bash
# List a resource
curl -s 'http://localhost:3001/api/contacts'

# Get one by ID
curl -s 'http://localhost:3001/api/contacts/1'

# Create
curl -s -X POST http://localhost:3001/api/contacts \
  -H 'Content-Type: application/json' \
  -d '{"first_name":"John","last_name":"Smith","status":"active"}'

# Update
curl -s -X PUT http://localhost:3001/api/contacts/1 \
  -H 'Content-Type: application/json' \
  -d '{"first_name":"John","last_name":"Doe"}'

# Delete
curl -s -X DELETE http://localhost:3001/api/contacts/1

# Filter
curl -s 'http://localhost:3001/api/contacts?filter={"status@eq":"active"}'
```

Filter operators: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `is`, `in`, `ilike`

---

## Tables

| Table | Description |
|-------|-------------|
| contacts | Clients/leads — name, email, phone, lifecycle |
| companies | Organizations |
| tasks | Follow-up tasks linked to contacts |
| contact_notes | Notes on contacts |
| orders | Orders linked to contacts |
| members | Team members with roles |
| tags | Labels for contacts |
| kb_pages | Knowledge base sidebar entries |
| page_content | KB page content (JSON blobs) |
| automations | Saved automation prompts |
| automation_runs | Automation execution history |
| meetings | Meeting records |

---

## Key Tables

### contacts
```
id, first_name, last_name, title, gender
email_jsonb: [{"type":"Work","email":"..."}] (JSON array)
phone_jsonb: [{"type":"mobile","phone":"+972-..."}] (JSON array)
avatar (JSON), tags (JSON array)
company_id (FK → companies), company_name
status: active | inactive
lifecycle_stage, lead_source, activity_status, qualification_status
readiness_to_book, lost_reason, lead_bio
followup_prompt, followup_date, date_of_birth
first_seen, last_seen, last_contact_at
has_newsletter (boolean)
client_preferences (JSON), member_id (FK → members)
```

### tasks
```
id, contact_id (FK, required, cascade delete), member_id
type (text), text (description)
due_date, done_date
```

### orders
```
id, contact_id (FK, required, cascade delete), member_id
status: pending | processing | shipped | completed | cancelled
order_date, order_number, description
expected_delivery, completed_date
total_amount (numeric), open_balance (numeric), notes
```

### contact_notes
```
id, contact_id (FK, cascade delete), member_id
text, date, status
attachments (JSON array)
```

### companies
```
id, name, sector, size, website, linkedin_url
logo (JSON), context_links (JSON)
member_id (FK → members)
```

### members
```
id, user_id (auto-generated), email (unique)
first_name, last_name, avatar (JSON)
role: admin | manager | member
administrator (boolean), disabled (boolean)
```

### kb_pages (Sidebar Navigation)
```
id, slug (unique), title, icon (lucide icon name), sort_order
created_at, updated_at
```

### page_content (KB Page Data)
```
id, page_slug (unique), content (JSON string), updated_at
```

### meetings
```
id, title, date, duration, location
attendees (JSON array), recording, summary
content (JSON), status: scheduled | completed | cancelled
```

### automations
```
id, name, prompt, schedule, enabled, last_run_at
```

---

## Common Operations

### Create a contact with email
```bash
curl -s -X POST http://localhost:3001/api/contacts \
  -H 'Content-Type: application/json' \
  -d '{"first_name":"John","last_name":"Smith","email_jsonb":[{"email":"john@example.com","type":"work"}],"company_name":"Acme Corp","status":"active"}'
```

### Create a task (requires contact_id)
```bash
curl -s -X POST http://localhost:3001/api/tasks \
  -H 'Content-Type: application/json' \
  -d '{"contact_id":1,"type":"follow-up","text":"Review the proposal","due_date":"2026-03-15"}'
```

### Complete a task
```bash
curl -s -X PUT http://localhost:3001/api/tasks/1 \
  -H 'Content-Type: application/json' \
  -d '{"done_date":"2026-03-10"}'
```

### Create an order (requires contact_id)
```bash
curl -s -X POST http://localhost:3001/api/orders \
  -H 'Content-Type: application/json' \
  -d '{"contact_id":1,"status":"pending","order_number":"ORD-001","description":"Web design project","total_amount":5000}'
```

### Create a KB page + content
```bash
# Step 1: Create the page entry
curl -s -X POST http://localhost:3001/api/kb_pages \
  -H 'Content-Type: application/json' \
  -d '{"slug":"my-page","title":"My Page","icon":"FileText","sort_order":10}'

# Step 2: Add content
curl -s -X POST http://localhost:3001/api/page_content \
  -H 'Content-Type: application/json' \
  -d '{"page_slug":"my-page","content":"{\"title\":\"My Page\",\"sections\":[{\"type\":\"markdown\",\"title\":\"Overview\",\"data\":{\"content\":\"Hello World\"}}]}"}'
```

### Create a meeting
```bash
curl -s -X POST http://localhost:3001/api/meetings \
  -H 'Content-Type: application/json' \
  -d '{"title":"Team Standup","date":"2026-03-15","duration":"30m","attendees":"[\"Erez\",\"Yaron\"]","status":"scheduled"}'
```

### Add a note to a contact
```bash
curl -s -X POST http://localhost:3001/api/contact_notes \
  -H 'Content-Type: application/json' \
  -d '{"contact_id":1,"text":"Called to discuss proposal.","date":"2026-03-10"}'
```

---

## Notes

- `member_id = 1` is the owner. Use this for all agent-created records.
- `email_jsonb` and `phone_jsonb` are JSON arrays, not plain text.
- Tasks and orders REQUIRE a `contact_id` — create a contact first if needed.
- `page_content.content` is a JSON string — each page defines its own shape.
- The frontend auto-refreshes via SSE when you create/update/delete data.
- Health check: `curl http://localhost:3001/api/health`
