import { useState, useCallback, useEffect, useMemo } from "react";
import type { AllMessage, ChatMessage } from "../types";
import { generateId } from "@/utils/id";

interface ChatStateOptions {
  initialMessages?: AllMessage[];
  initialSessionId?: string;
}

const DEFAULT_MESSAGES: AllMessage[] = [];

export function useChatState(options: ChatStateOptions = {}) {
  const { initialMessages = DEFAULT_MESSAGES, initialSessionId = null } =
    options;

  // Memoize initial messages to prevent infinite loops
  const memoizedInitialMessages = useMemo(
    () => initialMessages,
    [initialMessages],
  );

  const [messages, setMessages] = useState<AllMessage[]>(
    memoizedInitialMessages,
  );
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(
    initialSessionId,
  );
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [hasShownInitMessage, setHasShownInitMessage] = useState(false);
  const [hasReceivedInit, setHasReceivedInit] = useState(false);
  const [currentAssistantMessage, setCurrentAssistantMessage] =
    useState<ChatMessage | null>(null);

  // Update messages and sessionId when initial values change
  useEffect(() => {
    setMessages(memoizedInitialMessages);
  }, [memoizedInitialMessages]);

  useEffect(() => {
    setCurrentSessionId(initialSessionId);
  }, [initialSessionId]);

  const addMessage = useCallback((msg: AllMessage) => {
    setMessages((prev) => {
      // Check for duplicates for voice messages
      if (msg.type === 'voice') {
        const existingVoiceMsg = prev.find(m => m.type === 'voice' && m.timestamp === msg.timestamp);
        if (existingVoiceMsg) {
          return prev; // Don't add duplicate
        }
      }

      const newMessages = [...prev, msg];
      return newMessages;
    });
  }, []);

  const updateLastMessage = useCallback((content: string | Partial<ChatMessage>) => {
    setMessages((prev) =>
      prev.map((msg, index) => {
        if (index !== prev.length - 1 || msg.type !== "chat") return msg;
        if (typeof content === "string") return { ...msg, content };
        // Merge partial object — preserves audioUrl, autoPlay, etc.
        return { ...msg, ...content };
      }),
    );
  }, []);

  const clearInput = useCallback(() => {
    setInput("");
  }, []);

  const generateRequestId = useCallback(() => {
    const requestId = generateId();
    setCurrentRequestId(requestId);
    return requestId;
  }, []);

  const resetRequestState = useCallback(() => {
    setIsLoading(false);
    setCurrentRequestId(null);
    setCurrentAssistantMessage(null);
  }, []);

  const startRequest = useCallback(() => {
    setIsLoading(true);
    setCurrentAssistantMessage(null);
    setHasReceivedInit(false);
  }, []);

  const resetChat = useCallback(() => {
    setMessages([]);
    setInput("");
    setIsLoading(false);
    setCurrentSessionId(null);
    setCurrentRequestId(null);
    setHasShownInitMessage(false);
    setHasReceivedInit(false);
    setCurrentAssistantMessage(null);
  }, []);

  return {
    // State
    messages,
    input,
    isLoading,
    currentSessionId,
    currentRequestId,
    hasShownInitMessage,
    hasReceivedInit,
    currentAssistantMessage,

    // State setters
    setMessages,
    setInput,
    setIsLoading,
    setCurrentSessionId,
    setCurrentRequestId,
    setHasShownInitMessage,
    setHasReceivedInit,
    setCurrentAssistantMessage,

    // Helper functions
    addMessage,
    updateLastMessage,
    clearInput,
    generateRequestId,
    resetRequestState,
    startRequest,
    resetChat,
  };
}
