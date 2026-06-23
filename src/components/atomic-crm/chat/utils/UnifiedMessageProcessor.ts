import type {
  AllMessage,
  ChatMessage,
  ThinkingMessage,
  SDKMessage,
  TimestampedSDKMessage,
} from "../types";
import {
  convertSystemMessage,
  convertResultMessage,
  createToolMessage,
  createToolResultMessage,
  createThinkingMessage,
  createTodoMessageFromInput,
} from "./messageConversion";
import { isThinkingContentItem } from "./messageTypes";
import { extractToolInfo, generateToolPatterns } from "./toolUtils";
import { generateThinkingMessage } from "./thinkingMessageGenerator";

/**
 * Tool cache interface for tracking tool_use information
 */
interface ToolCache {
  name: string;
  input: Record<string, unknown>;
}

/**
 * Processing context interface for streaming use case
 */
export interface ProcessingContext {
  // Core message handling
  addMessage: (message: AllMessage) => void;
  updateLastMessage?: (contentOrUpdate: string | Partial<ChatMessage>) => void;

  // Current assistant message state (for streaming)
  currentAssistantMessage?: ChatMessage | null;
  setCurrentAssistantMessage?: (message: ChatMessage | null) => void;

  // Session handling
  onSessionId?: (sessionId: string) => void;
  hasReceivedInit?: boolean;
  setHasReceivedInit?: (received: boolean) => void;

  // Init message handling
  shouldShowInitMessage?: () => boolean;
  onInitMessageShown?: () => void;

  // Permission/Error handling
  onPermissionError?: (
    toolName: string,
    patterns: string[],
    toolUseId: string,
  ) => void;
  onAbortRequest?: () => void;

  // Token usage tracking
  onTokenUpdate?: (newTokens: number) => void;


  // User ID for voice generation
  userId?: string;
}

/**
 * Processing options for different use cases
 */
export interface ProcessingOptions {
  /** Whether this is streaming mode (vs batch history processing) */
  isStreaming?: boolean;
  /** Override timestamp for batch processing */
  timestamp?: number;
  /** User ID for voice generation */
  userId?: string;
}

/**
 * Helper function to detect tool use errors that should be displayed as regular results
 */
function isToolUseError(content: string): boolean {
  return content.includes("tool_use_error");
}

/**
 * Unified Message Processor
 *
 * This class provides consistent message processing logic for both
 * streaming and history loading scenarios, ensuring identical output
 * regardless of the data source.
 */
export class UnifiedMessageProcessor {
  private toolUseCache = new Map<string, ToolCache>();

  /**
   * Clear the tool use cache
   */
  public clearCache(): void {
    this.toolUseCache.clear();
  }

  /**
   * Store tool_use information for later correlation with tool_result
   */
  private cacheToolUse(
    id: string,
    name: string,
    input: Record<string, unknown>,
  ): void {
    this.toolUseCache.set(id, { name, input });
  }

  /**
   * Retrieve cached tool_use information
   */
  private getCachedToolInfo(id: string): ToolCache | undefined {
    return this.toolUseCache.get(id);
  }

  /**
   * Handle permission errors during streaming
   */
  private handlePermissionError(
    contentItem: { tool_use_id?: string; content: string },
    context: ProcessingContext,
  ): void {
    // Immediately abort the current request
    if (context.onAbortRequest) {
      context.onAbortRequest();
    }

    // Get cached tool_use information
    const toolUseId = contentItem.tool_use_id || "";
    const cachedToolInfo = this.getCachedToolInfo(toolUseId);

    // Extract tool information for permission handling
    const { toolName, commands } = extractToolInfo(
      cachedToolInfo?.name,
      cachedToolInfo?.input,
    );

    // Compute patterns based on tool type
    const patterns = generateToolPatterns(toolName, commands);

    // Notify parent component about permission error
    if (context.onPermissionError) {
      context.onPermissionError(toolName, patterns, toolUseId);
    }
  }

