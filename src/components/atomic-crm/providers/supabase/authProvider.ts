import type { AuthProvider } from "ra-core";
import { supabaseAuthProvider } from "ra-supabase-core";

import { canAccess } from "../commons/canAccess";
import { supabase } from "./supabase";

const baseAuthProvider = supabaseAuthProvider(supabase, {
  getIdentity: async () => {
    const member = await getMember();

    if (member == null) {
      throw new Error();
    }

    return {
      id: member.id,
      fullName: `${member.first_name} ${member.last_name}`,
      avatar: member.avatar?.src,
    };
  },
});

// To speed up checks, we cache the initialization state
// and the current member in the local storage. They are cleared on logout.
const IS_INITIALIZED_CACHE_KEY = "RaStore.auth.is_initialized";
const CURRENT_MEMBER_CACHE_KEY = "RaStore.auth.current_member";

function getLocalStorage(): Storage | null {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

export async function getIsInitialized() {
  const storage = getLocalStorage();
  const cachedValue = storage?.getItem(IS_INITIALIZED_CACHE_KEY);
  if (cachedValue != null) {
    return cachedValue === "true";
  }

  const { data } = await supabase.from("init_state").select("is_initialized");
  const isInitialized = data?.at(0)?.is_initialized > 0;

  if (isInitialized) {
    storage?.setItem(IS_INITIALIZED_CACHE_KEY, "true");
  }

  return isInitialized;
}

const getMember = async () => {
  const storage = getLocalStorage();
  const cachedValue = storage?.getItem(CURRENT_MEMBER_CACHE_KEY);
  if (cachedValue != null) {
    return JSON.parse(cachedValue);
  }

  const { data: dataSession, error: errorSession } =
    await supabase.auth.getSession();

  // Shouldn't happen after login but just in case
  if (dataSession?.session?.user == null || errorSession) {
    return undefined;
  }

  const { data: dataMember, error: errorMember } = await supabase
    .from("members")
    .select("id, first_name, last_name, avatar, administrator, role")
    .match({ user_id: dataSession?.session?.user.id })
    .single();

  // Shouldn't happen either as all users are members but just in case
  if (dataMember == null || errorMember) {
    return undefined;
  }

  storage?.setItem(CURRENT_MEMBER_CACHE_KEY, JSON.stringify(dataMember));
  return dataMember;
};

function clearCache() {
  const storage = getLocalStorage();
  storage?.removeItem(IS_INITIALIZED_CACHE_KEY);
  storage?.removeItem(CURRENT_MEMBER_CACHE_KEY);
}

export const authProvider: AuthProvider = {
  ...baseAuthProvider,
  login: async (params) => {
    if (params.ssoDomain) {
      const { error } = await supabase.auth.signInWithSSO({
        domain: params.ssoDomain,
      });
      if (error) {
        throw error;
      }
      return;
    }
    return baseAuthProvider.login(params);
  },
  logout: async (params) => {
    clearCache();
    return baseAuthProvider.logout(params);
  },
  checkAuth: async (params) => {
    // Users are on the set-password page, nothing to do
    if (
      window.location.pathname === "/set-password" ||
      window.location.hash.includes("#/set-password")
    ) {
      return;
    }
    // Users are on the forgot-password page, nothing to do
    if (
      window.location.pathname === "/forgot-password" ||
      window.location.hash.includes("#/forgot-password")
    ) {
      return;
    }
    // Users are on the sign-up page, nothing to do
    if (
      window.location.pathname === "/sign-up" ||
      window.location.hash.includes("#/sign-up")
    ) {
      return;
    }

    const isInitialized = await getIsInitialized();

    if (!isInitialized) {
      await supabase.auth.signOut();
      throw {
        redirectTo: "/sign-up",
        message: false,
      };
    }

    return baseAuthProvider.checkAuth(params);
  },
  canAccess: async (params) => {
    const isInitialized = await getIsInitialized();
    if (!isInitialized) return false;

    // Get the current user
    const member = await getMember();
    if (member == null) return false;

    // Compute access rights from the member role
    const memberRole = member.role || (member.administrator ? "admin" : "salesperson");
    return canAccess(memberRole, params);
  },
  getAuthorizationDetails(authorizationId: string) {
    return supabase.auth.oauth.getAuthorizationDetails(authorizationId);
  },
  approveAuthorization(authorizationId: string) {
    return supabase.auth.oauth.approveAuthorization(authorizationId);
  },
  denyAuthorization(authorizationId: string) {
    return supabase.auth.oauth.denyAuthorization(authorizationId);
  },
};
