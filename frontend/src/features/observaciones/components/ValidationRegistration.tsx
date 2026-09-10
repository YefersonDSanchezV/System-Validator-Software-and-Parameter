import { useState, useRef } from "react";
import type React from "react";
import { CheckCircle, XCircle, ExternalLink, Eye, Plus, AlertCircle, Upload } from "lucide-react";
import { api } from "@/lib/api/client";
import { Modal, StatusBadge, Btn, Field, FormInput, FormTextarea, SectionHeader } from "@/components/ui/custom";
import type { Version } from "@/types/version";
import type { Observacion } from "@/types/observacion";
import { MODULOS_VALIDATOR } from "@/config/constants";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePaginationControls } from "@/components/ui/TablePagination";

export function ValidationRegistration({
  versions, observaciones, setObservaciones, onError,
}: {
  versions: Version[];
  observaciones: Observacion[];
  setObservaciones: React.Dispatch<React.SetStateAction<Observacion[]>>;
  onError: (message: string) => void;
}) {
  const [detailsVersion, setDetailsVersion] = useState<Version | null>(null);
  const [consultVersion, setConsultVersion] = useState<Version | null>(null);
  const [detailForm, setDetailForm] = useState({ modulo: "", otrosText: "" });
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [rejectionOpen, setRejectionOpen] = useState(false);
  const [apForm, setApForm] = useState({ observacion: "", nombre: "", cargo: "", firma: "" });
  const [reForm, setReForm] = useState({ incidencia: "", ruta: "", observacion: "", nombre: "", cargo: "", firma: "", captura: [] as string[] });
  const [vrColFilters, setVrColFilters] = useState({ titulo: "", fecha: "", estado: "", contenedor: "" });
  const firmaApRef = useRef<HTMLInputElement>(null);
  const firmaReRef = useRef<HTMLInputElement>(null);
  const capturaReRef = useRef<HTMLInputElement>(null);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  function openDetails(v: Version) {
    setDetailForm({ modulo: "", otrosText: "" });
    setDetailsVersion(v);
  }

  const resolvedModulo =
    detailForm.modulo === "OTROS" ? detailForm.otrosText : detailForm.modulo;
  const moduloValid =
    !!detailForm.modulo && (detailForm.modulo !== "OTROS" || !!detailForm.otrosText.trim());

  function handleFirma(e: React.ChangeEvent<HTMLInputElement>, type: "ap" | "re") {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const res = ev.target?.result as string;
      if (type === "ap") setApForm((f) => ({ ...f, firma: res }));
      else setReForm((f) => ({ ...f, firma: res }));
    };
    reader.readAsDataURL(file);
  }

  function handleCaptura(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const res = ev.target?.result as string;
        setReForm((f) => ({ ...f, captura: [...f.captura, res] }));
      };
      reader.readAsDataURL(file);
    });
    // Reset input so same file can be re-added
    e.target.value = "";
  }

  async function submitApproval() {
    if (!detailsVersion || !apForm.observacion.trim() || !apForm.nombre.trim() || !apForm.cargo.trim()) return;
    try {
      const created = await api<Observacion>("/observaciones/", {
        method: "POST",
        body: JSON.stringify({ version_id: Number(detailsVersion.id.slice(1)), modulo: resolvedModulo, estado: "aprobacion", ...apForm }),
      });
      setObservaciones((prev) => [created, ...prev]);
      setApprovalOpen(false);
      setApForm({ observacion: "", nombre: "", cargo: "", firma: "" });
      setDetailsVersion(null);
    } catch (error) {
      onError(error instanceof Error ? error.message : "No fue posible registrar la aprobación.");
    }
  }

  async function submitRejection() {
    if (!detailsVersion || !reForm.observacion.trim() || !reForm.nombre.trim() || !reForm.cargo.trim()) return;
    try {
      const created = await api<Observacion>("/observaciones/", {
        method: "POST",
        body: JSON.stringify({ version_id: Number(detailsVersion.id.slice(1)), modulo: resolvedModulo, estado: "rechazo", ...reForm }),
      });
      setObservaciones((prev) => [created, ...prev]);
      setRejectionOpen(false);
      setReForm({ incidencia: "", ruta: "", observacion: "", nombre: "", cargo: "", firma: "", captura: [] as string[] });
      setDetailsVersion(null);
    } catch (error) {
      onError(error instanceof Error ? error.message : "No fue posible registrar el rechazo.");
    }
  }

  const obsCountForVersion = (vid: string) =>
    observaciones.filter((o) => o.versionId === vid).length;
  const filteredValidationVersions = versions.filter((v) => {
    const validationDate = (v.fecha_compilacion || v.fechaRegistro || "").toLowerCase();
    return (
      (!vrColFilters.titulo || v.titulo.toLowerCase().includes(vrColFilters.titulo.toLowerCase())) &&
      (!vrColFilters.fecha || validationDate.includes(vrColFilters.fecha.toLowerCase())) &&
      (!vrColFilters.contenedor || (v.contenedor_bd || "").toLowerCase().includes(vrColFilters.contenedor.toLowerCase())) &&
      (!vrColFilters.estado || v.estado === vrColFilters.estado)
    );
  });
  const validationPagination = useTablePagination(filteredValidationVersions);

  const produccionVersion = versions.find((v) => v.es_produccion) || versions.find((v) => v.titulo.includes("21 AGOSTO 2026"));
  const produccionTitle = produccionVersion ? produccionVersion.titulo : "VERSION DEL 21 AGOSTO 2026 NET Y WEB - 81709";

  return (
    <div>
      <SectionHeader
        title="Registro de Validación del Sistema"
        subtitle="Versiones disponibles para validación. Registre sus observaciones, aprobaciones o rechazos."
      />

      {/* Banner Informativo Versión en Producción */}
      <div className="mb-4 bg-emerald-50 border border-emerald-300 rounded-2xl p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-xs sm:text-sm font-bold text-emerald-950">
            {produccionTitle} se encuentra en producción
          </span>
        </div>
        <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
          En Producción
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              {["Título Versión", "Contenedor BD", "Fecha Compilación", "Estado", "Enlace", "Obs.", "Acciones"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
            <tr className="bg-slate-100/90 border-t border-slate-200">
              <th className="px-4 py-1.5"><input className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-normal" placeholder="Filtrar título" onChange={(e) => setVrColFilters((p) => ({ ...p, titulo: e.target.value }))} /></th>
              <th className="px-4 py-1.5"><input className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-normal" placeholder="Filtrar contenedor" onChange={(e) => setVrColFilters((p) => ({ ...p, contenedor: e.target.value }))} /></th>
              <th className="px-4 py-1.5"><input className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-normal" placeholder="Filtrar fecha" onChange={(e) => setVrColFilters((p) => ({ ...p, fecha: e.target.value }))} /></th>
              <th className="px-4 py-1.5">
                <select className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-normal" onChange={(e) => setVrColFilters((p) => ({ ...p, estado: e.target.value }))}>
                  <option value="">Todos</option>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                  <option value="publicado">Publicado</option>
                </select>
              </th>
              <th className="px-4 py-1.5"></th>
              <th className="px-4 py-1.5"></th>
              <th className="px-4 py-1.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {validationPagination.rows.map((v) => (
              <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-900 max-w-xs">{v.titulo}</td>
                <td className="px-4 py-3 font-bold text-[#0778ac] text-xs">{v.contenedor_bd || "—"}</td>
                <td className="px-4 py-3 text-slate-500 font-mono text-xs">{v.fecha_compilacion || "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge estado={v.estado} />
                </td>
                <td className="px-4 py-3">
                  {v.estado === "activo" ? (
                    <a
                      href={v.enlace}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[#0778ac] hover:text-[#055f82] text-xs font-medium"
                    >
                      <ExternalLink size={11} /> Ver enlace
                    </a>
                  ) : (
                    <span className="text-slate-400 text-xs flex items-center gap-1">
                      <XCircle size={11} /> Bloqueado
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                    {obsCountForVersion(v.id)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Btn v="ghost" sm onClick={() => setConsultVersion(v)}>
                      <Eye size={13} /> Consultar
                    </Btn>
                    <Btn
                      v="primary"
                      sm
                      onClick={() => openDetails(v)}
                      disabled={v.estado !== "activo"}
                    >
                      <Plus size={13} /> Registrar Obs.
                    </Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <TablePaginationControls pagination={validationPagination} itemLabel="versiones" />
      </div>

      {/* Consult version modal */}
      <Modal
        open={!!consultVersion}
        onClose={() => setConsultVersion(null)}
        title="Detalles de la Versión y Observaciones"
        size="lg"
      >
        {consultVersion && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="col-span-2">
                <Field label="Título de la Versión" value={consultVersion.titulo} />
              </div>
              <Field label="Fecha de Registro" value={consultVersion.fechaRegistro} />
              <Field label="Estado" value={consultVersion.estado} />
              <div className="col-span-2">
                <Field label="Descripción de la Compilación" value={consultVersion.descripcion} />
              </div>
              <div className="col-span-2 flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Enlace URL
                </span>
                <a
                  href={consultVersion.enlace}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-[#0778ac] hover:underline flex items-center gap-1"
                >
                  <ExternalLink size={13} /> {consultVersion.enlace}
                </a>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700">
                  Cola de Observaciones
                </h3>
                <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full font-medium">
                  {observaciones.filter((o) => o.versionId === consultVersion.id).length} registro(s)
                </span>
              </div>
              {observaciones.filter((o) => o.versionId === consultVersion.id).length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
                  No hay observaciones registradas para esta versión.
                </div>
              ) : (
                <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                  {observaciones
                    .filter((o) => o.versionId === consultVersion.id)
                    .map((obs) => (
                      <div
                        key={obs.id}
                        className={`p-4 rounded-xl border ${
                          obs.estado === "aprobacion"
                            ? "border-emerald-200 bg-emerald-50"
                            : "border-[#d43a39]/20 bg-[#d43a39]/10"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-slate-900">{obs.nombre}</span>
                              <span className="text-xs text-slate-400">— {obs.modulo}</span>
                            </div>
                            {obs.cargo && (
                              <span className="text-xs text-slate-500">{obs.cargo}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge estado={obs.estado} />
                            <span className="text-xs text-slate-500 font-mono">{obs.fechaHora}</span>
                          </div>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed mt-2">{obs.observacion}</p>
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

      {/* Details + observation modal */}
      <Modal
        open={!!detailsVersion}
        onClose={() => setDetailsVersion(null)}
        title="Detalles de Versión y Registro de Observación"
        size="lg"
      >
        {detailsVersion && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="col-span-2">
                <Field label="Título de la Versión" value={detailsVersion.titulo} />
              </div>
              <Field label="Fecha de Registro" value={detailsVersion.fechaRegistro} />
              <Field label="Estado" value={detailsVersion.estado} />
              <div className="col-span-2">
                <Field label="Descripción de la Compilación" value={detailsVersion.descripcion} />
              </div>
              <div className="col-span-2 flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Enlace URL
                </span>
                <a
                  href={detailsVersion.enlace}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-[#0778ac] hover:underline flex items-center gap-1"
                >
                  <ExternalLink size={13} /> {detailsVersion.enlace}
                </a>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Módulo a Validar <span className="text-red-500">*</span>
                </label>
                <select
                  value={detailForm.modulo}
                  onChange={(e) => setDetailForm({ ...detailForm, modulo: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0778ac]"
                >
                  <option value="">Seleccione un módulo...</option>
                  {MODULOS_VALIDATOR.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              {detailForm.modulo === "OTROS" && (
                <FormInput
                  label="Especifique la ruta o nombre del módulo"
                  required
                  placeholder=""
                  value={detailForm.otrosText}
                  onChange={(e) => setDetailForm({ ...detailForm, otrosText: e.target.value })}
                />
              )}
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-200">
              <Btn
                v="success"
                onClick={() => setApprovalOpen(true)}
                disabled={!moduloValid || detailsVersion.estado !== "activo"}
              >
                <CheckCircle size={15} /> Aprobar
              </Btn>
              <Btn
                v="danger"
                onClick={() => setRejectionOpen(true)}
                disabled={!moduloValid || detailsVersion.estado !== "activo"}
              >
                <XCircle size={15} /> Rechazar
              </Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* Approval modal */}
      <Modal open={approvalOpen} onClose={() => setApprovalOpen(false)} title="Registrar Aprobación" size="md">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
            <CheckCircle size={18} className="text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">Registro de Aprobación</p>
              <p className="text-xs text-emerald-600">Módulo: {resolvedModulo}</p>
            </div>
          </div>
          <FormTextarea
            label="Observación"
            required
            rows={4}
            placeholder=""
            value={apForm.observacion}
            onChange={(e) => setApForm({ ...apForm, observacion: e.target.value })}
          />
          <FormInput
            label="Nombre de quien registra"
            required
            placeholder=""
            value={apForm.nombre}
            onChange={(e) => setApForm({ ...apForm, nombre: e.target.value })}
          />
          <FormInput
            label="Cargo"
            required
            placeholder=""
            value={apForm.cargo}
            onChange={(e) => setApForm({ ...apForm, cargo: e.target.value })}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Firma (imagen .jpg / .png)
            </label>
            <div
              onClick={() => firmaApRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-all"
            >
              {apForm.firma ? (
                <img
                  src={apForm.firma}
                  alt="firma"
                  className="max-h-20 mx-auto object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <Upload size={22} />
                  <span className="text-xs">Haga clic para cargar la imagen de firma</span>
                </div>
              )}
            </div>
            <input
              ref={firmaApRef}
              type="file"
              accept=".jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => handleFirma(e, "ap")}
            />
          </div>
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <Btn
              v="success"
              onClick={submitApproval}
              disabled={!apForm.observacion.trim() || !apForm.nombre.trim() || !apForm.cargo.trim()}
            >
              <CheckCircle size={15} /> Guardar Aprobación
            </Btn>
            <Btn v="secondary" onClick={() => setApprovalOpen(false)}>
              Cancelar
            </Btn>
          </div>
        </div>
      </Modal>

      {/* Rejection modal */}
      <Modal open={rejectionOpen} onClose={() => setRejectionOpen(false)} title="Registrar Rechazo / Incidencia" size="md">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5 p-3 bg-[#d43a39]/10 rounded-xl border border-[#d43a39]/20">
            <AlertCircle size={18} className="text-[#d43a39] shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[#d43a39]">Registro de Rechazo</p>
              <p className="text-xs text-[#d43a39]">Módulo: {resolvedModulo}</p>
            </div>
          </div>
          <FormInput
            label="Incidencia"
            placeholder=""
            value={reForm.incidencia}
            onChange={(e) => setReForm({ ...reForm, incidencia: e.target.value })}
          />
          <FormInput
            label="Ruta"
            placeholder=""
            value={reForm.ruta}
            onChange={(e) => setReForm({ ...reForm, ruta: e.target.value })}
          />
          <FormTextarea
            label="Observación"
            required
            rows={4}
            placeholder=""
            value={reForm.observacion}
            onChange={(e) => setReForm({ ...reForm, observacion: e.target.value })}
          />
          <FormInput
            label="Nombre de quien registra"
            required
            placeholder=""
            value={reForm.nombre}
            onChange={(e) => setReForm({ ...reForm, nombre: e.target.value })}
          />
          <FormInput
            label="Cargo"
            required
            placeholder=""
            value={reForm.cargo}
            onChange={(e) => setReForm({ ...reForm, cargo: e.target.value })}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Firma (imagen .jpg / .png)
            </label>
            <div
              onClick={() => firmaReRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center cursor-pointer hover:border-[#d43a39] hover:bg-[#ffe6e6] transition-all"
            >
              {reForm.firma ? (
                <img
                  src={reForm.firma}
                  alt="firma"
                  className="max-h-20 mx-auto object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <Upload size={22} />
                  <span className="text-xs">Haga clic para cargar la imagen de firma</span>
                </div>
              )}
            </div>
            <input
              ref={firmaReRef}
              type="file"
              accept=".jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => handleFirma(e, "re")}
            />
          </div>
          {/* Captura de la Incidencia */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Captura de la Incidencia — múltiples imágenes (.jpg / .png)
            </label>
            {reForm.captura.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-1">
                {reForm.captura.map((src, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={src}
                      alt={`captura-${idx}`}
                      className="h-16 w-24 object-cover rounded-lg border border-slate-200 cursor-zoom-in hover:opacity-80 transition-opacity"
                      onClick={() => setLightboxImg(src)}
                    />
                    <button
                      type="button"
                      onClick={() => setReForm((f) => ({ ...f, captura: f.captura.filter((_, i) => i !== idx) }))}
                      className="absolute -top-1.5 -right-1.5 bg-[#d43a39] text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
            <div
              onClick={() => capturaReRef.current?.click()}
              className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center cursor-pointer hover:border-[#d43a39] hover:bg-[#ffe6e6] transition-all"
            >
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <Upload size={20} />
                <span className="text-xs">Haga clic para agregar capturas ({reForm.captura.length} cargada{reForm.captura.length !== 1 ? "s" : ""})</span>
              </div>
            </div>
            <input
              ref={capturaReRef}
              type="file"
              accept=".jpg,.jpeg,.png"
              multiple
              className="hidden"
              onChange={(e) => handleCaptura(e)}
            />
          </div>
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <Btn
              v="danger"
              onClick={submitRejection}
              disabled={!reForm.observacion.trim() || !reForm.nombre.trim() || !reForm.cargo.trim()}
            >
              <XCircle size={15} /> Guardar Rechazo
            </Btn>
            <Btn v="secondary" onClick={() => setRejectionOpen(false)}>
              Cancelar
            </Btn>
          </div>
        </div>
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
