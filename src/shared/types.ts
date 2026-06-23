export interface StreamResponse {
  type: "claude_json" | "text" | "tool_use" | "session_init" | "done" | "error" | "aborted" | "ping" | "token_update" | "file_synced";
  data?: unknown; // SDKMessage object for claude_json type
  content?: string; // Text content for "text" type
  name?: string; // Tool name for "tool_use" type
  input?: unknown; // Tool input for "tool_use" type
  id?: string; // Tool use ID for "tool_use" type
  session_id?: string; // Session ID for "session_init" type
  error?: string;
  usage?: Record<string, unknown>; // Token usage data for token_update type
  sessionId?: string; // Session ID for token_update type
  path?: string; // File path for "file_synced" type
}

export interface ChatRequest {
  message: string;
  sessionId?: string;
  requestId: string;
  allowedTools?: string[];
  workingDirectory?: string;
  permissionMode?: "default" | "plan" | "acceptEdits" | "bypassPermissions";
}

export interface AbortRequest {
  requestId: string;
}

export interface ProjectInfo {
  path: string;
  encodedName: string;
}

export interface ProjectsResponse {
  projects: ProjectInfo[];
}

// Conversation history types
export interface ConversationSummary {
  sessionId: string;
  startTime: string;
  lastTime: string;
  messageCount: number;
  lastMessagePreview: string;
}

export interface HistoryListResponse {
  conversations: ConversationSummary[];
}

// Token usage data from history files
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  total: number;
}

// Conversation history types
// Note: messages are typed as unknown[] to avoid frontend/backend dependency issues
// Frontend should cast to TimestampedSDKMessage[] (defined in frontend/src/types.ts)
export interface ConversationHistory {
  sessionId: string;
  messages: unknown[]; // TimestampedSDKMessage[] in practice, but avoiding frontend type dependency
  metadata: {
    startTime: string;
    endTime: string;
    messageCount: number;
  };
  tokenUsage?: TokenUsage; // Cumulative token usage extracted from assistant messages
}
