/**
 * Shared OS utilities using Node.js os and process modules
 *
 * Provides cross-platform OS and process operations that work in both
 * Deno and Node.js environments using the standard Node.js APIs.
 */

const { homedir } = require("node:os");
const process = require("node:process");

/**
 * Get environment variable
 */
function getEnv(key) {
  return process.env[key];
}

/**
 * Get command line arguments (excluding node/deno and script path)
 */
function getArgs() {
  // process.argv.slice(2) works correctly in both Node.js and Deno (via node:process)
  // Node.js: ['node', 'script.js', ...args] -> [...args]
  // Deno: ['deno', 'run', 'script.ts', ...args] -> [...args] (when using node:process)
  return process.argv.slice(2);
}

/**
 * Get platform identifier
 */
function getPlatform() {
  switch (process.platform) {
    case "win32":
      return "windows";
    case "darwin":
      return "darwin";
    case "linux":
      return "linux";
    default:
      // Default to linux for unknown platforms
      return "linux";
  }
}

/**
 * Get home directory path
 */
function getHomeDir() {
  try {
    return homedir();
  } catch {
    // Fallback to undefined if os.homedir() fails
    return undefined;
  }
}

/**
 * Exit the process with given code
 */
function exit(code) {
  process.exit(code);
}

module.exports = {
  getEnv,
  getArgs,
  getPlatform,
  getHomeDir,
  exit
};