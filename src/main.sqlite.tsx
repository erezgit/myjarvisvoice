import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { CRM } from "@/components/atomic-crm/root/CRM";
import { dataProvider } from "@/components/atomic-crm/providers/sqlite";
import { autoLoginAuthProvider } from "@/components/atomic-crm/providers/autoLoginAuthProvider";
import { VoiceAutoplayService } from "@/components/atomic-crm/voice-pal/voiceAutoplay";

/**
 * SQLite mode entry point.
 * Uses SQLite backend (Express + better-sqlite3) instead of Supabase.
 * Auto-login enabled (single-user mode).
 */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* Autoplay must OUTLIVE every route. It used to live inside VoicePalPage,
        which is a route, so navigating away killed the listener — that is why
        the app only spoke while that one screen was open. */}
    <VoiceAutoplayService />
    <CRM
      dataProvider={dataProvider}
      authProvider={autoLoginAuthProvider}
      singleUserMode
    />
  </StrictMode>,
);
