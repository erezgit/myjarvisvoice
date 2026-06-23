import type { AppSettings, Theme, EnterBehavior } from "../types/settings";
import { CURRENT_SETTINGS_VERSION, DEFAULT_SETTINGS } from "../types/settings";

export const STORAGE_KEYS = {
  // Unified settings key
  SETTINGS: "claude-code-webui-settings",
  // Legacy keys for migration
  THEME: "claude-code-webui-theme",
  ENTER_BEHAVIOR: "claude-code-webui-enter-behavior",
  PERMISSION_MODE: "claude-code-webui-permission-mode",
} as const;

// Type-safe storage utilities
export function getStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Silently fail if localStorage is not available
  }
}

export function removeStorageItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Silently fail if localStorage is not available
  }
}

// Settings-specific utilities
export function getSettings(): AppSettings {
  // Try to load unified settings first
  const unifiedSettings = getStorageItem<AppSettings | null>(
    STORAGE_KEYS.SETTINGS,
    null,
  );

  if (unifiedSettings && unifiedSettings.version === CURRENT_SETTINGS_VERSION) {
    // Fix any lingering /workspace paths in fileTreeDirectory
    if (unifiedSettings.fileTreeDirectory && unifiedSettings.fileTreeDirectory.includes('/workspace')) {
      unifiedSettings.fileTreeDirectory = unifiedSettings.fileTreeDirectory.replace('/workspace', '/home/node');
      setSettings(unifiedSettings);
    }
    return unifiedSettings;
  }

  // If we have unified settings but outdated version, migrate
  if (unifiedSettings && unifiedSettings.version < CURRENT_SETTINGS_VERSION) {
    return migrateSettings(unifiedSettings);
  }

  // If no unified settings, migrate from legacy format
  return migrateLegacySettings();
}

export function setSettings(settings: AppSettings): void {
  setStorageItem(STORAGE_KEYS.SETTINGS, settings);
}

