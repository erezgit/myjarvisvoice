/**
 * Parse PostgREST-style @operator filters into SQL WHERE clauses.
 *
 * Input format (from react-admin filter object):
 *   { "status@eq": "active", "nb_tasks@gt": 5, "@or": { "first_name@ilike": "john" } }
 *
 * Output: { where: "status = ? AND nb_tasks > ?", params: ["active", 5] }
 */

// JSON columns that need special handling
const JSON_COLUMNS = new Set([
  "email_jsonb",
  "phone_jsonb",
  "tags",
  "avatar",
  "logo",
  "attachments",
  "context_links",
  "client_preferences",
]);

export function parseFilters(filter: Record<string, any>): {
  where: string;
  params: any[];
} {
  if (!filter || Object.keys(filter).length === 0) {
    return { where: "1=1", params: [] };
  }

  const clauses: string[] = [];
  const params: any[] = [];

  for (const [key, value] of Object.entries(filter)) {
    // Handle @or (full-text search)
    if (key === "@or" && typeof value === "object") {
      const orClauses: string[] = [];
      for (const [orKey, orValue] of Object.entries(value as Record<string, any>)) {
        const parsed = parseSingleFilter(orKey, orValue);
        if (parsed) {
          orClauses.push(parsed.clause);
          params.push(...parsed.params);
        }
      }
      if (orClauses.length > 0) {
        clauses.push(`(${orClauses.join(" OR ")})`);
      }
      continue;
    }

    // Handle q (simple text search fallback)
    if (key === "q" && typeof value === "string") {
      clauses.push(
        "(first_name LIKE ? OR last_name LIKE ? OR company_name LIKE ?)"
      );
      const likeVal = `%${value}%`;
      params.push(likeVal, likeVal, likeVal);
      continue;
    }

    const parsed = parseSingleFilter(key, value);
    if (parsed) {
      clauses.push(parsed.clause);
      params.push(...parsed.params);
    }
  }

  return {
    where: clauses.length > 0 ? clauses.join(" AND ") : "1=1",
    params,
  };
}

function parseSingleFilter(
  key: string,
  value: any
): { clause: string; params: any[] } | null {
  // field@operator format
  const atIndex = key.lastIndexOf("@");

  if (atIndex === -1) {
    // Plain equality: field = value
    const column = sanitizeColumn(key);
    if (!column) return null;

    if (value === null || value === undefined) {
      return { clause: `${column} IS NULL`, params: [] };
    }
    return { clause: `${column} = ?`, params: [value] };
  }

  const field = key.substring(0, atIndex);
  const operator = key.substring(atIndex + 1);
  const column = sanitizeColumn(field);
  if (!column) return null;

  switch (operator) {
    case "eq":
      if (value === null) return { clause: `${column} IS NULL`, params: [] };
      return { clause: `${column} = ?`, params: [value] };

    case "neq":
      if (value === null)
        return { clause: `${column} IS NOT NULL`, params: [] };
      return { clause: `${column} != ?`, params: [value] };

    case "gt":
      return { clause: `${column} > ?`, params: [value] };

    case "gte":
      return { clause: `${column} >= ?`, params: [value] };

    case "lt":
      return { clause: `${column} < ?`, params: [value] };

    case "lte":
      return { clause: `${column} <= ?`, params: [value] };

    case "is":
      if (value === null || value === "null") {
        return { clause: `${column} IS NULL`, params: [] };
      }
      return { clause: `${column} = ?`, params: [value] };

    case "not.is":
      if (value === null || value === "null") {
        return { clause: `${column} IS NOT NULL`, params: [] };
      }
      return { clause: `${column} != ?`, params: [value] };

    case "in": {
      // Value is "(val1,val2,val3)" string
      const items = parseInValue(value);
      if (items.length === 0) return null;
      const placeholders = items.map(() => "?").join(",");
      return { clause: `${column} IN (${placeholders})`, params: items };
    }

    case "cs": {
      // Contains for JSON arrays (tags). Value is "{1,2,3}"
      const items = parseContainsValue(value);
      if (items.length === 0) return null;
      // For JSON arrays stored as text, use json_each
      const jsonClauses = items.map(
        () =>
          `EXISTS (SELECT 1 FROM json_each(${column}) WHERE json_each.value = ?)`
      );
      return {
        clause: `(${jsonClauses.join(" AND ")})`,
        params: items,
      };
    }

    case "ilike": {
      // Case-insensitive LIKE
      const likeVal =
        typeof value === "string" && !value.includes("%")
          ? `%${value}%`
          : value;

      // For JSON columns (email_jsonb, phone_jsonb), search inside the JSON text
      if (JSON_COLUMNS.has(field) || field.endsWith("_fts")) {
        const actualColumn = field.endsWith("_fts")
          ? field.replace("_fts", "_jsonb")
          : field;
        return {
          clause: `${sanitizeColumn(actualColumn) || column} LIKE ? COLLATE NOCASE`,
          params: [likeVal],
        };
      }

      return {
        clause: `${column} LIKE ? COLLATE NOCASE`,
        params: [likeVal],
      };
    }

    default:
      // Unknown operator, treat as equality
      return { clause: `${column} = ?`, params: [value] };
  }
}

