/**
 * FileOperationDetector — Client-side file operation detection
 *
 * Extracted from BackendMessageProcessor for use in direct streaming.
 * When the browser streams directly from Fly.io (bypassing Vercel),
 * we need to detect file operations client-side to emit file_synced events.
 *
 * Pure JSON pattern matching — no secrets, no database calls.
 */

interface ToolCache {
  name: string
  input: Record<string, unknown>
}

interface FileOperation {
  type: 'created' | 'modified' | 'deleted'
  path: string
  toolName: string
  isDirectory: boolean
}

export interface FileSyncEvent {
  type: 'file_synced'
  path: string
  timestamp: number
}

export class FileOperationDetector {
  private toolUseCache = new Map<string, ToolCache>()

  /**
   * Process a Claude SDK message and return a file_synced event if a file operation was detected.
   */
  processMessage(sdkMessage: any): FileSyncEvent | null {
    // Handle tool_use — cache tool name + input for correlation with result
    if (sdkMessage.type === 'assistant' && sdkMessage.message?.content) {
      for (const item of sdkMessage.message.content) {
        if (item.type === 'tool_use' && item.id && item.name) {
          this.toolUseCache.set(item.id, {
            name: item.name,
            input: item.input || {}
          })
        }
      }
    }

    // Handle tool_result — detect file operations
    if (sdkMessage.type === 'result' && sdkMessage.result?.content) {
      for (const item of sdkMessage.result.content) {
        if (item.type === 'tool_result' && item.tool_use_id) {
          const fileOp = this.detectFileOperation(item)
          if (fileOp) {
            return {
              type: 'file_synced',
              path: fileOp.path,
              timestamp: Date.now()
            }
          }
        }
      }
    }

    return null
  }

  private detectFileOperation(toolResult: any): FileOperation | null {
    const toolInfo = this.toolUseCache.get(toolResult.tool_use_id)
    if (!toolInfo) return null

    const { name: toolName, input } = toolInfo

    // Detect Write tool
    if (toolName === 'Write' && input.file_path) {
      return {
        type: 'created',
        path: input.file_path as string,
        toolName,
        isDirectory: false
      }
    }

    // Detect Edit/MultiEdit tools
    if ((toolName === 'Edit' || toolName === 'MultiEdit') && input.file_path) {
      return {
        type: 'modified',
        path: input.file_path as string,
        toolName,
        isDirectory: false
      }
    }

    // Detect NotebookEdit tool
    if (toolName === 'NotebookEdit' && input.notebook_path) {
      return {
        type: 'modified',
        path: input.notebook_path as string,
        toolName,
        isDirectory: false
      }
    }

    // Detect Bash operations (mkdir, rm, etc.)
    if (toolName === 'Bash' && input.command) {
      return this.parseBashCommand(input.command as string)
    }

    return null
  }

  private parseBashCommand(command: string): FileOperation | null {
    // Pattern 1: Directory creation (mkdir)
    const mkdirMatch = command.match(/mkdir\s+(?:-p\s+)?["']?([^\s"']+)["']?/)
    if (mkdirMatch) {
      return {
        type: 'created',
        path: mkdirMatch[1],
        toolName: 'Bash',
        isDirectory: true
      }
    }

    // Pattern 2: File creation with echo/cat
    const echoMatch = command.match(/(?:echo|cat)\s+.*?>\s*["']?([^\s"']+)["']?/)
    if (echoMatch) {
      return {
        type: 'created',
        path: echoMatch[1],
        toolName: 'Bash',
        isDirectory: false
      }
    }

    // Pattern 3: File deletion (rm)
    const rmMatch = command.match(/rm\s+(?:-[rf]+\s+)?["']?([^\s"']+)["']?/)
    if (rmMatch) {
      return {
        type: 'deleted',
        path: rmMatch[1],
        toolName: 'Bash',
        isDirectory: false
      }
    }

    return null
  }
}
