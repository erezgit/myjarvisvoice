import { useState } from 'react';
import type { AppConnectionConfig } from '@/config/appConnectionsConfig';

// Composio's official logo CDN
const LOGO_CDN_URL = 'https://logos.composio.dev/api';

// Override URLs for logos not available in main CDN
const LOGO_OVERRIDES: Record<string, string> = {
  'instagram': 'https://cdn.jsdelivr.net/gh/ComposioHQ/open-logos@master/instagram.svg',
  'excel': 'https://cdn.jsdelivr.net/gh/ComposioHQ/open-logos@master/Excel.png',
  'outlook': 'https://cdn.jsdelivr.net/gh/ComposioHQ/open-logos@master/Outlook%20SVG%20Icon.svg',
  'telegram': 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/telegram.svg',
  'whatsapp': 'https://www.svgrepo.com/show/452133/whatsapp.svg',
};

// Emoji fallbacks for when logo fails to load
const iconMap: Record<string, string> = {
  'mail': '\u{1F4E7}',
  'calendar': '\u{1F4C5}',
  'folder': '\u{1F4C1}',
  'document': '\u{1F4C4}',
  'video': '\u{1F3A5}',
  'map': '\u{1F5FA}\uFE0F',
  'chart': '\u{1F4CA}',
  'megaphone': '\u{1F4E2}',
  'sparkles': '\u2728',
  'chat': '\u{1F4AC}',
  'robot': '\u{1F916}',
  'phone': '\u{1F4F1}',
  'building': '\u{1F3E2}',
  'paper-airplane': '\u{1F4E8}',
  'code': '\u{1F4BB}',
  'database': '\u{1F5C4}\uFE0F',
  'cloud': '\u2601\uFE0F',
  'arrow-path': '\u{1F504}',
  'magnifying-glass': '\u{1F50D}',
  'microphone': '\u{1F3A4}',
  'clipboard': '\u{1F4CB}',
  'envelope': '\u2709\uFE0F',
  'briefcase': '\u{1F4BC}',
  'camera': '\u{1F4F7}',
  'users': '\u{1F465}',
  'chat-bubble': '\u{1F4AD}',
  'play': '\u25B6\uFE0F',
  'at-symbol': '\u{1F4E3}',
  'shopping-cart': '\u{1F6D2}',
  'currency-dollar': '\u{1F4B0}',
  'document-text': '\u{1F4DD}',
  'paint-brush': '\u{1F3A8}',
  'cloud-arrow-up': '\u2B06\uFE0F',
  'table-cells': '\u{1F4CA}',
  'globe-alt': '\u{1F310}',
  'chart-bar': '\u{1F4CA}',
};

interface AppConnectionCardProps {
  config: AppConnectionConfig;
  isConnected: boolean;
  isConnecting: boolean;
  isDisconnecting: boolean;
  connectionId?: string;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function AppConnectionCard({
  config,
  isConnected,
  isConnecting,
  isDisconnecting,
  onConnect,
  onDisconnect,
}: AppConnectionCardProps) {
  const [logoError, setLogoError] = useState(false);
  const fallbackIcon = iconMap[config.icon] || '\u{1F517}';

  // Check for override, use main CDN if no override
  const overrideUrl = LOGO_OVERRIDES[config.slug];
  const logoUrl = overrideUrl !== undefined
    ? overrideUrl  // Use override (empty string means no logo available)
    : `${LOGO_CDN_URL}/${config.slug}`;
  const hasLogo = logoUrl !== '';

  return (
    <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
      {/* Header: Icon + Name */}
      <div className="flex items-center gap-3 mb-3">
        {/* Icon container with white background and border */}
        <div className="w-11 h-11 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 flex items-center justify-center flex-shrink-0">
          {(!hasLogo || logoError) ? (
            <span className="text-lg" role="img" aria-label={config.name}>
              {fallbackIcon}
            </span>
          ) : (
            <img
              src={logoUrl}
              alt={`${config.name} logo`}
              className="w-6 h-6 object-contain"
              onError={() => setLogoError(true)}
            />
          )}
        </div>

        {/* Name */}
        <div className="font-semibold text-slate-900 dark:text-slate-100">
          {config.name}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
        {config.description}
      </p>

      {/* Bottom: Connect/Connected button */}
      <div className="flex items-center gap-2">
        {!isConnected ? (
          <button
            onClick={onConnect}
            disabled={isConnecting}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full transition-colors disabled:opacity-50"
          >
            {isConnecting ? 'CONNECTING...' : 'CONNECT'}
          </button>
        ) : (
          <button
            onClick={onDisconnect}
            disabled={isDisconnecting}
            className="px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900/30 dark:hover:text-red-400 rounded-full transition-colors disabled:opacity-50"
          >
            {isDisconnecting ? 'DISCONNECTING...' : 'CONNECTED'}
          </button>
        )}
      </div>
    </div>
  );
}
