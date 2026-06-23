/**
 * Shared file system utilities using Node.js fs module
 *
 * Provides cross-platform file system operations that work in both
 * Deno and Node.js environments using the standard Node.js fs API.
 */

const { promises: fs } = require("node:fs");
const { constants: fsConstants } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

/**
 * Read text file content
 */
async function readTextFile(path) {
  return await fs.readFile(path, "utf8");
}

/**
 * Read binary file content
 */
async function readBinaryFile(path) {
  const buffer = await fs.readFile(path);
  return new Uint8Array(buffer);
}

/**
 * Write text content to file
 */
async function writeTextFile(path, content, options = {}) {
  await fs.writeFile(path, content, "utf8");
  if (options.mode !== undefined) {
    await fs.chmod(path, options.mode);
  }
}

/**
 * Check if file or directory exists
 */
async function exists(path) {
  try {
    await fs.access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file/directory statistics
 */
async function stat(path) {
  const stats = await fs.stat(path);
  return {
    isFile: stats.isFile(),
    isDirectory: stats.isDirectory(),
    isSymlink: stats.isSymbolicLink(),
    size: stats.size,
    mtime: stats.mtime,
  };
}

/**
 * Read directory entries
 */
async function* readDir(path) {
  const entries = await fs.readdir(path, { withFileTypes: true });
  for (const entry of entries) {
    yield {
      name: entry.name,
      isFile: entry.isFile(),
      isDirectory: entry.isDirectory(),
      isSymlink: entry.isSymbolicLink(),
    };
  }
}

/**
 * Write binary content to file
 */
async function writeFile(path, content) {
  await fs.writeFile(path, content);
}

/**
 * Ensure directory exists, creating it if necessary
 */
async function ensureDir(path) {
  await fs.mkdir(path, { recursive: true });
}

/**
 * Execute callback with a temporary directory that gets cleaned up
 */
async function withTempDir(callback) {
  const tempDir = await fs.mkdtemp(join(tmpdir(), "claude-code-webui-temp-"));
  try {
    return await callback(tempDir);
  } finally {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Silently ignore cleanup errors - temp dir will be cleaned up by OS eventually
    }
  }
}

module.exports = {
  readTextFile,
  readBinaryFile,
  writeTextFile,
  exists,
  stat,
  readDir,
  writeFile,
  ensureDir,
  withTempDir
};