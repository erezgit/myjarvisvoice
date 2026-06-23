import { useEffect, useCallback, useState, useRef } from "react";
import type {
  ChatRequest,
  ChatMessage,
  PermissionMode,
} from "../types";
import { useClaudeStreaming } from "../hooks/useClaudeStreaming";
import { useChatStateContext } from "../contexts/ChatStateContext";
import { usePermissions } from "../hooks/usePermissions";
import { useLatestChat } from "../hooks/useLatestChat";
import { useAutoHistoryLoader } from "../hooks/useHistoryLoader";
import { ChatInput } from "./ChatInput";
import { ChatMessages } from "./ChatMessages";
import { KEYBOARD_SHORTCUTS } from "../utils/constants";
import type { StreamingContext } from "../hooks/useStreamParser";
import { useTokenUsage } from "../contexts/TokenUsageContext";
import { FileOperationDetector } from "../utils/FileOperationDetector";
import { useMemberConfig } from "@/components/atomic-crm/contexts/MemberConfigContext";
import { useAuthHeaders } from "@/hooks/useAuthHeaders";

interface OsChatPageProps {
  className?: string;
}

export function OsChatPage({ className }: OsChatPageProps) {
  const { chatUrl, automationUrl } = useMemberConfig();
  const { getAuthHeaders } = useAuthHeaders();
  const { setTokenUsage } = useTokenUsage();

  // When viewing an automation chat, messages route to automationUrl (OS machine)
  const [isAutomationSession, setIsAutomationSession] = useState(false);
  const targetUrl = isAutomationSession ? automationUrl : chatUrl;

  // Default to bypassPermissions — matches myjarvis-web behavior.
  // The agent auto-approves all tool use, no permission popups.
  const [permissionMode, setPermissionMode] = useState<PermissionMode>("bypassPermissions");

  const {
    messages,
    input,
    isLoading,
    currentSessionId,
    currentRequestId,
    currentAssistantMessage,
    setMessages,
    setInput,
    setCurrentSessionId,
    setCurrentAssistantMessage,
    addMessage,
    updateLastMessage,
    clearInput,
    generateRequestId,
    resetRequestState,
    startRequest,
    resetChat,
  } = useChatStateContext();

  const { processStreamLine } = useClaudeStreaming();

  // Native AbortController for cancelling fetch requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // --- Session persistence: auto-load latest chat on mount ---
  const { latestSessionId, loading: latestLoading } = useLatestChat();

  // Track whether we've attempted initial auto-load (prevents re-triggering on New Chat)
  const hasAttemptedInitialLoad = useRef(false);

  // Initialize with latest chat on mount (only once, never re-trigger)
  useEffect(() => {
    if (!hasAttemptedInitialLoad.current && !currentSessionId && latestSessionId && !latestLoading) {
      setCurrentSessionId(latestSessionId);
      hasAttemptedInitialLoad.current = true;
    }
  }, [latestSessionId, latestLoading, currentSessionId, setCurrentSessionId]);

  // --- History loading: fetch conversation messages when sessionId changes ---
  const {
    messages: historyMessages,
    loading: historyLoading,
    sessionId: loadedSessionId,
    tokenUsage: loadedTokenUsage,
    clearHistory,
  } = useAutoHistoryLoader(currentSessionId || undefined, isAutomationSession ? automationUrl : undefined);

  // Load history messages into shared state (prevent duplicates during streaming)
  useEffect(() => {
    if (historyMessages && historyMessages.length > 0 && messages.length === 0) {
      setMessages(historyMessages);
    }
  }, [historyMessages, setMessages, messages.length]);

  // Sync loaded session ID
  useEffect(() => {
    if (loadedSessionId) {
      setCurrentSessionId(loadedSessionId);
    }
  }, [loadedSessionId, setCurrentSessionId]);

  // Update token context bar when history loads with token usage data
  useEffect(() => {
    if (loadedTokenUsage) {
      setTokenUsage({
        tokens_used: loadedTokenUsage.total,
        max_tokens: 200000,
        percentage: (loadedTokenUsage.total / 200000) * 100,
        inputTokens: loadedTokenUsage.inputTokens,
        outputTokens: loadedTokenUsage.outputTokens,
        cacheCreationTokens: loadedTokenUsage.cacheCreationTokens,
        cacheReadTokens: loadedTokenUsage.cacheReadTokens,
      });
    }
  }, [loadedTokenUsage, setTokenUsage]);

  // --- Derived state ---
  const isInitializing = latestLoading || historyLoading;
  const showGreeting = !isInitializing && messages.length === 0;

  const {
    allowedTools,
    permissionRequest,
    showPermissionRequest,
    closePermissionRequest,
    allowToolTemporary,
    allowToolPermanent,
    planModeRequest,
    showPlanModeRequest,
    closePlanModeRequest,
    updatePermissionMode,
  } = usePermissions({
    onPermissionModeChange: setPermissionMode,
  });

  const handlePermissionError = useCallback(
    (toolName: string, patterns: string[], toolUseId: string) => {
      if (patterns.includes("ExitPlanMode")) {
        showPlanModeRequest("");
      } else {
        showPermissionRequest(toolName, patterns, toolUseId);
      }
    },
    [showPermissionRequest, showPlanModeRequest],
  );

  const sendMessage = useCallback(
    async (
      messageContent?: string,
      tools?: string[],
      hideUserMessage = false,
      overridePermissionMode?: PermissionMode,
    ) => {
      const content = messageContent || input.trim();
      if (!content || isLoading) return;

      const requestId = generateRequestId();

      if (!hideUserMessage) {
        const userMessage: ChatMessage = {
          type: "chat",
          role: "user",
          content: content,
          timestamp: Date.now(),
        };
        addMessage(userMessage);
      }

      if (!messageContent) clearInput();
      startRequest();

      try {
        const chatRequestBody: ChatRequest = {
          message: content,
          requestId,
          ...(currentSessionId ? { sessionId: currentSessionId } : {}),
          ...(permissionMode === "bypassPermissions" ? {} : { allowedTools: tools || allowedTools }),
          workingDirectory: import.meta.env.VITE_APP_MODE === "sqlite" ? undefined : "/home/node",
          permissionMode: overridePermissionMode || permissionMode,
        };

        const fileDetector = new FileOperationDetector();

        // Get auth headers (throws if not authenticated)
        const authHeaders = await getAuthHeaders();

        // Native AbortController — client-side fetch cancellation (Option B)
        const controller = new AbortController();
        abortControllerRef.current = controller;

        if (controller.signal.aborted) throw new DOMException("Aborted", "AbortError");

        const response = await fetch(`${targetUrl}/api/chat`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify(chatRequestBody),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Agent error (${response.status}): ${errorText}`);
        }

        if (!response?.body) {
          throw new Error("No response body");
        }

        // Process NDJSON stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let receivedSessionId = false;

        // Local tracking variable to avoid stale closure on React state.
        // The getter ensures the UMP always reads the latest value.
        let localAssistantMsg: ChatMessage | null = null;

        const streamContext: StreamingContext = {
          get currentAssistantMessage() { return localAssistantMsg; },
          setCurrentAssistantMessage: (msg: ChatMessage | null) => {
            localAssistantMsg = msg;
            setCurrentAssistantMessage(msg);
          },
          addMessage,
          updateLastMessage,
          onPermissionError: handlePermissionError,
          onTokenUpdate: setTokenUsage,
          onSessionId: (id: string) => {
            if (!receivedSessionId) {
              setCurrentSessionId(id);
              receivedSessionId = true;
            }
          },
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.trim()) {
              processStreamLine(line, streamContext);
              // Detect file operations for cache invalidation
              try {
                const parsed = JSON.parse(line);
                if (parsed.type === "claude_json" && parsed.data) {
                  fileDetector.processMessage(parsed.data);
                }
              } catch {
                // Not valid JSON — skip (e.g. heartbeat lines)
              }
            }
          }
        }

        // Process remaining buffer
        if (buffer.trim()) {
          processStreamLine(buffer, streamContext);
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name === "AbortError") {
          console.log("[OsChatPage] Request aborted");
        } else {
          console.error("[OsChatPage] Chat error:", error);
          addMessage({
            type: "error",
            role: "assistant",
            content: error instanceof Error ? error.message : "Failed to send message",
            timestamp: Date.now(),
          } as ChatMessage);
        }
      } finally {
        abortControllerRef.current = null;
        resetRequestState();
      }
    },
    [
      input,
      isLoading,
      currentSessionId,
      allowedTools,
      permissionMode,
      targetUrl,
      getAuthHeaders,
      generateRequestId,
      addMessage,
      clearInput,
      startRequest,
      processStreamLine,
      setCurrentSessionId,
      setCurrentAssistantMessage,
      setTokenUsage,
      handlePermissionError,
      resetRequestState,
      updateLastMessage,
    ],
  );

  // Handle submit (ChatInput calls this with no args — reads input from state)
  const handleSubmit = useCallback(() => {
    sendMessage();
  }, [sendMessage]);

  // Handle stop/abort — Option B: client-side AbortController + server-side POST
  const handleAbort = useCallback(() => {
    // Client-side: instantly cancel the fetch stream
    abortControllerRef.current?.abort();

    // Server-side: tell the agent to kill the CLI process (with auth)
    if (currentRequestId) {
      getAuthHeaders().then(headers =>
        fetch(`${targetUrl}/api/abort/${currentRequestId}`, {
          method: "POST",
          headers,
        })
      ).catch(console.error);
    }

    resetRequestState();
  }, [currentRequestId, targetUrl, resetRequestState, getAuthHeaders]);

  // Handle new chat — clear history first to prevent race condition
  const handleNewChat = useCallback(() => {
    clearHistory();
    resetChat();
    setIsAutomationSession(false);
  }, [clearHistory, resetChat]);

  // Listen for "new-chat" event from ChatPanel's plus button
  useEffect(() => {
    const handleNewChatEvent = () => clearHistory();
    window.addEventListener('new-chat', handleNewChatEvent);
    return () => window.removeEventListener('new-chat', handleNewChatEvent);
  }, [clearHistory]);

  // Listen for "load-chat-session" events — from automation "View Chat" or history item clicks
  useEffect(() => {
    const handleLoadSession = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const sessionId = detail?.sessionId;
      if (sessionId && sessionId !== currentSessionId) {
        clearHistory();
        setMessages([]);
        setCurrentSessionId(sessionId);
        setIsAutomationSession(!!detail?.automation);
      }
    };
    window.addEventListener('load-chat-session', handleLoadSession);
    return () => window.removeEventListener('load-chat-session', handleLoadSession);
  }, [clearHistory, setMessages, setCurrentSessionId, currentSessionId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+N: New chat
      if (
        e.key === KEYBOARD_SHORTCUTS.NEW_CHAT.key &&
        e.ctrlKey === KEYBOARD_SHORTCUTS.NEW_CHAT.ctrlKey &&
        e.shiftKey === KEYBOARD_SHORTCUTS.NEW_CHAT.shiftKey
      ) {
        e.preventDefault();
        handleNewChat();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNewChat]);

  // Permission handlers — match myjarvis-web ChatPage.tsx pattern exactly.
  // Loop through ALL patterns, accumulate into updatedAllowedTools, then
  // send "continue" with the full tool list so the agent resumes.
  const handlePermissionAllow = useCallback(() => {
    if (!permissionRequest) return;

    let updatedAllowedTools = allowedTools;
    permissionRequest.patterns.forEach((pattern) => {
      updatedAllowedTools = allowToolTemporary(pattern, updatedAllowedTools);
    });

    closePermissionRequest();

    if (currentSessionId) {
      sendMessage("continue", updatedAllowedTools, true);
    }
  }, [permissionRequest, currentSessionId, sendMessage, allowedTools, allowToolTemporary, closePermissionRequest]);

  const handlePermissionAllowPermanent = useCallback(() => {
    if (!permissionRequest) return;

    let updatedAllowedTools = allowedTools;
    permissionRequest.patterns.forEach((pattern) => {
      updatedAllowedTools = allowToolPermanent(pattern, updatedAllowedTools);
    });

    closePermissionRequest();

    if (currentSessionId) {
      sendMessage("continue", updatedAllowedTools, true);
    }
  }, [permissionRequest, currentSessionId, sendMessage, allowedTools, allowToolPermanent, closePermissionRequest]);

  const handlePermissionDeny = useCallback(() => {
    closePermissionRequest();
  }, [closePermissionRequest]);

  // Build permission data objects for ChatInput
  const permissionData = permissionRequest ? {
    patterns: permissionRequest.patterns,
    onAllow: handlePermissionAllow,
    onAllowPermanent: handlePermissionAllowPermanent,
    onDeny: handlePermissionDeny,
  } : undefined;

  const planPermissionData = planModeRequest ? {
    onAcceptWithEdits: () => {
      closePlanModeRequest();
      updatePermissionMode("acceptEdits");
      sendMessage(undefined, undefined, true, "acceptEdits");
    },
    onAcceptDefault: () => {
      closePlanModeRequest();
      sendMessage(undefined, undefined, true);
    },
    onKeepPlanning: () => {
      closePlanModeRequest();
      sendMessage("Keep planning", undefined, true);
    },
  } : undefined;

  return (
    <div className={`flex flex-col h-full ${className || ""}`}>
      <ChatMessages
        messages={messages}
        isLoading={isLoading}
        showGreeting={showGreeting}
        onSendMessage={sendMessage}
      />
      <ChatInput
        input={input}
        onInputChange={setInput}
        isLoading={isLoading}
        currentRequestId={currentRequestId}
        onSubmit={handleSubmit}
        onAbort={handleAbort}
        permissionMode={permissionMode}
        onPermissionModeChange={updatePermissionMode}
        showPermissions={!!permissionRequest || !!planModeRequest}
        permissionData={permissionData}
        planPermissionData={planPermissionData}
      />
    </div>
  );
}

OsChatPage.path = "/chat";
