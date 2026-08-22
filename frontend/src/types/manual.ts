export interface ApiManual {
  oid: number;
  modulo: string;
  titulo: string;
  version: string | null;
  fecha_registro: string;
  archivo: string | null;
}

export interface SolicitudManual {
  oid: number;
  manual_oid: number;
  nombre_solicitante: string;
  area: string;
  descripcion: string;
  fecha_solicitud: string;
  estado: "Pendiente" | "Aprobado";
  fecha_aprobacion?: string | null;
  manual_titulo?: string;
  manual_modulo?: string;
}
