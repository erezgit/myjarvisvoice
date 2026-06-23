import { Context } from "hono";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { logger } from "../utils/logger.ts";
import { readTextFile } from "../utils/fs.ts";

interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: string;
  extension: string;
  children?: FileItem[];  // Add children for nested structure
}

/**
 * List directory contents with recursive depth support
 */
async function listDirectoryContents(
  dirPath: string,
  depth: number = 0,
  maxDepth: number = 0
): Promise<FileItem[]> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    const files: FileItem[] = [];

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      const stats = await stat(fullPath);

      // Get file extension
      const extension = entry.isDirectory()
        ? ''
        : entry.name.includes('.')
          ? entry.name.substring(entry.name.lastIndexOf('.'))
          : '';

      const fileItem: FileItem = {
        name: entry.name,
        path: fullPath,
        isDirectory: entry.isDirectory(),
        size: stats.size,
        modified: stats.mtime.toISOString(),
        extension,
      };

      // If it's a directory and we haven't reached max depth, recurse
      if (entry.isDirectory() && depth < maxDepth) {
        try {
          const children = await listDirectoryContents(fullPath, depth + 1, maxDepth);
          if (children.length > 0) {
            fileItem.children = children;
          }
        } catch (err) {
          // If we can't read a subdirectory, just skip adding children
          logger.api.warn("Could not read subdirectory: {path}", { path: fullPath });
        }
      }

      files.push(fileItem);
    }

    // Sort: directories first, then files alphabetically
    return files.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    logger.api.error("Error listing directory contents: {error}", { error });
    throw error;
  }
}

/**
 * Handle GET /api/files?path=<path>
 * Returns list of files and directories at the specified path
 */
export async function handleFilesRequest(c: Context) {
  try {
    const requestedPath = c.req.query('path');
    const depthParam = c.req.query('depth');
    const workspaceDir = process.env.WORKSPACE_DIR || '/home/node';

    // Use requested path or default to workspace directory
    const targetPath = requestedPath || workspaceDir;
    // Parse depth parameter, default to 0 (no recursion)
    const maxDepth = depthParam ? parseInt(depthParam, 10) : 0;

    logger.api.info("Listing directory: {path} with depth: {depth}", {
      path: targetPath,
      depth: maxDepth
    });

    // Read directory contents with specified depth
    const files = await listDirectoryContents(targetPath, 0, maxDepth);

    return c.json({
      success: true,
      path: targetPath,
      files,
    });
  } catch (error) {
    logger.api.error("Error reading directory: {error}", { error });
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to read directory",
      },
      500
    );
  }
}

/**
 * Handle GET /api/files/read?path=<path>
 * Returns file content and metadata
 */
export async function handleReadFileRequest(c: Context) {
  try {
    const filePath = c.req.query('path');

    if (!filePath) {
      return c.json({
        success: false,
        error: "Path parameter is required"
      }, 400);
    }

    logger.api.info("Reading file: {path}", { path: filePath });

    // Read file content
    const content = await readTextFile(filePath);
    const stats = await stat(filePath);

    // Get file extension
    const extension = filePath.includes('.')
      ? filePath.substring(filePath.lastIndexOf('.'))
      : '';

    return c.json({
      success: true,
      content,
      path: filePath,
      name: filePath.substring(filePath.lastIndexOf('/') + 1),
      size: stats.size,
      modified: stats.mtime.toISOString(),
      extension,
    });
  } catch (error) {
    logger.api.error("Error reading file: {error}", { error });
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to read file",
      },
      500
    );
  }
}
