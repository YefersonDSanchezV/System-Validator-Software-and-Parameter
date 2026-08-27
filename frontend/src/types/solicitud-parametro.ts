export type EstadoSolicitud =
  | "Pendiente"
  | "Habilitado"
  | "Aprobado"
  | "Rechazado"
  | "Autorizado Solicitud Previa";

export interface SolicitudParametro {
  id: number;
  consecutivo: string;
  tipoParametro: "Enfermeria" | "Historia Clinica" | "Otros";
  descripcion: string;
  fechaApertura: string;
  fechaCierre: string;
  horaApertura: string;
  horaCierre: string;
  totalValor: number | null;
  totalUnidad: string | null;
  solicitante: string;
  area: string;
  ingreso: string;
  medico: string;
  nombrePaciente: string;
  estado: EstadoSolicitud;
  motivoRechazo?: string | null;
  solicitudExtension?: string | null;
  observacionResolucion?: string | null;
  fechaRegistro: string;
}

export interface ApiSolicitudParametro {
  oid: number;
  consecutivo: string | null;
  tipo_parametro: string;
  descripcion: string;
  fecha_apertura: string | null;
  fecha_cierre: string | null;
  hora_apertura: string | null;
  hora_cierre: string | null;
  total_valor: number | null;
  total_unidad: string | null;
  solicitante: string;
  area: string | null;
  ingreso: string | null;
  medico: string | null;
  nombre_paciente: string | null;
  estado: string;
  motivo_rechazo: string | null;
  solicitud_extension: string | null;
  observacion_resolucion: string | null;
  fecha_registro: string;
}

export interface ConfiguracionParametrosDTO {
  hc_default: number;
  enf_hcrenf_default: number;
  enf_haplmed_default: number;
  hora_restablecimiento: string;
  auto_restablecer: boolean;
  tipos_habilitados: string[];
}

export const toSolicitudParametro = (item: ApiSolicitudParametro): SolicitudParametro => ({
  id: item.oid,
  consecutivo: item.consecutivo ?? `REQ-${item.oid}`,
  tipoParametro: item.tipo_parametro as SolicitudParametro["tipoParametro"],
  descripcion: item.descripcion,
  fechaApertura: item.fecha_apertura ?? "",
  fechaCierre: item.fecha_cierre ?? "",
  horaApertura: item.hora_apertura ?? "",
  horaCierre: item.hora_cierre ?? "",
  totalValor: item.total_valor,
  totalUnidad: item.total_unidad,
  solicitante: item.solicitante,
  area: item.area ?? "",
  ingreso: item.ingreso ?? "",
  medico: item.medico ?? "",
  nombrePaciente: item.nombre_paciente ?? "",
  estado: item.estado as EstadoSolicitud,
  motivoRechazo: item.motivo_rechazo,
  solicitudExtension: item.solicitud_extension,
  observacionResolucion: item.observacion_resolucion,
  fechaRegistro: item.fecha_registro,
});
