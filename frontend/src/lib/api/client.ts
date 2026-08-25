import { API_BASE_URL } from "@/config/constants";

const AUTHENTICATED_USER_KEY = "svs-authenticated-user";

function getAuthenticatedUser() {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(AUTHENTICATED_USER_KEY)?.trim() ?? "";
}

function appendAuditHeaders(headers: Headers) {
  const authenticatedUser = getAuthenticatedUser();
  if (authenticatedUser) {
    headers.set("X-User-Name", authenticatedUser);
    headers.set("X-User-Role", authenticatedUser);
  }
}

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers as HeadersInit);
  const body = options?.body;
  if (!(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  appendAuditHeaders(headers);
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail ?? "No fue posible completar la operación.");
  }
  return response.json() as Promise<T>;
}

function getFilenameFromDisposition(disposition: string | null, fallback: string) {
  if (!disposition) return fallback;

  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const asciiMatch = disposition.match(/filename="?([^"]+)"?/i);
  return asciiMatch?.[1] ?? fallback;
}

export async function downloadApiFile(path: string, fallbackFilename: string, options?: RequestInit) {
  const headers = new Headers(options?.headers as HeadersInit);
  const body = options?.body;
  if (body && !(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  appendAuditHeaders(headers);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail ?? "No fue posible descargar el archivo.");
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = getFilenameFromDisposition(response.headers.get("Content-Disposition"), fallbackFilename);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export function setAuthenticatedApiUser(username: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(AUTHENTICATED_USER_KEY, username.trim());
}

export function clearAuthenticatedApiUser() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(AUTHENTICATED_USER_KEY);
}
