import { useState, useEffect, useCallback } from "react";
import type { AllMessage, TimestampedSDKMessage } from "../types";
import type { ConversationHistory, TokenUsage } from "@/shared/types";
import { useMemberConfig } from "@/components/atomic-crm/contexts/MemberConfigContext";
import { useMessageProcessor } from "../contexts/MessageProcessorContext";
import { useAuthHeaders } from "@/hooks/useAuthHeaders";
import { useProjectName } from "./useProjectName";

interface HistoryLoaderState {
  messages: AllMessage[];
  loading: boolean;
  error: string | null;
  sessionId: string | null;
  tokenUsage: TokenUsage | null;
}

interface HistoryLoaderResult extends HistoryLoaderState {
  loadHistory: (sessionId: string) => Promise<void>;
  clearHistory: () => void;
}

// Type guard to check if a message is a TimestampedSDKMessage
function isTimestampedSDKMessage(
  message: unknown,
): message is TimestampedSDKMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    "timestamp" in message &&
    typeof (message as { timestamp: unknown }).timestamp === "string"
  );
}

/**
 * Hook for loading and converting conversation history from the agent.
 *
 * Ported from myjarvis-web/hooks/useHistoryLoader.ts — adapted for OS
 * (direct Fly.io agent with Supabase JWT, no encodedProjectName).
 */
export function useHistoryLoader(baseUrl?: string): HistoryLoaderResult {
  const { chatUrl } = useMemberConfig();
  const { getAuthHeaders } = useAuthHeaders();
  const { projectName } = useProjectName();
  const processor = useMessageProcessor();
  const effectiveUrl = baseUrl || chatUrl;

  const [state, setState] = useState<HistoryLoaderState>({
    messages: [],
    loading: false,
    error: null,
    sessionId: null,
    tokenUsage: null,
  });

  const loadHistory = useCallback(
    async (sessionId: string) => {
      if (!sessionId || !projectName) {
        setState((prev) => ({
          ...prev,
          error: !sessionId ? "Session ID is required" : "Project not resolved yet",
        }));
        return;
      }

      try {
        setState((prev) => ({
          ...prev,
          loading: true,
          error: null,
        }));

        const url = `${effectiveUrl}/api/projects/${projectName}/histories/${sessionId}`;

        const headers = await getAuthHeaders();
        const response = await fetch(url, { headers });

        if (!response.ok) {
          throw new Error(
            `Failed to load conversation: ${response.status} ${response.statusText}`,
          );
        }

        const conversationHistory: ConversationHistory = await response.json();

        if (
          !conversationHistory.messages ||
          !Array.isArray(conversationHistory.messages)
        ) {
          throw new Error("Invalid conversation history format");
        }

        // Convert unknown[] to TimestampedSDKMessage[] with type checking
        const timestampedMessages: TimestampedSDKMessage[] = [];
        for (const msg of conversationHistory.messages) {
          if (isTimestampedSDKMessage(msg)) {
            timestampedMessages.push(msg);
          } else {
            console.warn("Skipping invalid message in history:", msg);
          }
        }

        // Convert to frontend message format using singleton processor
        const convertedMessages = await processor.processMessagesBatch(timestampedMessages);

        setState((prev) => ({
          ...prev,
          messages: convertedMessages,
          loading: false,
          sessionId: conversationHistory.sessionId,
          tokenUsage: conversationHistory.tokenUsage || null,
        }));
      } catch (error) {
        console.error("Error loading conversation history:", error);

        setState((prev) => ({
          ...prev,
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to load conversation history",
        }));
      }
    },
    [processor, effectiveUrl, getAuthHeaders, projectName],
  );

  const clearHistory = useCallback(() => {
    setState({
      messages: [],
      loading: false,
      error: null,
      sessionId: null,
      tokenUsage: null,
    });
  }, []);

  return {
    ...state,
    loadHistory,
    clearHistory,
  };
}

/**
 * Hook for auto-loading conversation history when sessionId changes.
 *
 * Ported from myjarvis-web/hooks/useHistoryLoader.ts
 */
export function useAutoHistoryLoader(
  sessionId?: string,
  baseUrl?: string,
): HistoryLoaderResult {
  const historyLoader = useHistoryLoader(baseUrl);

  useEffect(() => {
    if (sessionId) {
      historyLoader.loadHistory(sessionId);
    } else {
      historyLoader.clearHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return historyLoader;
}
