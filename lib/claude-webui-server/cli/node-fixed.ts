#!/usr/bin/env node
/**
 * Node.js-specific entry point with proper error handling for production
 *
 * This module handles Node.js-specific initialization including CLI argument parsing,
 * Claude CLI validation, and server startup using the NodeRuntime.
 *
 * Updated with proper graceful shutdown and error handling for Fly.io deployment
 */

import { createApp } from "../app.ts";
import { NodeRuntime } from "../runtime/node.ts";
import { parseCliArgs } from "./args.ts";
import { validateClaudeCli } from "./validation.ts";
import { setupLogger, logger } from "../utils/logger.ts";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { exit } from "../utils/os.ts";

// Global reference to HTTP server for graceful shutdown
let httpServer: any = null;

/**
 * Graceful shutdown handler
 * Ensures proper cleanup before process termination
 */
async function gracefulShutdown(exitCode: number = 0, reason: string = 'Unknown') {
  console.log(`🔄 Starting graceful shutdown... (Reason: ${reason}, Code: ${exitCode})`);

  try {
    // Stop accepting new connections
    if (httpServer) {
      console.log('📡 Closing HTTP server...');
      await new Promise<void>((resolve, reject) => {
        httpServer.close((err?: Error) => {
          if (err) {
            console.error('❌ Error closing server:', err);
            reject(err);
          } else {
            console.log('✅ HTTP server closed');
            resolve();
          }
        });
      });
    }

    // Give ongoing requests time to complete (max 10 seconds)
    console.log('⏳ Waiting for existing connections to complete...');
    await new Promise(resolve => setTimeout(resolve, Math.min(10000, parseInt(process.env.SHUTDOWN_TIMEOUT || '10000'))));

    // Additional cleanup can go here (close DB connections, etc.)

    console.log('✅ Graceful shutdown complete');
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    // Even if graceful shutdown fails, we still need to exit
  } finally {
    // Ensure we actually exit
    process.exit(exitCode);
  }
}

/**
 * Error handlers for production deployment
 * Following Node.js 15+ best practices: crash gracefully, don't try to continue
 */

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('❌ Unhandled Promise Rejection detected');
  console.error('Reason:', reason);
  console.error('Promise:', promise);

  // Log stack trace if available
  if (reason instanceof Error) {
    console.error('Stack:', reason.stack);
  }

  // In production, unhandled rejections should cause the process to exit
  // This is the default behavior in Node.js 15+ and is considered best practice
  gracefulShutdown(1, 'Unhandled Promise Rejection');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('❌ Uncaught Exception detected');
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);

  // Some errors are immediately fatal and shouldn't wait for graceful shutdown
  const criticalErrors = ['EADDRINUSE', 'EACCES', 'ENOENT'];
  const isCritical = criticalErrors.some(errCode => error.message?.includes(errCode));

  if (isCritical) {
    console.error('💥 Critical error - immediate shutdown required');
    process.exit(1);
  }

  // For non-critical uncaught exceptions, attempt graceful shutdown
  gracefulShutdown(1, 'Uncaught Exception');
});

// Handle termination signals for graceful shutdown
process.on('SIGTERM', () => {
  console.log('📛 SIGTERM received');
  gracefulShutdown(0, 'SIGTERM signal');
});

process.on('SIGINT', () => {
  console.log('📛 SIGINT received');
  gracefulShutdown(0, 'SIGINT signal');
});

// Optional: Handle other signals
process.on('SIGHUP', () => {
  console.log('📛 SIGHUP received - reloading configuration...');
  // In a real app, you might reload configuration here
  // For now, we'll just log it
});

async function main(runtime: NodeRuntime) {
  // Parse CLI arguments
  const args = parseCliArgs();

  // Initialize logging system
  await setupLogger(args.debug);

  if (args.debug) {
    logger.cli.info("🐛 Debug mode enabled");
  }

  // Log Node.js version for debugging
  console.log(`🔧 Node.js version: ${process.version}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

  // Validate Claude CLI availability and get the detected CLI path
  const cliPath = await validateClaudeCli(runtime, args.claudePath);

  // Use absolute path for static files (supported in @hono/node-server v1.17.0+)
  // Node.js 20.11.0+ compatible with fallback for older versions
  const __dirname =
    import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));
  const staticPath = join(__dirname, "../static");

  // Create application
  const app = createApp(runtime, {
    debugMode: args.debug,
    staticPath,
    cliPath,
  });

  // Start server (only show this message when everything is ready)
  logger.cli.info(`🚀 Server starting on ${args.host}:${args.port}`);

  // Store server reference for graceful shutdown
  httpServer = runtime.serve(args.port, args.host, app.fetch);

  // Make server reference global for error handlers
  global.httpServer = httpServer;

  // Log successful startup
  logger.cli.info(`✅ Server is running and ready to accept connections`);

  // If running in a container, log health check endpoint
  if (process.env.FLY_APP_NAME || process.env.DOCKER_CONTAINER) {
    logger.cli.info(`🏥 Health check endpoint: http://${args.host}:${args.port}/health`);
  }
}

// Run the application
const runtime = new NodeRuntime();
main(runtime).catch((error) => {
  // Initial startup errors are critical
  console.error("💥 Failed to start server:", error);
  console.error("Stack:", error.stack);

  // Exit immediately for startup failures
  exit(1);
});