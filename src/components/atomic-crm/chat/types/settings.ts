export type Theme = "light" | "dark";
export type EnterBehavior = "send" | "newline";
export type InterfaceMode = "jarvis" | "developer";
export type ClaudeAuthMethod = "api_key" | "terminal_login";
export type PreviewMode = "file" | "app" | "company";
export type WorkspaceDirection = "ltr" | "rtl";

export interface MessageDisplaySettings {
  mode: InterfaceMode;
}

export interface AppSettings {
  theme: Theme;
  enterBehavior: EnterBehavior;
  messageDisplay: MessageDisplaySettings;
  workingDirectory: string; // For Claude Code execution in VM - always /home/node
  fileTreeDirectory: string; // For file tree display - browses Supabase storage (empty = root of workspace)
  claudeAuthMethod: ClaudeAuthMethod;
  previewMode: PreviewMode; // For desktop preview panel - file preview or app preview
  mobilePreviewMode: PreviewMode; // For mobile preview - file preview or app preview
  workspaceDirection: WorkspaceDirection; // Workspace layout direction - loaded from DB, read-only
  parallelChat: boolean; // Enable multiple chat panels stacked vertically
  chatVisible: boolean; // Show/hide chat panel
  version: number;
}

export interface LegacySettings {
  theme?: Theme;
  enterBehavior?: EnterBehavior;
}

export interface SettingsContextType {
  settings: AppSettings;
  theme: Theme;
  enterBehavior: EnterBehavior;
  workingDirectory: string; // Claude Code working directory
  fileTreeDirectory: string; // File tree display directory
  previewMode: PreviewMode; // Desktop preview panel mode
  mobilePreviewMode: PreviewMode; // Mobile preview mode
  workspaceDirection: WorkspaceDirection; // Workspace layout direction (from DB)
  parallelChat: boolean; // Multiple chat panels enabled
  chatVisible: boolean; // Chat panel visible
  isTerminalOpen?: boolean;
  toggleTheme: () => void;
  toggleEnterBehavior: () => void;
  setWorkingDirectory: (path: string) => void;
  setFileTreeDirectory: (path: string) => void;
  setPreviewMode: (mode: PreviewMode) => void;
  setMobilePreviewMode: (mode: PreviewMode) => void;
  toggleParallelChat: () => void;
  toggleChatVisible: () => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
  toggleTerminal?: () => void;
}

// Get default Claude working directory - always /home/node for Docker deployment
function getDefaultClaudeWorkspace(): string {
  // Claude Code always runs in /home/node for consistent behavior in Docker
  return '/home/node';
}

// Get default file tree directory - browse Supabase storage root
function getDefaultFileTreeDirectory(): string {
  // Default to /home/node to match desktop implementation and ensure FileTree has valid path
  return '/home/node';
}

// Default settings
export const DEFAULT_SETTINGS: AppSettings = {
  theme: "light",
  enterBehavior: "send",
  messageDisplay: {
    mode: "jarvis"  // Default to consumer experience
  },
  workingDirectory: getDefaultClaudeWorkspace(), // Claude Code always in /home/node (VM concept)
  fileTreeDirectory: getDefaultFileTreeDirectory(), // Empty string = browse from Supabase root
  claudeAuthMethod: "terminal_login", // Default to terminal login
  previewMode: "app", // Default to app preview (desktop)
  mobilePreviewMode: "app", // Default to app preview (mobile)
  workspaceDirection: "ltr", // Default LTR - overridden by DB for RTL users
  parallelChat: false, // Default to single chat panel
  chatVisible: true, // Default to showing chat panel
  version: 12,  // v12: added chatVisible
};

// Current settings version for migration
export const CURRENT_SETTINGS_VERSION = 12;
