import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../providers/supabase/supabase";
import { subscribeServerEvents } from "@/lib/serverEvents";

const isSupabaseMode = import.meta.env.VITE_APP_MODE === "supabase";

/**
 * Tables the agent (or other external sources) may write to.
 * When a change is detected, we invalidate the React Query cache
 * for that resource so the UI auto-refreshes.
 */
const WATCHED_TABLES = [
  "contacts",
  "orders",
  "tasks",
  "contact_notes",
  "members",
  "page_content",
  "kb_pages",
  "automations",
  "automation_runs",
  "meetings",
  "action_items",
] as const;

/**
 * Subscribes to data change notifications on all key tables.
 *
 * - Supabase mode: postgres_changes via Supabase Realtime
 * - SQLite mode: SSE from Express server at /api/events
 *
 * When any change happens (from agent or any external source),
 * invalidates the corresponding React Query cache → UI auto-refreshes.
 */
export function useRealtimeRefresh() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isSupabaseMode) {
      // Supabase mode: subscribe to postgres_changes
      const channel = supabase.channel("agent-changes");

      for (const table of WATCHED_TABLES) {
        channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          () => {
            queryClient.invalidateQueries({ queryKey: [table] });
            queryClient.invalidateQueries({
              queryKey: [`${table}_summary`],
            });
          },
        );
      }

      channel.subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }

    // SQLite mode: SSE from Express server
    // Must use /preview/api/ path to go through the Vite proxy chain
    // (outer app proxies /preview/* → Vite → Vite proxy rewrites to Express at :3001)
    const sseUrl = import.meta.env.DEV
      ? `${import.meta.env.BASE_URL?.replace(/\/$/, "") || ""}/api/events`
      : "http://localhost:3001/api/events";
    // One shared socket per URL for the whole app. A per-hook EventSource is
    // what exhausted the browser's six-per-origin budget — lib/serverEvents.ts.
    return subscribeServerEvents((resource) => {
      queryClient.invalidateQueries({ queryKey: [resource] });
      queryClient.invalidateQueries({ queryKey: [`${resource}_summary`] });
    }, sseUrl);
  }, [queryClient]);
}
