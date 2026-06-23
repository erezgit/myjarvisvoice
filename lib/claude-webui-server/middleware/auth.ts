/**
 * Authentication middleware for My Jarvis Desktop
 *
 * Validates JWT tokens from My Jarvis Web and manages user sessions
 */

import { createMiddleware } from "hono/factory";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import pkg from 'jsonwebtoken';
const { verify, sign } = pkg;
import { logger } from "../utils/logger.ts";

interface JWTPayload {
  userId: string;
  machineId: string;      // Changed from instanceId to match frontend
  ephemeral?: boolean;    // Add ephemeral flag from frontend
  iat: number;
  exp?: number;           // Make optional since frontend doesn't always set it
}

interface AuthContext {
  Variables: {
    userId?: string;
    sessionId?: string;
  };
}

const JWT_SECRET = process.env.JWT_SECRET;
const LOGIN_URL = process.env.LOGIN_URL || "https://www.myjarvis.io/login";
const DISABLE_AUTH = process.env.DISABLE_AUTH === "true";
const NODE_ENV = process.env.NODE_ENV || "production";
const SESSION_COOKIE_NAME = "jarvis_session";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

// Simple in-memory session store (could be replaced with Redis in production)
const sessionStore = new Map<string, { userId: string; createdAt: number }>();

function generateSessionId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function isSessionValid(sessionId: string): { valid: boolean; userId?: string } {
  const session = sessionStore.get(sessionId);
  if (!session) {
    return { valid: false };
  }

  // Check if session has expired (30 days)
  const now = Date.now();
  const sessionAge = now - session.createdAt;
  const maxAge = SESSION_MAX_AGE * 1000; // Convert to milliseconds

  if (sessionAge > maxAge) {
    sessionStore.delete(sessionId);
    return { valid: false };
  }

  return { valid: true, userId: session.userId };
}

function createSession(userId: string): string {
  const sessionId = generateSessionId();
  sessionStore.set(sessionId, {
    userId,
    createdAt: Date.now(),
  });
  return sessionId;
}

function deleteSession(sessionId: string): void {
  sessionStore.delete(sessionId);
}

// SECURE: Explicit allowlist with path traversal protection (2025 OWASP compliance)
const PUBLIC_ASSETS = [
  '/favicon.ico',
  '/favicon.svg',
  '/robots.txt',
  '/manifest.json'
] as const;

const STATIC_PATTERNS = [
  '/assets/',
  '/static/'
] as const;

export const authMiddleware = createMiddleware<AuthContext>(async (c, next) => {
  const path = c.req.path;

  // 1. Health checks (must come first)
  if (path === "/health" || path === "/api/health") {
    return next();
  }

  // 2. Development mode bypass
  if (DISABLE_AUTH && NODE_ENV === "development") {
    // Create a mock session for development
    c.set("userId", "dev-user-123");
    c.set("sessionId", "dev-session-123");
    logger.app.info("Development mode: Authentication bypassed");
    return next();
  }

  // 2. (REMOVED) Internal API authentication bypass - no longer needed with shared service approach

  // 3. Explicit public asset allowlist (OWASP 2025 standard)
  if (PUBLIC_ASSETS.includes(path as any)) {
    return next();
  }

  // 4. Static directory patterns with security validation
  if (STATIC_PATTERNS.some(pattern => path.startsWith(pattern))) {
    // CVE-2025 Protection: Prevent path traversal attacks
    if (path.includes('..') || path.includes('\\') || path.includes('%2e') || path.includes('%2E')) {
      logger.app.warn("Path traversal attempt blocked", {
        path,
        ip: c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'
      });
      return c.text('Forbidden', 403);
    }

    // Additional security: Block executable file extensions in static dirs
    const executableExts = ['.php', '.jsp', '.asp', '.py', '.rb', '.sh', '.exe', '.bat'];
    if (executableExts.some(ext => path.toLowerCase().endsWith(ext))) {
      logger.app.warn("Executable file access blocked", {
        path,
        ip: c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'
      });
      return c.text('Forbidden', 403);
    }

    return next();
  }

  if (!JWT_SECRET) {
    logger.app.error("JWT_SECRET environment variable is not set");
    return c.text("Server configuration error", 500);
  }

  // Check for existing session cookie
  const sessionCookie = getCookie(c, SESSION_COOKIE_NAME);
  if (sessionCookie) {
    const sessionCheck = isSessionValid(sessionCookie);
    if (sessionCheck.valid && sessionCheck.userId) {
      // Valid session exists
      c.set("userId", sessionCheck.userId);
      c.set("sessionId", sessionCookie);
      return next();
    } else {
      // Invalid/expired session
      deleteCookie(c, SESSION_COOKIE_NAME);
    }
  }

  // Check for JWT token in Authorization header first, then query params as fallback
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7)
    : c.req.query("token");

  if (!token) {
    // No token and no valid session - redirect to login
    logger.app.info("No authentication token or session found, redirecting to login");
    return c.redirect(LOGIN_URL);
  }

  try {
    // Validate JWT token
    const payload = verify(token, JWT_SECRET) as JWTPayload;

    logger.app.info("JWT token validated successfully for user: {userId}", {
      userId: payload.userId,
    });

    // Create new session
    const sessionId = createSession(payload.userId);

    // Set session cookie
    setCookie(c, SESSION_COOKIE_NAME, sessionId, {
      maxAge: SESSION_MAX_AGE,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    // Set context variables
    c.set("userId", payload.userId);
    c.set("sessionId", sessionId);

    // CRITICAL FIX: Differentiate between API routes and web routes
    // API routes should proceed to endpoint, web routes should redirect for URL cleaning
    const isApiRoute = path.startsWith('/api/');

    if (isApiRoute) {
      // For API routes: proceed to the endpoint after setting auth context
      logger.app.info("API route authenticated, proceeding to endpoint", {
        userId: payload.userId,
        path
      });
      return next();
    } else {
      // For web routes: redirect to clean URL (remove token from query string)
      const url = new URL(c.req.url);
      url.searchParams.delete("token");
      const cleanUrl = url.pathname + (url.search || "");

      logger.app.info("Web route authenticated, redirecting to clean URL: {url}", { url: cleanUrl });
      return c.redirect(cleanUrl);
    }
  } catch (error) {
    logger.app.error("JWT validation failed: {error}", { error });

    // Invalid token - redirect to login
    return c.redirect(LOGIN_URL);
  }
});

// Middleware to require authentication (for API routes)
export const requireAuth = createMiddleware<AuthContext>(async (c, next) => {
  const userId = c.get("userId");

  if (!userId) {
    return c.json({ error: "Authentication required" }, 401);
  }

  return next();
});

// Session management utilities
export const sessionUtils = {
  getUserId: (c: any) => c.get("userId"),
  getSessionId: (c: any) => c.get("sessionId"),
  deleteSession: (c: any) => {
    const sessionId = c.get("sessionId");
    if (sessionId) {
      deleteSession(sessionId);
      deleteCookie(c, SESSION_COOKIE_NAME);
    }
  },
};