function parseInValue(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    // Parse "(val1,val2,val3)" format
    const stripped = value.replace(/^\(/, "").replace(/\)$/, "");
    if (!stripped) return [];
    return stripped.split(",").map((v) => v.trim());
  }
  return [value];
}

function parseContainsValue(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    // Parse "{1,2,3}" format
    const stripped = value.replace(/^\{/, "").replace(/\}$/, "");
    if (!stripped) return [];
    return stripped.split(",").map((v) => {
      const trimmed = v.trim();
      const num = Number(trimmed);
      return isNaN(num) ? trimmed : num;
    });
  }
  return [value];
}

// Whitelist of valid column names to prevent SQL injection
const VALID_COLUMNS = new Set([
  "id",
  "first_name",
  "last_name",
  "title",
  "company_id",
  "company_name",
  "email_jsonb",
  "phone_jsonb",
  "avatar",
  "gender",
  "background",
  "linkedin_url",
  "tags",
  "first_seen",
  "last_seen",
  "last_contact_at",
  "has_newsletter",
  "nb_tasks",
  "lifecycle_stage",
  "status",
  "lead_source",
  "activity_status",
  "qualification_status",
  "readiness_to_book",
  "lost_reason",
  "lead_bio",
  "followup_prompt",
  "followup_date",
  "date_of_birth",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "manychat_id",
  "client_preferences",
  "member_id",
  "name",
  "logo",
  "sector",
  "size",
  "website",
  "phone_number",
  "address",
  "zipcode",
  "city",
  "state_abbr",
  "country",
  "description",
  "revenue",
  "tax_identifier",
  "context_links",
  "nb_contacts",
  "created_at",
  "updated_at",
  "contact_id",
  "text",
  "date",
  "attachments",
  "type",
  "due_date",
  "done_date",
  "order_date",
  "order_number",
  "expected_delivery",
  "completed_date",
  "total_amount",
  "open_balance",
  "notes",
  "color",
  "user_id",
  "email",
  "password",
  "role",
  "administrator",
  "disabled",
  "contact_first_name",
  "contact_last_name",
  "member_first_name",
  "member_last_name",
  // page_content columns
  "page_slug",
  "content",
  // kb_pages columns
  "slug",
  "icon",
  "sort_order",
]);

function sanitizeColumn(name: string): string | null {
  if (VALID_COLUMNS.has(name)) return name;
  // Allow _fts suffix (mapped to real column in ilike handler)
  if (name.endsWith("_fts") && VALID_COLUMNS.has(name.replace("_fts", "_jsonb"))) {
    return name;
  }
  return null;
}
