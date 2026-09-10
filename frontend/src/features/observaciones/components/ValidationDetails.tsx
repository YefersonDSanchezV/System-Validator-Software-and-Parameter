import { useState } from "react";
import { FileText, Eye } from "lucide-react";
import { Modal, Btn, StatusBadge, Field } from "@/components/ui/custom";
import type { Version } from "@/types/version";
import type { Observacion } from "@/types/observacion";
import { MODULOS, MODULO_LABELS } from "@/config/constants";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePaginationControls } from "@/components/ui/TablePagination";

export function ValidationDetails({
  versions, observaciones,
}: {
  versions: Version[];
  observaciones: Observacion[];
}) {
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [versionSelectorOpen, setVersionSelectorOpen] = useState(false);
  const [moduleDetailModal, setModuleDetailModal] = useState<string | null>(null);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // Derive observations for the selected version from the globally provided prop
  const obsForVersion = selectedVersion
    ? observaciones.filter((o) => o.versionId === selectedVersion.id)
    : [];

  function getStats(modulo: string) {
    const obs = obsForVersion.filter((o) => o.modulo === modulo);
    const total = obs.length;
    const aprobados = obs.filter((o) => o.estado === "aprobacion").length;
    const rechazados = total - aprobados;
    const sorted = [...obs].sort((a, b) => b.fechaHora.localeCompare(a.fechaHora));
    return {
      total,
      pctAp: total > 0 ? Math.round((aprobados / total) * 100) : 0,
      pctRe: total > 0 ? Math.round((rechazados / total) * 100) : 0,
      ultima: sorted[0]?.fechaHora ?? "—",
    };
  }

  const detailObs = moduleDetailModal
    ? obsForVersion.filter((o) => o.modulo === moduleDetailModal)
    : [];
  const moduleRows = MODULOS.map((modulo) => ({ modulo, stats: getStats(modulo) }));
  const modulePagination = useTablePagination(moduleRows);
  const versionSelectorPagination = useTablePagination(versions);

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Consulta de Detalles de Validación</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {selectedVersion
              ? `Versión: ${selectedVersion.titulo}`
              : "Seleccione una versión para consultar los detalles de validación por módulo."}
          </p>
        </div>
        <Btn v="primary" onClick={() => setVersionSelectorOpen(true)}>
          <FileText size={14} /> Seleccionar Versión
        </Btn>
      </div>

      {selectedVersion && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                {["Módulo", "Última Observación", "% Aprobación", "% Rechazo", "Acción"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {modulePagination.rows.map(({ modulo, stats: s }) => (
                  <tr key={modulo} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-2.5 font-semibold text-slate-700 text-xs">{modulo}</td>
                    <td className="px-4 py-2.5 text-slate-500 font-mono text-xs">{s.ultima}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${s.pctAp}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-emerald-700 w-8">{s.pctAp}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#d43a39] rounded-full"
                            style={{ width: `${s.pctRe}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-[#d43a39] w-8">{s.pctRe}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <Btn v="ghost" sm onClick={() => setModuleDetailModal(modulo)}>
                        <Eye size={13} /> Ver detalles
                      </Btn>
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
          </div>
          <TablePaginationControls pagination={modulePagination} itemLabel="modulos" />
        </div>
      )}

      <Modal
        open={versionSelectorOpen}
        onClose={() => setVersionSelectorOpen(false)}
        title="Seleccionar Versión"
        size="lg"
      >
        <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {["Título", "Fecha Compilación", "Estado", "Acción"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {versionSelectorPagination.rows.map((v) => (
              <tr key={v.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{v.titulo}</td>
                <td className="px-4 py-3 text-slate-500 font-mono text-xs">{v.fecha_compilacion || "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge estado={v.estado} />
                </td>
                <td className="px-4 py-3">
                  <Btn
                    v="primary"
                    sm
                    onClick={() => {
                      setSelectedVersion(v);
                      setVersionSelectorOpen(false);
                    }}
                  >
                    Seleccionar
                  </Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <TablePaginationControls pagination={versionSelectorPagination} itemLabel="versiones" />
        </div>
      </Modal>

      <Modal
        open={!!moduleDetailModal}
        onClose={() => setModuleDetailModal(null)}
        title={`Detalles de Validación — ${moduleDetailModal}`}
        size="xl"
      >
        {selectedVersion && moduleDetailModal && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="col-span-2">
                <Field label="Título de la Versión" value={selectedVersion.titulo} />
              </div>
              <div className="col-span-2">
                <Field label="Descripción de la Versión" value={selectedVersion.descripcion} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700">
                  Cola de Observaciones
                </h3>
                <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full font-medium">
                  {detailObs.length} registro(s)
                </span>
              </div>
              {detailObs.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
                  No hay observaciones registradas para este módulo en esta versión.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {detailObs.map((obs, i) => (
                    <div
                      key={obs.id}
                      className={`p-4 rounded-xl border ${
                        obs.estado === "aprobacion"
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-[#d43a39]/20 bg-[#d43a39]/10"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 bg-white border border-slate-200 rounded-full w-5 h-5 flex items-center justify-center">
                            {i + 1}
                          </span>
                          <span className="font-semibold text-sm text-slate-900">{obs.nombre}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge estado={obs.estado} />
                          <span className="text-xs text-slate-500 font-mono">{obs.fechaHora}</span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">{obs.observacion}</p>
                      {obs.estado === "rechazo" && (obs.incidencia || obs.ruta) && (
                        <div className="mt-3 pt-3 border-t border-[#d43a39]/20 grid grid-cols-2 gap-3">
                          {obs.incidencia && <Field label="Incidencia" value={obs.incidencia} />}
                          {obs.ruta && <Field label="Ruta" value={obs.ruta} />}
                        </div>
                      )}
                      {obs.firma && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Firma</span>
                          <img
                            src={obs.firma}
                            alt="firma"
                            className="max-h-14 object-contain cursor-zoom-in hover:opacity-80 transition-opacity"
                            onClick={() => setLightboxImg(obs.firma!)}
                          />
                        </div>
                      )}
                      {obs.captura && obs.captura.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">Captura de la Incidencia</span>
                          <div className="flex flex-wrap gap-2">
                            {obs.captura.map((src, i) => (
                              <img
                                key={i}
                                src={src}
                                alt={`captura-${i}`}
                                className="h-16 w-24 object-cover rounded-lg border border-slate-200 cursor-zoom-in hover:opacity-80 transition-opacity"
                                onClick={() => setLightboxImg(src)}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
      {lightboxImg && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center cursor-zoom-out"
          onClick={() => setLightboxImg(null)}
        >
          <img src={lightboxImg} alt="preview" className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl" />
        </div>
      )}
    </div>
  );
}

export default ValidationDetails;
