export type EstadoObs = "aprobacion" | "rechazo";
export interface Observacion {
  id: string;
  versionId: string;
  versionTitulo?: string;
  modulo: string;
  nombre: string;
  cargo?: string;
  fechaHora: string;
  estado: EstadoObs;
  observacion: string;
  incidencia?: string;
  ruta?: string;
  captura?: string[];
  firma?: string;
}
