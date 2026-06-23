import { TokenUsageService } from '../../../app/lib/token-tracking/token-usage-service';

export async function saveTokenUsageToDatabase(params: {
  sessionId: string;
  usage: any;
  model: string;
  userId: string;
}) {
  const { sessionId, usage, model, userId } = params;

  const tokenService = new TokenUsageService(userId);

  await tokenService.processSessionUsage({
    sessionId,
    inputTokens: usage.input_tokens || 0,
    outputTokens: usage.output_tokens || 0,
    cacheCreationTokens: usage.cache_creation_input_tokens || 0,
    cacheReadTokens: usage.cache_read_input_tokens || 0,
    thinkingTokens: usage.thinking_tokens || 0,
    messageCount: 1,
    sessionStartedAt: new Date().toISOString(),
    model
  });
}