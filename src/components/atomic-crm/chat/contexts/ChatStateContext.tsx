import { createContext, useContext, type MutableRefObject } from 'react';
import type { AllMessage, ChatMessage } from '../types';

/**
 * ChatStateContext - Single source of truth for AI-driven UI state
 *
 * This context provides shared access to chat state across all components,
 * enabling AI-controlled UI features without prop drilling.
 */
export interface ChatStateContextType {
  // State
  messages: AllMessage[];
  input: string;
  isLoading: boolean;
  currentSessionId: string | null;
  currentRequestId: string | null;
  hasShownInitMessage: boolean;
  hasReceivedInit: boolean;
  currentAssistantMessage: ChatMessage | null;

  // State setters
  setMessages: (messages: AllMessage[]) => void;
  setInput: (input: string) => void;
  setIsLoading: (loading: boolean) => void;
  setCurrentSessionId: (id: string | null) => void;
  setCurrentRequestId: (id: string | null) => void;
  setHasShownInitMessage: (shown: boolean) => void;
  setHasReceivedInit: (received: boolean) => void;
  setCurrentAssistantMessage: (message: ChatMessage | null) => void;

  // Helper functions
  addMessage: (message: AllMessage) => void;
  updateLastMessage: (content: string | Partial<ChatMessage>) => void;
  clearInput: () => void;
  generateRequestId: () => string;
  resetRequestState: () => void;
  startRequest: () => void;
  resetChat: () => void;

  // Send message ref — allows components outside ChatPage to send messages
  sendMessageRef: MutableRefObject<((content: string) => Promise<void>) | null>;
}

export const ChatStateContext = createContext<ChatStateContextType | null>(null);

/**
 * Hook to access chat state context
 * Must be used within ChatStateProvider
 */
export function useChatStateContext() {
  const context = useContext(ChatStateContext);

  if (!context) {
    throw new Error('useChatStateContext must be used within ChatStateProvider');
  }

  return context;
}
