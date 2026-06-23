/**
 * Runtime-agnostic Hono application
 *
 * This module creates the Hono application with all routes and middleware,
 * but doesn't include runtime-specific code like CLI parsing or server startup.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Runtime } from "./runtime/types.ts";
import {
  type ConfigContext,
  createConfigMiddleware,
} from "./middleware/config.ts";
import { authMiddleware, requireAuth } from "./middleware/auth.ts";
import { keepaliveMiddleware } from "./middleware/keepalive.ts";
import { handleProjectsRequest } from "./handlers/projects.ts";
import { handleHistoriesRequest } from "./handlers/histories.ts";
import { handleConversationRequest } from "./handlers/conversations.ts";
import { handleChatRequest } from "./handlers/chat.ts";
import { handleAbortRequest } from "./handlers/abort.ts";
import { handleFilesRequest, handleReadFileRequest } from "./handlers/files.ts";
import { handleVoiceRequest } from "./handlers/voice.ts";
import { handleUploadRequest } from "./handlers/upload.ts";
import { handleSavePDFRequest } from "./handlers/save-pdf.ts";
import { handleStreamFileRequest } from "./handlers/stream-file.ts";
// Removed ephemeral infrastructure management - handled by Next.js frontend
// Removed deprecated session-tokens handler - now using real-time stream tokens
// import { getSessionTokens } from "./handlers/session-tokens.ts";
import { logger } from "./utils/logger.ts";
import { readBinaryFile } from "./utils/fs.ts";
import { generateVoiceResponse, generateAudioUrl } from "./utils/voiceGenerator.ts";

export interface AppConfig {
  debugMode: boolean;
  staticPath: string;
  cliPath: string; // Actual CLI script path detected by validateClaudeCli
}

export function createApp(
  runtime: Runtime,
  config: AppConfig,
): Hono<ConfigContext> {
  const app = new Hono<ConfigContext>();

  // Store AbortControllers for each request (shared with chat handler)
  const requestAbortControllers = new Map<string, AbortController>();

  // CORS middleware - Updated to accept requests from Next.js
  app.use(
    "*",
    cors({
      origin: [
        "https://www.myjarvis.io",
        "https://my-jarvis-web.vercel.app",
        "http://localhost:3000",  // Next.js dev
        /^https:\/\/.*-myjarvis\.vercel\.app$/  // Preview deploys
      ],
      allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization", "X-User-Id", "X-Instance-Id"],
      credentials: true
    }),
  );

  // Configuration middleware - makes app settings available to all handlers
  app.use(
    "*",
    createConfigMiddleware({
      debugMode: config.debugMode,
      runtime,
      cliPath: config.cliPath,
    }),
  );

  // Keepalive middleware - monitors activity for auto-stop extension
  app.use("*", keepaliveMiddleware);

  // Authentication middleware - validates JWT tokens and manages sessions
  app.use("*", authMiddleware);

  // Health check endpoints
  // Fly.io health check endpoint (simpler path)
  app.get("/health", (c) => {
    return c.json({
      status: "ok",
      timestamp: Date.now(),
      uptime: process.uptime()
    });
  });

  // API health check endpoint (for frontend)
  app.get("/api/health", (c) => {
    return c.json({
      status: "ok",
      timestamp: Date.now(),
      uptime: process.uptime()
    });
  });

  app.get("/api/projects", requireAuth, (c) => handleProjectsRequest(c));

  app.get("/api/projects/:encodedProjectName/histories", requireAuth, (c) =>
    handleHistoriesRequest(c),
  );

  app.get("/api/projects/:encodedProjectName/histories/:sessionId", requireAuth, (c) =>
    handleConversationRequest(c),
  );

  app.post("/api/abort/:requestId", requireAuth, (c) =>
    handleAbortRequest(c, requestAbortControllers),
  );

  app.post("/api/chat", requireAuth, (c) => handleChatRequest(c, requestAbortControllers));

  // Removed ephemeral container management routes - handled by Next.js frontend infrastructure API

  // Deprecated: session tokens now come through real-time stream messages
  // app.get("/api/session-tokens/:sessionId", requireAuth, (c) => getSessionTokens(c));

  // Document upload route
  app.post("/api/upload-document", requireAuth, (c) => handleUploadRequest(c));

  // PDF save route
  app.post("/api/save-pdf", requireAuth, (c) => handleSavePDFRequest(c));

  // File system API routes (for web mode)
  app.get("/api/files", requireAuth, (c) => handleFilesRequest(c));
  app.get("/api/files/read", requireAuth, (c) => handleReadFileRequest(c));

  // File streaming route (streams files without loading into memory)
  app.get("/api/stream-file", requireAuth, (c) => handleStreamFileRequest(c));

  // Voice file API route (for web mode)
  app.get("/api/voice/:filename", requireAuth, (c) => handleVoiceRequest(c));

  // ✅ FIXED: Server-side voice generation API using shared service
  app.post("/api/voice-generate", requireAuth, async (c) => {
    try {
      const { message, voice = "nova", speed = 1.0 } = await c.req.json();

      if (!message) {
        return c.json({ success: false, error: "Message is required" }, 400);
      }

      logger.app.info("[API_VOICE] Voice generation request using shared service: {request}", {
        message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
        voice,
        speed,
        approach: "SHARED_SERVICE_CALL",
        timestamp: new Date().toISOString()
      });

      // Use shared voice generation service
      const result = await generateVoiceResponse({
        text: message,
        voice,
        speed
      });

      logger.app.info("[API_VOICE] Voice generation result: {result}", {
        success: result.success,
        audioPath: result.audioPath,
        error: result.error
      });

      if (result.success && result.audioPath) {
        // Generate web-compatible URL
        const audioUrl = generateAudioUrl(result.audioPath);

        logger.app.info("[API_VOICE] Voice generation successful: {success}", {
          audioPath: result.audioPath,
          audioUrl
        });

        return c.json({
          success: true,
          message,
          audioPath: audioUrl, // Return web URL for frontend
          voice,
          speed,
          timestamp: Date.now()
        });
      } else {
        logger.app.error("[API_VOICE] Voice generation failed: {failure}", {
          error: result.error
        });
        return c.json({
          success: false,
          error: result.error || "Voice generation failed"
        }, 500);
      }
    } catch (error) {
      logger.app.error("[API_VOICE] Voice generation error: {error}", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }, 500);
    }
  });

  // Static file serving with SPA fallback
  // Serve static assets (CSS, JS, images, etc.)
  const serveStatic = runtime.createStaticFileMiddleware({
    root: config.staticPath,
  });
  app.use("/assets/*", serveStatic);

  // Serve PDF.js worker with correct MIME type
  app.get("/pdf.worker.min.mjs", async (c) => {
    try {
      const workerPath = `${config.staticPath}/pdf.worker.min.mjs`;
      const workerFile = await readBinaryFile(workerPath);
      return c.body(workerFile, 200, {
        "Content-Type": "application/javascript",
        "Cache-Control": "public, max-age=31536000",
      });
    } catch (error) {
      logger.app.error("Error serving PDF worker: {error}", { error });
      return c.text("Not found", 404);
    }
  });

  // SPA fallback - serve index.html for all unmatched routes (except API routes)
  app.get("*", async (c) => {
    const path = c.req.path;

    // Skip API routes
    if (path.startsWith("/api/")) {
      return c.text("Not found", 404);
    }

    try {
      const indexPath = `${config.staticPath}/index.html`;
      const indexFile = await readBinaryFile(indexPath);
      return c.html(new TextDecoder().decode(indexFile));
    } catch (error) {
      logger.app.error("Error serving index.html: {error}", { error });
      return c.text("Internal server error", 500);
    }
  });

  return app;
}
