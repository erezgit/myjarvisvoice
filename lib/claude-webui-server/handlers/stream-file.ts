import type { Context } from "hono";
import type { ConfigContext } from "../middleware/config.ts";
import { logger } from "../utils/logger.ts";
import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";

/**
 * Stream a file from the workspace without loading it into memory
 * Supports HTTP range requests for progressive PDF loading
 */
export async function handleStreamFileRequest(c: Context<ConfigContext>) {
  try {
    const filePath = c.req.query('path');

    if (!filePath) {
      return c.json({ error: 'File path required' }, 400);
    }

    // Security: ensure file exists
    if (!existsSync(filePath)) {
      return c.json({ error: 'File not found' }, 404);
    }

    // Get file stats for content length
    const fileStats = await stat(filePath);
    const fileSize = fileStats.size;

    // Determine content type based on extension
    const ext = filePath.split('.').pop()?.toLowerCase();
    const contentType = getContentType(ext || '');

    // Check if range request
    const range = c.req.header('Range');

    if (range) {
      // Parse range header (format: "bytes=start-end")
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;

      logger.app.info(`Streaming file range: ${filePath} (${start}-${end}/${fileSize})`);

      // Create read stream with range
      const stream = createReadStream(filePath, { start, end });

      // Set headers for partial content
      c.header('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      c.header('Accept-Ranges', 'bytes');
      c.header('Content-Length', chunkSize.toString());
      c.header('Content-Type', contentType);

      // CORS headers for cross-origin requests
      c.header('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Range, Content-Length, Content-Encoding');

      // Return 206 Partial Content
      return c.body(stream as any, 206);
    } else {
      // Normal full file request
      logger.app.info(`Streaming file: ${filePath} (${fileSize} bytes)`);

      const stream = createReadStream(filePath);

      // Set headers for full content
      c.header('Content-Type', contentType);
      c.header('Content-Length', fileSize.toString());
      c.header('Accept-Ranges', 'bytes');
      c.header('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Length');

      return c.body(stream as any);
    }
  } catch (error) {
    logger.app.error("Stream file error: {error}", { error });
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to stream file'
    }, 500);
  }
}

function getContentType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    'pdf': 'application/pdf',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'txt': 'text/plain',
    'md': 'text/markdown',
    'json': 'application/json',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'ts': 'application/typescript',
  };

  return mimeTypes[ext] || 'application/octet-stream';
}
