export interface ApiBoletin {
  oid: number;
  tipo_documento: string | null;
  consecutivo: number | null;
  fecha: string | null;
  modulo: string | null;
  opcion: string | null;
  impacto: string | null;
  categoria: string | null;
  con_documentacion: boolean;
  asunto: string | null;
  clase_documento: string | null;
  advertencia: string | null;
  instructivo_descripcion: string | null;
  mes: number;
  anio: number;
  archivo: string | null;
}
export interface ApiBoletinPeriodo { mes: number; anio: number; }
export interface ApiBoletinImportResult { mes: number; anio: number; inserted_rows: number; }
