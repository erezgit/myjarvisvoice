/**
 * Local single-user auth shim for My Jarvis Voice (open-source offline build).
 *
 * The original cloud app authenticated against Supabase (Google OAuth + email).
 * This fork is fully offline with no accounts and no keys, so we expose the
 * same minimal `voiceAuth` surface that AuthContext/LoginPage consume, backed
 * by a fixed local user that is always "signed in". No network, no secrets.
 */

type LocalUser = { id: string; email: string; user_metadata: { full_name: string } };
type LocalSession = { user: LocalUser; access_token: string };

const LOCAL_USER: LocalUser = {
  id: "local-user",
  email: "you@localhost",
  user_metadata: { full_name: "You" },
};

const LOCAL_SESSION: LocalSession = {
  user: LOCAL_USER,
  access_token: "local",
};

// Unlimited local profile — there is no paywall in the open-source build.
const LOCAL_PROFILE = {
  id: "local-user",
  email: "you@localhost",
  full_name: "You",
  avatar_url: "",
  plan: "paid" as const,
  message_count: 0,
  free_limit: 1_000_000,
};

function selectChain() {
  const result = { data: LOCAL_PROFILE, error: null };
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    single: async () => result,
    then: (resolve: (v: typeof result) => unknown) => resolve(result),
  };
  return chain;
}

export const voiceAuth = {
  from: () => selectChain(),
  auth: {
    getSession: async () => ({ data: { session: LOCAL_SESSION }, error: null }),
    onAuthStateChange: (cb: (event: string, session: LocalSession) => void) => {
      // Emit the local session once so consumers settle into "signed in".
      setTimeout(() => cb("SIGNED_IN", LOCAL_SESSION), 0);
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    signInWithOAuth: async () => ({ data: { url: null }, error: null }),
    signInWithPassword: async () => ({ data: { session: LOCAL_SESSION }, error: null }),
    signUp: async () => ({ data: { session: LOCAL_SESSION }, error: null }),
    signOut: async () => ({ error: null }),
  },
};
