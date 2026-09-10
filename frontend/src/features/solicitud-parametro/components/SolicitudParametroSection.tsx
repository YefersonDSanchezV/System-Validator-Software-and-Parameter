import { useState, useEffect } from "react";
import { Plus, AlertCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { Modal, Btn, StatusBadge, SectionHeader } from "@/components/ui/custom";
import { type SolicitudParametro, type ApiSolicitudParametro, toSolicitudParametro } from "@/types/solicitud-parametro";
import { type ParametrosEstado } from "@/types/parametros";
import { TablePaginationControls } from "@/components/ui/TablePagination";
import { useTablePagination } from "@/hooks/useTablePagination";
import { HabilitarParametroModal } from "./HabilitarParametroModal";
import { HabilitarSolicitudModal } from "./HabilitarSolicitudModal";
import { RechazarSolicitudModal } from "./RechazarSolicitudModal";
import { AutorizadoPreviaSolicitudModal } from "./AutorizadoPreviaSolicitudModal";
import { ParametroBadge } from "./ParametroBadge";

export function SolicitudParametroSection({
  solicitudes,
  setSolicitudes,
  onError,
  canApprove = false,
  canHabilitarParametro = false,
}: {
  solicitudes: SolicitudParametro[];
  setSolicitudes: React.Dispatch<React.SetStateAction<SolicitudParametro[]>>;
  onError: (message: string) => void;
  canApprove?: boolean;
  canHabilitarParametro?: boolean;
}) {
  const todayStr = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    tipoParametro: "Enfermeria" as SolicitudParametro["tipoParametro"],
    descripcion: "",
    fechaApertura: todayStr,
    fechaCierre: todayStr,
    horaApertura: "",
    horaCierre: "",
    tiempoLimite: "12:00",
    solicitante: "",
    area: "",
    ingreso: "",
    medico: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resettingDefecto, setResettingDefecto] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [coordModalOpen, setCoordModalOpen] = useState(false);
  const [selectedSolicitud, setSelectedSolicitud] = useState<SolicitudParametro | null>(null);

  const [habilitarModalOpen, setHabilitarModalOpen] = useState(false);
  const [habilitarModalItem, setHabilitarModalItem] = useState<SolicitudParametro | null>(null);

  const [rechazarModalOpen, setRechazarModalOpen] = useState(false);
  const [rechazarModalItem, setRechazarModalItem] = useState<SolicitudParametro | null>(null);

  const [extensionModalOpen, setExtensionModalOpen] = useState(false);
  const [extensionModalItem, setExtensionModalItem] = useState<SolicitudParametro | null>(null);
  
  const [paramEstado, setParamEstado] = useState<ParametrosEstado | null>(null);
  const [availableTipos, setAvailableTipos] = useState<string[]>(["Historia Clinica", "Enfermeria", "Otros"]);
  const [maxTiempoContador, setMaxTiempoContador] = useState<string>("12:00");

  const fetchParamEstado = () => {
    api<ParametrosEstado>("/parametros-clinicos/estado").then(setParamEstado).catch(() => {});
  };

  const fetchTipos = () => {
    api<string[]>("/parametros-clinicos/tipos").then(setAvailableTipos).catch(() => {});
    api<ConfiguracionParametrosDTO>("/parametros-clinicos/config")
      .then((conf) => {
        if (conf.tiempo_maximo_contador) {
          setMaxTiempoContador(conf.tiempo_maximo_contador);
          setForm((prev) => ({
            ...prev,
            tiempoLimite: prev.tiempoLimite === "12:00" ? conf.tiempo_maximo_contador! : prev.tiempoLimite,
          }));
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchParamEstado();
    fetchTipos();
  }, []);

  const isOtros = form.tipoParametro === "Otros";
  const isEnfermeria = form.tipoParametro === "Enfermeria";
  const isHistoriaClinica = form.tipoParametro === "Historia Clinica";
  const descriptionLength = form.descripcion.trim().length;
  const minDescriptionMet = !isOtros || descriptionLength >= 50;
  const parsedApertura = form.fechaApertura ? new Date(`${form.fechaApertura}T00:00:00`) : null;
  const parsedCierre = (isEnfermeria || isHistoriaClinica)
    ? new Date(`${todayStr}T00:00:00`)
    : (form.fechaCierre ? new Date(`${form.fechaCierre}T00:00:00`) : null);
  const dateRangeValid =
    !form.fechaApertura ||
    !form.fechaCierre ||
    (parsedApertura !== null && parsedCierre !== null && parsedCierre.getTime() >= parsedApertura.getTime());

  const datesValid = isOtros
    ? (form.fechaApertura.trim() !== "" && form.horaApertura.trim() !== "" && dateRangeValid)
    : (form.fechaApertura.trim() !== "" && dateRangeValid);

  const totalPreview = (() => {
    if (isOtros) return null;
    if (!parsedApertura || !parsedCierre || !dateRangeValid) return null;
    const diffMs = parsedCierre.getTime() - parsedApertura.getTime();
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
    if (days <= 0) return null;
    if (isEnfermeria) return `${days * 24} hr`;
    if (isHistoriaClinica) return `${days} dias`;
    return null;
  })();

  const formatTotal = (item: SolicitudParametro) => {
    if (item.totalValor == null || !item.totalUnidad) return "—";
    return `${item.totalValor} ${item.totalUnidad}`;
  };

  const extraFieldsValid = () => {
    if (isHistoriaClinica) return form.ingreso.trim() !== "" && form.medico.trim() !== "";
    if (isEnfermeria) return form.ingreso.trim() !== "";
    return true;
  };

  const parseTimeToMinutes = (t: string) => {
    if (!t || !t.includes(":")) return 0;
    const parts = t.split(":");
    return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
  };

  useEffect(() => {
    let active = true;
    api<ApiSolicitudParametro[]>("/solicitud-parametro/")
      .then((items) => {
        if (!active) return;
        setSolicitudes(items.map(toSolicitudParametro));
      })
      .catch(() => {
        if (!active) return;
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => { active = false; };
  }, [setSolicitudes]);

  const [colFilters, setColFilters] = useState({
    consecutivo: "",
    tipo: "",
    solicitante: "",
    area: "",
    estado: "",
  });

  const filteredSolicitudes = solicitudes.filter((item) => {
    const matchConsecutivo = !colFilters.consecutivo || (item.consecutivo || "").toLowerCase().includes(colFilters.consecutivo.toLowerCase());
    const matchTipo = !colFilters.tipo || (item.tipoParametro || "").toLowerCase().includes(colFilters.tipo.toLowerCase());
    const matchSolicitante = !colFilters.solicitante || (item.solicitante || "").toLowerCase().includes(colFilters.solicitante.toLowerCase());
    const matchArea = !colFilters.area || (item.area || "").toLowerCase().includes(colFilters.area.toLowerCase());
    const matchEstado = !colFilters.estado || (item.estado || "").toLowerCase() === colFilters.estado.toLowerCase();
    return matchConsecutivo && matchTipo && matchSolicitante && matchArea && matchEstado;
  });
  const solicitudPagination = useTablePagination(filteredSolicitudes);

  const handleSave = () => {
    setFormError(null);
    if (!form.descripcion.trim() || (isOtros && form.descripcion.trim().length < 50)) {
      setFormError("El campo descripcion es obligatorio, sin una descripcion valida el parametro procedera a ser rechazado");
      return;
    }
    if (!form.solicitante.trim()) {
      setFormError("El solicitante es obligatorio.");
      return;
    }
    if (!form.area.trim()) {
      setFormError("El área solicitante es obligatoria.");
      return;
    }
    if (!extraFieldsValid()) {
      setFormError(isHistoriaClinica ? "Para Historia Clínica es obligatorio el ingreso y el médico." : "Para Enfermería es obligatorio el ingreso.");
      return;
    }
    if ((isEnfermeria || isHistoriaClinica)) {
      if (!form.tiempoLimite || !form.tiempoLimite.trim() || !form.tiempoLimite.includes(":")) {
        setFormError("Debe ingresar un tiempo de habilitación en formato HH:mm (ej. 02:00).");
        return;
      }
      const reqMins = parseTimeToMinutes(form.tiempoLimite);
      const maxMins = parseTimeToMinutes(maxTiempoContador || "12:00");
      if (reqMins <= 0) {
        setFormError("El tiempo de habilitación debe ser mayor a 00:00.");
        return;
      }
      if (reqMins > maxMins) {
        setFormError(`El tiempo de habilitación no puede superar el límite configurado de ${maxTiempoContador} horas.`);
        return;
      }
      if (reqMins > 12 * 60) {
        setFormError("El tiempo máximo permitido es de 12 horas en horario de 12h.");
        return;
      }
    }
    if (!datesValid) {
      setFormError("Verifique las fechas y horas registradas.");
      return;
    }

    setSaving(true);
    api<ApiSolicitudParametro>("/solicitud-parametro/", {
      method: "POST",
      body: JSON.stringify({
        tipo_parametro: form.tipoParametro,
        descripcion: form.descripcion.trim(),
        fecha_apertura: form.fechaApertura ? form.fechaApertura : null,
        fecha_cierre: (isEnfermeria || isHistoriaClinica) ? todayStr : (form.fechaCierre ? form.fechaCierre : null),
        hora_apertura: isOtros && form.horaApertura ? form.horaApertura : null,
        hora_cierre: isOtros && form.horaCierre ? form.horaCierre : null,
        tiempo_limite: (isEnfermeria || isHistoriaClinica) ? form.tiempoLimite.trim() : null,
        solicitante: form.solicitante.trim(),
        area: form.area.trim(),
        ingreso: (isEnfermeria || isHistoriaClinica) ? form.ingreso.trim() : null,
        medico: isHistoriaClinica ? form.medico.trim() : null,
      }),
    })
      .then((created) => {
        setSolicitudes((prev) => [toSolicitudParametro(created), ...prev]);
        setForm({
          tipoParametro: "Enfermeria",
          descripcion: "",
          fechaApertura: todayStr,
          fechaCierre: todayStr,
          horaApertura: "",
          horaCierre: "",
          tiempoLimite: maxTiempoContador || "12:00",
          solicitante: "",
          area: "",
          ingreso: "",
          medico: "",
        });
        setOpen(false);
      })
      .catch((error) => {
        onError(error instanceof Error ? error.message : "No fue posible registrar la solicitud.");
      })
      .finally(() => setSaving(false));
  };

  const handleOpenNuevaSolicitud = () => {
    fetchTipos();
    setForm((prev) => ({
      ...prev,
      tiempoLimite: prev.tiempoLimite || maxTiempoContador || "12:00",
    }));
    setFormError(null);
    setOpen(true);
  };

  const handleResolutionSuccess = (updated: SolicitudParametro) => {
    setSolicitudes((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    fetchParamEstado();
  };

  const handleResetParametrosDefecto = () => {
    if (!window.confirm("¿Desea restablecer todos los parámetros clínicos a los valores por defecto configurados?")) {
      return;
    }
    setResettingDefecto(true);
    api<{ message: string }>("/parametros-clinicos/restablecer-defecto", {
      method: "POST",
    })
      .then((res) => {
        fetchParamEstado();
        toast.success(res.message || "Parámetros restablecidos por defecto correctamente");
      })
      .catch((e) => {
        onError(e instanceof Error ? e.message : "Error restableciendo los parámetros por defecto");
      })
      .finally(() => setResettingDefecto(false));
  };

  const handleViewDetail = (item: SolicitudParametro) => {
    setSelectedSolicitud(item);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <SectionHeader
          title="Habilitación de Parámetro"
          subtitle="Cree y gestione solicitudes de parámetros para soporte clínico."
        />
        <div className="flex flex-wrap items-center gap-3">
          {paramEstado && (
            <div className="flex flex-wrap items-center gap-2">
              <ParametroBadge title="Enfermeria" abierto={paramEstado.enfermeria_abierto} valor={paramEstado.enfermeria_hcrenf} valor2={paramEstado.enfermeria_haplmed} />
              <ParametroBadge title="Historia Clinica" abierto={paramEstado.historia_clinica_abierto} valor={paramEstado.historia_clinica_valor} />
            </div>
          )}
          {canHabilitarParametro && (
            <Btn v="secondary" onClick={handleResetParametrosDefecto} disabled={resettingDefecto}>
              <RotateCcw size={14} className={resettingDefecto ? "animate-spin" : ""} />
              Restablecer Valores por Defecto
            </Btn>
          )}
          <Btn v="primary" onClick={handleOpenNuevaSolicitud}>
            <Plus size={14} /> Nueva Solicitud
          </Btn>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        <div className="rounded-3xl border border-[#0778ac]/15 bg-[#0778ac]/5 p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-[#0778ac]/70">Solicitudes</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{solicitudes.length}</p>
          <p className="mt-2 text-xs text-slate-500">Total registradas.</p>
        </div>
        <div className="rounded-3xl border border-amber-200 bg-amber-50/50 p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-amber-700">Pendientes</p>
          <p className="mt-3 text-3xl font-semibold text-amber-900">{solicitudes.filter((s) => s.estado === "Pendiente").length}</p>
          <p className="mt-2 text-xs text-amber-700/80">En espera de revisión.</p>
        </div>
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-emerald-700">Habilitadas</p>
          <p className="mt-3 text-3xl font-semibold text-emerald-900">{solicitudes.filter((s) => s.estado === "Habilitado" || s.estado === "Aprobado").length}</p>
          <p className="mt-2 text-xs text-emerald-700/80">Habilitadas activas.</p>
        </div>
        <div className="rounded-3xl border border-red-200 bg-red-50/50 p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-red-700">Rechazadas</p>
          <p className="mt-3 text-3xl font-semibold text-red-900">{solicitudes.filter((s) => s.estado === "Rechazado").length}</p>
          <p className="mt-2 text-xs text-red-700/80">Solicitudes rechazadas.</p>
        </div>
        <div className="rounded-3xl border border-indigo-200 bg-indigo-50/50 p-5 col-span-2 md:col-span-1">
          <p className="text-xs uppercase tracking-[0.22em] text-indigo-700">Sol. Previa</p>
          <p className="mt-3 text-3xl font-semibold text-indigo-900">{solicitudes.filter((s) => s.estado === "Autorizado Solicitud Previa").length}</p>
          <p className="mt-2 text-xs text-indigo-700/80">Autorizadas bajo sol. previa.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              {["Consecutivo", "Tipo de Parámetro", "Solicitante", "Área", "Apertura", "Cierre", "Tiempo Parámetro", "Total", "Estado", "Acciones"].map((heading) => (
                <th
                  key={heading}
                  className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50"
                >
                  {heading}
                </th>
              ))}
            </tr>
            <tr className="bg-slate-100/90 border-t border-slate-200">
              <th className="px-2 py-1.5 bg-slate-100 font-normal">
                <input
                  type="text"
                  placeholder="Filtrar..."
                  value={colFilters.consecutivo}
                  onChange={(e) => setColFilters({ ...colFilters, consecutivo: e.target.value })}
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-normal bg-white"
                />
              </th>
              <th className="px-2 py-1.5 bg-slate-100 font-normal">
                <input
                  type="text"
                  placeholder="Filtrar..."
                  value={colFilters.tipo}
                  onChange={(e) => setColFilters({ ...colFilters, tipo: e.target.value })}
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-normal bg-white"
                />
              </th>
              <th className="px-2 py-1.5 bg-slate-100 font-normal">
                <input
                  type="text"
                  placeholder="Filtrar..."
                  value={colFilters.solicitante}
                  onChange={(e) => setColFilters({ ...colFilters, solicitante: e.target.value })}
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-normal bg-white"
                />
              </th>
              <th className="px-2 py-1.5 bg-slate-100 font-normal">
                <input
                  type="text"
                  placeholder="Filtrar..."
                  value={colFilters.area}
                  onChange={(e) => setColFilters({ ...colFilters, area: e.target.value })}
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-normal bg-white"
                />
              </th>
              <th className="px-2 py-1.5 bg-slate-100 font-normal"></th>
              <th className="px-2 py-1.5 bg-slate-100 font-normal"></th>
              <th className="px-2 py-1.5 bg-slate-100 font-normal"></th>
              <th className="px-2 py-1.5 bg-slate-100 font-normal"></th>
              <th className="px-2 py-1.5 bg-slate-100 font-normal">
                <select
                  value={colFilters.estado}
                  onChange={(e) => setColFilters({ ...colFilters, estado: e.target.value })}
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-normal bg-white"
                >
                  <option value="">Todos</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Habilitado">Habilitado</option>
                  <option value="Rechazado">Rechazado</option>
                  <option value="Autorizado Solicitud Previa">Sol. Previa</option>
                </select>
              </th>
              <th className="px-2 py-1.5 bg-slate-100 font-normal"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-slate-400 text-sm">
                    Cargando solicitudes...
                  </td>
                </tr>
              ) : filteredSolicitudes.length === 0 ? (
              <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-slate-400 text-sm">
                  No hay solicitudes registradas.
                </td>
              </tr>
              ) : (
              solicitudPagination.rows.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 text-xs font-bold text-[#0778ac] font-mono">{item.consecutivo}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-800">{item.tipoParametro}</td>
                  <td className="px-4 py-3 text-slate-700">{item.solicitante}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{item.area || "—"}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs font-mono">{item.fechaApertura || "—"}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs font-mono">{item.fechaCierre || "—"}</td>
                  <td className="px-4 py-3 text-slate-800 text-xs font-mono font-bold">
                    {item.tiempoLimite ? `${item.tiempoLimite} hrs` : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-700 text-xs font-semibold">{formatTotal(item)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge estado={item.estado} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Btn v="secondary" sm onClick={() => handleViewDetail(item)}>
                        Consultar
                      </Btn>
                      {canApprove && item.estado === "Pendiente" && (
                        <>
                          <button
                            onClick={() => { setHabilitarModalItem(item); setHabilitarModalOpen(true); }}
                            className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm"
                          >
                            Habilitar
                          </button>
                          <button
                            onClick={() => { setRechazarModalItem(item); setRechazarModalOpen(true); }}
                            className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors shadow-sm"
                          >
                            Rechazar
                          </button>
                          <button
                            onClick={() => { setExtensionModalItem(item); setExtensionModalOpen(true); }}
                            className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm"
                          >
                            Autorizado Solicitud Previa
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
        <TablePaginationControls pagination={solicitudPagination} itemLabel="solicitudes" />
      </div>

      <HabilitarParametroModal 
        open={coordModalOpen} 
        onClose={() => setCoordModalOpen(false)} 
        onRefresh={fetchParamEstado}
        onError={onError}
      />

      <HabilitarSolicitudModal
        solicitud={habilitarModalItem}
        open={habilitarModalOpen}
        onClose={() => { setHabilitarModalOpen(false); setHabilitarModalItem(null); }}
        onSuccess={handleResolutionSuccess}
        onError={onError}
      />

      <RechazarSolicitudModal
        solicitud={rechazarModalItem}
        open={rechazarModalOpen}
        onClose={() => { setRechazarModalOpen(false); setRechazarModalItem(null); }}
        onSuccess={handleResolutionSuccess}
        onError={onError}
      />

      <AutorizadoPreviaSolicitudModal
        solicitud={extensionModalItem}
        solicitudes={solicitudes}
        open={extensionModalOpen}
        onClose={() => { setExtensionModalOpen(false); setExtensionModalItem(null); }}
        onSuccess={handleResolutionSuccess}
        onError={onError}
      />

      <Modal open={open} onClose={() => { setOpen(false); setFormError(null); }} title="Nueva Solicitud de Parámetro" size="md">
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700 shadow-sm">
            <AlertCircle size={16} className="shrink-0 text-red-600" />
            <span>Sin una justificacion valida, parametro no sera habilitado</span>
          </div>

          {formError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-500" />
              <p className="leading-snug">{formError}</p>
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Tipo de parámetro</label>
              <select
                value={form.tipoParametro}
                onChange={(e) => {
                  const nextType = e.target.value as SolicitudParametro["tipoParametro"];
                  setForm((prev) => ({
                    ...prev,
                    tipoParametro: nextType,
                    ingreso: nextType === "Otros" ? "" : prev.ingreso,
                    medico: nextType !== "Historia Clinica" ? "" : prev.medico,
                  }));
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0778ac]"
              >
                {availableTipos.includes("Enfermeria") && <option value="Enfermeria">Enfermería</option>}
                {availableTipos.includes("Historia Clinica") && <option value="Historia Clinica">Historia Clínica</option>}
                {availableTipos.includes("Otros") && <option value="Otros">Otros</option>}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Solicitante *</label>
              <input
                value={form.solicitante}
                onChange={(e) => setForm({ ...form, solicitante: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0778ac]"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Área *</label>
            <input
              value={form.area}
              onChange={(e) => setForm({ ...form, area: e.target.value })}
              placeholder="Ingrese el área solicitante"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0778ac]"
            />
          </div>

          {(isEnfermeria || isHistoriaClinica) && (
             <div className="grid gap-4 md:grid-cols-2 border-t border-slate-100 pt-3">
               <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Ingreso *</label>
                  <input
                    value={form.ingreso}
                    onChange={(e) => setForm({ ...form, ingreso: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0778ac]"
                  />
               </div>
               {isHistoriaClinica && (
                 <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Médico *</label>
                    <input
                      value={form.medico}
                      onChange={(e) => setForm({ ...form, medico: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0778ac]"
                    />
                 </div>
               )}
             </div>
          )}

          <div className="border-t border-slate-100 pt-3">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Descripción *</label>
            <textarea
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Ingrese la descripción detallada de la solicitud..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0778ac] resize-none min-h-[140px]"
            />
            {isOtros && (
              <p className={`mt-1 text-xs ${minDescriptionMet ? "text-emerald-600" : "text-rose-600"}`}>
                Minimo 50 caracteres para tipo Otros. Actual: {descriptionLength}
              </p>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                Fecha apertura desde *
              </label>
              <input
                type="date"
                value={form.fechaApertura}
                onChange={(e) => setForm({ ...form, fechaApertura: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0778ac]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                Fecha de cierre {isOtros ? <span className="normal-case text-slate-400 font-normal">(Opcional)</span> : (isEnfermeria || isHistoriaClinica) ? <span className="normal-case text-amber-600 font-semibold text-[11px]">(Fecha fija de hoy)</span> : "*"}
              </label>
              <input
                type="date"
                value={(isEnfermeria || isHistoriaClinica) ? todayStr : form.fechaCierre}
                disabled={isEnfermeria || isHistoriaClinica}
                onChange={(e) => setForm({ ...form, fechaCierre: e.target.value })}
                className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0778ac] ${
                  (isEnfermeria || isHistoriaClinica) ? "bg-slate-100 text-slate-500 cursor-not-allowed font-medium" : "bg-white"
                }`}
              />
            </div>
          </div>

          {(isEnfermeria || isHistoriaClinica) && (
            <div className="border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Tiempo de Habilitación / Contador (HH:mm) *
                </label>
                <span className="text-[11px] font-bold text-[#0778ac] bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                  Límite Máximo: {maxTiempoContador}
                </span>
              </div>
              <div className="relative flex items-center rounded-lg border border-slate-300 bg-white transition-all focus-within:ring-2 focus-within:ring-[#0778ac] focus-within:border-[#0778ac]">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  placeholder={maxTiempoContador || "12:00"}
                  value={form.tiempoLimite || ""}
                  onChange={(e) => {
                    let raw = e.target.value.replace(/[^0-9:]/g, "");
                    if (raw.length === 2 && !raw.includes(":") && !e.target.value.endsWith(":")) {
                      raw = raw + ":";
                    }
                    if (raw.length > 5) raw = raw.slice(0, 5);
                    setForm({ ...form, tiempoLimite: raw });
                  }}
                  onBlur={() => {
                    if (!form.tiempoLimite) {
                      setForm({ ...form, tiempoLimite: maxTiempoContador || "12:00" });
                      return;
                    }
                    const parts = form.tiempoLimite.split(":");
                    let h = parseInt(parts[0] || "0", 10);
                    let m = parseInt(parts[1] || "0", 10);
                    if (isNaN(h)) h = 0;
                    if (isNaN(m)) m = 0;
                    if (h > 12) h = 12;
                    if (h < 0) h = 0;
                    if (m > 59) m = 59;
                    if (m < 0) m = 0;
                    setForm({ ...form, tiempoLimite: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}` });
                  }}
                  className="w-full px-3 py-2 text-sm bg-transparent font-semibold font-mono text-slate-800 focus:outline-none"
                />
                <span className="pr-3 text-[11px] font-mono font-bold text-slate-400 select-none">
                  HH:mm
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                <span>⏱</span> Toma por defecto el tiempo máximo parametrizado ({maxTiempoContador}), pero puede ser editado para esta solicitud si se requiere menor tiempo.
              </p>
            </div>
          )}

          {isOtros && (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                  Hora de inicio *
                </label>
                <input
                  type="time"
                  value={form.horaApertura}
                  onChange={(e) => setForm({ ...form, horaApertura: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0778ac]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                  Hora final <span className="normal-case text-slate-400 font-normal">(Opcional)</span>
                </label>
                <input
                  type="time"
                  value={form.horaCierre}
                  onChange={(e) => setForm({ ...form, horaCierre: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0778ac]"
                />
              </div>
            </div>
          )}
          {!dateRangeValid && form.fechaApertura && form.fechaCierre && (
            <p className="text-xs text-rose-600">La fecha de cierre no puede ser menor que la fecha de apertura.</p>
          )}
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <Btn v="primary" onClick={handleSave} disabled={saving}>
              Guardar solicitud
            </Btn>
            <Btn v="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Btn>
          </div>
        </div>
      </Modal>

      <Modal
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedSolicitud(null);
        }}
        title="Detalle de Solicitud de Parámetro"
        size="md"
      >
        {!selectedSolicitud ? null : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-[11px] uppercase tracking-wider text-slate-400">Consecutivo</p>
                <p className="font-bold text-[#0778ac] mt-1 font-mono">{selectedSolicitud.consecutivo}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-[11px] uppercase tracking-wider text-slate-400">Tipo de parámetro</p>
                <p className="font-semibold text-slate-800 mt-1">{selectedSolicitud.tipoParametro}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-[11px] uppercase tracking-wider text-slate-400">Solicitante</p>
                <p className="font-semibold text-slate-800 mt-1">{selectedSolicitud.solicitante}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-[11px] uppercase tracking-wider text-slate-400">Área</p>
                <p className="font-semibold text-slate-800 mt-1">{selectedSolicitud.area || "—"}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-[11px] uppercase tracking-wider text-slate-400">Paciente</p>
                <p className="font-semibold text-slate-800 mt-1">{selectedSolicitud.nombrePaciente || "—"}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-[11px] uppercase tracking-wider text-slate-400">Ingreso</p>
                <p className="font-semibold text-slate-800 mt-1">{selectedSolicitud.ingreso || "—"}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-[11px] uppercase tracking-wider text-slate-400">Médico</p>
                <p className="font-semibold text-slate-800 mt-1">{selectedSolicitud.medico || "—"}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-[11px] uppercase tracking-wider text-slate-400">Apertura</p>
                <p className="font-semibold text-slate-800 mt-1">
                  {selectedSolicitud.fechaApertura || "—"} {selectedSolicitud.horaApertura ? `(${selectedSolicitud.horaApertura})` : ""}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-[11px] uppercase tracking-wider text-slate-400">Cierre</p>
                <p className="font-semibold text-slate-800 mt-1">
                  {selectedSolicitud.fechaCierre || "—"} {selectedSolicitud.horaCierre ? `(${selectedSolicitud.horaCierre})` : ""}
                </p>
              </div>
              {selectedSolicitud.tiempoLimite && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3">
                  <p className="text-[11px] uppercase tracking-wider text-blue-700 font-semibold">Contador / Tiempo Límite</p>
                  <p className="font-bold text-blue-900 mt-1 font-mono">⏱ {selectedSolicitud.tiempoLimite} hrs</p>
                </div>
              )}
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-[11px] uppercase tracking-wider text-slate-400">Total / Duración</p>
                <p className="font-semibold text-slate-800 mt-1">{formatTotal(selectedSolicitud)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-[11px] uppercase tracking-wider text-slate-400">Estado</p>
                <div className="mt-1"><StatusBadge estado={selectedSolicitud.estado} /></div>
              </div>
            </div>

            {selectedSolicitud.fechaExpiracion && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-[11px] uppercase tracking-wider text-amber-700 font-semibold">Expiración programada del contador</p>
                <p className="text-sm font-bold text-amber-900 mt-1">
                  {new Date(selectedSolicitud.fechaExpiracion).toLocaleString("es-CO")}
                </p>
              </div>
            )}

            {selectedSolicitud.motivoRechazo && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="text-[11px] uppercase tracking-wider text-red-500 font-semibold">Motivo de Rechazo</p>
                <p className="text-sm text-red-800 mt-1 whitespace-pre-wrap">{selectedSolicitud.motivoRechazo}</p>
              </div>
            )}

            {selectedSolicitud.solicitudExtension && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
                <p className="text-[11px] uppercase tracking-wider text-indigo-500 font-semibold">Autorizado bajo la solicitud previa</p>
                <p className="text-sm text-indigo-800 mt-1 font-bold">{selectedSolicitud.solicitudExtension}</p>
              </div>
            )}

            {selectedSolicitud.observacionResolucion && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Observación de Resolución</p>
                <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{selectedSolicitud.observacionResolucion}</p>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-400">Fecha de registro</p>
              <p className="font-semibold text-slate-800 mt-1">{new Date(selectedSolicitud.fechaRegistro).toLocaleString("es-CO")}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-400">Descripción</p>
              <p className="text-slate-700 mt-1 whitespace-pre-wrap">{selectedSolicitud.descripcion}</p>
            </div>
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Btn v="secondary" onClick={() => {
                setDetailOpen(false);
                setSelectedSolicitud(null);
              }}>
                Cerrar
              </Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
