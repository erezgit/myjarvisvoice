import { useState } from 'react';
import { useNotify } from 'ra-core';
import { APP_CONNECTIONS } from '@/config/appConnectionsConfig';
import { AppConnectionCard } from './AppConnectionCard';
import {
  useComposioConnections,
  connectApp,
  disconnectApp,
} from '@/hooks/useComposioConnections';
import { useMemberConfig } from '@/components/atomic-crm/contexts/MemberConfigContext';

export function AppConnectionsGrid() {
  const { automationUrl } = useMemberConfig();
  const { connections, isLoading, refetch } = useComposioConnections(automationUrl);
  const notify = useNotify();

  const [connectingApp, setConnectingApp] = useState<string | null>(null);
  const [disconnectingApp, setDisconnectingApp] = useState<string | null>(null);

  const getConnectionStatus = (slug: string) => {
    return connections.find(c => c.slug === slug || c.app === slug);
  };

  const handleConnect = async (slug: string) => {
    setConnectingApp(slug);
    try {
      const result = await connectApp(automationUrl, slug);

      if (result.redirectUrl) {
        // Center popup on screen
        const popupWidth = 600;
        const popupHeight = 700;
        const left = (window.screen.width - popupWidth) / 2;
        const top = (window.screen.height - popupHeight) / 2 - 100;
        const popup = window.open(
          result.redirectUrl,
          'oauth',
          `width=${popupWidth},height=${popupHeight},left=${left},top=${top},scrollbars=yes,resizable=yes`
        );

        if (!popup) {
          throw new Error('Failed to open popup window. Please allow popups for this site.');
        }

        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            setConnectingApp(null);
            // Refresh connections after popup closes
            setTimeout(() => refetch(), 500);
          }
        }, 500);
      }
    } catch (error) {
      console.error(`[COMPOSIO] OAuth failed for ${slug}:`, error);
      notify(`Failed to connect ${slug}. Please try again.`, { type: 'error' });
      setConnectingApp(null);
    }
  };

  const handleDisconnect = async (slug: string, connectionId?: string) => {
    if (!connectionId) return;

    setDisconnectingApp(slug);
    try {
      await disconnectApp(automationUrl, connectionId);
      await refetch();
    } catch (error) {
      console.error(`[COMPOSIO] Disconnect failed for ${slug}:`, error);
      notify(`Failed to disconnect ${slug}. Please try again.`, { type: 'error' });
    } finally {
      setDisconnectingApp(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Loading connections...
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {APP_CONNECTIONS.map((config) => {
        const status = getConnectionStatus(config.slug);
        return (
          <AppConnectionCard
            key={config.slug}
            config={config}
            isConnected={status?.connected || false}
            isConnecting={connectingApp === config.slug}
            isDisconnecting={disconnectingApp === config.slug}
            connectionId={status?.connectionId}
            onConnect={() => handleConnect(config.slug)}
            onDisconnect={() => handleDisconnect(config.slug, status?.connectionId)}
          />
        );
      })}
    </div>
  );
}
