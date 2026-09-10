import type { Version } from "@/types/version";

export const DEFAULT_DB_CONTAINERS = ["DGEMPRES99", "DGEMPRES98", "DGEMPRES10"] as const;

export function normalizeContainerName(value: string) {
  return value.trim();
}

export function toTimestamp(value?: string | null) {
  if (!value) return Number.NEGATIVE_INFINITY;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value.replace(" ", "T");
  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}

export function sortVersionsByCompilationDateDesc(items: Version[]) {
  return [...items].sort((a, b) => {
    const byCompilation = toTimestamp(b.fecha_compilacion) - toTimestamp(a.fecha_compilacion);
    if (byCompilation !== 0) return byCompilation;
    const byRegistration = toTimestamp(b.fechaRegistro) - toTimestamp(a.fechaRegistro);
    if (byRegistration !== 0) return byRegistration;
    return b.oid - a.oid;
  });
}

export function getContainerOptions(versions: Version[]) {
  return Array.from(
    new Set(
      [...DEFAULT_DB_CONTAINERS, ...versions.map((version) => normalizeContainerName(version.contenedor_bd ?? ""))]
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));
}
