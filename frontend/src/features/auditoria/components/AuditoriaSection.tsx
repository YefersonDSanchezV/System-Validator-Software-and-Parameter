import { useState, useEffect } from "react";
import { Download, Eye } from "lucide-react";
import { api } from "@/lib/api/client";
import { Modal, Btn, SectionHeader, EmptyState } from "@/components/ui/custom";
import { TablePaginationControls } from "@/components/ui/TablePagination";
import { useTablePagination } from "@/hooks/useTablePagination";

export interface AuditLogItem {
  oid: number;
  fecha_hora: string;
  tipo_accion: string;
  ip_equipo: string;
  nombre_equipo?: string | null;
  usuario_windows_equipo?: string | null;
  modulo: string;
  submodulo: "LOGS_SISTEMAS" | "LOGS_DESCARGAS" | "LOGS_ACCESOS";
  usuario: string;
  detalle?: string | null;
  payload_json?: Record<string, unknown> | null;
}

export type AuditSubmodulo = "LOGS_SISTEMAS" | "LOGS_DESCARGAS" | "LOGS_ACCESOS";

export function AuditoriaSection({ submodulo }: { submodulo: AuditSubmodulo }) {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [filters, setFilters] = useState({
    tipo_accion: "",
    ip_equipo: "",
    nombre_equipo: "",
    usuario_windows_equipo: "",
    modulo: "",
    usuario: "",
    fecha_inicio: "",
    fecha_fin: "",
  });

  const buildQueryParams = () => {
    const queryParams = new URLSearchParams();
    queryParams.append("submodulo", submodulo);
    if (filters.tipo_accion) queryParams.append("tipo_accion", filters.tipo_accion);
    if (filters.ip_equipo) queryParams.append("ip_equipo", filters.ip_equipo);
    if (filters.nombre_equipo) queryParams.append("nombre_equipo", filters.nombre_equipo);
    if (filters.usuario_windows_equipo) queryParams.append("usuario_windows_equipo", filters.usuario_windows_equipo);
    if (filters.modulo) queryParams.append("modulo", filters.modulo);
    if (filters.usuario) queryParams.append("usuario", filters.usuario);
    if (filters.fecha_inicio) queryParams.append("fecha_inicio", filters.fecha_inicio);
    if (filters.fecha_fin) queryParams.append("fecha_fin", filters.fecha_fin);
    return queryParams;
  };

  const fetchLogs = () => {
    setLoading(true);
    const queryParams = buildQueryParams();
    api<AuditLogItem[]>(`/auditoria/?${queryParams.toString()}`)
      .then(setLogs)
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, [submodulo]);

  const handleExportExcel = () => {
    const queryParams = buildQueryParams();
    window.open(`/api/v1/auditoria/exportar-excel?${queryParams.toString()}`, "_blank");
  };
  const logPagination = useTablePagination(logs);

  const submoduloTitles = {
    LOGS_SISTEMAS: "Logs Sistemas",
    LOGS_DESCARGAS: "Logs Descargas",
    LOGS_ACCESOS: "Logs Accesos",
  } as const;
  const subtitleBySubmodulo = {
    LOGS_SISTEMAS: "Historial de operaciones del sistema con detalle de solicitud/respuesta.",
    LOGS_DESCARGAS: "Historial de descargas de documentos y reportes del sistema.",
    LOGS_ACCESOS: "Historial de accesos de lectura (GET) a recursos del sistema.",
  } as const;

  return (
    <div className="space-y-6">
      <SectionHeader
        title={`Auditoría - ${submoduloTitles[submodulo]}`}
        subtitle={subtitleBySubmodulo[submodulo]}
      />

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-9 items-end bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Acción (HTTP)</label>
            <select
              value={filters.tipo_accion}
              onChange={(e) => setFilters({ ...filters, tipo_accion: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
            >
              <option value="">Todas</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="OPTIONS">OPTIONS</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">IP del Equipo</label>
            <input
              type="text"
              value={filters.ip_equipo}
              onChange={(e) => setFilters({ ...filters, ip_equipo: e.target.value })}
              placeholder="Ej: 192.168.1.1"
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Nombre del Equipo</label>
            <input
            type="text"
            value={filters.nombre_equipo}
            onChange={(e) => setFilters({ ...filters, nombre_equipo: e.target.value })}
            placeholder="Ej: EQUIPO-01"
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Usuario Windows</label>
            <input
            type="text"
            value={filters.usuario_windows_equipo}
            onChange={(e) => setFilters({ ...filters, usuario_windows_equipo: e.target.value })}
            placeholder="Ej: sistemas"
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Módulo</label>
            <input
              type="text"
              value={filters.modulo}
              onChange={(e) => setFilters({ ...filters, modulo: e.target.value })}
              placeholder="Ej: Versiones"
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Usuario</label>
            <input
              type="text"
              value={filters.usuario}
              onChange={(e) => setFilters({ ...filters, usuario: e.target.value })}
              placeholder="Ej: Coordinador"
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Desde</label>
            <input
              type="date"
              value={filters.fecha_inicio}
              onChange={(e) => setFilters({ ...filters, fecha_inicio: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Hasta</label>
            <input
              type="date"
              value={filters.fecha_fin}
              onChange={(e) => setFilters({ ...filters, fecha_fin: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
            />
          </div>

          <div className="flex gap-2">
            <Btn v="primary" sm onClick={fetchLogs} className="flex-1 justify-center">
              Filtrar
            </Btn>
            <Btn v="success" sm onClick={handleExportExcel} className="flex-1 justify-center">
              <Download size={13} /> Excel
            </Btn>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                {["#", "Fecha y Hora", "Acción", "IP del Equipo", "Nombre del Equipo", "Usuario Windows", "Módulo", "Detalle", "Acción"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left font-bold text-slate-500 uppercase tracking-wider bg-slate-50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logPagination.rows.map((log) => {
                const badgeColor =
                  log.tipo_accion === "POST" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                  log.tipo_accion === "PUT" ? "bg-amber-100 text-amber-800 border-amber-200" :
                  log.tipo_accion === "DELETE" ? "bg-rose-100 text-rose-800 border-rose-200" :
                  "bg-slate-100 text-slate-700 border-slate-200";
                return (
                  <tr key={log.oid} className="hover:bg-slate-50/70">
                    <td className="px-3 py-2 text-slate-400 font-mono">#{log.oid}</td>
                    <td className="px-3 py-2 text-slate-600 font-mono whitespace-nowrap">{log.fecha_hora}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${badgeColor}`}>
                        {log.tipo_accion}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-600">{log.ip_equipo}</td>
                    <td className="px-3 py-2 text-slate-700">{log.nombre_equipo || "No disponible"}</td>
                    <td className="px-3 py-2 text-slate-700">{log.usuario_windows_equipo || "No disponible"}</td>
                    <td className="px-3 py-2 font-bold text-[#0778ac]">{log.modulo}</td>
                    <td className="px-3 py-2 text-slate-600 max-w-md truncate" title={log.detalle || ""}>{log.detalle || "—"}</td>
                    <td className="px-3 py-2">
                      <Btn v="ghost" sm onClick={() => setSelectedLog(log)}>
                        <Eye size={13} /> Consultar
                      </Btn>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          <TablePaginationControls pagination={logPagination} itemLabel="registros" />
          {!loading && logs.length === 0 && <EmptyState message="No se encontraron registros de auditoría." />}
        </div>
      </div>

      <Modal
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={`Detalle del Log #${selectedLog?.oid ?? ""}`}
        size="lg"
      >
        {!selectedLog ? null : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-slate-200 p-3"><p className="text-[11px] uppercase tracking-wider text-slate-400">Fecha y hora</p><p className="mt-1 font-semibold text-slate-800">{selectedLog.fecha_hora}</p></div>
              <div className="rounded-xl border border-slate-200 p-3"><p className="text-[11px] uppercase tracking-wider text-slate-400">Acción</p><p className="mt-1 font-semibold text-slate-800">{selectedLog.tipo_accion}</p></div>
              <div className="rounded-xl border border-slate-200 p-3"><p className="text-[11px] uppercase tracking-wider text-slate-400">IP del equipo</p><p className="mt-1 font-semibold text-slate-800">{selectedLog.ip_equipo}</p></div>
              <div className="rounded-xl border border-slate-200 p-3"><p className="text-[11px] uppercase tracking-wider text-slate-400">Nombre del equipo</p><p className="mt-1 font-semibold text-slate-800">{selectedLog.nombre_equipo || "No disponible"}</p></div>
              <div className="rounded-xl border border-slate-200 p-3"><p className="text-[11px] uppercase tracking-wider text-slate-400">Usuario windows</p><p className="mt-1 font-semibold text-slate-800">{selectedLog.usuario_windows_equipo || "No disponible"}</p></div>
              <div className="rounded-xl border border-slate-200 p-3"><p className="text-[11px] uppercase tracking-wider text-slate-400">Módulo</p><p className="mt-1 font-semibold text-slate-800">{selectedLog.modulo}</p></div>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-400">Detalle</p>
              <p className="mt-1 text-sm text-slate-700">{selectedLog.detalle || "—"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-400">Estructura JSON</p>
              <pre className="mt-2 max-h-[320px] overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
{JSON.stringify(selectedLog.payload_json || {}, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default AuditoriaSection;
