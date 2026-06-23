import { createContext, useContext, useMemo, ReactNode } from 'react';
import { UnifiedMessageProcessor } from '../utils/UnifiedMessageProcessor';

/**
 * MessageProcessorContext - Singleton instance of UnifiedMessageProcessor
 *
 * This context provides a single shared instance of UnifiedMessageProcessor
 * across the entire application, ensuring tool cache continuity across
 * component remounts and view changes.
 *
 * Architecture:
 * - Created once at app root level (App.tsx)
 * - Never unmounts during app lifetime
 * - Maintains tool_use cache across chat/history view switches
 * - Used by useStreamParser for streaming message processing
 */
export interface MessageProcessorContextType {
  processor: UnifiedMessageProcessor;
}

export const MessageProcessorContext = createContext<MessageProcessorContextType | null>(null);

/**
 * Hook to access the message processor context
 * Must be used within MessageProcessorProvider
 */
export function useMessageProcessor() {
  const context = useContext(MessageProcessorContext);

  if (!context) {
    throw new Error('useMessageProcessor must be used within MessageProcessorProvider');
  }

  return context.processor;
}

interface MessageProcessorProviderProps {
  children: ReactNode;
}

/**
 * Provider component that creates and maintains the singleton processor instance
 */
export function MessageProcessorProvider({ children }: MessageProcessorProviderProps) {
  // Create singleton processor instance - never recreated
  const processor = useMemo(() => new UnifiedMessageProcessor(), []);

  const value = useMemo(() => ({ processor }), [processor]);

  return (
    <MessageProcessorContext.Provider value={value}>
      {children}
    </MessageProcessorContext.Provider>
  );
}
