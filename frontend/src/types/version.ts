export type EstadoVersion = "activo" | "inactivo";

export interface Version {
  id: string;
  oid: number;
  titulo: string;
  tituloBase: string;
  descripcion: string;
  enlace: string;
  fechaRegistro: string;
  estado: EstadoVersion;
  contenedor_bd?: string | null;
  num_compilacion?: string | null;
  fecha_compilacion?: string | null;
}

export interface ApiVersion {
  oid: number;
  titulo: string;
  descripcion: string;
  enlace: string;
  estado: boolean;
  fecha_registro: string | null;
  contenedor_bd?: string | null;
  num_compilacion?: string | null;
  fecha_compilacion?: string | null;
}

export const toVersion = (v: ApiVersion): Version => {
  const numComp = v.num_compilacion?.trim();
  const displayTitle = numComp ? `${v.titulo} - ${numComp}` : v.titulo;

  return {
    id: `v${v.oid}`,
    oid: v.oid,
    titulo: displayTitle,
    tituloBase: v.titulo,
    descripcion: v.descripcion,
    enlace: v.enlace,
    fechaRegistro: v.fecha_registro?.slice(0, 10) ?? "",
    estado: v.estado ? "activo" : "inactivo",
    contenedor_bd: v.contenedor_bd || null,
    num_compilacion: v.num_compilacion || null,
    fecha_compilacion: v.fecha_compilacion ? v.fecha_compilacion.slice(0, 16).replace("T", " ") : null,
  };
};

export interface RestauracionDB {
  oid: number;
  contenedor_bd: string;
  fecha_hora_restauracion: string;
  fecha_ultima_copia: string;
  compilacion_anclada_oid?: number | null;
  compilacion_titulo?: string | null;
  usuario?: string | null;
}
