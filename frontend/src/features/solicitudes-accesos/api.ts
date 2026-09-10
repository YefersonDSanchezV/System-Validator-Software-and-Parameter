import { api } from "@/lib/api/client";
import type { UserRequest, PasswordRequest, Platform } from "@/types/acceso";

export function listCreacionUsuarios(): Promise<UserRequest[]> {
  return api<UserRequest[]>("/solicitudes-accesos/creacion-usuarios");
}

export function listPlatforms(modulo?: string, soloActivas?: boolean): Promise<Platform[]> {
  const params = new URLSearchParams();
  if (modulo) params.set("modulo", modulo);
  if (soloActivas !== undefined) params.set("solo_activas", String(soloActivas));
  const qs = params.toString() ? `?${params.toString()}` : "";
  return api<Platform[]>(`/solicitudes-accesos/plataformas${qs}`);
}

export function createCreacionUsuario(data: FormData): Promise<UserRequest> {
  return api<UserRequest>("/solicitudes-accesos/creacion-usuarios", { method: "POST", body: data } as RequestInit);
}

export function listRestablecimientos(): Promise<PasswordRequest[]> {
  return api<PasswordRequest[]>("/solicitudes-accesos/restablecimientos-password");
}

export function createRestablecimiento(payload: {
  plataforma: string;
  solicitante: string;
  area: string;
  usuario: string;
  observacion: string;
  correo_jefe: string;
}): Promise<PasswordRequest> {
  return api<PasswordRequest>("/solicitudes-accesos/restablecimientos-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listPlataformasAll(): Promise<Platform[]> {
  return api<Platform[]>("/solicitudes-accesos/plataformas");
}
