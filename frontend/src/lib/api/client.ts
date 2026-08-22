import { API_BASE_URL } from "@/config/constants";

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers as HeadersInit);
  const body = options?.body;
  if (!(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail ?? "No fue posible completar la operación.");
  }
  return response.json() as Promise<T>;
}
