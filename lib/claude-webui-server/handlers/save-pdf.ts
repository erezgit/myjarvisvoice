import type { Context } from "hono";
import type { ConfigContext } from "../middleware/config.ts";
import { logger } from "../utils/logger.ts";
import { writeFile, ensureDir } from "../utils/fs.ts";
import { join, dirname } from "node:path";

/**
 * Handle PDF save request from frontend
 *
 * Saves generated PDF to workspace alongside the source presentation file
 */
export async function handleSavePDFRequest(c: Context<ConfigContext>) {
  try {
    const body = await c.req.json();
    const { pdfData, filePath, filename } = body;

    if (!pdfData || !filePath) {
      return c.json({ error: 'Missing pdfData or filePath' }, 400);
    }

    // Get workspace root
    const workspaceRoot = process.cwd();

    // Determine save directory from the source file path
    // E.g., if filePath is "my-jarvis/tickets/002/app.tsx"
    // we want to save to "my-jarvis/tickets/002/presentation.pdf"
    const sourceDir = dirname(filePath);
    const saveDir = join(workspaceRoot, sourceDir);

    // Ensure directory exists
    await ensureDir(saveDir);

    // Determine filename
    const pdfFilename = filename || 'presentation.pdf';
    const fullPath = join(saveDir, pdfFilename);

    // Convert base64 PDF data to buffer
    // pdfData format: "data:application/pdf;base64,..."
    const base64Data = pdfData.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');

    // Write PDF file
    await writeFile(fullPath, buffer);

    logger.app.info(`PDF saved: ${pdfFilename} to ${fullPath}`);

    // Return relative path for chat message
    const relativePath = join(sourceDir, pdfFilename);

    return c.json({
      success: true,
      filename: pdfFilename,
      path: relativePath,
      fullPath: fullPath,
    });
  } catch (error) {
    logger.app.error("PDF save error: {error}", { error });
    return c.json({
      error: error instanceof Error ? error.message : 'PDF save failed'
    }, 500);
  }
}
