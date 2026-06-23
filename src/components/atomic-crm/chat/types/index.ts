import type {
  SDKUserMessage,
  SDKAssistantMessage,
  SDKSystemMessage,
  SDKResultMessage,
  PermissionMode as SDKPermissionMode,
} from "@anthropic-ai/claude-agent-sdk";

// Token usage tracking
export interface TokenUsageData {
  tokens_used: number;
  max_tokens: number;
  percentage: number;
}

// Chat message for user/assistant interactions (not part of SDKMessage)
export interface ChatMessage {
  type: "chat";
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  audioUrl?: string;          // Voice audio URL (for assistant messages)
  audioStatus?: 'generating' | 'ready' | 'error'; // Voice generation status
  autoPlay?: boolean;         // Whether to auto-play voice (true for streaming, false for history)
}

// Error message for streaming errors
export type ErrorMessage = {
  type: "error";
  subtype: "stream_error";
  message: string;
  timestamp: number;
};

// Abort message for aborted operations
export type AbortMessage = {
  type: "system";
  subtype: "abort";
  message: string;
  timestamp: number;
};

// Hooks message for hook execution notifications
export type HooksMessage = {
  type: "system";
  content: string;
  level?: string;
  toolUseID?: string;
};

// System message extending SDK types with timestamp
export type SystemMessage = (
  | SDKSystemMessage
  | SDKResultMessage
  | ErrorMessage
  | AbortMessage
  | HooksMessage
) & {
  timestamp: number;
};

// Tool message for tool usage display
export type ToolMessage = {
  type: "tool";
  content: string;
  timestamp: number;
};

// Tool result message for tool result display
export type ToolResultMessage = {
  type: "tool_result";
  toolName: string;
  content: string;
  summary: string;
  timestamp: number;
  toolUseResult?: unknown; // Contains structured data like structuredPatch, stdout, stderr etc.
};

// Plan approval dialog state
export interface PlanApprovalDialog {
  isOpen: boolean;
  plan: string;
  toolUseId: string;
}

// Plan message type for UI display
export interface PlanMessage {
  type: "plan";
  plan: string;
  toolUseId: string;
  timestamp: number;
}

// Thinking message for Claude's reasoning process
export interface ThinkingMessage {
  type: "thinking";
  content: string;
  timestamp: number;
}

// Todo item structure for TodoWrite tool results
export interface TodoItem {
  content: string;
  status: "pending" | "in_progress" | "completed";
  activeForm: string;
}

// Todo message for TodoWrite tool result display
export interface TodoMessage {
  type: "todo";
  todos: TodoItem[];
  timestamp: number;
}

// Voice message for audio playback with transcript
export interface VoiceMessage {
  type: "voice";
  content: string;           // Transcript text
  audioUrl: string;          // URL to audio file
  timestamp: number;
  autoPlay?: boolean;        // Default: false for production
}

// File operation message for file creation/modification/preview notifications
export interface FileOperationMessage {
  type: "file_operation";
  operation: "created" | "modified" | "deleted" | "opened";
  path: string;
  fileName: string;
  isDirectory: boolean;
  timestamp: number;
}

// PDF export message for presentation export trigger
export interface PDFExportMessage {
  type: "pdf_export";
  filePath: string;        // Path to the .tsx file to export
  filename?: string;       // Optional output filename
  timestamp: number;
}

// Token usage message for token tracking display
export interface TokenUsageMessage {
  type: "token_usage";
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_tokens?: number;
    cache_read_tokens?: number;
    currentContextSize: number;
    percentage: number;
  };
  timestamp: number;
}

// Thinking content item from Claude SDK
export interface ThinkingContentItem {
  type: "thinking";
  thinking: string;
}

// TimestampedSDKMessage types for conversation history API
// These extend Claude SDK types with timestamp information
type WithTimestamp<T> = T & { timestamp: string };

