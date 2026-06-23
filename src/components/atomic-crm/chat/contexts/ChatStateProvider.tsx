import { ReactNode, useRef, useMemo } from 'react';
import { ChatStateContext } from './ChatStateContext';
import { useChatState } from '../hooks/useChatState';

interface ChatStateProviderProps {
  children: ReactNode;
}

/**
 * ChatStateProvider - Single source of truth for chat state
 *
 * Manages the one and only useChatState instance. All components access
 * chat state through this context.
 */
export function ChatStateProvider({ children }: ChatStateProviderProps) {
  const chatState = useChatState({});

  // Ref for sendMessage — OsChatPage registers its sendMessage here,
  // other components can call it
  const sendMessageRef = useRef<((content: string) => Promise<void>) | null>(null);

  const value = useMemo(() => ({
    ...chatState,
    sendMessageRef,
  }), [chatState]);

  return (
    <ChatStateContext.Provider value={value}>
      {children}
    </ChatStateContext.Provider>
  );
}
