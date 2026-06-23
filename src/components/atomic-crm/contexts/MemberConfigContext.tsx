import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface MemberConfig {
  /** Absolute URL to the user's member machine (for chat) */
  chatUrl: string;
  /** Absolute URL to the OS machine (for automations) */
  automationUrl: string;
}

interface MemberConfigContextValue extends MemberConfig {
  isLoading: boolean;
}

const isSqliteMode = import.meta.env.VITE_APP_MODE === "sqlite";

const AGENT_URL = "http://localhost:10000";

const localConfig: MemberConfigContextValue = {
  chatUrl: AGENT_URL,
  automationUrl: AGENT_URL,
  isLoading: false,
};

const defaultValue: MemberConfigContextValue = {
  chatUrl: "",
  automationUrl: "",
  isLoading: true,
};

const MemberConfigContext = createContext<MemberConfigContextValue>(defaultValue);

export function useMemberConfig() {
  return useContext(MemberConfigContext);
}

// Module-level cache — survives re-renders, cleared on page reload
let cachedConfig: MemberConfig | null = null;

export function MemberConfigProvider({ children }: { children: ReactNode }) {
  // Desktop/SQLite mode: always use local agent
  if (isSqliteMode) {
    return (
      <MemberConfigContext.Provider value={localConfig}>
        {children}
      </MemberConfigContext.Provider>
    );
  }

  return <CloudMemberConfigProvider>{children}</CloudMemberConfigProvider>;
}

/** Cloud mode: fetch chatUrl/automationUrl from Supabase member_instances */
function CloudMemberConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<MemberConfigContextValue>(
    cachedConfig
      ? { ...cachedConfig, isLoading: false }
      : defaultValue
  );

  useEffect(() => {
    if (cachedConfig) return;

    async function fetchConfig() {
      try {
        const { supabase } = await import("../providers/supabase/supabase");
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("Not authenticated");
        }

        const [memberResult, osResult] = await Promise.all([
          supabase.from("member_instances")
            .select("fly_app_url, status")
            .eq("user_id", user.id)
            .eq("status", "ready")
            .single(),
          supabase.from("member_instances")
            .select("fly_app_url, status")
            .eq("role", "os")
            .eq("status", "ready")
            .single(),
        ]);

        if (!memberResult.data?.fly_app_url) {
          throw new Error("No member instance found — user not provisioned");
        }
        if (!osResult.data?.fly_app_url) {
          throw new Error("No OS instance found — OS agent not provisioned");
        }

        const result: MemberConfig = {
          chatUrl: `https://${memberResult.data.fly_app_url}`,
          automationUrl: `https://${osResult.data.fly_app_url}`,
        };

        cachedConfig = result;
        setConfig({ ...result, isLoading: false });
        console.log("[MemberConfig] Loaded:", result);
      } catch (err) {
        console.error("[MemberConfig] Error:", err);
        setConfig({ chatUrl: "", automationUrl: "", isLoading: false });
      }
    }

    fetchConfig();
  }, []);

  return (
    <MemberConfigContext.Provider value={config}>
      {children}
    </MemberConfigContext.Provider>
  );
}
