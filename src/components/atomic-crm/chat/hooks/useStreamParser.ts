import { useCallback } from "react";
import { useQueryClient } from '@tanstack/react-query';
import type {
  StreamResponse,
  SDKMessage,
  SystemMessage,
  AbortMessage,
  TokenUsageMessage,
  AllMessage,
  ChatMessage,
} from "../types";
import {
  isSystemMessage,
  isAssistantMessage,
  isResultMessage,
  isUserMessage,
} from "../utils/messageTypes";
import type { ProcessingContext } from "../utils/UnifiedMessageProcessor";
import { useMessageProcessor } from "../contexts/MessageProcessorContext";

/**
 * StreamingContext — the callbacks the streaming loop needs to update UI state.
 * This was previously imported from useMessageProcessor (which doesn't exist in chat module).
 * Defined inline here for self-containment.
 */
export interface StreamingContext {
  // Current assistant message state (for streaming)
  currentAssistantMessage: ChatMessage | null;
  setCurrentAssistantMessage: (message: ChatMessage | null) => void;

  // Core message handling
  addMessage: (message: AllMessage) => void;
  updateLastMessage: (content: string | Partial<ChatMessage>) => void;

  // Session handling
  onSessionId?: (sessionId: string) => void;
  hasReceivedInit?: boolean;
  setHasReceivedInit?: (received: boolean) => void;

  // Init message handling
  shouldShowInitMessage?: () => boolean;
  onInitMessageShown?: () => void;

  // Permission/Error handling
  onPermissionError?: (toolName: string, patterns: string[], toolUseId: string) => void;
  onAbortRequest?: () => void;

  // Token usage tracking
  onTokenUpdate?: (usage: any) => void;

  // User ID
  userId?: string;
}

export function useStreamParser() {
  // Use the singleton processor instance from context
  // This ensures cache continuity across component remounts
  const processor = useMessageProcessor();

  // Get query client for cache invalidation
  const queryClient = useQueryClient();

  // Convert StreamingContext to ProcessingContext
  const adaptContext = useCallback(
    (context: StreamingContext): ProcessingContext => {
      return {
        // Core message handling
        addMessage: context.addMessage,
        updateLastMessage: context.updateLastMessage,

        // Current assistant message state
        currentAssistantMessage: context.currentAssistantMessage,
        setCurrentAssistantMessage: context.setCurrentAssistantMessage,

        // Session handling
        onSessionId: context.onSessionId,
        hasReceivedInit: context.hasReceivedInit,
        setHasReceivedInit: context.setHasReceivedInit,

        // Init message handling
        shouldShowInitMessage: context.shouldShowInitMessage,
        onInitMessageShown: context.onInitMessageShown,

        // Permission/Error handling
        onPermissionError: context.onPermissionError,
        onAbortRequest: context.onAbortRequest,

        // Token usage tracking
        onTokenUpdate: context.onTokenUpdate,

        // User ID for user identification
        userId: context.userId,
      };
    },
    [],
  );

  const processClaudeData = useCallback(
    async (claudeData: SDKMessage, context: StreamingContext) => {
      const processingContext = adaptContext(context);

      // Validate message types before processing
      switch (claudeData.type) {
        case "system":
          if (!isSystemMessage(claudeData)) {
            console.warn("Invalid system message:", claudeData);
            return;
          }
          break;
        case "assistant":
          if (!isAssistantMessage(claudeData)) {
            console.warn("Invalid assistant message:", claudeData);
            return;
          }
          break;
        case "result":
          if (!isResultMessage(claudeData)) {
            console.warn("Invalid result message:", claudeData);
            return;
          }
          break;
        case "user":
          if (!isUserMessage(claudeData)) {
            console.warn("Invalid user message:", claudeData);
            return;
          }
          break;
        default:
          console.log("Unknown Claude message type:", claudeData);
          return;
      }

      // Process the message using the unified processor
      await processor.processMessage(claudeData, processingContext, {
        isStreaming: true,
        userId: context.userId,
      });
    },
    [processor, adaptContext],
  );

  const processStreamLine = useCallback(
    (line: string, context: StreamingContext): { isHtmlDetected?: boolean } => {
      try {
        // Strip SSE "data: " prefix if present (backend sends SSE format)
        const jsonLine = line.startsWith("data: ") ? line.slice(6) : line;
        // Skip SSE comments (heartbeats/pings)
        if (line.startsWith(":")) return {};

        const data: StreamResponse = JSON.parse(jsonLine);


        // Handle normalized SSE types (new backend format)
        if (data.type === "text" && data.content) {
          // Reconstruct as SDK-shaped message for the unified processor
          processClaudeData(
            {
              type: "assistant",
              message: { content: [{ type: "text", text: data.content }] },
            } as SDKMessage,
            context,
          ).catch(error => {
            console.error('[STREAM-PARSER] Error processing text:', error);
          });
        } else if (data.type === "tool_use") {
          processClaudeData(
            {
              type: "assistant",
              message: {
                content: [
                  {
                    type: "tool_use",
                    name: data.name,
                    input: data.input,
                    id: data.id,
                  },
                ],
              },
            } as SDKMessage,
            context,
          ).catch(error => {
            console.error('[STREAM-PARSER] Error processing tool_use:', error);
          });
        } else if (data.type === "session_init" && data.session_id) {
          context.onSessionId?.(data.session_id);
        } else if (data.type === "done") {
          // Stream complete — reset assistant message state
          context.setCurrentAssistantMessage(null);
        } else if (data.type === "claude_json" && data.data) {
          // Legacy format: data.data is already an SDKMessage object
          const claudeData = data.data as SDKMessage;
          processClaudeData(claudeData, context).catch(error => {
            console.error('[STREAM-PARSER] Error processing Claude data:', error);
          });
        } else if (data.type === "ping") {
          // Mobile keep-alive ping - ignore silently
        } else if (data.type === "error") {
          const errorMessage: SystemMessage = {
            type: "error",
            subtype: "stream_error",
            message: data.error || "Unknown error",
            timestamp: Date.now(),
          };
          context.addMessage(errorMessage);
        } else if (data.type === "aborted") {
          const abortedMessage: AbortMessage = {
            type: "system",
            subtype: "abort",
            message: "Operation was aborted by user",
            timestamp: Date.now(),
          };
          context.addMessage(abortedMessage);
          context.setCurrentAssistantMessage(null);
        } else if (data.type === "token_update") {
          // Handle token updates for progress bar
          if (context.onTokenUpdate && data.usage) {
            context.onTokenUpdate(data.usage);
          }
        } else if (data.type === "file_synced") {
          // Handle file sync notification from backend
          const fileSyncData = data as any; // Type cast for now
          if (fileSyncData.path) {
            // Invalidate the specific file and its parent directory
            queryClient.invalidateQueries({
              queryKey: ['fileTree', fileSyncData.path]
            });

            // Also invalidate parent directory
            const parentPath = fileSyncData.path.substring(0, fileSyncData.path.lastIndexOf('/')) || '/';
            queryClient.invalidateQueries({
              queryKey: ['fileTree', parentPath]
            });

            console.log(`[CACHE] Invalidated cache for synced file: ${fileSyncData.path}`);
          }
        }
        // Other types (rate_limit_event, etc.) silently ignored
      } catch (parseError) {
        console.error("Failed to parse stream line:", parseError);
      }

      return {};
    },
    [processClaudeData, queryClient],
  );

  return {
    processStreamLine,
  };
}
