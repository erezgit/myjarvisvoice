/**
 * Composio connection hooks for MyJarvis OS
 * Uses automationUrl from MemberConfigContext — the OS machine handles Composio
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/components/atomic-crm/providers/supabase/supabase';

export interface ConnectionStatus {
  name: string;
  slug: string;
  app: string;
  connected: boolean;
  connectionId?: string;
  status: string;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Fetch all Composio connection statuses for the current user
 */
export function useComposioConnections(agentUrl: string) {
  const [connections, setConnections] = useState<ConnectionStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConnections = useCallback(async () => {
    if (!agentUrl) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${agentUrl}/api/composio/connections`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setConnections(data.connections || []);
    } catch {
      setConnections([]);
    } finally {
      setIsLoading(false);
    }
  }, [agentUrl]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  return { connections, isLoading, refetch: fetchConnections };
}

/**
 * Initiate OAuth connection for a toolkit
 */
export async function connectApp(agentUrl: string, toolkit: string): Promise<{ redirectUrl?: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${agentUrl}/api/composio/authorize`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      toolkit,
      callbackUrl: `${window.location.origin}/oauth/callback`,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * Disconnect an app connection
 */
export async function disconnectApp(agentUrl: string, connectionId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${agentUrl}/api/composio/disconnect`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ connectionId }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
