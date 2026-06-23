import { Plus, MessageSquare, History, SplitSquareVertical, X } from 'lucide-react';

interface ChatHeaderProps {
  currentView: 'chat' | 'history';
  onChatClick: () => void;
  onHistoryClick: () => void;
  onNewChat?: () => void;
  hasMessages?: boolean;
  onSplit?: () => void;
  onClose?: () => void;
  canSplit?: boolean;
  canClose?: boolean;
}

export function ChatHeader({
  currentView,
  onChatClick,
  onHistoryClick,
  onNewChat,
  hasMessages = false,
  onSplit,
  onClose,
  canSplit,
  canClose,
}: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-neutral-50 dark:bg-neutral-900">
      {/* Left side: close button when in multi-panel mode */}
      <div className="flex items-center">
        {canClose && onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-md transition-colors text-neutral-400 hover:text-red-400 hover:bg-red-500/10"
            aria-label="Close panel"
            title="Close panel"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Right side: Split, New Chat, History, Chat */}
      <div className="flex items-center gap-1">
        {/* Split button */}
        {onSplit && canSplit && (
          <button
            onClick={onSplit}
            className="p-2 rounded-md transition-colors text-neutral-500 hover:text-white hover:bg-[#8a9db0]"
            aria-label="Split chat panel"
            title="Split panel"
          >
            <SplitSquareVertical className="h-4 w-4" />
          </button>
        )}

        {/* New Chat button */}
        {onNewChat && hasMessages && (
          <button
            onClick={onNewChat}
            className="p-2 rounded-md transition-colors text-neutral-500 hover:text-white hover:bg-[#8a9db0]"
            aria-label="New chat"
            title="New chat"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}

        {/* History button */}
        <button
          onClick={onHistoryClick}
          className={`p-2 rounded-md transition-colors ${
            currentView === 'history'
              ? 'text-white bg-[#8a9db0]'
              : 'text-neutral-500 hover:text-white hover:bg-[#8a9db0]'
          }`}
          aria-label="History"
          title="History"
        >
          <History className="h-4 w-4" />
        </button>

        {/* Chat button */}
        <button
          onClick={onChatClick}
          className={`p-2 rounded-md transition-colors ${
            currentView === 'chat'
              ? 'text-white bg-[#8a9db0]'
              : 'text-neutral-500 hover:text-white hover:bg-[#8a9db0]'
          }`}
          aria-label="Chat"
          title="Chat"
        >
          <MessageSquare className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
