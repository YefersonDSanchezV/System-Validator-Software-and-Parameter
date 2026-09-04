import { API_BASE_URL } from "@/config/constants";

const AUTHENTICATED_USER_KEY = "svs-authenticated-user";
let cachedPrivateIp = "";
let networkDiscoveryStarted = false;

function getAuthenticatedUser() {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(AUTHENTICATED_USER_KEY)?.trim() ?? "";
}

function extractPrivateIpv4FromCandidate(candidate: string) {
  const match = candidate.match(/\b(\d{1,3}(?:\.\d{1,3}){3})\b/);
  if (!match) return "";
  const [a, b] = match[1].split(".").map(Number);
  const isPrivate =
    a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168);
  return isPrivate ? match[1] : "";
}

function discoverClientPrivateIp() {
  if (typeof window === "undefined" || networkDiscoveryStarted || cachedPrivateIp) return;
  networkDiscoveryStarted = true;

  const RTCPeerConnectionCtor =
    (window as any).RTCPeerConnection ||
    (window as any).webkitRTCPeerConnection ||
    (window as any).mozRTCPeerConnection;
  if (!RTCPeerConnectionCtor) return;

  try {
    const pc = new RTCPeerConnectionCtor({ iceServers: [] });
    const closeConnection = () => {
      try {
        pc.close();
      } catch {
        // no-op
      }
    };
    const timeout = window.setTimeout(closeConnection, 1200);
    pc.createDataChannel("ip");
    pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      const candidateText = event.candidate?.candidate ?? "";
      const privateIp = extractPrivateIpv4FromCandidate(candidateText);
      if (privateIp) {
        cachedPrivateIp = privateIp;
        window.clearTimeout(timeout);
        closeConnection();
      }
    };
    pc.createOffer()
      .then((offer: RTCSessionDescriptionInit) => pc.setLocalDescription(offer))
      .catch(() => closeConnection());
  } catch {
    // no-op
  }
}

function appendAuditHeaders(headers: Headers) {
  discoverClientPrivateIp();
  const authenticatedUser = getAuthenticatedUser();
  if (authenticatedUser) {
    headers.set("X-User-Name", authenticatedUser);
    headers.set("X-User-Role", authenticatedUser);
  }
  if (cachedPrivateIp) {
    headers.set("X-Client-Private-IP", cachedPrivateIp);
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
    let errorMsg = "No fue posible completar la operación.";
    if (typeof data?.detail === "string") {
      errorMsg = data.detail;
    } else if (Array.isArray(data?.detail) && data.detail.length > 0) {
      errorMsg = data.detail.map((err: any) => err.msg || JSON.stringify(err)).join(", ");
    } else if (data?.detail) {
      errorMsg = JSON.stringify(data.detail);
    }
    throw new Error(errorMsg);
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
