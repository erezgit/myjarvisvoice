import { spawn } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { logger } from "./logger";

/**
 * Voice generation configuration
 */
export interface VoiceGenerationConfig {
  text: string;
  voice?: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
  speed?: number;
  model?: "tts-1" | "tts-1-hd";
  format?: "mp3" | "opus" | "aac" | "flac" | "wav";
  maxLength?: number;
}

/**
 * Voice generation result
 */
export interface VoiceGenerationResult {
  success: boolean;
  audioPath: string;
  message: string;
  error?: string;
}

/**
 * Generate voice response using the existing Python voice generation system
 * This replaces the shell script wrapper with direct Node.js execution
 */
export async function generateVoiceResponse(config: VoiceGenerationConfig): Promise<VoiceGenerationResult> {
  return new Promise((resolve, reject) => {
    const {
      text,
      voice = "nova",
      speed = 1.0,
      model = "tts-1",
      format = "mp3",
      maxLength = 1000
    } = config;

    // Define paths - ALWAYS use WORKSPACE_DIR (never fallback to process.cwd())
    const baseDir = process.env.WORKSPACE_DIR || '/home/node';
    const pythonScript = `${baseDir}/tools/src/cli/auto_jarvis_voice.py`;
    const outputDir = `${baseDir}/tools/voice`;

    // Build arguments for Python script
    const args = [
      pythonScript,
      text,
      "--voice", voice,
      "--model", model,
      "--format", format,
      "--speed", speed.toString(),
      "--max-length", maxLength.toString(),
      "--output-dir", outputDir,
      "--json-output" // Request JSON output for structured parsing
    ];

    // Add API key from environment
    const env = {
      ...process.env,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY
    };

    if (!env.OPENAI_API_KEY) {
      reject(new Error("OPENAI_API_KEY environment variable is not set"));
      return;
    }

    // 🔍 ENHANCED DEBUG: Comprehensive pre-execution logging
    logger.chat.info("[VOICE_GEN] Starting Python script execution: {details}", {
      args,
      voice,
      speed,
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      textLength: text.length
    });

    logger.chat.info("[VOICE_GEN] Environment and paths: {environment}", {
      baseDir,
      pythonScript,
      outputDir,
      cwd: process.cwd(),
      workspaceDir: process.env.WORKSPACE_DIR,
      pythonScriptExists: fs.existsSync(pythonScript),
      outputDirExists: fs.existsSync(outputDir),
      openaiKeySet: !!env.OPENAI_API_KEY,
      openaiKeyPrefix: env.OPENAI_API_KEY ? env.OPENAI_API_KEY.substring(0, 10) + '...' : 'NOT SET'
    });

    // Execute Python script with correct working directory
    logger.chat.info("[VOICE_GEN] Spawning Python process: {spawn}", {
      command: "python3",
      args: args,
      env: {
        OPENAI_API_KEY: env.OPENAI_API_KEY ? 'SET' : 'NOT SET',
        WORKSPACE_DIR: env.WORKSPACE_DIR,
        PATH: env.PATH?.substring(0, 100) + '...',
        NODE_ENV: env.NODE_ENV
      },
      cwd: baseDir,
      stdio: ["pipe", "pipe", "pipe"]
    });

    const pythonProcess = spawn("python3", args, {
      env,
      cwd: baseDir, // ✅ CRITICAL: Set working directory to /home/node
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    pythonProcess.stdout.on("data", (data) => {
      const chunk = data.toString();
      stdout += chunk;
      logger.chat.debug("[VOICE_GEN] STDOUT chunk: {chunk}", { chunk: chunk.substring(0, 500) });
    });

    pythonProcess.stderr.on("data", (data) => {
      const chunk = data.toString();
      stderr += chunk;
      logger.chat.debug("[VOICE_GEN] STDERR chunk: {chunk}", { chunk: chunk.substring(0, 500) });
    });

    pythonProcess.on("spawn", () => {
      logger.chat.info("[VOICE_GEN] Python process spawned successfully with PID: {pid}", { pid: pythonProcess.pid });
    });

    pythonProcess.on("close", (code) => {
      // 🔍 ENHANCED DEBUG: Process completion logging
      logger.chat.info("[VOICE_GEN] Python process completed: {completion}", {
        code,
        stdoutLength: stdout.length,
        stderrLength: stderr.length,
        stdout: stdout.substring(0, 1000) + (stdout.length > 1000 ? '...' : ''),
        stderr: stderr.substring(0, 1000) + (stderr.length > 1000 ? '...' : ''),
        pid: pythonProcess.pid
      });

      if (code === 0) {
        try {
          // Parse JSON output from Python script
          const result = JSON.parse(stdout.trim());

          // Handle new JSON format: {"type": "voice", "audioPath": "...", "transcript": "...", "filename": "..."}
          if (result.type === "voice" && result.audioPath) {
            logger.chat.info("[VOICE_GEN] Voice generation successful: {success}", {
              audioPath: result.audioPath,
              fileExists: fs.existsSync(result.audioPath),
              fileSize: fs.existsSync(result.audioPath) ? fs.statSync(result.audioPath).size : 0
            });
            resolve({
              success: true,
              audioPath: result.audioPath,
              message: text
            });
          }
          // Fallback: handle legacy format with success/saved_path
          else if (result.success && result.saved_path) {
            logger.chat.info("[VOICE_GEN] Voice generation successful (legacy): {success}", {
              audioPath: result.saved_path,
              fileExists: fs.existsSync(result.saved_path),
              fileSize: fs.existsSync(result.saved_path) ? fs.statSync(result.saved_path).size : 0
            });
            resolve({
              success: true,
              audioPath: result.saved_path,
              message: text
            });
          } else {
            logger.chat.error("[VOICE_GEN] Python script reported failure: {failure}", {
              result,
              error: result.error,
              success: result.success,
              savedPath: result.saved_path || result.audioPath
            });
            reject(new Error(result.error || "Voice generation failed"));
          }
        } catch (parseError) {
          // Fallback: try to parse legacy output format
          logger.chat.warn("[VOICE_GEN] JSON parse failed, trying legacy format: {parseError}", {
            parseError: parseError instanceof Error ? parseError.message : String(parseError),
            stdout: stdout.substring(0, 500)
          });

          const audioPathMatch = stdout.match(/Audio generated successfully at: (.+\.mp3)/);
          if (audioPathMatch) {
            const audioPath = audioPathMatch[1];
            logger.chat.info("[VOICE_GEN] Voice generation successful (legacy format): {legacy}", {
              audioPath,
              fileExists: fs.existsSync(audioPath)
            });
            resolve({
              success: true,
              audioPath,
              message: text
            });
          } else {
            logger.chat.error("[VOICE_GEN] Failed to parse any output format: {parseFailure}", {
              parseError: parseError instanceof Error ? parseError.message : String(parseError),
              stdout,
              stderr,
              stdoutMatch: audioPathMatch
            });
            reject(new Error(`Failed to parse voice generation output: ${parseError}`));
          }
        }
      } else {
        logger.chat.error("[VOICE_GEN] Python process failed: {processFailure}", {
          exitCode: code,
          stderr,
          stdout,
          args,
          baseDir,
          pythonScript,
          pythonExists: fs.existsSync(pythonScript),
          cwdContents: fs.readdirSync(baseDir).slice(0, 20)
        });
        reject(new Error(`Voice generation process failed with code ${code}. STDERR: ${stderr}. STDOUT: ${stdout}`));
      }
    });

    pythonProcess.on("error", (error) => {
      logger.chat.error("[VOICE_GEN] Failed to start Python process: {spawnError}", {
        error: error.message,
        code: (error as any).code,
        errno: (error as any).errno,
        syscall: (error as any).syscall,
        path: (error as any).path,
        spawnfile: (error as any).spawnfile,
        command: "python3",
        args: args,
        cwd: baseDir,
        pythonExists: fs.existsSync(pythonScript)
      });
      reject(new Error(`Failed to start voice generation process: ${error.message}`));
    });

    // Set timeout to prevent hanging
    setTimeout(() => {
      pythonProcess.kill();
      reject(new Error("Voice generation timed out after 30 seconds"));
    }, 30000);
  });
}

/**
 * Sanitize text for safe JSON serialization in streaming context
 * Prevents JSON parse errors caused by special characters, quotes, newlines, etc.
 */
export function sanitizeForJson(text: string): string {
  if (!text || typeof text !== 'string') return '';

  return text
    .replace(/\\/g, '\\\\')         // Must be first: escape backslashes
    .replace(/"/g, '\\"')           // Escape double quotes
    .replace(/\n/g, '\\n')          // Escape newlines
    .replace(/\r/g, '\\r')          // Escape carriage returns
    .replace(/\t/g, '\\t')          // Escape tabs
    .replace(/\f/g, '\\f')          // Escape form feeds
    .replace(/\b/g, '\\b')          // Escape backspaces
    .substring(0, 1000);            // Limit length to prevent huge responses
}

/**
 * Generate audio URL based on deployment mode
 */
export function generateAudioUrl(audioPath: string): string {
  // Extract filename from path
  const filename = path.basename(audioPath);

  // Check deployment mode from environment
  const deploymentMode = process.env.DEPLOYMENT_MODE;

  if (deploymentMode === 'electron') {
    // Electron mode: Use file:// protocol for local filesystem access
    return `file://${audioPath}`;
  } else if (deploymentMode === 'web') {
    // Web mode: Use HTTP API endpoint to serve voice files
    return `/api/voice/${filename}`;
  } else {
    // Fallback to file:// for unknown modes
    return `file://${audioPath}`;
  }
}