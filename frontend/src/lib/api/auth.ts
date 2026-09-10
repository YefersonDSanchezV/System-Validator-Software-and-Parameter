/**
 * Fase 1 — Auth unificado a Bearer JWT (Decisión 5)
 * Centraliza token `usuarios_solicitud_token` y headers Authorization.
 * Mantiene compatibilidad con `svs-authenticated-user` legacy hasta Fase 3.
 */
const TOKEN_KEY = "usuarios_solicitud_token";
const USER_KEY = "usuarios_solicitud_user";
const LEGACY_USER_KEY = "svs-authenticated-user";

export function getBearerToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setBearerToken(token: string, user?: unknown): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token.trim());
  if (user !== undefined) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function getStoredUser<T = unknown>(): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function clearBearerAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  // Limpiar también legacy para evitar sesiones huérfanas (Fase 1.1)
  sessionStorage.removeItem(LEGACY_USER_KEY);
}

export function getAuthHeaders(): Record<string, string> {
  const token = getBearerToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function isAuthenticated(): boolean {
  return !!getBearerToken();
}

/** Helper para api() — inyecta Authorization si hay token */
export function withAuthHeaders(headers?: HeadersInit): Headers {
  const h = new Headers(headers as HeadersInit);
  const token = getBearerToken();
  if (token && !h.has("Authorization")) {
    h.set("Authorization", `Bearer ${token}`);
  }
  return h;
}
