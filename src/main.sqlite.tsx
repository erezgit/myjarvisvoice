import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { CRM } from "@/components/atomic-crm/root/CRM";
import { dataProvider } from "@/components/atomic-crm/providers/sqlite";
import { autoLoginAuthProvider } from "@/components/atomic-crm/providers/autoLoginAuthProvider";

/**
 * SQLite mode entry point.
 * Uses SQLite backend (Express + better-sqlite3) instead of Supabase.
 * Auto-login enabled (single-user mode).
 */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CRM
      dataProvider={dataProvider}
      authProvider={autoLoginAuthProvider}
      singleUserMode
    />
  </StrictMode>,
);
