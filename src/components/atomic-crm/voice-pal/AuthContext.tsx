import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { voiceAuth } from "@/lib/voice-auth";

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  plan: "free" | "paid";
  message_count: number;
  free_limit: number;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await voiceAuth
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  return data as Profile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (u: User) => {
    const p = await fetchProfile(u.id);
    setProfile(p);
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user);
  };

  useEffect(() => {
    let mounted = true;

    voiceAuth.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const s = data.session;
      setSession(s);
      const u = s?.user ?? null;
      setUser(u);
      if (u) {
        loadProfile(u).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = voiceAuth.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      setSession(s);
      const u = s?.user ?? null;
      setUser(u);
      if (u) {
        loadProfile(u);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signInWithGoogle = async () => {
    await voiceAuth.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  };

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await voiceAuth.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    const { error } = await voiceAuth.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await voiceAuth.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
