import { Context } from "hono";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { logger } from "../utils/logger.ts";

/**
 * Handle GET /api/voice/:filename
 * Serves voice MP3 files from the workspace tools/voice directory
 */
export async function handleVoiceRequest(c: Context) {
  try {
    const filename = c.req.param('filename');

    if (!filename) {
      return c.json({
        success: false,
        error: "Filename parameter is required"
      }, 400);
    }

    // Validate filename to prevent directory traversal attacks
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return c.json({
        success: false,
        error: "Invalid filename"
      }, 400);
    }

    // Only allow MP3 files
    if (!filename.endsWith('.mp3')) {
      return c.json({
        success: false,
        error: "Only MP3 files are allowed"
      }, 400);
    }

    const workspaceDir = process.env.WORKSPACE_DIR || '/home/node';
    const voiceDir = join(workspaceDir, 'tools', 'voice');
    const filePath = join(voiceDir, filename);

    logger.api.info("Serving voice file: {path}", { path: filePath });

    // Read file and get stats
    const fileContent = await readFile(filePath);
    const stats = await stat(filePath);

    // Set appropriate headers for audio streaming
    c.header('Content-Type', 'audio/mpeg');
    c.header('Content-Length', stats.size.toString());
    c.header('Accept-Ranges', 'bytes');
    c.header('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

    return c.body(fileContent);
  } catch (error) {
    logger.api.error("Error serving voice file: {error}", { error });

    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return c.json(
        {
          success: false,
          error: "Voice file not found",
        },
        404
      );
    }

    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to serve voice file",
      },
      500
    );
  }
}
