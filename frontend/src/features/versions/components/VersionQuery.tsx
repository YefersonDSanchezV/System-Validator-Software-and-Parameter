import { useState, useEffect } from "react";
import {
  Eye,
  Pencil,
  Power,
  Trash2,
  CheckCircle,
  XCircle,
  ExternalLink,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { api, downloadApiFile } from "@/lib/api/client";
import {
  Modal,
  Btn,
  StatusBadge,
  Field,
  FormInput,
  FormTextarea,
  SectionHeader,
} from "@/components/ui/custom";
import { type Version, type ApiVersion, toVersion } from "@/types/version";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePaginationControls } from "@/components/ui/TablePagination";

import { DEFAULT_DB_CONTAINERS, normalizeContainerName, sortVersionsByCompilationDateDesc, getContainerOptions } from "@/lib/versionHelpers";
import { ContainerAutocompleteField } from "@/components/ui/ContainerAutocompleteField";

export function VersionQuery({
  versions, setVersions, onError, loggedUser = "coordinador_sistemas",
}: {
  versions: Version[];
  setVersions: React.Dispatch<React.SetStateAction<Version[]>>;
  onError: (message: string) => void;
  loggedUser?: string;
}) {
  const [detailsModal, setDetailsModal] = useState<Version | null>(null);
  const [editModal, setEditModal] = useState<Version | null>(null);
  const [correoModal, setCorreoModal] = useState<Version | null>(null);
  const [correoTipo, setCorreoTipo] = useState<"pruebas" | "produccion">("pruebas");
  const [correoMejoras, setCorreoMejoras] = useState("");
  const [correoFechaDespliegue, setCorreoFechaDespliegue] = useState("");
  const [correoSending, setCorreoSending] = useState(false);
  const [colFilters, setColFilters] = useState({
    titulo: "",
    contenedor: "",
    compilacion: "",
    estado: "",
  });

  const filteredVersions = versions.filter((v) => {
    const matchTitulo = !colFilters.titulo || (v.titulo || "").toLowerCase().includes(colFilters.titulo.toLowerCase());
    const matchContenedor = !colFilters.contenedor || (v.contenedor_bd || "").toLowerCase().includes(colFilters.contenedor.toLowerCase());
    const matchCompilacion = !colFilters.compilacion || (v.num_compilacion || "").toLowerCase().includes(colFilters.compilacion.toLowerCase());
    const matchEstado = !colFilters.estado || v.estado === colFilters.estado;
    return matchTitulo && matchContenedor && matchCompilacion && matchEstado;
  });

  const [editForm, setEditForm] = useState<{
    titulo: string;
    descripcion: string;
    enlace: string;
    contenedor_bd: string;
    num_compilacion: string;
    fecha_compilacion: string;
  }>({
    titulo: "",
    descripcion: "",
    enlace: "",
    contenedor_bd: DEFAULT_DB_CONTAINERS[0],
    num_compilacion: "",
    fecha_compilacion: "",
  });
  const containerOptions = getContainerOptions(versions);
  const versionPagination = useTablePagination(filteredVersions);

  const isCoordinator = loggedUser !== "practicante";

  const produccionVersion = versions.find((v) => v.es_produccion) || versions.find((v) => v.titulo.includes("21 AGOSTO 2026"));
  const produccionTitle = produccionVersion ? produccionVersion.titulo : "VERSION DEL 21 AGOSTO 2026 NET Y WEB - 81709";

  async function handleSetProduccion(version: Version) {
    try {
      const updated = await api<ApiVersion>(`/versions/${version.id.slice(1)}/set-produccion`, {
        method: "PUT",
      });
      setVersions((prev) =>
        sortVersionsByCompilationDateDesc(
          prev.map((v) => ({
            ...v,
            es_produccion: v.id === version.id,
          }))
        )
      );
      toast.success(`Versión "${version.titulo}" establecida como Producción.`);
    } catch (error) {
      onError(error instanceof Error ? error.message : "No fue posible cambiar la versión en producción.");
    }
  }

  function openEdit(v: Version) {
    setEditForm({
      titulo: v.tituloBase,
      descripcion: v.descripcion,
      enlace: v.enlace,
      contenedor_bd: v.contenedor_bd || DEFAULT_DB_CONTAINERS[0],
      num_compilacion: v.num_compilacion || "",
      fecha_compilacion: v.fecha_compilacion ? v.fecha_compilacion.slice(0, 16) : "",
    });
    setEditModal(v);
  }

  async function saveEdit() {
    if (!editModal) return;
    if (!editForm.titulo.trim() || !editForm.descripcion.trim() || !editForm.enlace.trim()) {
      onError("Título, descripción y enlace son obligatorios para actualizar la versión.");
      return;
    }
    try {
      const updated = await api<ApiVersion>(`/versions/${editModal.id.slice(1)}`, {
        method: "PUT",
        body: JSON.stringify({
          ...editForm,
          titulo: editForm.titulo.trim(),
          descripcion: editForm.descripcion.trim(),
          enlace: editForm.enlace.trim(),
          contenedor_bd: normalizeContainerName(editForm.contenedor_bd) || null,
          fecha_compilacion: editForm.fecha_compilacion ? editForm.fecha_compilacion : null,
        }),
      });
      setVersions((prev) =>
        sortVersionsByCompilationDateDesc(prev.map((v) => (v.id === editModal.id ? toVersion(updated) : v)))
      );
      setEditModal(null);
    } catch (error) {
      onError(error instanceof Error ? error.message : "No fue posible actualizar la versión.");
    }
  }

  async function toggleEstado(version: Version) {
    try {
      const updated = await api<ApiVersion>(`/versions/${version.id.slice(1)}`, {
        method: "PUT",
        body: JSON.stringify({ estado: version.estado !== "activo" }),
      });
      setVersions((prev) =>
        sortVersionsByCompilationDateDesc(prev.map((v) => (v.id === version.id ? toVersion(updated) : v)))
      );
    } catch (error) {
      onError(error instanceof Error ? error.message : "No fue posible cambiar el estado.");
    }
  }

  return (
    <div>
      <SectionHeader
        title="Consulta de Versiones del Sistema"
        subtitle={`${filteredVersions.length} de ${versions.length} versión(es) encontradas`}
      />

      {/* Banner Informativo Versión en Producción (Req 5) */}
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

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50">Título Versión</th>
              {isCoordinator && (
                <th className="px-4 py-3 text-left text-[10px] font-bold text-[#0778ac] uppercase tracking-wider bg-slate-50">Contenedor BD</th>
              )}
              <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50">N° Compilación</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50">Fecha Compilación</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50">Fecha Registro</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50">Estado</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50">Enlace</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50">Acciones</th>
            </tr>
            <tr className="bg-slate-100/90 border-t border-slate-200">
              <th className="px-2 py-1.5 bg-slate-100 font-normal">
                <input
                  type="text"
                  placeholder="Filtrar..."
                  value={colFilters.titulo}
                  onChange={(e) => setColFilters({ ...colFilters, titulo: e.target.value })}
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-normal bg-white"
                />
              </th>
              {isCoordinator && (
                <th className="px-2 py-1.5 bg-slate-100 font-normal">
                  <input
                    type="text"
                    placeholder="Filtrar..."
                    value={colFilters.contenedor}
                    onChange={(e) => setColFilters({ ...colFilters, contenedor: e.target.value })}
                    className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-normal bg-white"
                  />
                </th>
              )}
              <th className="px-2 py-1.5 bg-slate-100 font-normal">
                <input
                  type="text"
                  placeholder="Filtrar..."
                  value={colFilters.compilacion}
                  onChange={(e) => setColFilters({ ...colFilters, compilacion: e.target.value })}
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-normal bg-white"
                />
              </th>
              <th className="px-2 py-1.5 bg-slate-100 font-normal"></th>
              <th className="px-2 py-1.5 bg-slate-100 font-normal"></th>
              <th className="px-2 py-1.5 bg-slate-100 font-normal">
                <select
                  value={colFilters.estado}
                  onChange={(e) => setColFilters({ ...colFilters, estado: e.target.value })}
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-normal bg-white"
                >
                  <option value="">Todos</option>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </th>
              <th className="px-2 py-1.5 bg-slate-100 font-normal"></th>
              <th className="px-2 py-1.5 bg-slate-100 font-normal"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {versionPagination.rows.map((v) => {
              const isInactive = v.estado === "inactivo";
              return (
                <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900 max-w-xs">{v.titulo}</td>
                  {isCoordinator && (
                    <td className="px-4 py-3 font-bold text-[#0778ac] text-xs">{v.contenedor_bd || "—"}</td>
                  )}
                  <td className="px-4 py-3 text-slate-700 text-xs font-mono">{v.num_compilacion || "—"}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{v.fecha_compilacion || "—"}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{v.fechaRegistro}</td>
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
                    <div className="flex items-center gap-1 flex-wrap">
                      {/* Consultar - Siempre activo (Req 5) */}
                      <Btn v="ghost" sm onClick={() => setDetailsModal(v)}>
                        <Eye size={13} /> Consultar
                      </Btn>
                      {/* Editar - Inactivado cuando estado === inactivo (Req 5) */}
                      <Btn v="ghost" sm onClick={() => openEdit(v)} disabled={isInactive}>
                        <Pencil size={13} /> Editar
                      </Btn>
                      {/* Activar/Inactivar - Siempre activo (Req 5) */}
                      <Btn
                        v={v.estado === "activo" ? "warning" : "success"}
                        sm
                        onClick={() => toggleEstado(v)}
                      >
                        <Power size={13} />
                        {v.estado === "activo" ? "Inactivar" : "Activar"}
                      </Btn>
                      {/* Enviar correo - Inactivado cuando estado === inactivo (Req 5) */}
                      <button
                        onClick={() => { setCorreoModal(v); setCorreoTipo("pruebas"); setCorreoMejoras(""); setCorreoFechaDespliegue(""); }}
                        disabled={isInactive}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#0778ac] hover:bg-[#066591] text-white transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Mail size={13} /> Enviar correo
                      </button>
                      {/* Botón Producción - Inactivado cuando estado === inactivo (Req 5) */}
                      <button
                        onClick={() => handleSetProduccion(v)}
                        disabled={isInactive}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors shadow-sm ${
                          v.es_produccion
                            ? "bg-emerald-600 text-white font-bold cursor-default"
                            : "bg-slate-700 hover:bg-slate-800 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                        }`}
                      >
                        <CheckCircle size={13} />
                        {v.es_produccion ? "En Producción" : "Producción"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        <TablePaginationControls pagination={versionPagination} itemLabel="versiones" />
      </div>

      <Modal open={!!detailsModal} onClose={() => setDetailsModal(null)} title="Detalles de la Versión">
        {detailsModal && (
          <div className="flex flex-col gap-5">
            <Field label="Título" value={detailsModal.titulo} />
            <Field label="Descripción" value={detailsModal.descripcion} />
            <div className="grid grid-cols-2 gap-4">
              {isCoordinator && <Field label="Contenedor BD" value={detailsModal.contenedor_bd || "—"} />}
              <Field label="Número de Compilación" value={detailsModal.num_compilacion || "—"} />
              <Field label="Fecha de Compilación" value={detailsModal.fecha_compilacion || "—"} />
              <Field label="Fecha de Registro" value={detailsModal.fechaRegistro} />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Enlace
              </span>
              <a
                href={detailsModal.enlace}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-[#0778ac] hover:underline flex items-center gap-1"
              >
                <ExternalLink size={13} /> {detailsModal.enlace}
              </a>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!editModal} onClose={() => setEditModal(null)} title="Editar Datos de Versión">
        {editModal && (
          <div className="flex flex-col gap-4">
            <FormInput
              label="Título"
              required
              value={editForm.titulo}
              onChange={(e) => setEditForm({ ...editForm, titulo: e.target.value })}
            />

            <ContainerAutocompleteField
              label="Contenedor de BD"
              listId="version-edit-container-options"
              value={editForm.contenedor_bd}
              onChange={(value) => setEditForm({ ...editForm, contenedor_bd: value })}
              options={containerOptions}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="Número de compilación"
                value={editForm.num_compilacion}
                onChange={(e) => setEditForm({ ...editForm, num_compilacion: e.target.value })}
              />
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Fecha de compilación</label>
                <input
                  type="datetime-local"
                  value={editForm.fecha_compilacion}
                  onChange={(e) => setEditForm({ ...editForm, fecha_compilacion: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                />
              </div>
            </div>

            <FormTextarea
              label="Descripción"
              required
              rows={4}
              value={editForm.descripcion}
              onChange={(e) => setEditForm({ ...editForm, descripcion: e.target.value })}
            />
            <FormInput
              label="Enlace"
              required
              value={editForm.enlace}
              onChange={(e) => setEditForm({ ...editForm, enlace: e.target.value })}
            />
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <Btn v="primary" onClick={saveEdit}>
                <CheckCircle size={15} /> Guardar Cambios
              </Btn>
              <Btn v="secondary" onClick={() => setEditModal(null)}>
                Cancelar
              </Btn>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!correoModal} onClose={() => { setCorreoModal(null); setCorreoMejoras(""); setCorreoFechaDespliegue(""); }} title={`Enviar correo — ${correoModal?.titulo || ""}`} size="lg">
        {correoModal && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm">
              <Field label="Título" value={correoModal.titulo} />
              <Field label="Contenedor BD" value={correoModal.contenedor_bd || "—"} />
              <Field label="N° Compilación" value={correoModal.num_compilacion || "—"} />
              <Field label="Fecha Compilación" value={correoModal.fecha_compilacion || "—"} />
              <Field label="Estado" value={correoModal.estado} />
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Enlace</span>
                <span className="text-sm text-[#0778ac] break-all">{correoModal.enlace}</span>
              </div>
            </div>

            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                onClick={() => setCorreoTipo("pruebas")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${correoTipo==="pruebas" ? "bg-[#0778ac] text-white shadow" : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"}`}
              >
                Enviar correo para realizar pruebas
              </button>
              <button
                onClick={() => setCorreoTipo("produccion")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${correoTipo==="produccion" ? "bg-[#0778ac] text-white shadow" : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"}`}
              >
                Enviar correo para despliegue a producción
              </button>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 leading-relaxed">
              {correoTipo==="pruebas" ? (
                <>Asunto: <b>[PRUEBAS] {correoModal.tituloBase}{correoModal.num_compilacion ? ` - ${correoModal.num_compilacion}` : ""}</b> — Se enviará a los destinatarios configurados en <b>Consulta de Versión → Parámetros → Correos pruebas</b>.</>
              ) : (
                <>Asunto: <b>[PRODUCCIÓN] {correoModal.tituloBase}{correoModal.num_compilacion ? ` - ${correoModal.num_compilacion}` : ""}</b> — Zona horaria <b>America/Bogota</b>, formato fecha <b>dd/MM/yyyy hh:mm a.m./p.m.</b>.</>
              )}
            </div>

            <FormTextarea
              label={correoTipo==="pruebas" ? "Detalles de Compilación *" : "Detalles de Compilación *"}
              required
              rows={5}
              placeholder={correoTipo==="pruebas" ? "Describa los detalles de compilación, mejoras y cambios incluidos..." : "Detalle las mejoras, correcciones e impactos de la versión estable..."}
              value={correoMejoras}
              onChange={(e) => setCorreoMejoras(e.target.value)}
            />

            {correoTipo==="produccion" && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Fecha y hora en que se ejecutará la actualización *</label>
                <input
                  type="datetime-local"
                  value={correoFechaDespliegue}
                  onChange={(e) => setCorreoFechaDespliegue(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0778ac]"
                />
                <p className="mt-1 text-xs text-slate-400">Se formateará como dd/MM/yyyy hh:mm a.m./p.m. en zona America/Bogota.</p>
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <Btn
                v="primary"
                disabled={correoSending || correoMejoras.trim().length < 10 || (correoTipo==="produccion" && !correoFechaDespliegue)}
                onClick={async () => {
                  if (!correoModal) return;
                  if (correoMejoras.trim().length < 10) { onError("La descripción de mejoras debe tener al menos 10 caracteres."); return; }
                  if (correoTipo==="produccion" && !correoFechaDespliegue) { onError("La fecha y hora de despliegue es obligatoria."); return; }
                  setCorreoSending(true);
                  try {
                    const res = await api<{message:string}>(`/versions/${correoModal.id.slice(1)}/enviar-correo`, {
                      method: "POST",
                      body: JSON.stringify({ tipo: correoTipo, mejoras: correoMejoras.trim(), fecha_despliegue: correoFechaDespliegue || null })
                    });
                    toast.success(res.message || "Correo enviado correctamente");
                    setCorreoModal(null); setCorreoMejoras(""); setCorreoFechaDespliegue("");
                  } catch (e) {
                    onError(e instanceof Error ? e.message : "No fue posible enviar el correo.");
                  } finally { setCorreoSending(false); }
                }}
              >
                <Mail size={15} /> {correoSending ? "Enviando..." : "Enviar correo"}
              </Btn>
              <Btn v="secondary" onClick={() => { setCorreoModal(null); setCorreoMejoras(""); setCorreoFechaDespliegue(""); }}>Cancelar</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default VersionQuery;
