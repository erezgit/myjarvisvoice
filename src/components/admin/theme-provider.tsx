import { useEffect, useRef } from "react";
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

  // EVERY LAUNCH STARTS DARK. Erez-locked 2026-08-06.
  //
  // A previous attempt tried to be clever: migrate an inherited "system" to
  // "dark" once, and respect whatever was stored after that. It did not work,
  // and the reason it did not work is that I never established what was
  // actually stored — `defaultTheme` only wins when the store is empty, and I
  // could not find the app's localStorage on disk to check. Shipping a fix
  // built on an unverified premise is what wasted the round.
  //
  // The requirement is simple and absolute: launch the app, it is dark. So do
  // exactly that and depend on nothing. This runs once per mount, i.e. once per
  // launch; toggling within the session still works and is still honoured until
  // the app is next opened.
  const forcedRef = useRef(false);
  useEffect(() => {
    if (forcedRef.current) return;
    forcedRef.current = true;
    if (theme !== "dark") setTheme("dark");
  }, [theme, setTheme]);

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
