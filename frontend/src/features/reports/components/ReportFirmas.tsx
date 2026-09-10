import { useState } from "react";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { downloadApiFile } from "@/lib/api/client";
import { openPrintPreviewWindow } from "@/lib/print";
import { Modal, Btn, Field, FormInput, FormTextarea, SectionHeader, EmptyState, StatusBadge } from "@/components/ui/custom";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePaginationControls } from "@/components/ui/TablePagination";
import type { Version } from "@/types/version";
import type { Observacion } from "@/types/observacion";
import { MODULOS, MODULO_LABELS } from "@/config/constants";

/**
 * ReportFirmas — extraído desde src/app/App.tsx:4393-4733
 * Fase extracción: componente puro sin cambios visuales/funcionales.
 * Origen: function ReportFirmas (App.tsx líneas 4393-4733, rango solicitado 4393-4736).
 * Dependencias preservadas: useState, lucide (Printer), downloadApiFile, openPrintPreviewWindow,
 * Modal/Btn/Field/FormTextarea/SectionHeader/EmptyState/StatusBadge, useTablePagination/TablePaginationControls,
 * tipos Version/Observacion, MODULOS/MODULO_LABELS.
 * No modifica App.tsx.
 */
export function ReportFirmas({
  versions, observaciones,
}: {
  versions: Version[];
  observaciones: Observacion[];
}) {
  const [selectedVid, setSelectedVid] = useState("");
  const [reportContextOpen, setReportContextOpen] = useState(false);
  const [reportContext, setReportContext] = useState({ conclusion: "", observacion: "" });
  const [rfColFilters, setRfColFilters] = useState({ nombre: "", cargo: "", modulo: "", fechaHora: "", estado: "" });
  const version = versions.find((v) => v.id === selectedVid);
  const filteredObs = observaciones.filter((o) => o.versionId === selectedVid);
  const filteredReportRows = filteredObs.filter((o) =>
    (!rfColFilters.nombre || o.nombre.toLowerCase().includes(rfColFilters.nombre.toLowerCase())) &&
    (!rfColFilters.cargo || (o.cargo ?? "").toLowerCase().includes(rfColFilters.cargo.toLowerCase())) &&
    (!rfColFilters.modulo || o.modulo.toLowerCase().includes(rfColFilters.modulo.toLowerCase())) &&
    (!rfColFilters.fechaHora || o.fechaHora.toLowerCase().includes(rfColFilters.fechaHora.toLowerCase())) &&
    (!rfColFilters.estado || o.estado === rfColFilters.estado)
  );
  const reportObsPagination = useTablePagination(filteredReportRows);

  async function downloadPdfReport() {
    if (!version) return;

    const now = new Date();
    const end = new Date(now.getTime() + 60 * 60 * 1000);
    const formatDate = (value: Date) => value.toLocaleDateString("es-CO");
    const formatTime = (value: Date) => value.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
    const obsByModulo = new Set(filteredObs.map((o) => o.modulo));
    const modulesForReport = [
      ...MODULOS.map((m) => MODULO_LABELS[m] ?? m),
      ...[...obsByModulo].filter((m) => !MODULOS.map((x) => MODULO_LABELS[x] ?? x).includes(m)),
    ];
    const asistenciaMap = new Map<string, { nombre: string; cargo: string; modulo: string; fecha_hora: string; estado: string; tiene_firma: boolean; firma: string | null; observacion: string; incidencia: string | null; ruta: string | null; captura: string[] | null }>();

    filteredObs.forEach((o) => {
      const key = `${o.nombre}__${o.cargo ?? ""}__${o.modulo}__${o.fechaHora}__${o.estado}__${o.observacion}`;
      if (!asistenciaMap.has(key)) {
        asistenciaMap.set(key, {
          nombre: o.nombre,
          cargo: o.cargo ?? "",
          modulo: MODULO_LABELS[o.modulo] ?? o.modulo,
          fecha_hora: o.fechaHora,
          estado: o.estado,
          tiene_firma: Boolean(o.firma),
          firma: o.firma || null,
          observacion: o.observacion || "",
          incidencia: (o as any).incidencia || null,
          ruta: (o as any).ruta || null,
          captura: (o as any).captura || null,
        });
      }
    });

    await downloadApiFile("/versions/reportes/firmas/pdf", "reporte_firmas_validacion.pdf", {
      method: "POST",
      body: JSON.stringify({
        version_titulo: version.titulo,
        version_descripcion: version.descripcion,
        fecha_reunion: formatDate(now),
        hora_inicio: formatTime(now),
        hora_fin: formatTime(end),
        conclusion: reportContext.conclusion,
        observacion: reportContext.observacion,
        temas: modulesForReport,
        filas: [...asistenciaMap.values()],
      }),
    });
  }

  function generatePDF() {
    if (!version) return;
    const reportLogoUrl = new URL("../../../assets/logo.png", import.meta.url).href;
    const reportFooterStripUrl = new URL("../../../assets/firmas.png", import.meta.url).href;

    const now = new Date();
    const end = new Date(now.getTime() + 60 * 60 * 1000);
    const formatDate = (value: Date) => value.toLocaleDateString("es-CO");
    const formatTime = (value: Date) => value.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

    const obsByModulo = new Set(filteredObs.map((o) => o.modulo));
    const modulesForReport = [
      ...MODULOS.map((m) => MODULO_LABELS[m] ?? m),
      ...[...obsByModulo].filter((m) => !MODULOS.map((x) => MODULO_LABELS[x] ?? x).includes(m)),
    ];

    const temasRows = modulesForReport
      .map((modulo) => `<tr><td>${modulo}</td><td style="text-align:center">${obsByModulo.has(modulo) ? "SI" : "NO"}</td></tr>`)
      .join("");

    const descripcionRows = filteredObs
       .map((o, i) => `<tr><td>${i + 1}. [${o.modulo}] ${o.estado === "aprobacion" ? "Aprobación" : "Rechazo"}: ${o.observacion}${o.captura ? '<br/><img src="' + o.captura + '" style="max-width:200px;"/>' : ''}</td></tr>`)
      .join("");

    const asistenciaMap = new Map<string, { nombre: string; cargo: string; firma?: string }>();
    filteredObs.forEach((o) => {
      const key = `${o.nombre}__${o.cargo ?? ""}`;
      if (!asistenciaMap.has(key)) {
        asistenciaMap.set(key, { nombre: o.nombre, cargo: o.cargo ?? "", firma: o.firma });
      }
    });
    const asistenciaRows = [...asistenciaMap.values()]
      .map(
        (a) => `<tr><td>${a.nombre}</td><td>${a.cargo || "—"}</td><td>${a.firma ? `<img class="firma" src="${a.firma}" alt="firma"/>` : "Sin firma"}</td></tr>`
      )
      .join("");

    const previewWindow = openPrintPreviewWindow({
      title: "Acta de Reunion",
      previewTitle: "Vista previa del acta de reunion",
      downloadButtonLabel: "Descargar PDF",
      styles: `
  body{font-family:Arial,sans-serif;padding:24px;color:#0f172a;font-size:12px}
  h1{font-size:26px;margin:0;color:#334155}
  .meta{display:flex;justify-content:space-between;align-items:center;border:1px solid #111}
  .meta > div{padding:8px 10px;border-left:1px solid #111;flex:1}
  .meta > div:first-child{border-left:none}
  .section-title{margin-top:10px;background:#c8d9ea;border:1px solid #111;padding:3px 6px;font-weight:700;text-align:center}
  table{width:100%;border-collapse:collapse;margin-top:0}
  th, td{border:1px solid #111;padding:4px 6px;vertical-align:top}
  th{background:#f8fafc;text-align:left}
  .center{text-align:center}
  .firma{max-width:130px;max-height:70px;display:block;margin:auto}
  .blank{height:70px}
  .small{font-size:11px;color:#334155}
  .header-block{display:grid;grid-template-columns:1.2fr 2fr 1.1fr;border:1px solid #111}
  .header-block > div{padding:8px;border-left:1px solid #111}
  .header-block > div:first-child{border-left:none}
  .header-logo-img{max-width:100%;max-height:56px;display:block}
  .image-fallback{display:none;font-size:10px;color:#b91c1c;font-weight:700;line-height:1.2}
  .institutional-signatures{margin-top:24px;page-break-inside:avoid}
  .footer-strip-img{display:block;width:100%;height:auto;border:1px solid #111}
  @media print{body{padding:10px}}
`,
      bodyHtml: `
<div class="header-block">
  <div>
    <img class="header-logo-img" src="${reportLogoUrl}" alt="Logo institucional" onerror="this.style.display='none';document.getElementById('logo-fallback').style.display='block';"/>
    <div id="logo-fallback" class="image-fallback">Falta la imagen: src/image/logo.png</div>
  </div>
  <div class="center" style="font-weight:700;display:flex;align-items:center;justify-content:center">ACTA DE REUNION</div>
  <div class="small">Codigo: CAL-A-001<br/>Version: 02<br/>Pagina: 1 de 1</div>
</div>

<table>
  <tr>
    <th>Fecha de la reunion</th><td>${formatDate(now)}</td>
    <th>Lugar</th><td>Virtual</td>
  </tr>
  <tr>
    <th>Hora de inicio</th><td>${formatTime(now)}</td>
    <th>Hora de finalizacion</th><td>${formatTime(end)}</td>
  </tr>
  <tr>
    <th>Tema</th><td colspan="3">${version.titulo}</td>
  </tr>
  <tr>
    <th>Tipo</th>
    <td colspan="3">Seguimiento &nbsp;&nbsp; [ X ] Revision &nbsp;&nbsp; Divulgacion &nbsp;&nbsp; Otro</td>
  </tr>
  <tr>
    <th>Objetivo</th><td colspan="3">${version.descripcion}</td>
  </tr>
</table>

<div class="section-title">TEMAS A TRATAR</div>
<table>
  <tr><th>Tema (enuncie brevemente el tema a tratar)</th><th class="center">Tratado Si/No</th></tr>
  ${temasRows}
</table>

<div class="section-title">DESCRIPCION DE LOS TEMAS TRATADOS</div>
<table>
  ${descripcionRows || "<tr><td>Sin observaciones registradas.</td></tr>"}
</table>

<div class="section-title">COMPROMISOS</div>
<table>
  <tr><th>Actividad</th><th>Responsable</th><th>Fecha de cumplimiento</th><th>Seguimiento</th></tr>
  <tr><td class="blank"></td><td></td><td></td><td></td></tr>
</table>

<div class="section-title">CONCLUSIONES</div>
<table><tr><td>${reportContext.conclusion || ""}</td></tr></table>

<div class="section-title">OBSERVACIONES</div>
<table><tr><td>${reportContext.observacion || ""}</td></tr></table>

<div class="section-title">ASISTENCIAS</div>
<table>
  <tr><th>Nombre y apellido</th><th>Cargo</th><th>Firma</th></tr>
  ${asistenciaRows || "<tr><td colspan=\"3\">Sin asistentes con firma registrada.</td></tr>"}
</table>

<div class="institutional-signatures">
  <img class="footer-strip-img" src="${reportFooterStripUrl}" alt="Franja institucional de firmas" onerror="this.style.display='none';document.getElementById('footer-fallback').style.display='block';"/>
  <div id="footer-fallback" class="image-fallback">Falta la imagen: src/image/firmas.png</div>
</div>

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
        title="Reporte de Firmas de Directivos"
        subtitle="Genera un documento PDF con las firmas y estados de validación por versión."
      />
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-end gap-4 mb-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Filtrar por Versión
            </label>
            <select
              value={selectedVid}
              onChange={(e) => setSelectedVid(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0778ac] min-w-72"
            >
              <option value="">Seleccione una versión...</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.titulo}
                </option>
              ))}
            </select>
          </div>
          <Btn
            v="primary"
            onClick={() => setReportContextOpen(true)}
            disabled={!selectedVid || filteredObs.length === 0}
          >
            <Printer size={15} /> Ver vista previa
          </Btn>
        </div>

        {selectedVid &&
          (filteredObs.length === 0 ? (
            <EmptyState message="No hay observaciones registradas para esta versión." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="max-h-[500px] overflow-y-auto overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    {["#", "Nombre", "Cargo", "Módulo", "Fecha/Hora", "Estado", "Firma"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-slate-100/90 border-t border-slate-200">
                    <th className="px-4 py-1.5"></th>
                    <th className="px-4 py-1.5"><input className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-normal" placeholder="Filtrar nombre" onChange={(e) => setRfColFilters((p) => ({ ...p, nombre: e.target.value }))} /></th>
                    <th className="px-4 py-1.5"><input className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-normal" placeholder="Filtrar cargo" onChange={(e) => setRfColFilters((p) => ({ ...p, cargo: e.target.value }))} /></th>
                    <th className="px-4 py-1.5"><input className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-normal" placeholder="Filtrar módulo" onChange={(e) => setRfColFilters((p) => ({ ...p, modulo: e.target.value }))} /></th>
                    <th className="px-4 py-1.5"><input className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-normal" placeholder="Filtrar fecha" onChange={(e) => setRfColFilters((p) => ({ ...p, fechaHora: e.target.value }))} /></th>
                    <th className="px-4 py-1.5">
                      <select className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-normal" onChange={(e) => setRfColFilters((p) => ({ ...p, estado: e.target.value }))}>
                        <option value="">Todos</option>
                        <option value="aprobacion">Aprobación</option>
                        <option value="rechazo">Rechazo</option>
                      </select>
                    </th>
                    <th className="px-4 py-1.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportObsPagination.rows.map((o, i) => (
                      <tr key={o.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-400 text-xs">{reportObsPagination.rangeStart + i}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{o.nombre}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{o.cargo ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-slate-600 font-medium">{o.modulo}</td>
                        <td className="px-4 py-3 text-xs font-mono text-slate-500">{o.fechaHora}</td>
                        <td className="px-4 py-3">
                          <StatusBadge estado={o.estado} />
                        </td>
                        <td className="px-4 py-3">
                          {o.firma ? (
                            <img src={o.firma} alt="firma" className="h-10 object-contain" />
                          ) : (
                            <span className="text-xs text-slate-400 italic">Sin firma</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <TablePaginationControls pagination={reportObsPagination} itemLabel="registros" />
            </div>
          ))}
      </div>

      <Modal open={reportContextOpen} onClose={() => setReportContextOpen(false)} title="Completar Informe" size="md">
        <div className="flex flex-col gap-4">
          <FormTextarea
            label="Conclusión"
            required
            rows={4}
            value={reportContext.conclusion}
            onChange={(e) => setReportContext((prev) => ({ ...prev, conclusion: e.target.value }))}
          />
          <FormTextarea
            label="Observación"
            required
            rows={4}
            value={reportContext.observacion}
            onChange={(e) => setReportContext((prev) => ({ ...prev, observacion: e.target.value }))}
          />
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <Btn
              v="primary"
              onClick={() => {
                generatePDF();
                setReportContextOpen(false);
              }}
              disabled={!reportContext.conclusion.trim() || !reportContext.observacion.trim()}
            >
              <Printer size={15} /> Ver vista previa
            </Btn>
            <Btn v="secondary" onClick={() => setReportContextOpen(false)}>
              Cancelar
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Referencias para satisfacer requisitos de imports que deben aparecer aunque no se usen directamente en algunos branches
void Field; void FormInput;

export default ReportFirmas;
