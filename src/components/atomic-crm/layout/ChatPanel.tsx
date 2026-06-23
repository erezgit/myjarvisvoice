import { useState, useCallback, useEffect } from "react";
import { ChatStateProvider } from "../chat/contexts/ChatStateProvider";
import { TokenUsageProvider } from "../chat/contexts/TokenUsageContext";
import { MessageProcessorProvider } from "../chat/contexts/MessageProcessorContext";
import { SelectedFilesProvider } from "@/contexts/SelectedFilesProvider";
import { OsChatPage } from "../chat/components/OsChatPage";
import { ChatHeader } from "../chat/components/ChatHeader";
import { HistoryView } from "../chat/components/HistoryView";
import { TokenContextBar } from "../chat/components/TokenContextBar";
import { useChatStateContext } from "../chat/contexts/ChatStateContext";
import { useMemberConfig } from "../contexts/MemberConfigContext";

interface ChatPanelProps {
  instanceId?: string;
  onSplit?: () => void;
  onClose?: () => void;
  canSplit?: boolean;
  canClose?: boolean;
}

/**
 * ChatPanel — Persistent right-side chat panel rendered in the Layout.
 * Wraps OsChatPage with all required context providers so chat state
 * persists across route navigations.
 * Note: SettingsProvider is in Layout.tsx (shared with TerminalOverlay).
 */
export function ChatPanel({ instanceId, onSplit, onClose, canSplit, canClose }: ChatPanelProps) {
  const { chatUrl, isLoading } = useMemberConfig();

  // Don't mount the chat tree until chatUrl resolves.
  // This prevents all child hooks (useLatestChat, useHistoryLoader, sendMessage)
  // from firing with an empty URL.
  if (isLoading || !chatUrl) return null;

  return (
    <MessageProcessorProvider>
      <TokenUsageProvider>
        <ChatStateProvider>
          <SelectedFilesProvider>
            <ChatPanelInner
              onSplit={onSplit}
              onClose={onClose}
              canSplit={canSplit}
              canClose={canClose}
            />
          </SelectedFilesProvider>
        </ChatStateProvider>
      </TokenUsageProvider>
    </MessageProcessorProvider>
  );
}

interface ChatPanelInnerProps {
  onSplit?: () => void;
  onClose?: () => void;
  canSplit?: boolean;
  canClose?: boolean;
}

/** Inner component that can access ChatStateContext for header props */
function ChatPanelInner({ onSplit, onClose, canSplit, canClose }: ChatPanelInnerProps) {
  const { messages, resetChat, setMessages, setCurrentSessionId } = useChatStateContext();
  const [currentView, setCurrentView] = useState<'chat' | 'history'>('chat');

  const handleChatClick = useCallback(() => setCurrentView('chat'), []);
  const handleHistoryClick = useCallback(() => setCurrentView('history'), []);

  // Switch to chat view when automation "View Chat" fires
  useEffect(() => {
    const handleLoadSession = () => setCurrentView('chat');
    window.addEventListener('load-chat-session', handleLoadSession);
    return () => window.removeEventListener('load-chat-session', handleLoadSession);
  }, []);

  const handleNewChat = useCallback(() => {
    // Dispatch event so OsChatPage can clearHistory (prevents stale messages re-injection)
    window.dispatchEvent(new CustomEvent('new-chat'));
    resetChat();
    setCurrentView('chat');
  }, [resetChat]);

  const handleConversationSelect = useCallback((sessionId: string) => {
    // Set state directly via context (not events) because OsChatPage is unmounted in history view.
    // isAutomationSession resets to false naturally when OsChatPage remounts.
    setMessages([]);
    setCurrentSessionId(sessionId);
    setCurrentView('chat');
  }, [setMessages, setCurrentSessionId]);

  return (
    <div className="h-full flex flex-col bg-neutral-50 dark:bg-gray-900">
      <ChatHeader
        currentView={currentView}
        onChatClick={handleChatClick}
        onHistoryClick={handleHistoryClick}
        onNewChat={handleNewChat}
        hasMessages={messages.length > 0}
        onSplit={onSplit}
        onClose={onClose}
        canSplit={canSplit}
        canClose={canClose}
      />
      <TokenContextBar />
      <div className="flex-1 min-h-0 relative">
        {/* Gradient fade at top of messages */}
        <div className="absolute top-0 left-0 right-0 h-4 z-10 pointer-events-none bg-gradient-to-b from-neutral-50 to-transparent dark:from-gray-900 dark:to-transparent" />
        <div className="h-full px-4 pb-4">
          {currentView === 'history' ? (
            <HistoryView onConversationSelect={handleConversationSelect} />
          ) : (
            <OsChatPage className="h-full" />
          )}
        </div>
      </div>
    </div>
  );
}
