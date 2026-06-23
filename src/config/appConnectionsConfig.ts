/**
 * Static app connections configuration
 * Single source of truth for all supported Composio integrations
 */

export interface AppConnectionConfig {
  slug: string;           // Composio toolkit slug (e.g., 'gmail', 'slack')
  name: string;           // Display name (e.g., 'Gmail', 'Slack')
  description: string;    // Short description
  icon: string;           // Icon identifier (using heroicons or emoji fallback)
  category: string;       // For future grouping/filtering
}

export const APP_CONNECTIONS: AppConnectionConfig[] = [
  // Google Suite
  { slug: 'gmail', name: 'Gmail', description: 'Send and manage emails', icon: 'mail', category: 'google' },
  { slug: 'googlecalendar', name: 'Google Calendar', description: 'Manage calendar events', icon: 'calendar', category: 'google' },
  { slug: 'googledrive', name: 'Google Drive', description: 'Access and manage files', icon: 'folder', category: 'google' },
  { slug: 'googledocs', name: 'Google Docs', description: 'Create and edit documents', icon: 'document', category: 'google' },
  { slug: 'googlesheets', name: 'Google Sheets', description: 'Spreadsheets and data', icon: 'table-cells', category: 'google' },
  { slug: 'googlemeet', name: 'Google Meet', description: 'Video conferencing', icon: 'video', category: 'google' },
  { slug: 'google_maps', name: 'Google Maps', description: 'Location and maps', icon: 'map', category: 'google' },
  { slug: 'google_analytics', name: 'Google Analytics', description: 'Website analytics', icon: 'chart', category: 'google' },
  { slug: 'googleads', name: 'Google Ads', description: 'Advertising campaigns', icon: 'megaphone', category: 'google' },

  // Communication
  { slug: 'slack', name: 'Slack', description: 'Team messaging and channels', icon: 'chat', category: 'communication' },
  { slug: 'discord', name: 'Discord', description: 'Community chat platform', icon: 'chat', category: 'communication' },
  { slug: 'discordbot', name: 'Discord Bot', description: 'Automate Discord servers', icon: 'robot', category: 'communication' },
  { slug: 'whatsapp', name: 'WhatsApp', description: 'Messaging platform', icon: 'phone', category: 'communication' },
  { slug: 'telegram', name: 'Telegram', description: 'Secure messaging', icon: 'paper-airplane', category: 'communication' },
  { slug: 'zoom', name: 'Zoom', description: 'Video meetings', icon: 'video', category: 'communication' },

  // Dev Tools
  { slug: 'github', name: 'GitHub', description: 'Code hosting and collaboration', icon: 'code', category: 'dev' },
  { slug: 'supabase', name: 'Supabase', description: 'Backend as a service', icon: 'database', category: 'dev' },
  { slug: 'vercel', name: 'Vercel', description: 'Frontend deployment', icon: 'cloud', category: 'dev' },

  // Business/CRM
  { slug: 'hubspot', name: 'HubSpot', description: 'CRM and marketing', icon: 'building', category: 'business' },
  { slug: 'salesforce', name: 'Salesforce', description: 'Enterprise CRM', icon: 'cloud', category: 'business' },
  { slug: 'gong', name: 'Gong', description: 'Revenue intelligence', icon: 'microphone', category: 'business' },
  { slug: 'monday', name: 'Monday', description: 'Work management', icon: 'clipboard', category: 'business' },
  { slug: 'klaviyo', name: 'Klaviyo', description: 'Email marketing', icon: 'envelope', category: 'business' },

  // Social
  { slug: 'linkedin', name: 'LinkedIn', description: 'Professional networking', icon: 'briefcase', category: 'social' },
  { slug: 'instagram', name: 'Instagram', description: 'Photo and video sharing', icon: 'camera', category: 'social' },
  { slug: 'facebook', name: 'Facebook', description: 'Social networking', icon: 'users', category: 'social' },
  { slug: 'reddit', name: 'Reddit', description: 'Community discussions', icon: 'chat-bubble', category: 'social' },
  { slug: 'youtube', name: 'YouTube', description: 'Video platform', icon: 'play', category: 'social' },
  { slug: 'twitter', name: 'Twitter/X', description: 'Social media', icon: 'at-symbol', category: 'social' },

  // E-commerce & Crypto
  { slug: 'shopify', name: 'Shopify', description: 'E-commerce platform', icon: 'shopping-cart', category: 'ecommerce' },
  { slug: 'coinbase', name: 'Coinbase', description: 'Cryptocurrency exchange', icon: 'currency-dollar', category: 'ecommerce' },
  { slug: 'coinmarketcap', name: 'CoinMarketCap', description: 'Crypto prices and data', icon: 'chart-bar', category: 'ecommerce' },

  // Productivity
  { slug: 'notion', name: 'Notion', description: 'Notes and collaboration', icon: 'document-text', category: 'productivity' },
  { slug: 'figma', name: 'Figma', description: 'Design collaboration', icon: 'paint-brush', category: 'productivity' },
  { slug: 'dropbox', name: 'Dropbox', description: 'Cloud storage', icon: 'cloud-arrow-up', category: 'productivity' },
  { slug: 'excel', name: 'Excel', description: 'Spreadsheets', icon: 'table-cells', category: 'productivity' },
  { slug: 'outlook', name: 'Outlook', description: 'Microsoft email', icon: 'envelope', category: 'productivity' },

  // Search/SEO
  { slug: 'semrush', name: 'SEMrush', description: 'SEO and marketing', icon: 'magnifying-glass', category: 'search' },

  // Design
  { slug: 'canva', name: 'Canva', description: 'Design and create graphics', icon: 'paint-brush', category: 'design' },
];

// Helper to get apps by category
export function getAppsByCategory(category: string): AppConnectionConfig[] {
  return APP_CONNECTIONS.filter(app => app.category === category);
}

// Helper to get all categories
export function getAllCategories(): string[] {
  return [...new Set(APP_CONNECTIONS.map(app => app.category))];
}
