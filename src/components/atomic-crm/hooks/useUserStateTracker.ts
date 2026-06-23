import { useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { useGetIdentity } from "ra-core";
import { supabase } from "../providers/supabase/supabase";

const isSupabaseMode = import.meta.env.VITE_APP_MODE === "supabase";

/**
 * Parse a React Router pathname into resource/record info.
 * Examples:
 *   "/" → { resource: null, recordId: null }
 *   "/contacts" → { resource: "contacts", recordId: null }
 *   "/contacts/42" → { resource: "contacts", recordId: 42 }
 *   "/contacts/42/show" → { resource: "contacts", recordId: 42 }
 *   "/contacts/create" → { resource: "contacts", recordId: null }
 */
function parseRoute(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  const resource = parts[0] || null;
  const maybeId = parts[1] ? Number(parts[1]) : null;
  const recordId = maybeId && !isNaN(maybeId) ? maybeId : null;
  return { resource, recordId };
}

/**
 * Tracks user navigation and writes to the user_state table in Supabase.
 * The agent queries this table to know what the user is looking at.
 *
 * No-op in SQLite mode (no Supabase backend).
 */
export function useUserStateTracker() {
  const location = useLocation();
  const { identity } = useGetIdentity();
  const lastPath = useRef("");

  useEffect(() => {
    if (!isSupabaseMode) return;
    if (!identity?.id || location.pathname === lastPath.current) return;
    lastPath.current = location.pathname;

    const { resource, recordId } = parseRoute(location.pathname);

    // Get auth user ID from current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user?.id) return;

      supabase
        .from("user_state")
        .upsert(
          {
            user_id: session.user.id,
            member_id: identity.id,
            current_path: location.pathname,
            current_resource: resource,
            current_record_id: recordId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        )
        .then(({ error }) => {
          if (error) {
            console.warn("[user_state] upsert failed:", error.message);
          }
        });
    });
  }, [location.pathname, identity]);
}
