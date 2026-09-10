import { useState, useEffect } from "react";
import { AlertCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { Btn, SectionHeader, EmptyState } from "@/components/ui/custom";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePaginationControls } from "@/components/ui/TablePagination";
import { type Version, type RestauracionDB } from "@/types/version";

// ─── 1b. Consultar Restauración DB Section ─────────────────────────────────────

export function ConsultarRestauracionDBSection({
  versions,
  onError,
}: {
  versions: Version[];
  onError: (message: string) => void;
}) {
  const [restauraciones, setRestauraciones] = useState<RestauracionDB[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchRestauraciones = () => {
    setLoading(true);
    api<RestauracionDB[]>(`/versions/restauraciones?_ts=${Date.now()}`, { cache: "no-store" })
      .then(setRestauraciones)
      .catch((e) => setErrorMsg(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRestauraciones();
  }, []);

  const handleDeleteRestauracion = (oid: number) => {
    if (!window.confirm(`¿Está seguro de eliminar el registro de restauración #${oid}?`)) {
      return;
    }
    api(`/versions/restauraciones/${oid}`, { method: "DELETE" })
      .then(() => {
        toast.success(`Restauración #${oid} eliminada exitosamente.`);
        fetchRestauraciones();
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Error al eliminar la restauración"));
  };

  const restauracionPagination = useTablePagination(restauraciones);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Consultar Restauración Base Datos"
        subtitle="Listado y consulta de los registros de restauración de base de datos anclados a compilaciones."
      />

      {errorMsg && (
        <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 text-sm">
          <AlertCircle size={18} className="text-amber-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 sticky top-0 bg-white z-20 flex justify-between items-center">
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Historial de Restauraciones de BD</h4>
          <span className="text-xs text-slate-500 font-medium">Total: {restauraciones.length} registros</span>
        </div>
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              {["ID", "Contenedor BD", "Fecha Restauración", "Fecha Última Copia BD", "Compilación Anclada", "Usuario", "Acciones"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {restauracionPagination.rows.map((r) => (
              <tr key={r.oid} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">#{r.oid}</td>
                <td className="px-4 py-3 font-bold text-[#0778ac] whitespace-nowrap">{r.contenedor_bd}</td>
                <td className="px-4 py-3 text-slate-700 font-mono text-xs whitespace-nowrap">{r.fecha_hora_restauracion?.slice(0, 16).replace("T", " ")}</td>
                <td className="px-4 py-3 text-slate-700 font-mono text-xs whitespace-nowrap">{r.fecha_ultima_copia?.slice(0, 16).replace("T", " ")}</td>
                <td className="px-4 py-3 text-slate-900 font-medium min-w-[240px]">{r.compilacion_titulo || "—"}</td>
                <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap min-w-[120px]">{r.usuario || "—"}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Btn v="danger" sm onClick={() => handleDeleteRestauracion(r.oid)}>
                    <Trash2 size={13} /> Eliminar
                  </Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <TablePaginationControls pagination={restauracionPagination} itemLabel="restauraciones" />
        {!loading && restauraciones.length === 0 && <EmptyState message="No hay registros de restauración de base de datos." />}
      </div>
    </div>
  );
}

export default ConsultarRestauracionDBSection;
