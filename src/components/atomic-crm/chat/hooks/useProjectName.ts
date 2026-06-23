import { useState, useEffect } from "react";
import { useMemberConfig } from "@/components/atomic-crm/contexts/MemberConfigContext";

const isSqliteMode = import.meta.env.VITE_APP_MODE === "sqlite";
const CLOUD_PROJECT = "/home/node".replace(/[/\\:.]/g, "-");

/**
 * Resolves the encoded project name for the Claude Code agent.
 *
 * Cloud mode: always "-home-node" (agent runs in /home/node on Fly).
 * Desktop mode: fetches /api/agent-config which returns the agent's
 * actual cwd and its encoded project name. This is the single source
 * of truth — no more guessing from ~/.claude.json.
 */
export function useProjectName(): { projectName: string | null; loading: boolean } {
  const { chatUrl } = useMemberConfig();
  const [projectName, setProjectName] = useState<string | null>(
    isSqliteMode ? null : CLOUD_PROJECT
  );
  const [loading, setLoading] = useState(isSqliteMode);

  useEffect(() => {
    if (!isSqliteMode || !chatUrl) return;

    let cancelled = false;

    async function resolve() {
      try {
        const res = await fetch(`${chatUrl}/api/agent-config`);
        if (!res.ok) throw new Error("Failed to fetch agent config");
        const data = await res.json();

        if (cancelled) return;

        if (data.encodedProjectName) {
          setProjectName(data.encodedProjectName);
        } else {
          setProjectName(null);
        }
      } catch (err) {
        console.error("[useProjectName] Error resolving project:", err);
        if (!cancelled) setProjectName(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    resolve();
    return () => { cancelled = true; };
  }, [chatUrl]);

  return { projectName, loading };
}
