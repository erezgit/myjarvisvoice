import { useCallback } from "react";

const isSqliteMode = import.meta.env.VITE_APP_MODE === "sqlite";

/**
 * Centralized auth header hook for all Fly machine API calls.
 * In SQLite/desktop mode: no auth needed, just Content-Type.
 * In cloud mode: Supabase JWT token.
 */
export function useAuthHeaders() {
  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    if (isSqliteMode) {
      return { "Content-Type": "application/json" };
    }

    const { supabase } = await import("@/components/atomic-crm/providers/supabase/supabase");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error("Not authenticated — please log in");
    }
    return {
      "Authorization": `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    };
  }, []);

  return { getAuthHeaders };
}
