import { useEffect } from "react";
import { useStore } from "ra-core";

import { ThemeProviderContext, type Theme } from "./theme-context";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

/**
 * Theme provider that enables light, dark, and system theme modes.
 *
 * @internal
 */
export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useStore<Theme>(storageKey, defaultTheme);

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    const applied =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : theme;

    root.classList.add(applied);

    // Drive the NATIVE window chrome (macOS title bar) so it matches the app
    // theme instead of staying light. Uses the global Tauri API (withGlobalTauri);
    // no-op in a plain browser / non-Tauri dev context.
    const tauri = (window as unknown as { __TAURI__?: any }).__TAURI__;
    tauri?.window?.getCurrentWindow?.().setTheme?.(applied).catch(() => {});
  }, [theme]);

  const value = {
    theme,
    setTheme,
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}
