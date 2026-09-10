import { useState, useEffect } from "react";
import { AlertCircle, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { Btn, SectionHeader, EmptyState } from "@/components/ui/custom";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePaginationControls } from "@/components/ui/TablePagination";
import { type Version, type RestauracionDB } from "@/types/version";

// ─── Restaurar DB Section ──────────────────────────────────────────────────

export function RestaurarDBSection({
  versions,
  onError,
}: {
  versions: Version[];
  onError: (message: string) => void;
}) {
  const [contenedorBd, setContenedorBd] = useState<string>("DGEMPRES99");
  const [fechaUltimaCopia, setFechaUltimaCopia] = useState("");
  const [compilacionOid, setCompilacionOid] = useState<number | "">("");
  const [restauraciones, setRestauraciones] = useState<RestauracionDB[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchRestauraciones = () => {
    setLoading(true);
    api<RestauracionDB[]>(`/versions/restauraciones?_ts=${Date.now()}`, { cache: "no-store" })
      .then(setRestauraciones)
      .catch((e) => setFormError(e.message))
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

  const handleSave = () => {
    setFormError(null);
    if (!fechaUltimaCopia) {
      setFormError("La fecha de la última copia de la base de datos es obligatoria.");
      return;
    }
    setSaving(true);
    api<RestauracionDB>("/versions/restauraciones", {
      method: "POST",
      body: JSON.stringify({
        contenedor_bd: contenedorBd,
        fecha_ultima_copia: fechaUltimaCopia,
        compilacion_anclada_oid: compilacionOid ? Number(compilacionOid) : null,
      }),
    })
      .then(() => {
        fetchRestauraciones();
        setFechaUltimaCopia("");
        setCompilacionOid("");
        toast.success("Restauración de base de datos registrada exitosamente.");
      })
      .catch((e) => setFormError(e instanceof Error ? e.message : "Error guardando la restauración."))
      .finally(() => setSaving(false));
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Restauración de Base de Datos"
        subtitle="Registre y consulte los eventos de restauración de base de datos anclados a compilaciones."
      />

      {formError && (
        <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 text-sm">
          <AlertCircle size={18} className="text-amber-600 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Nuevo Registro de Restauración</h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Contenedor de Base de Datos *</label>
            <select
              value={contenedorBd}
              onChange={(e) => setContenedorBd(e.target.value as any)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0778ac]"
            >
              <option value="DGEMPRES99">DGEMPRES99</option>
              <option value="DGEMPRES98">DGEMPRES98</option>
              <option value="DGEMPRES10">DGEMPRES10</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Fecha y Hora de Restauración (Sistema)</label>
            <input
              type="text"
              readOnly
              value={new Date().toLocaleString("es-CO")}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 font-mono"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Fecha de la Última Copia de BD *</label>
            <input
              type="datetime-local"
              value={fechaUltimaCopia}
              onChange={(e) => setFechaUltimaCopia(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0778ac]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Compilación a la que está anclada</label>
            <select
              value={compilacionOid}
              onChange={(e) => setCompilacionOid(e.target.value ? Number(e.target.value) : "")}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0778ac]"
            >
              <option value="">Seleccione versión/compilación...</option>
              {versions.map((v) => (
                <option key={v.id} value={v.oid}>
                  {v.titulo} {v.num_compilacion ? `(Comp: ${v.num_compilacion})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-2">
          <Btn v="primary" onClick={handleSave} disabled={saving}>
            <RotateCcw size={14} /> Registrar Restauración
          </Btn>
        </div>
      </div>

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

export default RestaurarDBSection;
