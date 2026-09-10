/**
 * Fase 3 — Tipos centralizados para Fase 4 split de AccessRequestSections.tsx
 * Extraídos desde src/features/solicitudes-accesos/AccessRequestSections.tsx:9
 */

export type UserRequest = {
  oid: number;
  consecutivo: string;
  tipo?: string;
  tipos?: string[];
  solicitante: string;
  area: string;
  nombre_usuario: string;
  estado: string;
  fecha_registro: string;
  primer_nombre?: string;
  segundo_nombre?: string;
  primer_apellido?: string;
  segundo_apellido?: string;
  cedula?: string;
  telefono?: string;
  correo?: string;
  direccion?: string;
  cargo?: string;
};

export type PasswordRequest = {
  oid: number;
  consecutivo: string;
  plataforma: string;
  solicitante: string;
  area: string;
  usuario: string;
  correo_jefe?: string;
  observacion?: string;
  estado: string;
  fecha_registro: string;
};

export type Platform = {
  oid: number;
  nombre: string;
  modulo: string;
  activa: boolean;
};

export type SolicitudAccesoEmailConfig = {
  correos_creacion: string;
  correos_restablecimiento: string;
};
