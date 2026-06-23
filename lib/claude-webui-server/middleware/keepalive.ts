import type { MiddlewareHandler } from "hono";
import { logger } from "../utils/logger.ts";

class KeepaliveService {
  private externalPingInterval: NodeJS.Timeout | null = null;
  private remainingPings: number = 8;
  private totalPings: number = 0;

  private readonly PING_INTERVAL = 4 * 60 * 1000; // 4 minutes
  private readonly MAX_PINGS = 8; // 8 pings = 32 minutes

  constructor() {
    if (process.env.KEEPALIVE_ENABLED === 'true') {
      console.log('[Keepalive] ✅ Service initialized - External keepalive enabled');
      console.log('[Keepalive] Will ping every 4 minutes, max 8 times (32 minutes)');
      console.log('[Keepalive] User activity resets counter to 8');

      // Delay start to ensure server is fully initialized
      setTimeout(() => {
        console.log('[Keepalive] Starting external ping loop');
        this.startExternalPinging();
      }, 5000); // Wait 5 seconds for server to fully start
    } else {
      console.log('[Keepalive] Service disabled (KEEPALIVE_ENABLED != true)');
    }
  }

  // Called by middleware on each request
  public recordActivity(path: string): void {
    // Ignore health endpoint and our own keepalive pings
    if (path === '/health' || path === '/api/health') {
      return;
    }

    console.log(`[Keepalive] 📡 User activity: ${path}`);

    // Reset the counter back to 8 on user activity
    if (this.remainingPings < this.MAX_PINGS) {
      console.log(`[Keepalive] 🔄 Resetting counter from ${this.remainingPings} to ${this.MAX_PINGS}`);
    }
    this.remainingPings = this.MAX_PINGS;
  }

  private startExternalPinging(): void {
    // Clear any existing interval
    if (this.externalPingInterval) {
      clearInterval(this.externalPingInterval);
    }

    // Send first ping immediately
    this.sendExternalPing();

    // Set up interval for pinging every 4 minutes
    this.externalPingInterval = setInterval(() => {
      this.sendExternalPing();
    }, this.PING_INTERVAL);
  }

  private async sendExternalPing(): Promise<void> {
    // Check if we should stop
    if (this.remainingPings <= 0) {
      console.log('[Keepalive] ⏹️  No pings remaining - stopping keepalive, allowing auto-stop');
      this.stopExternalPinging();
      return;
    }

    this.totalPings++;
    console.log(`[Keepalive] 🏓 External ping #${this.totalPings} (${this.remainingPings}/${this.MAX_PINGS} remaining)`);

    try {
      // CRITICAL: Ping the EXTERNAL URL so Fly.io's proxy sees it
      const appName = process.env.FLY_APP_NAME;
      const url = appName
        ? `https://${appName}.fly.dev/health`  // Production: external URL
        : `http://localhost:${process.env.PORT || 10000}/health`;  // Development: localhost

      console.log(`[Keepalive] 🌐 Pinging: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Keepalive': 'true',
          'User-Agent': 'Keepalive-Service/1.0'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (response.ok) {
        console.log(`[Keepalive] ✅ Ping successful (status: ${response.status})`);
      } else {
        console.log(`[Keepalive] ⚠️ Ping returned status ${response.status}`);
      }
    } catch (error: any) {
      console.error(`[Keepalive] ❌ Ping failed:`, error.message);
    }

    // Decrement counter after successful ping
    this.remainingPings--;
    console.log(`[Keepalive] 📉 Decremented counter to ${this.remainingPings}`);
  }

  private stopExternalPinging(): void {
    if (this.externalPingInterval) {
      clearInterval(this.externalPingInterval);
      this.externalPingInterval = null;
      console.log('[Keepalive] 🛑 External pinging stopped');
    }
  }
}

// Create singleton instance - but delay initialization
let keepaliveService: KeepaliveService | null = null;

// Initialize on first use
function getKeepaliveService(): KeepaliveService {
  if (!keepaliveService) {
    keepaliveService = new KeepaliveService();
  }
  return keepaliveService;
}

// Hono middleware
export const keepaliveMiddleware: MiddlewareHandler = async (c, next) => {
  const service = getKeepaliveService();
  service.recordActivity(c.req.path);
  await next();
};