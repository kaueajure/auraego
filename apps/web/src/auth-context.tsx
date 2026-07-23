import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { PublicUser } from "@aura-ego/shared";
import { api, refreshSession, setToken } from "./api";

interface AuthValue { user: PublicUser | null; loading: boolean; login: (email: string, password: string) => Promise<void>; logout: () => Promise<void>; updateUser: (user: PublicUser) => void }
const AuthContext = createContext<AuthValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null), [loading, setLoading] = useState(true);
  useEffect(() => { refreshSession().then(r => { setToken(r.accessToken); setUser(r.user); }).catch(() => {}).finally(() => setLoading(false)); }, []);
  const login = async (email: string, password: string) => { const result = await api<{ accessToken: string; user: PublicUser }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }); setToken(result.accessToken); setUser(result.user); };
  const logout = async () => { await api("/auth/logout", { method: "POST" }).catch(() => {}); setToken(null); setUser(null); };
  return <AuthContext.Provider value={{ user, loading, login, logout, updateUser: setUser }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => { const value = useContext(AuthContext); if (!value) throw new Error("AuthProvider missing"); return value; };
