import { Context } from "hono";
import * as fs from "fs";
import * as path from "path";
import { logger } from "../utils/logger.ts";
import { TokenUsageService } from "../../../app/lib/token-tracking/token-usage-service.ts";

interface TokenResponse {
  sessionId: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  messageCount: number;
}

/**
 * Get cumulative token usage for a session by parsing its JSONL file
 * @param c - Hono context
 * @returns JSON response with cumulative token totals
 */
export async function getSessionTokens(c: Context): Promise<Response> {
  const sessionId = c.req.param("sessionId");

  logger.chat.info("[SESSION_TOKENS] Fetching session tokens for: {sessionId}", { sessionId });

  // Construct JSONL file path
  // Claude Code writes JSONL files to ~/.claude/projects/-home-node/{sessionId}.jsonl
  // In Docker, the .claude directory is mounted at /home/node/.claude
  const claudeHome = "/home/node";  // Correct path in Docker container
  const jsonlPath = path.join(
    claudeHome,
    ".claude/projects/-home-node",
    `${sessionId}.jsonl`
  );

  logger.chat.info("[SESSION_TOKENS] FIXED VERSION - Looking for JSONL file at: {jsonlPath}", {
    jsonlPath,
    claudeHome,
    exists: fs.existsSync(jsonlPath)
  });

  // Check if file exists
  if (!fs.existsSync(jsonlPath)) {
    logger.chat.warn("Session JSONL file not found: {jsonlPath}", { jsonlPath });
    return c.json({ error: "Session not found", sessionId }, 404);
  }

  try {
    // Parse JSONL file and sum tokens from all assistant messages
    let totalInput = 0;
    let totalOutput = 0;
    let messageCount = 0;

    const fileContent = fs.readFileSync(jsonlPath, "utf-8");
    const lines = fileContent.split("\n").filter((line) => line.trim());

    for (const line of lines) {
      try {
        const data = JSON.parse(line);

        // Look for assistant messages with token usage data
        if (data.type === "assistant" && data.message?.usage) {
          const usage = data.message.usage;
          totalInput += usage.input_tokens || 0;
          totalOutput += usage.output_tokens || 0;
          messageCount++;
        }
      } catch (parseError) {
        // Skip invalid JSON lines
        logger.chat.debug("Skipping invalid JSON line in JSONL file");
      }
    }

    const totalTokens = totalInput + totalOutput;

    logger.chat.info(
      "[SESSION_TOKENS] Tokens calculated: {totalTokens} ({inputTokens} in, {outputTokens} out, {messageCount} messages)",
      { totalTokens, inputTokens: totalInput, outputTokens: totalOutput, messageCount }
    );

    // Save token usage to database (asynchronously - don't block response)
    if (totalTokens > 0) {
      // TODO: Get actual user ID from auth context - for now using hardcoded test user
      const testUserId = "3dfb3580-b7c4-4da3-8d9e-b9775c216f7e"; // erez.test@gmail.com

      const tokenService = new TokenUsageService(testUserId);

      tokenService.processSessionUsage({
        sessionId,
        inputTokens: totalInput,
        outputTokens: totalOutput,
        cacheCreationTokens: 0, // TODO: Extract from JSONL if available
        cacheReadTokens: 0,     // TODO: Extract from JSONL if available
        thinkingTokens: 0,      // TODO: Extract from JSONL if available
        messageCount,
        sessionStartedAt: new Date().toISOString(),
        model: "claude-3-5-sonnet-20241022"
      }).catch(error => {
        logger.chat.error("[SESSION_TOKENS] Failed to save to database: {error}", { error });
      });

      logger.chat.info("[SESSION_TOKENS] Token data saved to database (async)");
    }

    const response: TokenResponse = {
      sessionId,
      inputTokens: totalInput,
      outputTokens: totalOutput,
      totalTokens,
      messageCount,
    };

    return c.json(response);
  } catch (error) {
    logger.chat.error("Error reading session JSONL file: {error}", { error });
    return c.json(
      { error: "Failed to read session tokens", sessionId },
      500
    );
  }
}
