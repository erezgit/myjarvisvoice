import { Suspense, type ReactNode } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Home, Heart, Volume2, VolumeX, Settings as SettingsIcon } from "lucide-react";
import { useNavigate, useLocation } from "react-router";
import { Notification } from "@/components/admin/notification";
import { Error } from "@/components/admin/error";
import { Skeleton } from "@/components/ui/skeleton";

import { useUserStateTracker } from "../hooks/useUserStateTracker";
import { useRealtimeRefresh } from "../hooks/useRealtimeRefresh";
import { SettingsProvider } from "../chat/contexts/SettingsContext";
import { MemberConfigProvider } from "../contexts/MemberConfigContext";
import { useAutoplay } from "../voice-pal/autoplayStore";

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
 * The only chrome in the app, bottom-right: Home, Autoplay, Likes, Voice
 * settings. The navigation ones toggle — tap to open, tap again to go back to
 * the feed; Autoplay just flips a setting and stays put.
 */
const BottomBar = () => {
  const navigate = useNavigate();
  const [autoplay, setAutoplay] = useAutoplay();
  const { pathname } = useLocation();
  const onHome = pathname === "/voice-pal";
  const onLikes = pathname === "/voice-pal/likes";
  const onVoices = pathname === "/voice-pal/voices";
  const go = (target: string, active: boolean) =>
    navigate(active ? "/voice-pal" : target);
  return (
    <div className="shrink-0 flex items-center justify-end gap-2 px-4 py-3">
      <button
        type="button"
        aria-label="Home"
        title="Home"
        onClick={() => navigate("/voice-pal")}
        className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
          onHome
            ? "border-blue-500/30 bg-blue-500/10 text-blue-500"
            : "border-border text-muted-foreground hover:bg-muted"
        }`}
      >
        <Home className="h-4 w-4" />
      </button>
      {/* Autoplay. Was a sliding switch floating over the top of the feed;
          it is a button down here like everything else now — same 9x9 tile,
          same border, colour is the only state it shows. */}
      <button
        type="button"
        aria-label={autoplay ? "Autoplay on" : "Autoplay off"}
        title={autoplay ? "Autoplay on — new messages play themselves" : "Autoplay off — press play yourself"}
        onClick={() => setAutoplay(!autoplay)}
        className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
          autoplay
            ? "border-green-500/30 bg-green-500/10 text-green-500"
            : "border-border text-muted-foreground hover:bg-muted"
        }`}
      >
        {autoplay ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      </button>
      <button
        type="button"
        aria-label="Likes"
        title="Likes"
        onClick={() => go("/voice-pal/likes", onLikes)}
        className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
          onLikes
            ? "border-red-500/30 bg-red-500/10 text-red-500"
            : "border-border text-muted-foreground hover:bg-muted"
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
            ? "border-border bg-muted text-foreground"
            : "border-border text-muted-foreground hover:bg-muted"
        }`}
      >
        <SettingsIcon className="h-4 w-4" />
      </button>
    </div>
  );
};
