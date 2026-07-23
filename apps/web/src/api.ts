import type { ApiError, PublicUser } from "@aura-ego/shared";

// Empty in production means same origin: Express serves both API and frontend.
const API = import.meta.env.VITE_API_URL || "";
let token: string | null = null;
export const setToken = (value: string | null) => { token = value; };
export const getToken = () => token;

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...options, credentials: "include",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: { message: "Servidor indisponível." } })) as ApiError;
    throw Object.assign(new Error(body.error.message), { status: response.status, code: body.error.code, fields: body.error.fields });
  }
  return response.status === 204 ? undefined as T : response.json();
}
export const refreshSession = () => api<{ accessToken: string; user: PublicUser }>("/auth/refresh", { method: "POST" });
