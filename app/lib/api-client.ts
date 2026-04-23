import { API_CONFIG } from "@/app/config/api";

const AUTH_TOKEN_KEY = "auth_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

/**
 * Fetch wrapper that calls the FastAPI backend directly with auth headers.
 * @param path - API path (e.g. "/api/chat" or "/api/threads/123")
 * @param init - Standard RequestInit options (method, body, headers, signal, etc.)
 */
export async function apiFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const url = `${API_CONFIG.API_HOST}${path}`;
  const headers = new Headers(init.headers);

  const authHeaders = getAuthHeaders();
  for (const [key, value] of Object.entries(authHeaders)) {
    if (!headers.has(key)) {
      headers.set(key, value);
    }
  }

  return fetch(url, { ...init, headers });
}