  /**
   * Process tool_result content item
   */
  private processToolResult(
    contentItem: {
      tool_use_id?: string;
      content: string;
      is_error?: boolean;
    },
    context: ProcessingContext,
    options: ProcessingOptions,
    toolUseResult?: unknown,
  ): void {
    const content =
      typeof contentItem.content === "string"
        ? contentItem.content
        : JSON.stringify(contentItem.content);

    // Check for permission errors - but skip tool use errors which should be displayed as regular results
    if (
      options.isStreaming &&
      contentItem.is_error &&
      !isToolUseError(content)
    ) {
      this.handlePermissionError(contentItem, context);
      return;
    }

    // Get cached tool_use information to determine tool name (for non-voice tools)
    const toolUseId = contentItem.tool_use_id || "";
    const cachedToolInfo = this.getCachedToolInfo(toolUseId);
    const toolName = cachedToolInfo?.name || "Tool";

    // Don't show tool_result for TodoWrite since we already show TodoMessage from tool_use
    if (toolName === "TodoWrite") {
      return;
    }

    // Special handling for Write/Edit tool results - file operations
    // Use cached tool input instead of pattern matching (100% reliable)

    let filePath: string | null = null;
    let operation: "created" | "modified" | "deleted" | null = null;
    let isDirectory = false;

    // Check if this is a Write, Edit, or Bash (delete) tool by examining the cached input
    if (cachedToolInfo && cachedToolInfo.input) {
      const input = cachedToolInfo.input;

      // Check tool name FIRST to distinguish Write from Edit from Delete
      if (toolName === "Write" && input.file_path && typeof input.file_path === 'string') {
        filePath = input.file_path;
        operation = "created";
        isDirectory = false;
      }
      else if (toolName === "Edit" && input.file_path && typeof input.file_path === 'string') {
        filePath = input.file_path;
        operation = "modified";
        isDirectory = false;
      }
      else if (toolName === "Bash" && input.command && typeof input.command === 'string') {
        const command = input.command as string;
        // Pattern 1: Directory creation (mkdir)
        const mkdirMatch = command.match(/mkdir\s+(?:-p\s+)?["']?([^\s"']+)["']?/);
        if (mkdirMatch) {
          filePath = mkdirMatch[1];
          operation = "created";
          isDirectory = true;
        }

        // Pattern 2: File creation with echo/cat
        const echoMatch = command.match(/(?:echo|cat)\s+.*?>\s*["']?([^\s"']+)["']?/);
        if (!filePath && echoMatch) {
          filePath = echoMatch[1];
          operation = "created";
          isDirectory = false;
        }

        // Pattern 3: Move/Rename operations
        const mvMatch = command.match(/mv\s+["']?([^\s"']+)["']?\s+["']?([^\s"']+)["']?/);
        if (!filePath && mvMatch) {
          // For moves, we need to handle both deletion of old and creation of new
          // First, trigger deletion of old path
          filePath = mvMatch[1];
          operation = "deleted";
          // TODO: Also trigger creation for mvMatch[2] (may need separate message)
        }

        // Pattern 4: Copy operations
        const cpMatch = command.match(/cp\s+(?:-r\s+)?["']?([^\s"']+)["']?\s+["']?([^\s"']+)["']?/);
        if (!filePath && cpMatch) {
          filePath = cpMatch[2];  // Destination is what appears in tree
          operation = "created";
          isDirectory = command.includes('-r');
        }

        // Pattern 5: Delete operations (improved)
        const deleteMatch = command.match(/(?:rm|rmdir|unlink)\s+(?:-[rf]+\s+)?["']?([^\s"']+)["']?/);
        if (!filePath && deleteMatch) {
          filePath = deleteMatch[1];
          operation = "deleted";
          isDirectory = command.includes('rmdir') || command.includes('-r');
        }

        // Pattern 6: Touch for file creation
        const touchMatch = command.match(/touch\s+["']?([^\s"']+)["']?/);
        if (!filePath && touchMatch) {
          filePath = touchMatch[1];
          operation = "created";
          isDirectory = false;
        }
      }
    }

    // Additional detection: Check for embedded FILE_OPERATION JSON in MCP tool responses
    // This provides a fallback if cache-based detection fails
    // Also handles explicit FILE_OPERATION signals from echo commands
    if (!filePath && content) {
      const fileOpMatch = content.match(/FILE_OPERATION:(\{[^}]+\})/);
      if (fileOpMatch) {
        try {
          const fileOpData = JSON.parse(fileOpMatch[1]);

          if (fileOpData.path && fileOpData.operation) {
            filePath = fileOpData.path;
            // Map operation types: file_created -> created, file_modified -> modified, opened -> opened
            if (fileOpData.operation === 'file_created') {
              operation = "created";
            } else if (fileOpData.operation === 'file_modified') {
              operation = "modified";
            } else if (fileOpData.operation === 'opened') {
              operation = "opened";
            }
          }
        } catch (e) {
          // Silently handle parsing errors
        }
      }
    }

