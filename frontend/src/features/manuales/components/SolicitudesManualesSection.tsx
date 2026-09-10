import { useState, useEffect } from "react";
import { CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { Btn, SectionHeader, EmptyState } from "@/components/ui/custom";
import { TablePaginationControls } from "@/components/ui/TablePagination";
import { useTablePagination } from "@/hooks/useTablePagination";
import type { SolicitudManual } from "@/types/manual";

export function SolicitudesManualesSection({ onError }: { onError: (msg: string) => void }) {
  const [solicitudes, setSolicitudes] = useState<SolicitudManual[]>([]);
  const [loading, setLoading] = useState(true);
  const [smColFilters, setSmColFilters] = useState({ manual: "", modulo: "", solicitante: "", area: "", fecha: "", estado: "" });

  const fetchSolicitudes = () => {
    setLoading(true);
    api<SolicitudManual[]>("/manuales/solicitudes").then(setSolicitudes).catch((e) => onError(e.message)).finally(() => setLoading(false));
  };
  useEffect(() => { fetchSolicitudes(); }, []);
  const handleAprobar = (oid: number) => {
    api<SolicitudManual>(`/manuales/solicitudes/${oid}/aprobar`, { method: "PUT" }).then((updated) => {
      setSolicitudes((prev) => prev.map((s) => (s.oid === oid ? updated : s)));
      toast.success("Solicitud aprobada por 30 minutos.");
    }).catch((e) => onError(e instanceof Error ? e.message : "Error al aprobar la solicitud."));
  };
  const filteredSolicitudes = solicitudes.filter((sol) =>
    (!smColFilters.manual || (sol.manual_titulo ?? "").toLowerCase().includes(smColFilters.manual.toLowerCase())) &&
    (!smColFilters.modulo || (sol.manual_modulo ?? "").toLowerCase().includes(smColFilters.modulo.toLowerCase())) &&
    (!smColFilters.solicitante || sol.nombre_solicitante.toLowerCase().includes(smColFilters.solicitante.toLowerCase())) &&
    (!smColFilters.area || sol.area.toLowerCase().includes(smColFilters.area.toLowerCase())) &&
    (!smColFilters.fecha || (sol.fecha_solicitud ?? "").toLowerCase().includes(smColFilters.fecha.toLowerCase())) &&
    (!smColFilters.estado || sol.estado.toLowerCase().includes(smColFilters.estado.toLowerCase()))
  );
  const solicitudManualPagination = useTablePagination(filteredSolicitudes);
  return (
    <div className="space-y-6">
      <SectionHeader title="Solicitudes de Descarga de Manuales" subtitle="Administre las solicitudes de descarga de manuales de usuario. Al aprobar, el usuario tendrá 30 minutos para descargar el PDF." />
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr>{["Manual", "Módulo", "Solicitante", "Área", "Descripción", "Fecha Solicitud", "Estado", "Acciones"].map((h) => (<th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>))}</tr>
            <tr className="bg-slate-100/90 border-t border-slate-200">
              <th className="px-4 py-1.5"><input className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-normal" placeholder="Filtrar manual" onChange={(e) => setSmColFilters((p) => ({ ...p, manual: e.target.value }))} /></th>
              <th className="px-4 py-1.5"><input className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-normal" placeholder="Filtrar módulo" onChange={(e) => setSmColFilters((p) => ({ ...p, modulo: e.target.value }))} /></th>
              <th className="px-4 py-1.5"><input className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-normal" placeholder="Filtrar solicitante" onChange={(e) => setSmColFilters((p) => ({ ...p, solicitante: e.target.value }))} /></th>
              <th className="px-4 py-1.5"><input className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-normal" placeholder="Filtrar área" onChange={(e) => setSmColFilters((p) => ({ ...p, area: e.target.value }))} /></th>
              <th className="px-4 py-1.5"></th>
              <th className="px-4 py-1.5"><input className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-normal" placeholder="Filtrar fecha" onChange={(e) => setSmColFilters((p) => ({ ...p, fecha: e.target.value }))} /></th>
              <th className="px-4 py-1.5"><select className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-normal" onChange={(e) => setSmColFilters((p) => ({ ...p, estado: e.target.value }))}><option value="">Todos</option><option value="Pendiente">Pendiente</option><option value="Aprobado">Aprobado</option></select></th>
              <th className="px-4 py-1.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {solicitudManualPagination.rows.map((sol) => (
              <tr key={sol.oid} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-4 py-3 font-semibold text-slate-900">{sol.manual_titulo}</td>
                <td className="px-4 py-3 text-xs font-bold text-[#0778ac]">{sol.manual_modulo}</td>
                <td className="px-4 py-3 text-slate-800">{sol.nombre_solicitante}</td>
                <td className="px-4 py-3 text-slate-600">{sol.area}</td>
                <td className="px-4 py-3 text-slate-600 max-w-xs">{sol.descripcion}</td>
                <td className="px-4 py-3 text-slate-500 font-mono text-xs">{sol.fecha_solicitud?.slice(0, 16).replace("T", " ")}</td>
                <td className="px-4 py-3"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold ${sol.estado === "Aprobado" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-amber-100 text-amber-800 border border-amber-200"}`}>{sol.estado}</span></td>
                <td className="px-4 py-3">{sol.estado === "Pendiente" ? (<Btn v="success" sm onClick={() => handleAprobar(sol.oid)}><CheckCircle size={13} /> Aprobar (30 min)</Btn>) : (<span className="text-xs text-slate-400 font-medium">Activo</span>)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <TablePaginationControls pagination={solicitudManualPagination} itemLabel="solicitudes" />
        {!loading && solicitudes.length === 0 && <EmptyState message="No hay solicitudes de manuales registradas." />}
      </div>
    </div>
  );
}
