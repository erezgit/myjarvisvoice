import axios from 'axios';

class KeepaliveService {
  private lastActivityTime: number = Date.now();
  private keepaliveTimer: NodeJS.Timeout | null = null;
  private keepaliveInterval: NodeJS.Timeout | null = null;
  private keepaliveCount: number = 0;

  private readonly INACTIVITY_THRESHOLD = 4 * 60 * 1000; // 4 minutes
  private readonly KEEPALIVE_INTERVAL = 4 * 60 * 1000; // 4 minutes
  private readonly MAX_KEEPALIVE_ROUNDS = 8; // 8 * 4min = 32 minutes

  constructor() {
    if (process.env.KEEPALIVE_ENABLED === 'true') {
      console.log('[Keepalive] ✅ Service initialized - 30 minute timeout enabled');
      console.log('[Keepalive] Monitoring HTTP activity, will start pings after 4 minutes of inactivity');
      this.startInactivityTimer();
    } else {
      console.log('[Keepalive] Service disabled (KEEPALIVE_ENABLED != true)');
    }
  }

  // Called by middleware on each request
  public recordActivity(path: string): void {
    // Ignore health endpoint and keepalive pings
    if (path === '/health' || path === '/api/health') {
      return;
    }

    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivityTime;

    console.log(`[Keepalive] 📡 HTTP Request: ${path} (${Math.round(timeSinceLastActivity / 1000)}s since last activity)`);

    this.lastActivityTime = now;
    this.resetKeepalive();
    this.startInactivityTimer();
  }

  private startInactivityTimer(): void {
    // Clear existing timer
    if (this.keepaliveTimer) {
      clearTimeout(this.keepaliveTimer);
    }

    console.log('[Keepalive] ⏰ Timer started - will ping after 4 minutes of inactivity');

    // Start new timer
    this.keepaliveTimer = setTimeout(() => {
      console.log('[Keepalive] ⚠️  4 minutes of inactivity detected - starting keepalive pings');
      this.startKeepaliveLoop();
    }, this.INACTIVITY_THRESHOLD);
  }

  private startKeepaliveLoop(): void {
    this.keepaliveCount = 0;

    console.log('[Keepalive] 🔄 Starting keepalive loop (max 8 rounds = 32 minutes)');

    // Send first ping immediately
    this.sendKeepalivePing();

    // Set up interval for subsequent pings
    this.keepaliveInterval = setInterval(() => {
      if (this.keepaliveCount >= this.MAX_KEEPALIVE_ROUNDS) {
        console.log('[Keepalive] ⏹️  Reached 30-minute timeout - stopping keepalive, allowing auto-stop');
        this.stopKeepalive();
      } else {
        this.sendKeepalivePing();
      }
    }, this.KEEPALIVE_INTERVAL);
  }

  private async sendKeepalivePing(): Promise<void> {
    this.keepaliveCount++;
    console.log(`[Keepalive] 🏓 Sending keepalive ping ${this.keepaliveCount}/${this.MAX_KEEPALIVE_ROUNDS}`);

    try {
      await axios.get(`http://localhost:${process.env.PORT || 10000}/health`, {
        timeout: 5000,
        headers: { 'X-Keepalive': 'true' }
      });
      console.log(`[Keepalive] ✅ Ping ${this.keepaliveCount} successful`);
    } catch (error: any) {
      console.error(`[Keepalive] ❌ Ping ${this.keepaliveCount} failed:`, error.message);
    }
  }

  private resetKeepalive(): void {
    if (this.keepaliveInterval) {
      console.log('[Keepalive] 🔄 Activity detected - resetting keepalive loop');
      clearInterval(this.keepaliveInterval);
      this.keepaliveInterval = null;
    }
    this.keepaliveCount = 0;
  }

  private stopKeepalive(): void {
    if (this.keepaliveTimer) {
      clearTimeout(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
    if (this.keepaliveInterval) {
      clearInterval(this.keepaliveInterval);
      this.keepaliveInterval = null;
    }
  }
}

// Singleton instance
const keepaliveService = new KeepaliveService();

// Express middleware
export function keepaliveMiddleware(req: any, res: any, next: any): void {
  keepaliveService.recordActivity(req.path);
  next();
}