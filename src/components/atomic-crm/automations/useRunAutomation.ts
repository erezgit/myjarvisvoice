import { useCallback, useState } from 'react';
import { useCreate, useUpdate, useNotify } from 'ra-core';
import { useMemberConfig } from '../contexts/MemberConfigContext';
import { useAuthHeaders } from '@/hooks/useAuthHeaders';
import type { Automation } from '../types';

/**
 * Hook to trigger an automation run.
 * 1. Creates a queued run record in SQLite
 * 2. POSTs to agent /api/automation/run endpoint (fire-and-forget, returns 202)
 * 3. Agent processes in background, writes results to SQLite via :3001
 * 4. UI auto-refreshes via SSE
 */
export function useRunAutomation() {
  const [create] = useCreate();
  const [update] = useUpdate();
  const notify = useNotify();
  const { automationUrl } = useMemberConfig();
  const { getAuthHeaders } = useAuthHeaders();
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());
  const [stoppingIds, setStoppingIds] = useState<Set<string>>(new Set());

  const run = useCallback(async (automation: Automation) => {
    const runId = crypto.randomUUID();

    setRunningIds(prev => new Set(prev).add(String(automation.id)));

    try {
      // 1. Create queued run record
      await create('automation_runs', {
        data: {
          id: runId,
          automation_id: automation.id,
          started_by: 'owner',
          status: 'queued',
          queued_at: new Date().toISOString(),
        },
      }, { returnPromise: true });

      // 2. POST to agent — fire-and-forget (returns 202)
      const headers = await getAuthHeaders();

      const res = await fetch(`${automationUrl}/api/automation/run`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          run_id: runId,
          prompt: automation.prompt,
          max_budget_usd: automation.max_budget_usd,
          max_turns: automation.max_turns,
        }),
      });

      if (!res.ok) {
        throw new Error(`Agent returned ${res.status}`);
      }

      notify('Automation started');
    } catch (err: any) {
      notify(`Failed to start automation: ${err.message}`, { type: 'error' });
    } finally {
      setRunningIds(prev => {
        const next = new Set(prev);
        next.delete(String(automation.id));
        return next;
      });
    }
  }, [create, notify, automationUrl, getAuthHeaders]);

  const stop = useCallback(async (runId: string) => {
    setStoppingIds(prev => new Set(prev).add(runId));
    try {
      await update('automation_runs', {
        id: runId,
        data: {
          status: 'completed',
          completed_at: new Date().toISOString(),
        },
        previousData: { id: runId },
      }, { returnPromise: true });

      // Also abort the agent session
      try {
        const headers = await getAuthHeaders();
        await fetch(`${automationUrl}/api/abort/${runId}`, {
          method: 'POST',
          headers,
        });
      } catch {
        // Best effort — agent may have already finished
      }

      notify('Automation stopped');
    } catch (err: any) {
      notify(`Failed to stop: ${err.message}`, { type: 'error' });
    } finally {
      setStoppingIds(prev => {
        const next = new Set(prev);
        next.delete(runId);
        return next;
      });
    }
  }, [update, notify, automationUrl, getAuthHeaders]);

  const isRunning = useCallback(
    (automationId: string | number) => runningIds.has(String(automationId)),
    [runningIds]
  );

  const isStopping = useCallback(
    (runId: string) => stoppingIds.has(runId),
    [stoppingIds]
  );

  return { run, stop, isRunning, isStopping };
}
