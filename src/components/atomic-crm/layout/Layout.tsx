import { Suspense, type ReactNode } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Home, Heart, Settings as SettingsIcon } from "lucide-react";
import { useNavigate, useLocation } from "react-router";
import { Notification } from "@/components/admin/notification";
import { Error } from "@/components/admin/error";
import { Skeleton } from "@/components/ui/skeleton";

import { useUserStateTracker } from "../hooks/useUserStateTracker";
import { useRealtimeRefresh } from "../hooks/useRealtimeRefresh";
import { SettingsProvider } from "../chat/contexts/SettingsContext";
import { MemberConfigProvider } from "../contexts/MemberConfigContext";

/**
 * My Jarvis Voice — compact desktop shell (Open Whisper style).
 *
 * One small window: the voice feed fills the body, a slim bottom bar holds the
 * only two controls — Likes and Voice settings. No sidebar, no chat panel, no
 * terminal; those belonged to the original cloud app and were removed.
 */
export const Layout = ({ children }: { children: ReactNode }) => {
  useUserStateTracker();
  useRealtimeRefresh();
  return (
    <MemberConfigProvider>
      <SettingsProvider>
        <div className="flex h-svh flex-col bg-white dark:bg-background">
          <main className="flex-1 overflow-y-auto" id="main-content">
            <ErrorBoundary FallbackComponent={Error}>
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center">
                    <Skeleton className="h-10 w-10 rounded-full" />
                  </div>
                }
              >
                {children}
              </Suspense>
            </ErrorBoundary>
          </main>
          <BottomBar />
          <Notification />
        </div>
      </SettingsProvider>
    </MemberConfigProvider>
  );
};

/**
 * The only chrome in the app: two icon buttons, bottom-right. Each toggles —
 * tap to open Likes / Voice settings, tap again to return to the feed.
 */
const BottomBar = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const onHome = pathname === "/voice-pal";
  const onLikes = pathname === "/voice-pal/likes";
  const onVoices = pathname === "/voice-pal/voices";
  const go = (target: string, active: boolean) =>
    navigate(active ? "/voice-pal" : target);
  return (
    <div className="shrink-0 flex items-center justify-end gap-2 border-t border-gray-100 bg-white/80 px-4 py-2.5 backdrop-blur">
      <button
        type="button"
        aria-label="Home"
        title="Home"
        onClick={() => navigate("/voice-pal")}
        className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
          onHome
            ? "border-blue-200 bg-blue-50 text-blue-600"
            : "border-gray-200 text-gray-500 hover:bg-gray-50"
        }`}
      >
        <Home className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Likes"
        title="Likes"
        onClick={() => go("/voice-pal/likes", onLikes)}
        className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
          onLikes
            ? "border-red-200 bg-red-50 text-red-500"
            : "border-gray-200 text-gray-500 hover:bg-gray-50"
        }`}
      >
        <Heart className={`h-4 w-4 ${onLikes ? "fill-current" : ""}`} />
      </button>
      <button
        type="button"
        aria-label="Voice settings"
        title="Voice settings"
        onClick={() => go("/voice-pal/voices", onVoices)}
        className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
          onVoices
            ? "border-gray-300 bg-gray-100 text-gray-700"
            : "border-gray-200 text-gray-500 hover:bg-gray-50"
        }`}
      >
        <SettingsIcon className="h-4 w-4" />
      </button>
    </div>
  );
};
