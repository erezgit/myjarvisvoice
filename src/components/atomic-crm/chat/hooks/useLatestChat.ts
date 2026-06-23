import { useState, useEffect } from "react";
import type { ConversationSummary } from "@/shared/types";
import { useMemberConfig } from "@/components/atomic-crm/contexts/MemberConfigContext";
import { useAuthHeaders } from "@/hooks/useAuthHeaders";
import { useProjectName } from "./useProjectName";

interface LatestChatResult {
  latestSessionId: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch the latest chat session ID from conversation history.
 * Used to auto-load the most recent conversation on app startup.
 *
 * Ported from myjarvis-web/hooks/useLatestChat.ts — adapted for OS
 * (direct Fly.io agent with Supabase JWT auth, no Vercel proxy).
 */
export function useLatestChat(): LatestChatResult {
  const { chatUrl } = useMemberConfig();
  const { getAuthHeaders } = useAuthHeaders();
  const { projectName, loading: projectLoading } = useProjectName();
  const [latestSessionId, setLatestSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chatUrl || projectLoading || !projectName) {
      if (!projectLoading && !projectName) {
        // No project found — no history to load
        setLoading(false);
      }
      return;
    }

    const fetchLatestChat = async () => {
      try {
        setLoading(true);
        setError(null);

        const url = `${chatUrl}/api/projects/${projectName}/histories`;
        const headers = await getAuthHeaders();

        const response = await fetch(url, { headers });

        if (!response.ok) {
          throw new Error(`Failed to fetch histories: ${response.statusText}`);
        }

        const data = await response.json();
        const conversations: ConversationSummary[] = data.conversations || [];

        // Conversations are sorted newest-first by the agent's grouping.ts
        if (conversations.length > 0) {
          setLatestSessionId(conversations[0].sessionId);
        } else {
          setLatestSessionId(null);
        }
      } catch (err) {
        console.error("Error fetching latest chat:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch latest chat");
        setLatestSessionId(null);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestChat();
  }, [chatUrl, getAuthHeaders, projectName, projectLoading]);

  return { latestSessionId, loading, error };
}
