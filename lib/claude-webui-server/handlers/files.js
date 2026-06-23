const { readdir, stat } = require("node:fs/promises");
const { join } = require("node:path");
const { readTextFile } = require("../utils/fs.js");

/**
 * List directory contents and return file metadata
 */
async function listDirectoryContents(dirPath) {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      const stats = await stat(fullPath);

      // Get file extension
      const extension = entry.isDirectory()
        ? ''
        : entry.name.includes('.')
          ? entry.name.substring(entry.name.lastIndexOf('.'))
          : '';

      files.push({
        name: entry.name,
        path: fullPath,
        isDirectory: entry.isDirectory(),
        size: stats.size,
        modified: stats.mtime.toISOString(),
        extension,
      });
    }

    // Sort: directories first, then files alphabetically
    return files.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error("Error listing directory contents:", error);
    throw error;
  }
}

/**
 * Handle GET /api/files?path=<path>
 * Returns list of files and directories at the specified path
 */
async function handleFilesRequest(c) {
  try {
    const requestedPath = c.req.query('path');
    const workspaceDir = process.env.WORKSPACE_DIR || '/home/node';

    // Use requested path or default to workspace directory
    const targetPath = requestedPath || workspaceDir;

    console.log("Listing directory:", targetPath);

    // Read directory contents
    const files = await listDirectoryContents(targetPath);

    return c.json({
      success: true,
      path: targetPath,
      files,
    });
  } catch (error) {
    console.error("Error reading directory:", error);
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
async function handleReadFileRequest(c) {
  try {
    const filePath = c.req.query('path');

    if (!filePath) {
      return c.json({
        success: false,
        error: "Path parameter is required"
      }, 400);
    }

    console.log("Reading file:", filePath);

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
    console.error("Error reading file:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to read file",
      },
      500
    );
  }
}

module.exports = {
  handleFilesRequest,
  handleReadFileRequest
};