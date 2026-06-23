import { useCallback, useRef, useState } from 'react';

export type ScrollBehavior = 'smooth' | 'instant' | 'auto';

/**
 * useScrollToBottom - Smart scroll management that respects user intent
 *
 * Tracks whether user is at bottom of scroll container
 * Only auto-scrolls when user hasn't manually scrolled up
 * Uses viewport detection to track scroll position
 */
export function useScrollToBottom() {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [scrollBehavior, setScrollBehavior] = useState<ScrollBehavior>('smooth');

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = 'smooth') => {
      if (endRef.current) {
        endRef.current.scrollIntoView({
          behavior,
          block: 'end',
        });
      }
    },
    [],
  );

  // Auto-scroll on new messages only if user is at bottom
  const handleNewMessage = useCallback(() => {
    if (isAtBottom) {
      scrollToBottom(scrollBehavior);
    }
  }, [isAtBottom, scrollBehavior, scrollToBottom]);

  const onViewportEnter = useCallback(() => {
    setIsAtBottom(true);
  }, []);

  const onViewportLeave = useCallback(() => {
    setIsAtBottom(false);
  }, []);

  return {
    containerRef,
    endRef,
    isAtBottom,
    scrollToBottom,
    handleNewMessage,
    onViewportEnter,
    onViewportLeave,
    setScrollBehavior,
  };
}
