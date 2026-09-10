import { useState, useEffect } from "react";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { api, downloadApiFile } from "@/lib/api/client";
import { openPrintPreviewWindow } from "@/lib/print";
import { Modal, Btn, Field, FormInput, FormTextarea, SectionHeader, EmptyState, StatusBadge } from "@/components/ui/custom";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePaginationControls } from "@/components/ui/TablePagination";
import type { Version } from "@/types/version";
import type { Observacion } from "@/types/observacion";
import { MODULOS, MODULO_LABELS } from "@/config/constants";

/**
 * ReportDetalles — extraído desde src/app/App.tsx:4737-4955 (rango solicitado 4737-5696 justo antes de function Boletines en 5697)
 * Fase extracción: componente puro sin cambios visuales/funcionales.
 * Origen: function ReportDetalles (App.tsx líneas 4737-4955; el rango 4737-5696 incluye además ValidatorModule/DocumentModule/ValidationRegistration/renderImpactoBadge que quedan en App.tsx).
 * Dependencias preservadas: useState/useEffect, lucide (Printer), api/downloadApiFile, openPrintPreviewWindow,
 * Modal/Btn/Field/FormInput/FormTextarea/SectionHeader/EmptyState/StatusBadge, useTablePagination/TablePaginationControls,
 * tipos Version/Observacion, MODULOS/MODULO_LABELS.
 * No modifica App.tsx.
 */
