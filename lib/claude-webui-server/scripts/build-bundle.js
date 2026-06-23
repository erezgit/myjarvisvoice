#!/usr/bin/env node

/**
 * Build script for esbuild bundling
 *
 * This script bundles the Node.js CLI application using esbuild.
 * Version information is handled via the auto-generated version.ts file.
 */

import { build } from "esbuild";

// Build with esbuild
await build({
  entryPoints: ["cli/node.ts"],
  bundle: true,
  platform: "node",
  target: "node18",
  format: "esm",
  outfile: "dist/cli/node.js",
  external: [
    "@anthropic-ai/claude-agent-sdk",
    "@hono/node-server",
    "hono",
    "commander",
    "@logtape/logtape",
    "@logtape/pretty",
    "@supabase/supabase-js", // Keep external for proper Node.js module resolution
    "node-pty", // Native module for terminal PTY
    "ws", // WebSocket for terminal communication
    "jsonwebtoken", // JWT library for authentication
    "cookie-parser", // Cookie parsing middleware
    "express-session", // Session management
    "zod", // Schema validation library
    // Node.js core modules (fix for "Dynamic require of fs is not supported")
    "fs",
    "path",
    "child_process",
    "stream",
    "util",
    "crypto",
    "http",
    "https",
    "url",
  ],
  sourcemap: true,
});

console.log("✅ Bundle created successfully");
