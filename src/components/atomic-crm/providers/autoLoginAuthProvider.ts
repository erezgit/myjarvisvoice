import type { AuthProvider } from "ra-core";

/**
 * Auto-login auth provider for single-user mode.
 * Always resolves as authenticated — no login page, no Supabase auth needed.
 */
export const autoLoginAuthProvider: AuthProvider = {
  login: async () => {},
  logout: async () => {},
  checkAuth: async () => {},
  checkError: async () => {},
  getIdentity: async () => ({
    id: 1,
    fullName: "Michaela",
  }),
  getPermissions: async () => "admin",
  canAccess: async () => true,
};
