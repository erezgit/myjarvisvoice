import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import type { AllMessage } from "../types";
import {
  isChatMessage,
  isSystemMessage,
  isToolMessage,
  isToolResultMessage,
  isPlanMessage,
  isThinkingMessage,
  isTodoMessage,
  isFileOperationMessage,
  isTokenUsageMessage,
} from "../types";
import {
  ChatMessageComponent,
  SystemMessageComponent,
  ToolMessageComponent,
  ToolResultMessageComponent,
  PlanMessageComponent,
  ThinkingMessageComponent,
  TodoMessageComponent,
  FileOperationMessageComponent,
  LoadingComponent,
} from "./MessageComponents";
import { useSettings } from "../hooks/useSettings";
import { Greeting } from "@/components/desktop/Greeting";
import { useScrollToBottom } from "../hooks/useScrollToBottom";


interface ChatMessagesProps {
  messages: AllMessage[];
  isLoading: boolean;
  showGreeting?: boolean;
  onSendMessage?: (message: string) => void;
}

export function ChatMessages({ messages, isLoading, showGreeting, onSendMessage }: ChatMessagesProps) {
  const { settings } = useSettings();
  const { containerRef, endRef, handleNewMessage, setScrollBehavior } = useScrollToBottom();
  const prevMessagesLengthRef = useRef(0);




  // Auto-scroll when messages change
  useEffect(() => {
    const prevLength = prevMessagesLengthRef.current;
    const currentLength = messages.length;
    const messagesAdded = currentLength - prevLength;

    if (messagesAdded > 3) {
      setScrollBehavior('instant');
    } else if (messagesAdded > 0) {
      setScrollBehavior('smooth');
    }

    prevMessagesLengthRef.current = currentLength;
    handleNewMessage();
  }, [messages, handleNewMessage, setScrollBehavior]);

  // Upstream filter — only renderable messages enter the React tree (no nulls, no key collisions)
  const shouldRender = (message: AllMessage): boolean => {
    // Hide injected system prompts (welcome, file upload notifications)
    if (isChatMessage(message) && message.role === 'user' && message.content.startsWith('[SYSTEM')) return false;
    // Token usage is handled by TokenContextBar, never rendered in chat
    if (isTokenUsageMessage(message)) return false;

    if (settings.messageDisplay.mode === "jarvis") {
      return isChatMessage(message) || isThinkingMessage(message) || isFileOperationMessage(message);
    }
    // Developer mode: render all known types
    return isChatMessage(message) || isSystemMessage(message) || isToolMessage(message)
      || isToolResultMessage(message) || isPlanMessage(message) || isThinkingMessage(message)
      || isTodoMessage(message) || isFileOperationMessage(message);
  };

  const renderMessage = (message: AllMessage, index: number) => {
    const key = `${message.timestamp}-${index}`;

    if (settings.messageDisplay.mode === "jarvis") {
      if (isChatMessage(message)) return <ChatMessageComponent key={key} message={message} />;
      if (isThinkingMessage(message)) return <ThinkingMessageComponent key={key} message={message} />;
      if (isFileOperationMessage(message)) return <FileOperationMessageComponent key={key} message={message} />;
    }

    return renderMessageComponent(message, key);
  };

  const renderMessageComponent = (message: AllMessage, key: string) => {
    if (isSystemMessage(message)) return <SystemMessageComponent key={key} message={message} />;
    if (isToolMessage(message)) return <ToolMessageComponent key={key} message={message} />;
    if (isToolResultMessage(message)) return <ToolResultMessageComponent key={key} message={message} />;
    if (isPlanMessage(message)) return <PlanMessageComponent key={key} message={message} />;
    if (isThinkingMessage(message)) return <ThinkingMessageComponent key={key} message={message} />;
    if (isTodoMessage(message)) return <TodoMessageComponent key={key} message={message} />;
    if (isFileOperationMessage(message)) return <FileOperationMessageComponent key={key} message={message} />;
    if (isChatMessage(message)) return <ChatMessageComponent key={key} message={message} />;
    // shouldRender already filtered unknown types — this is a safety fallback
    return <ChatMessageComponent key={key} message={{ ...message, type: 'chat', content: `[Unknown: ${message.type}]` } as any} />;
  };

  // Greeting visibility is controlled by parent via showGreeting prop

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-scroll bg-neutral-50 dark:bg-neutral-900 relative"
    >
      <div className="flex flex-col py-1 sm:py-4">
        {showGreeting ? (
          <Greeting onSendMessage={onSendMessage} />
        ) : messages.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {messages.filter(shouldRender).map(renderMessage)}
            {isLoading && <LoadingComponent />}
            <div ref={endRef} className="shrink-0 min-h-[24px]" />
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
