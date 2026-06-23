// Simplified useClaudeStreaming hook that uses the new modular hooks
import { useStreamParser } from "./useStreamParser";

export function useClaudeStreaming() {
  const { processStreamLine } = useStreamParser();

  return {
    processStreamLine,
  };
}