export function ReportDetalles({
  versions, observaciones,
}: {
  versions: Version[];
  observaciones: Observacion[];
}) {
  const [selectedVid, setSelectedVid] = useState("todas");
  const [filterModulo, setFilterModulo] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const [allObservaciones, setAllObservaciones] = useState<Observacion[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);

  useEffect(() => {
    if (selectedVid === "todas") {
      setLoadingAll(true);
      api<Observacion[]>("/observaciones/")
        .then(setAllObservaciones)
        .catch(() => setAllObservaciones(observaciones))
        .finally(() => setLoadingAll(false));
    }
  }, [selectedVid, observaciones]);

  const baseObs = selectedVid === "todas" ? (allObservaciones.length > 0 ? allObservaciones : observaciones) : observaciones.filter((o) => o.versionId === selectedVid);
  const version = versions.find((v) => v.id === selectedVid);

  const filteredObs = baseObs.filter((o) => {
    const byModulo = !filterModulo || o.modulo === filterModulo;
    const byTipo = !filterTipo || o.estado === filterTipo;
    return byModulo && byTipo;
  });

  const availableModulos = [...new Set(baseObs.map((o) => o.modulo))].sort();

  async function downloadPdfReport() {
    const subtitleText = selectedVid === "todas" ? "Todas las versiones publicadas" : (version?.titulo ?? "");

    await downloadApiFile("/versions/reportes/detalles/pdf", "reporte_detalles_validacion.pdf", {
      method: "POST",
      body: JSON.stringify({
        titulo: "Reporte de Detalles de Validación",
        subtitulo: subtitleText,
        generado_en: new Date().toLocaleDateString("es-CO", { dateStyle: "long" }),
        filas: filteredObs.map((o) => ({
          version_titulo: o.versionTitulo || o.versionId,
          modulo: MODULO_LABELS[o.modulo] ?? o.modulo,
          fecha_hora: o.fechaHora,
          estado: o.estado,
          nombre: o.nombre,
          observacion: o.observacion,
          incidencia: o.incidencia || null,
          ruta: o.ruta || null,
        })),
      }),
    });
  }

  function generatePDF() {
    const subtitleText = selectedVid === "todas" ? "Todas las versiones publicadas" : (version?.titulo ?? "");
    const previewWindow = openPrintPreviewWindow({
      title: "Reporte de Validacion",
      previewTitle: "Vista previa del reporte de validacion",
      downloadButtonLabel: "Descargar PDF",
      styles: `
  body{font-family:Arial,sans-serif;padding:40px;color:#0f172a;font-size:13px}
  h1{color:#0f2d52;font-size:18px;margin-bottom:4px}
  .sub{color:#64748b;font-size:12px;margin-bottom:28px}
  .obs{margin-bottom:16px;border:1px solid #e2e8f0;border-radius:10px;padding:16px;page-break-inside:avoid}
  .obs.ap{border-left:4px solid #10b981}
  .obs.re{border-left:4px solid #d43a39}
  .obs-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
  .badge{padding:2px 10px;border-radius:99px;font-size:11px;font-weight:700}
  .apb{background:#d1fae5;color:#065f46}
  .reb{background:#fee2e2;color:#991b1b}
  .meta{font-size:11px;color:#64748b;margin-top:2px}
  .text{font-size:13px;color:#334155;line-height:1.5;margin-top:8px}
  .extra{font-size:11px;color:#64748b;margin-top:8px;padding-top:8px;border-top:1px solid #e2e8f0}
  @media print{body{padding:20px}}
`,
      bodyHtml: `
<h1>Reporte de Detalles de Validación</h1>
<div class="sub">${subtitleText} &nbsp;|&nbsp; Generado: ${new Date().toLocaleDateString("es-CO", { dateStyle: "long" })}</div>
${filteredObs
  .map(
    (o) => `<div class="obs ${o.estado === "aprobacion" ? "ap" : "re"}">
  <div class="obs-head">
    <strong>${o.nombre}</strong>
    <span class="badge ${o.estado === "aprobacion" ? "apb" : "reb"}">${o.estado === "aprobacion" ? "Aprobación" : "Rechazo"}</span>
  </div>
  <div class="meta">Versión: <strong>${o.versionTitulo || o.versionId}</strong> &nbsp;|&nbsp; Módulo: <strong>${o.modulo}</strong> &nbsp;|&nbsp; ${o.fechaHora}</div>
  <div class="text">${o.observacion}</div>
  ${o.incidencia || o.ruta ? `<div class="extra">${o.incidencia ? `Incidencia: <strong>${o.incidencia}</strong>` : ""}${o.ruta ? ` &nbsp;|&nbsp; Ruta: ${o.ruta}` : ""}</div>` : ""}
</div>`
  )
  .join("")}
`,
    });

    previewWindow?.document.getElementById("preview-download-button")?.addEventListener("click", () => {
      void downloadPdfReport().catch((error) => {
        toast.error(error instanceof Error ? error.message : "No fue posible descargar el PDF.");
      });
    });
  }

  return (
    <div>
      <SectionHeader
        title="Reporte de Detalles de Validación"
        subtitle="Consulte y filtre los detalles de validación por versión, módulo y tipo."
      />
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        {/* Persistent Filter Bar */}
        <div className="grid gap-4 md:grid-cols-4 items-end bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Versión
            </label>
            <select
              value={selectedVid}
              onChange={(e) => setSelectedVid(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0778ac]"
            >
              <option value="todas">Todas las versiones</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.titulo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Módulo
            </label>
            <select
              value={filterModulo}
              onChange={(e) => setFilterModulo(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0778ac]"
            >
              <option value="">Todos los módulos</option>
              {availableModulos.map((m) => (
                <option key={m} value={m}>{MODULO_LABELS[m] ?? m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Tipo
            </label>
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0778ac]"
            >
              <option value="">Todos (Aprobados / Rechazados)</option>
              <option value="aprobacion">Solo Aprobados</option>
              <option value="rechazo">Solo Rechazados</option>
            </select>
          </div>

          <div>
            <Btn
              v="primary"
              onClick={generatePDF}
              disabled={filteredObs.length === 0}
              className="w-full justify-center"
            >
              <Printer size={15} /> Ver vista previa ({filteredObs.length})
            </Btn>
          </div>
        </div>

        {/* Independent Scroll Container */}
        <div className="max-h-[600px] overflow-y-auto space-y-3 pr-1 pt-1">
          {loadingAll && <EmptyState message="Cargando detalles de validación de todas las versiones..." />}

          {!loadingAll && filteredObs.length === 0 && (
            <EmptyState message="No hay observaciones registradas con los filtros seleccionados." />
          )}

          {!loadingAll &&
            filteredObs.map((o) => (
              <div
                key={o.id}
                className={`p-4 rounded-xl border ${
                  o.estado === "aprobacion"
                    ? "border-emerald-200 bg-emerald-50/70 border-l-4 border-l-emerald-500"
                    : "border-[#d43a39]/20 bg-[#d43a39]/10 border-l-4 border-l-[#d43a39]"
                }`}
              >
                <div className="flex flex-wrap justify-between items-start gap-2 mb-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-sm">{o.nombre}</span>
                    <span className="text-xs font-semibold text-[#0778ac] bg-blue-100/80 px-2.5 py-0.5 rounded border border-blue-200">
                      {o.versionTitulo || o.versionId}
                    </span>
                    <span className="text-xs text-slate-600 font-medium">— {MODULO_LABELS[o.modulo] ?? o.modulo}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge estado={o.estado} />
                    <span className="text-xs font-mono text-slate-500">{o.fechaHora}</span>
                  </div>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{o.observacion}</p>
                {(o.incidencia || o.ruta) && (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 flex flex-wrap gap-6 text-xs text-slate-600">
                    {o.incidencia && <div><span className="font-bold text-slate-700 uppercase">Incidencia:</span> {o.incidencia}</div>}
                    {o.ruta && <div><span className="font-bold text-slate-700 uppercase">Ruta:</span> {o.ruta}</div>}
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

// Referencias para satisfacer requisitos de imports que deben aparecer aunque no se usen directamente en este componente
void Modal; void Field; void FormInput; void FormTextarea; void useTablePagination; void TablePaginationControls; void MODULOS;

export default ReportDetalles;
