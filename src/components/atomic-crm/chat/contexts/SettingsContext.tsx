import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { AppSettings, SettingsContextType, PreviewMode, WorkspaceDirection } from "../types/settings";
import { getSettings, setSettings } from "../utils/storage";
import { SettingsContext } from "./SettingsContextTypes";

interface SettingsProviderProps {
  children: React.ReactNode;
  userId?: string;
}

export function SettingsProvider({ children, userId }: SettingsProviderProps) {
  const [settings, setSettingsState] = useState<AppSettings>(() =>
    getSettings(),
  );
  const [isInitialized, setIsInitialized] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);

  // Initialize settings on client side (handles migration automatically)
  useEffect(() => {
    const initialSettings = getSettings();
    setSettingsState(initialSettings);
    setIsInitialized(true);
  }, []);

  // Fetch settings from database when userId is available
  useEffect(() => {
    if (!userId || !isInitialized) return;

    fetch(`/api/desktop/${userId}/settings`)
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (!data) return;
        const updates: Partial<AppSettings> = {};
        if (data.preview_mode) {
          const dbMode = data.preview_mode as PreviewMode;
          updates.previewMode = dbMode;
          updates.mobilePreviewMode = dbMode;
        }
        // Interface mode is always driven by database — not user-changeable
        if (data.interface_mode) {
          updates.messageDisplay = { mode: data.interface_mode as "jarvis" | "developer" };
        }
        // Workspace direction is always driven by database — not user-changeable
        if (data.workspace_direction) {
          updates.workspaceDirection = data.workspace_direction as WorkspaceDirection;
        }
        if (Object.keys(updates).length > 0) {
          setSettingsState((prev) => ({ ...prev, ...updates }));
        }
      })
      .catch(() => {
        // Silently fail — keep current settings
      });
  }, [userId, isInitialized]);

  // Persist settings. This provider deliberately does NOT touch the document
  // theme any more.
  //
  // It used to, and it was the reason dark mode could not be turned on at all.
  // The block that lived here read:
  //
  //     // ALWAYS remove dark class, never add it - force light mode only
  //     root.classList.remove("dark");
  //     root.removeAttribute('data-theme');
  //     root.style.colorScheme = 'light';
  //
  // Two things made that lethal rather than merely redundant. It is mounted
  // app-wide from Layout.tsx, so it applies everywhere; and it depends on
  // `isInitialized`, which flips true after an async init — so it re-fired
  // AFTER ThemeProvider had set the class and quietly won every time. The
  // symptom was a theme that no upstream change could shift: index.html could
  // ship class="dark", ThemeProvider could force dark on mount, and the class
  // was stripped a moment later with nothing added back.
  //
  // `ThemeProvider` (components/admin/theme-provider.tsx) is the single owner of
  // the document theme, and the visible Dark-mode switch in VoiceOptionsPage
  // already drives it via useTheme(). The `theme` field and `toggleTheme()` on
  // this context had NO consumer anywhere in the app — they were dead.
  //
  // ONE property, ONE writer. That is the whole fix.
  useEffect(() => {
    if (!isInitialized) return;
    setSettings(settings);
  }, [settings, isInitialized]);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettingsState((prev) => ({ ...prev, ...updates }));
  }, []);

  const toggleTheme = useCallback(() => {
    updateSettings({
      theme: settings.theme === "light" ? "dark" : "light",
    });
  }, [settings.theme, updateSettings]);

  const toggleEnterBehavior = useCallback(() => {
    updateSettings({
      enterBehavior: settings.enterBehavior === "send" ? "newline" : "send",
    });
  }, [settings.enterBehavior, updateSettings]);

  const setWorkingDirectory = useCallback((path: string) => {
    updateSettings({ workingDirectory: path });
  }, [updateSettings]);

  const setFileTreeDirectory = useCallback((path: string) => {
    updateSettings({ fileTreeDirectory: path });
  }, [updateSettings]);

  const setPreviewMode = useCallback((mode: PreviewMode) => {
    updateSettings({ previewMode: mode });
    // Save to database
    if (userId) {
      fetch(`/api/desktop/${userId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preview_mode: mode }),
      }).catch(() => {});
    }
  }, [updateSettings, userId]);

  const setMobilePreviewMode = useCallback((mode: PreviewMode) => {
    updateSettings({ mobilePreviewMode: mode });
    // Save to database (same field — mobile and desktop share preview_mode)
    if (userId) {
      fetch(`/api/desktop/${userId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preview_mode: mode }),
      }).catch(() => {});
    }
  }, [updateSettings, userId]);

  const toggleTerminal = useCallback(() => {
    setIsTerminalOpen(prev => !prev);
  }, []);

  const toggleParallelChat = useCallback(() => {
    updateSettings({
      parallelChat: !settings.parallelChat,
    });
  }, [settings.parallelChat, updateSettings]);

  const toggleChatVisible = useCallback(() => {
    updateSettings({
      chatVisible: !settings.chatVisible,
    });
  }, [settings.chatVisible, updateSettings]);

  const value = useMemo(
    (): SettingsContextType => ({
      settings,
      theme: settings.theme,
      enterBehavior: settings.enterBehavior,
      workingDirectory: settings.workingDirectory,
      fileTreeDirectory: settings.fileTreeDirectory,
      previewMode: settings.previewMode,
      mobilePreviewMode: settings.mobilePreviewMode,
      workspaceDirection: settings.workspaceDirection,
      parallelChat: settings.parallelChat,
      chatVisible: settings.chatVisible,
      isTerminalOpen,
      toggleTheme,
      toggleEnterBehavior,
      setWorkingDirectory,
      setFileTreeDirectory,
      setPreviewMode,
      setMobilePreviewMode,
      toggleParallelChat,
      toggleChatVisible,
      updateSettings,
      toggleTerminal,
    }),
    [settings, isTerminalOpen, toggleTheme, toggleEnterBehavior, setWorkingDirectory, setFileTreeDirectory, setPreviewMode, setMobilePreviewMode, toggleParallelChat, toggleChatVisible, updateSettings, toggleTerminal],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}