function migrateSettings(oldSettings: Partial<AppSettings>): AppSettings {
  // Migrate from version 1 to version 2 (add messageDisplay)
  if (oldSettings.version === 1) {
    const migratedSettings: AppSettings = {
      theme: oldSettings.theme || DEFAULT_SETTINGS.theme,
      enterBehavior: oldSettings.enterBehavior || DEFAULT_SETTINGS.enterBehavior,
      messageDisplay: DEFAULT_SETTINGS.messageDisplay, // Add new field
      version: CURRENT_SETTINGS_VERSION,
    };

    // Save migrated settings
    setSettings(migratedSettings);
    return migratedSettings;
  }

  // Migrate from version 2 to version 3 (convert boolean flags to single mode)
  if (oldSettings.version === 2) {
    // Cast to access old boolean properties
    const oldMessageDisplay = oldSettings.messageDisplay as any;

    // Determine mode based on old boolean flags
    let mode: "jarvis" | "developer" = "jarvis"; // Default to jarvis

    if (oldMessageDisplay) {
      // If developerMode was true, use developer mode
      if (oldMessageDisplay.developerMode === true) {
        mode = "developer";
      }
      // If jarvisMode was explicitly true, use jarvis mode
      else if (oldMessageDisplay.jarvisMode === true) {
        mode = "jarvis";
      }
    }

    const migratedSettings: AppSettings = {
      theme: oldSettings.theme || DEFAULT_SETTINGS.theme,
      enterBehavior: oldSettings.enterBehavior || DEFAULT_SETTINGS.enterBehavior,
      messageDisplay: { mode },
      workingDirectory: oldSettings.workingDirectory || DEFAULT_SETTINGS.workingDirectory,
      version: CURRENT_SETTINGS_VERSION,
    };

    // Save migrated settings
    setSettings(migratedSettings);
    return migratedSettings;
  }

  // Migrate from version 3 to version 4 (add workingDirectory)
  if (oldSettings.version === 3) {
    // When migrating from v3, which had no separate directories, use defaults
    const migratedSettings: AppSettings = {
      theme: oldSettings.theme || DEFAULT_SETTINGS.theme,
      enterBehavior: oldSettings.enterBehavior || DEFAULT_SETTINGS.enterBehavior,
      messageDisplay: oldSettings.messageDisplay || DEFAULT_SETTINGS.messageDisplay,
      workingDirectory: '/home/node', // Always use /home/node for Claude Code
      fileTreeDirectory: DEFAULT_SETTINGS.fileTreeDirectory, // Use default file tree directory
      version: CURRENT_SETTINGS_VERSION,
    };

    // Save migrated settings
    setSettings(migratedSettings);
    return migratedSettings;
  }

  // Migrate from version 4 to version 5 (separate fileTreeDirectory)
  if (oldSettings.version === 4) {
    // Convert old /workspace paths to /home/node
    let fileTreeDir = DEFAULT_SETTINGS.fileTreeDirectory;
    if (oldSettings.workingDirectory) {
      // Replace /workspace with /home/node in the old working directory
      fileTreeDir = oldSettings.workingDirectory.replace('/workspace', '/home/node');
    }

    const migratedSettings: AppSettings = {
      theme: oldSettings.theme || DEFAULT_SETTINGS.theme,
      enterBehavior: oldSettings.enterBehavior || DEFAULT_SETTINGS.enterBehavior,
      messageDisplay: oldSettings.messageDisplay || DEFAULT_SETTINGS.messageDisplay,
      workingDirectory: '/home/node', // Claude Code always uses /home/node
      fileTreeDirectory: fileTreeDir, // Convert /workspace to /home/node
      version: 5,
    };

    oldSettings = migratedSettings;
  }

  // Migrate from version 5 to version 6 (fix file tree to browse Supabase root)
  if (oldSettings.version === 5) {
    const migratedSettings: AppSettings = {
      ...oldSettings,
      fileTreeDirectory: '', // Empty string = browse from Supabase workspace root
      version: 6,
    };

    oldSettings = migratedSettings;
  }

  // Migrate from version 6 to version 7 (add claudeAuthMethod)
  if (oldSettings.version === 6) {
    const migratedSettings: AppSettings = {
      theme: oldSettings.theme || DEFAULT_SETTINGS.theme,
      enterBehavior: oldSettings.enterBehavior || DEFAULT_SETTINGS.enterBehavior,
      messageDisplay: oldSettings.messageDisplay || DEFAULT_SETTINGS.messageDisplay,
      workingDirectory: oldSettings.workingDirectory || DEFAULT_SETTINGS.workingDirectory,
      fileTreeDirectory: oldSettings.fileTreeDirectory ?? DEFAULT_SETTINGS.fileTreeDirectory,
      claudeAuthMethod: DEFAULT_SETTINGS.claudeAuthMethod,
      previewMode: DEFAULT_SETTINGS.previewMode,
      version: 7,
    };

    oldSettings = migratedSettings;
  }

  // Migrate from version 7 to version 8 (add previewMode)
  if (oldSettings.version === 7) {
    const migratedSettings: AppSettings = {
      theme: oldSettings.theme || DEFAULT_SETTINGS.theme,
      enterBehavior: oldSettings.enterBehavior || DEFAULT_SETTINGS.enterBehavior,
      messageDisplay: oldSettings.messageDisplay || DEFAULT_SETTINGS.messageDisplay,
      workingDirectory: oldSettings.workingDirectory || DEFAULT_SETTINGS.workingDirectory,
      fileTreeDirectory: oldSettings.fileTreeDirectory ?? DEFAULT_SETTINGS.fileTreeDirectory,
      claudeAuthMethod: (oldSettings as any).claudeAuthMethod || DEFAULT_SETTINGS.claudeAuthMethod,
      previewMode: DEFAULT_SETTINGS.previewMode,
      mobilePreviewMode: DEFAULT_SETTINGS.mobilePreviewMode,
      version: 8,
    };

    oldSettings = migratedSettings;
  }

  // Migrate from version 8 to version 9 (add mobilePreviewMode)
  if (oldSettings.version === 8) {
    const migratedSettings: AppSettings = {
      theme: oldSettings.theme || DEFAULT_SETTINGS.theme,
      enterBehavior: oldSettings.enterBehavior || DEFAULT_SETTINGS.enterBehavior,
      messageDisplay: oldSettings.messageDisplay || DEFAULT_SETTINGS.messageDisplay,
      workingDirectory: oldSettings.workingDirectory || DEFAULT_SETTINGS.workingDirectory,
      fileTreeDirectory: oldSettings.fileTreeDirectory ?? DEFAULT_SETTINGS.fileTreeDirectory,
      claudeAuthMethod: (oldSettings as any).claudeAuthMethod || DEFAULT_SETTINGS.claudeAuthMethod,
      previewMode: (oldSettings as any).previewMode || DEFAULT_SETTINGS.previewMode,
      mobilePreviewMode: DEFAULT_SETTINGS.mobilePreviewMode, // New field - default to file
      version: 9,
    };

    oldSettings = migratedSettings;
  }

  // Migrate from version 9 to version 10 (force terminal_login for all users)
  if (oldSettings.version === 9) {
    const migratedSettings: AppSettings = {
      theme: oldSettings.theme || DEFAULT_SETTINGS.theme,
      enterBehavior: oldSettings.enterBehavior || DEFAULT_SETTINGS.enterBehavior,
      messageDisplay: oldSettings.messageDisplay || DEFAULT_SETTINGS.messageDisplay,
      workingDirectory: oldSettings.workingDirectory || DEFAULT_SETTINGS.workingDirectory,
      fileTreeDirectory: oldSettings.fileTreeDirectory ?? DEFAULT_SETTINGS.fileTreeDirectory,
      claudeAuthMethod: "terminal_login", // Force terminal_login for all users
      previewMode: (oldSettings as any).previewMode || DEFAULT_SETTINGS.previewMode,
      mobilePreviewMode: (oldSettings as any).mobilePreviewMode || DEFAULT_SETTINGS.mobilePreviewMode,
      workspaceDirection: DEFAULT_SETTINGS.workspaceDirection,
      parallelChat: DEFAULT_SETTINGS.parallelChat,
      version: 10,
    };

    oldSettings = migratedSettings;
  }

  // Migrate from version 10 to version 11 (add parallelChat)
  if (oldSettings.version === 10) {
    const migratedSettings: AppSettings = {
      theme: oldSettings.theme || DEFAULT_SETTINGS.theme,
      enterBehavior: oldSettings.enterBehavior || DEFAULT_SETTINGS.enterBehavior,
      messageDisplay: oldSettings.messageDisplay || DEFAULT_SETTINGS.messageDisplay,
      workingDirectory: oldSettings.workingDirectory || DEFAULT_SETTINGS.workingDirectory,
      fileTreeDirectory: oldSettings.fileTreeDirectory ?? DEFAULT_SETTINGS.fileTreeDirectory,
      claudeAuthMethod: (oldSettings as any).claudeAuthMethod || DEFAULT_SETTINGS.claudeAuthMethod,
      previewMode: (oldSettings as any).previewMode || DEFAULT_SETTINGS.previewMode,
      mobilePreviewMode: (oldSettings as any).mobilePreviewMode || DEFAULT_SETTINGS.mobilePreviewMode,
      workspaceDirection: (oldSettings as any).workspaceDirection || DEFAULT_SETTINGS.workspaceDirection,
      parallelChat: DEFAULT_SETTINGS.parallelChat,
      chatVisible: DEFAULT_SETTINGS.chatVisible,
      version: 11,
    };

    oldSettings = migratedSettings;
  }

  // Migrate from version 11 to version 12 (add chatVisible)
  if (oldSettings.version === 11) {
    const migratedSettings: AppSettings = {
      theme: oldSettings.theme || DEFAULT_SETTINGS.theme,
      enterBehavior: oldSettings.enterBehavior || DEFAULT_SETTINGS.enterBehavior,
      messageDisplay: oldSettings.messageDisplay || DEFAULT_SETTINGS.messageDisplay,
      workingDirectory: oldSettings.workingDirectory || DEFAULT_SETTINGS.workingDirectory,
      fileTreeDirectory: oldSettings.fileTreeDirectory ?? DEFAULT_SETTINGS.fileTreeDirectory,
      claudeAuthMethod: (oldSettings as any).claudeAuthMethod || DEFAULT_SETTINGS.claudeAuthMethod,
      previewMode: (oldSettings as any).previewMode || DEFAULT_SETTINGS.previewMode,
      mobilePreviewMode: (oldSettings as any).mobilePreviewMode || DEFAULT_SETTINGS.mobilePreviewMode,
      workspaceDirection: (oldSettings as any).workspaceDirection || DEFAULT_SETTINGS.workspaceDirection,
      parallelChat: (oldSettings as any).parallelChat ?? DEFAULT_SETTINGS.parallelChat,
      chatVisible: DEFAULT_SETTINGS.chatVisible, // New field - default true
      version: CURRENT_SETTINGS_VERSION,
    };

    // Save migrated settings
    setSettings(migratedSettings);
    return migratedSettings;
  }

  // For any other version, fall back to defaults
  const migratedSettings = { ...DEFAULT_SETTINGS };
  setSettings(migratedSettings);
  return migratedSettings;
}

function migrateLegacySettings(): AppSettings {
  // Always use light theme, ignore browser preference
  const systemDefaultTheme: Theme = "light";

  // Load legacy settings
  const legacyTheme = getStorageItem<Theme>(
    STORAGE_KEYS.THEME,
    systemDefaultTheme,
  );
  const legacyEnterBehavior = getStorageItem<EnterBehavior>(
    STORAGE_KEYS.ENTER_BEHAVIOR,
    "send",
  );

  // Create migrated settings from legacy format
  const migratedSettings: AppSettings = {
    ...DEFAULT_SETTINGS,
    theme: legacyTheme,
    enterBehavior: legacyEnterBehavior,
  };

  // Save migrated settings
  setSettings(migratedSettings);

  // Clean up legacy storage keys
  removeStorageItem(STORAGE_KEYS.THEME);
  removeStorageItem(STORAGE_KEYS.ENTER_BEHAVIOR);

  return migratedSettings;
}