    // Special handling for move operations - need both delete and create
    if (cachedToolInfo && cachedToolInfo.input && toolName === "Bash") {
      const input = cachedToolInfo.input;
      if (input.command && typeof input.command === 'string') {
        const command = input.command as string;
        const mvMatch = command.match(/mv\s+["']?([^\s"']+)["']?\s+["']?([^\s"']+)["']?/);
        if (mvMatch) {
          // First message: delete old location
          const deleteMessage = {
            type: "file_operation" as const,
            operation: "deleted" as const,
            path: mvMatch[1],
            fileName: mvMatch[1].split('/').pop() || mvMatch[1],
            isDirectory: false,  // Could enhance with stat check
            timestamp: options.timestamp || Date.now(),
          };
          context.addMessage(deleteMessage);

          // Second message: create new location
          const createMessage = {
            type: "file_operation" as const,
            operation: "created" as const,
            path: mvMatch[2],
            fileName: mvMatch[2].split('/').pop() || mvMatch[2],
            isDirectory: false,  // Could enhance with stat check
            timestamp: options.timestamp || Date.now(),
          };
          context.addMessage(createMessage);

          // Skip normal single message creation
          filePath = null;
          operation = null;
        }
      }
    }

    // If we detected a file operation, create FileOperationMessage
    if (filePath && operation) {
      const fileName = filePath.split('/').pop() || filePath;
      // Create FileOperationMessage
      const fileOpMessage = {
        type: "file_operation" as const,
        operation,
        path: filePath,
        fileName,
        isDirectory: isDirectory,
        timestamp: options.timestamp || Date.now(),
      };

      context.addMessage(fileOpMessage);
      // Note: We still create ToolResultMessage too (unlike voice which returns early)
    }


    // Special handling for other Bash tool results
    if (toolName === "Bash") {
      const cachedInput = this.getCachedToolInfo(toolUseId)?.input;
      const command = cachedInput?.command as string;

      // Note: jarvis_voice.sh detection removed - now handled by structured MCP tool responses

      // Special handling for PDF export trigger
      if (command?.includes('jarvis_pdf_export.sh')) {
        // Parse PDF export parameters from content
        if (content.includes('PDF_EXPORT_TRIGGER')) {
          const filePathMatch = content.match(/FILE_PATH:(.+)/);
          const filenameMatch = content.match(/FILENAME:(.+)/);

          if (filePathMatch) {
            const filePath = filePathMatch[1].trim();
            const filename = filenameMatch ? filenameMatch[1].trim() : 'presentation.pdf';

            // Create PDFExportMessage instead of ToolResultMessage
            const pdfExportMessage = {
              type: "pdf_export" as const,
              filePath,
              filename,
              timestamp: options.timestamp || Date.now(),
            };

            context.addMessage(pdfExportMessage);
            return; // Skip creating ToolResultMessage
          }
        }
      }
    }