export type TimestampedSDKUserMessage = WithTimestamp<SDKUserMessage>;
export type TimestampedSDKAssistantMessage = WithTimestamp<SDKAssistantMessage>;
export type TimestampedSDKSystemMessage = WithTimestamp<SDKSystemMessage>;
export type TimestampedSDKResultMessage = WithTimestamp<SDKResultMessage>;

export type TimestampedSDKMessage =
  | TimestampedSDKUserMessage
  | TimestampedSDKAssistantMessage
  | TimestampedSDKSystemMessage
  | TimestampedSDKResultMessage;

export type AllMessage =
  | ChatMessage
  | SystemMessage
  | ToolMessage
  | ToolResultMessage
  | PlanMessage
  | ThinkingMessage
  | TodoMessage
  | VoiceMessage
  | FileOperationMessage
  | PDFExportMessage
  | TokenUsageMessage;

// Type guard functions
export function isChatMessage(message: AllMessage): message is ChatMessage {
  return message.type === "chat";
}

export function isSystemMessage(message: AllMessage): message is SystemMessage {
  return (
    message.type === "system" ||
    message.type === "result" ||
    message.type === "error"
  );
}

export function isToolMessage(message: AllMessage): message is ToolMessage {
  return message.type === "tool";
}

export function isToolResultMessage(
  message: AllMessage,
): message is ToolResultMessage {
  return message.type === "tool_result";
}

export function isPlanMessage(message: AllMessage): message is PlanMessage {
  return message.type === "plan";
}

export function isThinkingMessage(
  message: AllMessage,
): message is ThinkingMessage {
  return message.type === "thinking";
}

export function isTodoMessage(message: AllMessage): message is TodoMessage {
  return message.type === "todo";
}

export function isVoiceMessage(message: AllMessage): message is VoiceMessage {
  const result = message.type === "voice";

  // Only log new voice messages to avoid render loops
  if (result && !(message as any)._logged) {
    (message as any)._logged = true;
  }

  return result;
}

export function isFileOperationMessage(message: AllMessage): message is FileOperationMessage {
  return message.type === "file_operation";
}

export function isPDFExportMessage(message: AllMessage): message is PDFExportMessage {
  return message.type === "pdf_export";
}

export function isTokenUsageMessage(message: AllMessage): message is TokenUsageMessage {
  return message.type === "token_usage";
}

// Permission mode types (UI-focused subset of SDK PermissionMode)
export type PermissionMode = "default" | "plan" | "acceptEdits" | "bypassPermissions";

// SDK type integration utilities
export function toSDKPermissionMode(uiMode: PermissionMode): SDKPermissionMode {
  return uiMode as SDKPermissionMode;
}

export function fromSDKPermissionMode(
  sdkMode: SDKPermissionMode,
): PermissionMode {
  // Filter out bypassPermissions for UI
  return sdkMode === "bypassPermissions" ? "default" : sdkMode;
}

// Chat state extensions for permission mode
export interface ChatStatePermissions {
  permissionMode: PermissionMode;
  planApprovalDialog: PlanApprovalDialog | null;
  setPermissionMode: (mode: PermissionMode) => void;
  showPlanApprovalDialog: (plan: string, toolUseId: string) => void;
  closePlanApprovalDialog: () => void;
  approvePlan: () => void;
  rejectPlan: () => void;
}

// Permission mode preference type
export interface PermissionModePreference {
  mode: PermissionMode;
  timestamp: number;
}

// Plan approval error types (simplified, realistic)
export interface PlanApprovalError {
  type: "user_rejected" | "network_error";
  message: string;
  canRetry: boolean;
}

export type PlanApprovalResult =
  | { success: true; sessionId: string }
  | { success: false; error: PlanApprovalError };

// Re-export shared types
export type {
  StreamResponse,
  ChatRequest,
  ProjectsResponse,
  ProjectInfo,
} from "@/shared/types"; // kept as @/ - lives outside chat module

// Re-export SDK types
export type {
  SDKMessage,
  SDKSystemMessage,
  SDKResultMessage,
  SDKAssistantMessage,
  SDKUserMessage,
} from "@anthropic-ai/claude-code";
