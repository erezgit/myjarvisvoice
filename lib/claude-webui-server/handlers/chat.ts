import { Context } from "hono";
import { query, type PermissionMode, createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import type { ChatRequest, StreamResponse } from "../../shared/types.ts";
import { logger } from "../utils/logger.ts";
import { generateVoiceResponse, generateAudioUrl, sanitizeForJson } from "../utils/voiceGenerator.ts";
// TokenUsageService import removed - database operations now handled by Next.js backend

// getTokenTrackingUserId function removed - user identification now handled by Next.js backend

/**
 * Create JARVIS Tools MCP Server with voice generation capability
 */
const jarvisToolsServer = createSdkMcpServer({
  name: "jarvis-tools",
  version: "1.0.0",
  tools: [
    tool(
      "voice_generate",
      "Generate voice message with text-to-speech using JARVIS voice system",
      {
        message: z.string().describe("Text to convert to speech"),
        voice: z.enum(["alloy", "echo", "fable", "onyx", "nova", "shimmer"]).default("nova").describe("Voice model to use"),
        speed: z.number().min(0.25).max(4.0).default(1.0).describe("Speech speed (0.25 to 4.0)")
      },
      async (args) => {
        // 🔍 ENHANCED DEBUG: Log MCP tool invocation
        logger.chat.info("[MCP_VOICE_TOOL] Voice generation requested: {request}", {
          message: args.message,
          voice: args.voice,
          speed: args.speed,
          timestamp: new Date().toISOString(),
          pid: process.pid,
          cwd: process.cwd(),
          env: {
            WORKSPACE_DIR: process.env.WORKSPACE_DIR,
            DEPLOYMENT_MODE: process.env.DEPLOYMENT_MODE,
            OPENAI_API_KEY_SET: !!process.env.OPENAI_API_KEY,
            NODE_ENV: process.env.NODE_ENV
          }
        });

        try {
          // ✅ FIXED: Use direct function call instead of HTTP API (follows MCP best practices)
          const voiceStartTime = Date.now();
          logger.chat.info("[MCP_VOICE_TOOL] Calling voice generation service directly: {direct_call}", {
            message: args.message,
            voice: args.voice,
            speed: args.speed,
            approach: "DIRECT_FUNCTION_CALL",
            timestamp: new Date().toISOString(),
            messageLength: args.message?.length || 0
          });

          // 🎯 VOICE TIMING: Log start of voice generation
          logger.chat.info("[VOICE_TIMING] Voice generation start: {timing}", {
            phase: 'start',
            timestamp: voiceStartTime,
            messageLength: args.message?.length || 0,
            voice: args.voice,
            speed: args.speed
          });

          // Call the shared voice generation service directly
          const result = await generateVoiceResponse({
            text: args.message,
            voice: args.voice || 'nova',
            speed: args.speed || 1.0
          });

          // 🎯 VOICE TIMING: Log end of voice generation
          const voiceEndTime = Date.now();
          const voiceDuration = voiceEndTime - voiceStartTime;
          logger.chat.info("[VOICE_TIMING] Voice generation end: {timing}", {
            phase: 'end',
            timestamp: voiceEndTime,
            duration: voiceDuration,
            messageLength: args.message?.length || 0,
            success: result.success
          });

          logger.chat.info("[MCP_VOICE_TOOL] Voice generation result: {result}", {
            success: result.success,
            audioPath: result.audioPath,
            error: result.error
          });

          if (result.success && result.audioPath) {
            // Generate the appropriate audio URL for the deployment context
            const audioUrl = generateAudioUrl(result.audioPath);

            // 🎯 STREAM TX: Log voice message transmission preparation
            const voiceDataSize = JSON.stringify({
              audioUrl: audioUrl,
              transcript: args.message,
              voiceType: args.voice || 'nova',
              speed: args.speed || 1.0,
              timestamp: Date.now()
            }).length;

            logger.chat.info("[STREAM_TX] Preparing voice message for transmission: {transmission}", {
              audioUrl,
              transcriptLength: args.message?.length || 0,
              voiceDataSize,
              timestamp: Date.now(),
              voice: args.voice || 'nova',
              speed: args.speed || 1.0
            });

            // ✅ JSON EMBEDDING: Embed voice metadata as JSON within text content
            const responseContent = {
              content: [
                {
                  type: "text",
                  text: `🔊 Voice message generated successfully!\n\n**Voice:** ${args.voice || 'nova'}\n**Speed:** ${args.speed || 1.0}x\n**Audio URL:** ${audioUrl}\n\nVOICE_DATA:${JSON.stringify({
                    audioUrl: audioUrl,
                    transcript: args.message,  // Include the original message text
                    voiceType: args.voice || 'nova',
                    speed: args.speed || 1.0,
                    timestamp: Date.now()
                  })}\n\nThe voice file has been created and is ready for playbook.`
                }
              ]
            };

            // 🎯 STREAM TX: Log successful voice message ready for stream transmission
            logger.chat.info("[STREAM_TX] Voice message ready for stream transmission: {ready}", {
              contentSize: JSON.stringify(responseContent).length,
              timestamp: Date.now(),
              success: true
            });

            return responseContent;
          } else {
            // Voice generation failed
            throw new Error(result.error || 'Voice generation failed');
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          const errorStack = error instanceof Error ? error.stack : 'No stack trace';

          // 🔍 ENHANCED DEBUG: Comprehensive error logging
          logger.chat.error("[MCP_VOICE_TOOL] Voice generation failed: {error}", {
            error: errorMsg,
            stack: errorStack,
            args: {
              message: args.message,
              voice: args.voice,
              speed: args.speed
            },
            environment: {
              baseDir: process.env.WORKSPACE_DIR || process.cwd(),
              pythonScript: `${process.env.WORKSPACE_DIR || '/home/node'}/tools/src/cli/auto_jarvis_voice.py`,
              openaiKeySet: !!process.env.OPENAI_API_KEY,
              deploymentMode: process.env.DEPLOYMENT_MODE,
              nodeVersion: process.version,
              platform: process.platform,
              arch: process.arch,
              pid: process.pid,
              cwd: process.cwd(),
              memoryUsage: process.memoryUsage()
            }
          });

          return {
            content: [{
              type: "text",
              text: `🔊 Voice generation failed: ${errorMsg}\n\nDEBUG INFO:\n- Environment: ${process.env.DEPLOYMENT_MODE || 'unknown'}\n- Working dir: ${process.cwd()}\n- OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET'}\n- Error: ${errorMsg}`
            }],
            isError: true
          };
        }
      }
    ),
  ]
});

/**
 * Executes a Claude command and yields streaming responses
 * @param message - User message or command
 * @param requestId - Unique request identifier for abort functionality
 * @param requestAbortControllers - Shared map of abort controllers
 * @param cliPath - Path to actual CLI script (detected by validateClaudeCli)
 * @param sessionId - Optional session ID for conversation continuity
 * @param allowedTools - Optional array of allowed tool names
 * @param workingDirectory - Optional working directory for Claude execution
 * @param permissionMode - Optional permission mode for Claude execution
 * @returns AsyncGenerator yielding StreamResponse objects
 */
async function* executeClaudeCommand(
  message: string,
  requestId: string,
  requestAbortControllers: Map<string, AbortController>,
  cliPath: string,
  sessionId?: string,
  allowedTools?: string[],
  workingDirectory?: string,
  permissionMode?: PermissionMode,
  context?: Context,
): AsyncGenerator<StreamResponse> {
  let abortController: AbortController;
  let actualSessionId = sessionId; // Store the session ID, may be updated from system message

  try {
    // Process commands that start with '/'
    let processedMessage = message;
    if (message.startsWith("/")) {
      // Remove the '/' and send just the command
      processedMessage = message.substring(1);
    }

    // Create and store AbortController for this request
    abortController = new AbortController();
    requestAbortControllers.set(requestId, abortController);

    // Build SDK options with 2025 best practices + MCP server integration
    const queryOptions = {
      abortController,
      executable: "node" as const, // Use "node" to let SDK find it in PATH (works for both Electron and Docker)
      executableArgs: [],
      pathToClaudeCodeExecutable: cliPath,
      cwd: workingDirectory, // Set working directory for Claude CLI process
      additionalDirectories: workingDirectory ? [workingDirectory] : [], // Also add to allowed directories

      // ✅ CRITICAL FIX: Explicit API key configuration for Claude Agent SDK
      // The SDK requires explicit apiKey parameter - doesn't auto-read from environment
      apiKey: process.env.ANTHROPIC_API_KEY,

      // ✅ FIX: Explicit environment variable passing for containerized deployments
      // Ensures ANTHROPIC_API_KEY is available to Claude CLI subprocess in Fly.io containers
      env: {
        ...process.env, // Inherit all environment variables from container
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY, // Explicitly ensure API key is passed
      },

      // ✅ COST OPTIMIZATION: Use Haiku 4.5 by default (1/3 the cost of Sonnet 4.5)
      model: 'haiku' as const, // Haiku 4.5 - similar coding performance at 66% lower cost

      // ✅ REQUIRED: Thinking parameter configuration (fixes clear_thinking_20251015)
      // TEMPORARILY DISABLED: Testing SDK update with caching only
      // thinking: {
      //   type: "enabled" as const,
      //   budget_tokens: 10000 // Optimal balance of performance and speed
      // },

      // ✅ BEST PRACTICE: Explicit system prompt configuration (temporarily without caching)
      systemPrompt: {
        type: "preset" as const,
        preset: "claude_code" as const, // Maintains Claude Code behavior
        // TEMPORARILY DISABLED: cache_control: { type: "ephemeral" }
      },

      // ✅ ENHANCEMENT: Enable CLAUDE.md project context loading (temporarily without caching)
      settingSources: ['project' as const],
      // TEMPORARILY DISABLED: projectSettingsCache: { type: "ephemeral" },

      // ✅ NEW: MCP server integration for custom tools
      mcpServers: {
        "jarvis-tools": jarvisToolsServer
      },

      // ✅ ENHANCED: Clean architecture - MCP tools ALWAYS prioritized
      // REMOVED SESSION RESUME - This was causing excessive API caching costs
      // Each message was reloading and re-caching entire conversation history
      // Claude SDK handles session memory internally without this
      // ...(sessionId ? { resume: sessionId } : {}),
      ...(allowedTools ? {
        allowedTools: [
          "mcp__jarvis-tools__voice_generate",     // Only keep voice tool
          // Include all other non-MCP file tools (native Claude Code tools work perfectly)
          ...allowedTools.filter(tool =>
            tool !== "mcp__jarvis-tools__voice_generate"
          )
        ]
      } : {
        allowedTools: [
          "mcp__jarvis-tools__voice_generate"     // Default: only voice tool
        ]
      }),

      // ✅ CACHING: Add required header for prompt caching
      // TEMPORARILY DISABLED: Testing without caching
      // extraArgs: {
      //   "anthropic-beta": "prompt-caching-2024-07-31"
      // },

      ...(permissionMode ? { permissionMode } : {}), // Only pass permissionMode if provided by frontend
    };

    // ✅ CRITICAL: Add MCP discovery debugging
    logger.chat.debug("SDK query options: {queryOptions}", { queryOptions });
    logger.chat.debug("[MCP_DISCOVERY] MCP servers available: {mcpServers}", {
      mcpServers: Object.keys(queryOptions.mcpServers || {}),
      allowedTools: queryOptions.allowedTools,
      jarvisToolsRegistered: !!jarvisToolsServer
    });

    for await (const sdkMessage of query({
      prompt: processedMessage,
      options: queryOptions,
    })) {
      // Debug logging of raw SDK messages with detailed content
      logger.chat.debug("Claude SDK Message: {sdkMessage}", { sdkMessage });

      // Check for usage data in message properties

      // Capture session ID from system init message
      if (sdkMessage.type === 'system' && sdkMessage.session_id) {
        actualSessionId = sdkMessage.session_id;
        logger.chat.debug("Captured session ID from system message: {sessionId}", { sessionId: actualSessionId });
      }

      // Extract usage data from any message type that contains it
      let usageData = null;
      let modelName = null;

      // Check for usage in different possible locations
      if (sdkMessage.usage) {
        usageData = sdkMessage.usage;
      } else if (sdkMessage.message?.usage) {
        usageData = sdkMessage.message.usage;
        modelName = sdkMessage.message.model;
      }

      // Process usage data if found
      if (usageData) {

        // Calculate total input tokens
        const totalInputTokens =
          (usageData.input_tokens || 0) +
          (usageData.cache_creation_input_tokens || 0) +
          (usageData.cache_read_input_tokens || 0);

        // Send token update to frontend
        yield {
          type: "token_update",
          usage: {
            input_tokens: usageData.input_tokens || 0,
            output_tokens: usageData.output_tokens || 0,
            cache_creation_tokens: usageData.cache_creation_input_tokens || 0,
            cache_read_tokens: usageData.cache_read_input_tokens || 0,
            thinking_tokens: usageData.thinking_tokens || 0,
            total_input: totalInputTokens,
            total_output: usageData.output_tokens || 0,
            total: totalInputTokens + (usageData.output_tokens || 0)
          },
          sessionId: actualSessionId
        };

        // Database saving now handled by Next.js backend via stream interception
        // Express agent only sends token_update messages - no direct database access
      }

      yield {
        type: "claude_json",
        data: sdkMessage,
      };
    }

    yield { type: "done" };
  } catch (error) {
    // Check if error is due to abort
    // TODO: Re-enable when AbortError is properly exported from Claude SDK
    // if (error instanceof AbortError) {
    //   yield { type: "aborted" };
    // } else {
    {
      logger.chat.error("Claude Code execution failed: {error}", { error });
      yield {
        type: "error",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  } finally {
    // Clean up AbortController from map
    if (requestAbortControllers.has(requestId)) {
      requestAbortControllers.delete(requestId);
    }
  }
}

/**
 * Handles POST /api/chat requests with streaming responses
 * @param c - Hono context object with config variables
 * @param requestAbortControllers - Shared map of abort controllers
 * @returns Response with streaming NDJSON
 */
export async function handleChatRequest(
  c: Context,
  requestAbortControllers: Map<string, AbortController>,
) {
  const chatRequest: ChatRequest = await c.req.json();
  const { cliPath } = c.var.config;

  logger.chat.debug(
    "Received chat request {*}",
    chatRequest as unknown as Record<string, unknown>,
  );

  // Default to current working directory if not specified
  // Use WORKSPACE_DIR environment variable as fallback (points to /home/node in Docker)
  const workingDirectory = chatRequest.workingDirectory || process.env.WORKSPACE_DIR || process.cwd();

  logger.chat.debug("Working directory for Claude CLI: {workingDirectory}", { workingDirectory });

  // Detect mobile browsers for enhanced streaming
  const userAgent = c.req.header('user-agent') || '';
  const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(userAgent);

  const stream = new ReadableStream({
    async start(controller) {
      let chunkCount = 0;
      try {
        for await (const chunk of executeClaudeCommand(
          chatRequest.message,
          chatRequest.requestId,
          requestAbortControllers,
          cliPath, // Use detected CLI path from validateClaudeCli
          chatRequest.sessionId,
          chatRequest.allowedTools,
          workingDirectory,
          chatRequest.permissionMode,
          c, // Pass context for token tracking
        )) {
          const data = JSON.stringify(chunk) + "\n";
          controller.enqueue(new TextEncoder().encode(data));
          chunkCount++;

          // Mobile-specific: Add keep-alive ping every 5 chunks to prevent mobile timeout
          if (isMobile && chunkCount % 5 === 0) {
            const keepAlive = JSON.stringify({ type: "ping", timestamp: Date.now() }) + "\n";
            controller.enqueue(new TextEncoder().encode(keepAlive));
          }
        }
        controller.close();
      } catch (error) {
        const errorResponse: StreamResponse = {
          type: "error",
          error: error instanceof Error ? error.message : String(error),
        };
        controller.enqueue(
          new TextEncoder().encode(JSON.stringify(errorResponse) + "\n"),
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      // CRITICAL FIX: Remove Connection: keep-alive to prevent zombie connections
      // After streaming completes, connection should close to free up connection slots
      // This prevents connection pool exhaustion (Fly.io 25 connection limit)
    },
  });
}