    // This is a regular tool result - create a ToolResultMessage
    const toolResultMessage = createToolResultMessage(
      toolName,
      content,
      options.timestamp,
      toolUseResult,
    );
    context.addMessage(toolResultMessage);
  }

  /**
   * Handle assistant text content during streaming
   */
  private handleAssistantText(
    contentItem: { text?: string },
    context: ProcessingContext,
    options: ProcessingOptions,
  ): void {
    if (!options.isStreaming) {
      return;
    }

    let messageToUpdate = context.currentAssistantMessage;
    let isNewMessage = false;

    if (!messageToUpdate) {
      isNewMessage = true;
      messageToUpdate = {
        type: "chat",
        role: "assistant",
        content: "",
        timestamp: options.timestamp || Date.now(),
      };
      context.setCurrentAssistantMessage?.(messageToUpdate);
    }

    const updatedContent =
      (messageToUpdate.content || "") + (contentItem.text || "");

    const updatedMessage = {
      ...messageToUpdate,
      content: updatedContent,
    };
    context.setCurrentAssistantMessage?.(updatedMessage);

    if (isNewMessage) {
      context.addMessage(updatedMessage);
      context.setCurrentAssistantMessage?.(updatedMessage);
    } else {
      context.updateLastMessage?.(updatedMessage);
    }
  }

  /**
   * Handle tool_use content item
   */
  private handleToolUse(
    contentItem: {
      id?: string;
      name?: string;
      input?: Record<string, unknown>;
    },
    context: ProcessingContext,
    options: ProcessingOptions,
  ): void {

    // Cache tool_use information for later permission error handling and tool_result correlation
    if (contentItem.id && contentItem.name) {
      this.cacheToolUse(
        contentItem.id,
        contentItem.name,
        contentItem.input || {},
      );
    }

    // Note: We don't create FileOperationMessage from tool_use anymore
    // because it happens BEFORE the file is created. We only create it from
    // tool_result after the file is actually written to disk.

    // Generate thinking message before tool execution (for Jarvis mode)
    if (contentItem.name) {
      const thinkingMessage = generateThinkingMessage(
        contentItem.name,
        contentItem.input || {},
        options.timestamp || Date.now()
      );

      if (thinkingMessage) {
        context.addMessage(thinkingMessage);
      }
    }

    // Special handling for ExitPlanMode - create plan message instead of tool message
    if (contentItem.name === "ExitPlanMode") {
      const planContent = (contentItem.input?.plan as string) || "";
      const planMessage = {
        type: "plan" as const,
        plan: planContent,
        toolUseId: contentItem.id || "",
        timestamp: options.timestamp || Date.now(),
      };
      context.addMessage(planMessage);
    } else if (contentItem.name === "TodoWrite") {
      // Special handling for TodoWrite - create todo message from input
      const todoMessage = createTodoMessageFromInput(
        contentItem.input || {},
        options.timestamp,
      );
      if (todoMessage) {
        context.addMessage(todoMessage);
      } else {
        // Fallback to regular tool message if todo parsing fails
        const toolMessage = createToolMessage(contentItem, options.timestamp);
        context.addMessage(toolMessage);
      }
    } else {
      const toolMessage = createToolMessage(contentItem, options.timestamp);
      context.addMessage(toolMessage);
    }
  }

  /**
   * Process a system message
   */
  private processSystemMessage(
    message: Extract<SDKMessage | TimestampedSDKMessage, { type: "system" }>,
    context: ProcessingContext,
    options: ProcessingOptions,
  ): void {
    const timestamp = options.timestamp || Date.now();

    // Check if this is an init message and if we should show it (streaming only)
    if (options.isStreaming && message.subtype === "init") {
      // Mark that we've received init
      context.setHasReceivedInit?.(true);

      const shouldShow = context.shouldShowInitMessage?.() ?? true;
      if (shouldShow) {
        const systemMessage = convertSystemMessage(message, timestamp);
        context.addMessage(systemMessage);
        context.onInitMessageShown?.();
      }
    } else {
      // Always show non-init system messages
      const systemMessage = convertSystemMessage(message, timestamp);
      context.addMessage(systemMessage);
    }
  }

  /**
   * Process an assistant message
   */
  private async processAssistantMessage(
    message: Extract<SDKMessage | TimestampedSDKMessage, { type: "assistant" }>,
    context: ProcessingContext,
    options: ProcessingOptions,
  ): Promise<AllMessage[]> {
    const timestamp = options.timestamp || Date.now();
    const messages: AllMessage[] = [];

    // Update sessionId only for the first assistant message after init (streaming only)
    if (
      options.isStreaming &&
      context.hasReceivedInit &&
      message.session_id &&
      context.onSessionId
    ) {
      context.onSessionId(message.session_id);
    }

    // For batch processing, collect messages to return
    // For streaming, messages are added directly via context
    const localContext = options.isStreaming
      ? context
      : {
          ...context,
          addMessage: (msg: AllMessage) => messages.push(msg),
        };

    let assistantContent = "";
    const thinkingMessages: ThinkingMessage[] = [];

    // Each SDK assistant message is a new turn — reset so handleAssistantText
    // creates a fresh ChatMessage via addMessage instead of silently failing
    // on updateLastMessage (which requires last msg to be type "chat")
    if (options.isStreaming) {
      context.setCurrentAssistantMessage?.(null);
    }

    // Check if message.content exists and is an array
    if (message.message?.content && Array.isArray(message.message.content)) {
      for (const item of message.message.content) {
        if (item.type === "text") {
          if (options.isStreaming) {
            this.handleAssistantText(item, context, options);
          } else {
            assistantContent += (item as { text: string }).text;
          }
        } else if (item.type === "tool_use") {
          this.handleToolUse(item, localContext, options);
        } else if (isThinkingContentItem(item)) {
          // SDK adaptive thinking blocks — skip rendering.
          // Model reasoning is logged on the backend; users see
          // tool-based thinking messages from generateThinkingMessage instead.
        }
      }
    }

    // For batch processing, assemble the messages in proper order
    if (!options.isStreaming) {
      const orderedMessages: AllMessage[] = [];

      // Add thinking messages first (reasoning comes before action)
      orderedMessages.push(...thinkingMessages);

      // Add tool messages second (actions)
      orderedMessages.push(...messages);

      // Add assistant text message last if there is text content
      if (assistantContent.trim()) {
        const assistantMessage: ChatMessage = {
          type: "chat",
          role: "assistant",
          content: assistantContent.trim(),
          timestamp,
        };
        orderedMessages.push(assistantMessage);
      }

      return orderedMessages;
    }

    return messages;
  }

  /**
   * Process a result message
   */
  private processResultMessage(
    message: Extract<SDKMessage | TimestampedSDKMessage, { type: "result" }>,
    context: ProcessingContext,
    options: ProcessingOptions,
  ): void {
    const timestamp = options.timestamp || Date.now();
    const resultMessage = convertResultMessage(message, timestamp);
    context.addMessage(resultMessage);

    // Clear current assistant message (streaming only)
    if (options.isStreaming) {
      // Voice generation now happens automatically in backend
      context.setCurrentAssistantMessage?.(null);
    }
  }

  /**
   * Process a user message
   */
  private processUserMessage(
    message: Extract<SDKMessage | TimestampedSDKMessage, { type: "user" }>,
    context: ProcessingContext,
    options: ProcessingOptions,
  ): AllMessage[] {
    const timestamp = options.timestamp || Date.now();
    const messages: AllMessage[] = [];

    // For batch processing, collect messages to return
    // For streaming, messages are added directly via context
    const localContext = options.isStreaming
      ? context
      : {
          ...context,
          addMessage: (msg: AllMessage) => messages.push(msg),
        };

    const messageContent = message.message.content;

    if (Array.isArray(messageContent)) {
      for (let i = 0; i < messageContent.length; i++) {
        const contentItem = messageContent[i];

        if (contentItem.type === "tool_result") {
          // Extract toolUseResult from message if it exists
          const toolUseResult = (message as { toolUseResult?: unknown })
            .toolUseResult;
          this.processToolResult(
            contentItem,
            localContext,
            options,
            toolUseResult,
          );
        } else if (contentItem.type === "text") {
          // Regular text content
          const userMessage: ChatMessage = {
            type: "chat",
            role: "user",
            content: (contentItem as { text: string }).text,
            timestamp,
          };
          localContext.addMessage(userMessage);
        }
      }
    } else if (typeof messageContent === "string") {
      // Simple string content
      const userMessage: ChatMessage = {
        type: "chat",
        role: "user",
        content: messageContent,
        timestamp,
      };
      localContext.addMessage(userMessage);
    }

    return messages;
  }

  /**
   * Process a single SDK message
   *
   * @param message - The SDK message to process
   * @param context - Processing context for callbacks and state management
   * @param options - Processing options (streaming vs batch, timestamp override)
   * @returns Array of messages for batch processing (empty for streaming)
   */
  public async processMessage(
    message: SDKMessage | TimestampedSDKMessage,
    context: ProcessingContext,
    options: ProcessingOptions = {},
  ): Promise<AllMessage[]> {
    const timestamp =
      options.timestamp ||
      ("timestamp" in message
        ? new Date(message.timestamp).getTime()
        : Date.now());

    const finalOptions = { ...options, timestamp };


    switch (message.type) {
      case "system":
        this.processSystemMessage(message, context, finalOptions);
        return [];

      case "assistant":
        return await this.processAssistantMessage(message, context, finalOptions);

      case "result":
        this.processResultMessage(message, context, finalOptions);
        return [];

      case "user":
        return this.processUserMessage(message, context, finalOptions);

      default:
        console.warn(
          "Unknown message type:",
          (message as { type: string }).type,
        );
        return [];
    }
  }

  /**
   * Process multiple messages in batch (for history loading)
   *
   * @param messages - Array of timestamped SDK messages
   * @param context - Processing context
   * @returns Array of processed messages
   */
  public async processMessagesBatch(
    messages: TimestampedSDKMessage[],
    context?: Partial<ProcessingContext>,
  ): Promise<AllMessage[]> {
    const allMessages: AllMessage[] = [];

    // Create a batch context that collects messages
    const batchContext: ProcessingContext = {
      addMessage: (msg: AllMessage) => allMessages.push(msg),
      ...context,
    };

    // Clear cache before processing batch
    this.clearCache();

    for (const message of messages) {
      const processedMessages = await this.processMessage(message, batchContext, {
        isStreaming: false,
        timestamp: new Date(message.timestamp).getTime(),
        // Don't pass userId for batch processing - no voice generation for history
      });
      allMessages.push(...processedMessages);
    }

    return allMessages;
  }
}
