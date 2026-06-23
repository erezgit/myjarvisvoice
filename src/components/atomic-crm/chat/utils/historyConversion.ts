import type { AllMessage, TimestampedSDKMessage } from "../types";
import { UnifiedMessageProcessor } from "./UnifiedMessageProcessor";

/**
 * Convert a TimestampedSDKMessage to AllMessage array
 * This is the core conversion logic used by both streaming and history loading
 * Uses UnifiedMessageProcessor for consistent behavior across pipelines
 */
export function convertTimestampedSDKMessage(
  message: TimestampedSDKMessage,
): AllMessage[] {
  const processor = new UnifiedMessageProcessor();

  // Use the unified processor to convert the message
  return processor.processMessage(
    message,
    {
      addMessage: () => {}, // Not used in batch mode
    },
    {
      isStreaming: false,
      timestamp: new Date(message.timestamp).getTime(),
    },
  );
}

/**
 * Convert an array of TimestampedSDKMessages to AllMessage array
 * Used for batch conversion of conversation history
 * Uses UnifiedMessageProcessor's batch processing for optimal performance and consistency
 *
 * IMPORTANT: Pass the same processor instance used for streaming to maintain tool cache continuity
 */
export async function convertConversationHistory(
  timestampedMessages: TimestampedSDKMessage[],
  processor?: UnifiedMessageProcessor,
): Promise<AllMessage[]> {
  // Use provided processor instance (for cache continuity) or create new one (legacy fallback)
  const processorInstance = processor || new UnifiedMessageProcessor();

  // Use the unified processor's batch processing method
  // Note: processMessagesBatch clears the cache, but that's OK for history loading
  // as we're processing old messages that don't need cache continuity
  return await processorInstance.processMessagesBatch(timestampedMessages);
}
