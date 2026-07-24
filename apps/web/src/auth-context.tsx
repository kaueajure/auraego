import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { PublicUser } from "@aura-ego/shared";
import { api, refreshSession, setToken } from "./api";
import { clearLegacyLookId, lookIdFromCosmetics, readLegacyLookId } from "./cosmetics";

interface AuthValue { user: PublicUser | null; loading: boolean; login: (email: string, password: string) => Promise<void>; logout: () => Promise<void>; updateUser: (user: PublicUser) => void }
const AuthContext = createContext<AuthValue | null>(null);

async function syncLegacyLook(user: PublicUser): Promise<PublicUser> {
  const legacy = readLegacyLookId();
  if (!legacy) return user;
  const current = lookIdFromCosmetics(user.profile.selectedCosmetics);
  if (user.profile.selectedCosmetics.look) {
    clearLegacyLookId();
    return user;
  }
  try {
    const selectedCosmetics = { ...user.profile.selectedCosmetics, look: legacy };
    const fresh = await api<PublicUser>("/users/me", {
      method: "PATCH",
      body: JSON.stringify({ selectedCosmetics })
    });
    clearLegacyLookId();
    return fresh;
  } catch {
    return { ...user, profile: { ...user.profile, selectedCosmetics: { ...user.profile.selectedCosmetics, look: current === "emi" ? legacy : current } } };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null), [loading, setLoading] = useState(true);
  useEffect(() => {
    refreshSession()
      .then(async r => {
        setToken(r.accessToken);
        setUser(await syncLegacyLook(r.user));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  const login = async (email: string, password: string) => {
    const result = await api<{ accessToken: string; user: PublicUser }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    setToken(result.accessToken);
    setUser(await syncLegacyLook(result.user));
  };
  const logout = async () => { await api("/auth/logout", { method: "POST" }).catch(() => {}); setToken(null); setUser(null); };
  return <AuthContext.Provider value={{ user, loading, login, logout, updateUser: setUser }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => { const value = useContext(AuthContext); if (!value) throw new Error("AuthProvider missing"); return value; };
