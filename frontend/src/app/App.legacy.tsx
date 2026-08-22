import { useState, useRef, useEffect } from "react";
// Same-origin in Docker (Nginx proxies /api), configurable for other deployments.
const API_BASE_URL = ((import.meta as any).env?.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8020/api/v1";
import {
  Monitor, ShieldCheck, X, Eye, Pencil, Power, CheckCircle,
  XCircle, Download, Plus, ExternalLink, FileText, BookOpen,
  BarChart3, ArrowLeft, Upload, Printer, AlertCircle,
  ChevronDown, ChevronRight, Settings, Home, ClipboardList,
  Link,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const MODULOS = [
  "ADMISIONES", "CARTERA", "CONTABILIDAD", "CONTRATOS_IPS",
  "FACTURACION", "HOSPITALIZACION", "INVENTARIOS", "PAGOS",
  "TESORERIA", "GENERALES_SEGURIDAD", "CITAS_MEDICAS",
  "HISTORIAS_CLINICAS", "ACTIVOS_FIJOS", "NOMINA",
  "INFORMACION_FINANCIERA_NIIF", "GESTION_GERENCIAL",
  "WEB_CITAS_MEDICAS", "PROGRAMACION_DE_CIRUGIAS", "OTROS",
];
const MODULO_LABELS: Record<string, string> = {
  CONTRATOS_IPS: "CONTRATOS IPS",
  GENERALES_SEGURIDAD: "GENERALES & SEGURIDAD",
  CITAS_MEDICAS: "CITAS MEDICAS",
  HISTORIAS_CLINICAS: "HISTORIAS CLINICAS",
  ACTIVOS_FIJOS: "ACTIVOS FIJOS",
  WEB_CITAS_MEDICAS: "WEB CITAS MEDICAS",
  PROGRAMACION_DE_CIRUGIAS: "PROGRAMACION DE CIRUGIAS",
};
const MODULOS_VALIDATOR = [...MODULOS, "OTROS"];

// ─── Types ────────────────────────────────────────────────────────────────────

type EstadoVersion = "activo" | "inactivo";
type EstadoObs = "aprobacion" | "rechazo";

interface Version {
  id: string;
  titulo: string;
  descripcion: string;
  enlace: string;
  fechaRegistro: string;
  estado: EstadoVersion;
}

interface Observacion {
  id: string;
  versionId: string;
  modulo: string;
  nombre: string;
  cargo?: string;
  fechaHora: string;
  estado: EstadoObs;
  observacion: string;
  incidencia?: string;
  ruta?: string;
  captura?: string[];
  firma?: string;
}

interface ApiVersion {
  oid: number;
  titulo: string;
  descripcion: string;
  enlace: string;
  estado: boolean;
  fecha_registro: string | null;
}

interface ApiBoletin {
  oid: number;
  tipo_documento: string | null;
  consecutivo: number | null;
  fecha: string | null;
  modulo: string | null;
  opcion: string | null;
  impacto: string | null;
  categoria: string | null;
  con_documentacion: boolean;
  asunto: string | null;
  clase_documento: string | null;
  advertencia: string | null;
  instructivo_descripcion: string | null;
  mes: number;
  anio: number;
  archivo: string | null;
}

interface ApiBoletinPeriodo {
  mes: number;
  anio: number;
}

interface ApiBoletinImportResult {
  mes: number;
  anio: number;
  inserted_rows: number;
}

interface ApiManual {
  oid: number;
  modulo: string;
  titulo: string;
  version: string | null;
  fecha_registro: string;
  archivo: string | null;
}

interface ApiSolicitudParametro {
  oid: number;
  tipo_parametro: string;
  descripcion: string;
  fecha_apertura: string | null;
  fecha_cierre: string | null;
  hora_apertura: string | null;
  hora_cierre: string | null;
  total_valor: number | null;
  total_unidad: string | null;
  solicitante: string;
  area: string | null;
  estado: string;
  fecha_registro: string;
}

const toSolicitudParametro = (item: ApiSolicitudParametro): SolicitudParametro => ({
  id: item.oid,
  tipoParametro: item.tipo_parametro as SolicitudParametro["tipoParametro"],
  descripcion: item.descripcion,
  fechaApertura: item.fecha_apertura ?? "",
  fechaCierre: item.fecha_cierre ?? "",
  horaApertura: item.hora_apertura ?? "",
  horaCierre: item.hora_cierre ?? "",
  totalValor: item.total_valor,
  totalUnidad: item.total_unidad,
  solicitante: item.solicitante,
  area: item.area ?? "",
  estado: item.estado as EstadoSolicitud,
  fechaRegistro: item.fecha_registro,
});

type EstadoSolicitud = "Pendiente" | "Aprobado";

interface SolicitudParametro {
  id: number;
  tipoParametro: "Enfermeria" | "Historia Clinica" | "Otros";
  descripcion: string;
  fechaApertura: string;
  fechaCierre: string;
  horaApertura: string;
  horaCierre: string;
  totalValor: number | null;
  totalUnidad: string | null;
  solicitante: string;
  area: string;
  estado: EstadoSolicitud;
  fechaRegistro: string;
}

const toVersion = (version: ApiVersion): Version => ({
  id: `v${version.oid}`,
  titulo: version.titulo,
  descripcion: version.descripcion,
  enlace: version.enlace,
  fechaRegistro: version.fecha_registro?.slice(0, 10) ?? "",
  estado: version.estado ? "activo" : "inactivo",
});

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers as HeadersInit);
  const body = options?.body;
  if (!(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? "No fue posible completar la operación.");
  }
  return response.json() as Promise<T>;
}


// ─── Shared UI Components ─────────────────────────────────────────────────────

function Modal({
  open, onClose, title, children, size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  if (!open) return null;
  const w = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl", xl: "max-w-6xl" }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative bg-white rounded-2xl shadow-2xl w-full ${w} max-h-[90vh] flex flex-col border border-slate-200`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-2xl shrink-0">
          <h2 className="font-semibold text-slate-800 text-sm">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors text-slate-500"
          >
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">{children}</div>
      </div>
    </div>
  );
}

function StatusBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    activo: "bg-emerald-100 text-emerald-700 ring-emerald-200/60",
    inactivo: "bg-slate-100 text-slate-500 ring-slate-200",
    aprobacion: "bg-[#0778ac]/15 text-[#0778ac] ring-[#0778ac]/30",
    rechazo: "bg-[#d43a39]/15 text-[#d43a39] ring-[#d43a39]/30",
    Pendiente: "bg-slate-100 text-slate-600 ring-slate-200",
    Aprobado: "bg-[#0778ac]/15 text-[#0778ac] ring-[#0778ac]/30",
  };
  const labels: Record<string, string> = {
    activo: "Activo", inactivo: "Inactivo",
    aprobacion: "Aprobación", rechazo: "Rechazo",
    Pendiente: "Pendiente", Aprobado: "Aprobado",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ${map[estado] ?? "bg-slate-100 text-slate-600 ring-slate-200"}`}
    >
      {labels[estado] ?? estado}
    </span>
  );
}

type BtnVariant = "primary" | "secondary" | "success" | "danger" | "ghost" | "warning" | "info";

function Btn({
  children, v = "primary", sm = false, onClick, disabled, type = "button", className = "",
}: {
  children: React.ReactNode;
  v?: BtnVariant;
  sm?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const styles: Record<BtnVariant, string> = {
    primary: "bg-[#0778ac] text-white hover:bg-[#056b95] border-[#0778ac]",
    secondary: "bg-white text-slate-700 hover:bg-slate-50 border-slate-300",
    success: "bg-[#0778ac] text-white hover:bg-[#056b95] border-[#0778ac]",
    danger: "bg-[#d43a39] text-white hover:bg-[#b13333] border-[#d43a39]",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 border-transparent",
    warning: "bg-[#d43a39] text-white hover:bg-[#b13333] border-[#d43a39]",
    info: "bg-[#0778ac] text-white hover:bg-[#056b95] border-[#0778ac]",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 border rounded-lg font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm ${
        sm ? "px-2.5 py-1 text-xs" : "px-4 py-2 text-sm"
      } ${styles[v]} ${className}`}
    >
      {children}
    </button>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
      <span className="text-sm text-slate-800">{value}</span>
    </div>
  );
}

function FormInput({
  label, required: req, ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; required?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
        {label}
        {req && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        {...props}
        className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0778ac] focus:border-[#0778ac] transition-all placeholder:text-slate-400"
      />
    </div>
  );
}

function FormTextarea({
  label, required: req, ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; required?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
        {label}
        {req && <span className="text-red-500 ml-1">*</span>}
      </label>
      <textarea
        {...props}
        className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0778ac] focus:border-[#0778ac] transition-all resize-none placeholder:text-slate-400"
      />
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
      {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12 text-slate-400 text-sm">{message}</div>
  );
}


// ─── Parametros Clinicos (NUEVO) ─────────────────────────────────────────────────────────────

interface ParametrosEstado {
  historia_clinica_abierto: boolean;
  historia_clinica_valor: number;
  enfermeria_abierto: boolean;
  enfermeria_hcrenf: number;
  enfermeria_haplmed: number;
}

function ParametroBadge({ title, abierto, valor, valor2 }: { title: string, abierto: boolean, valor: number, valor2?: number }) {
  const valueText = valor2 !== undefined ? `: ${valor}, : ${valor2}` : `${valor}`;
  if (abierto) {
    return (
      <div className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-semibold ring-1 ring-red-300">
        Parametro {title} Abierto {valueText}
      </div>
    );
  }
  return (
    <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold ring-1 ring-green-300">
      Parametro {title} Cerrado {valueText}
    </div>
  );
}

function HabilitarParametroModal({
  open, onClose, onRefresh, onError
}: {
  open: boolean; onClose: () => void; onRefresh: () => void; onError: (msg: string) => void;
}) {
  const [tipo, setTipo] = useState<"Enfermeria" | "Historia Clinica" | "Otros">("Enfermeria");
  const [hcpdiaaut, setHcpdiaaut] = useState(30);
  const [hcnmhcrenf, setHcnmhcrenf] = useState(48);
  const [hcnhaplmed, setHcnhaplmed] = useState(48);
  const [observacion, setObservacion] = useState("");
  const [saving, setSaving] = useState(false);

  const canSubmit = observacion.trim().length >= 5;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setSaving(true);
    api("/parametros-clinicos/habilitar", {
      method: "POST",
      body: JSON.stringify({
        tipo,
        hcpdiaaut: tipo === "Historia Clinica" ? hcpdiaaut : null,
        hcnmhcrenf: tipo === "Enfermeria" ? hcnmhcrenf : null,
        hcnhaplmed: tipo === "Enfermeria" ? hcnhaplmed : null,
        observacion: observacion.trim()
      })
    }).then(() => {
      onRefresh();
      onClose();
      setObservacion("");
    }).catch((e) => {
      onError(e instanceof Error ? e.message : "Error al actualizar parametro");
    }).finally(() => {
      setSaving(false);
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Habilitar/Cerrar Parámetro">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Tipo de Parámetro</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as any)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
          >
            <option value="Enfermeria">Enfermería</option>
            <option value="Historia Clinica">Historia Clínica</option>
            <option value="Otros">Otros</option>
          </select>
        </div>
        {tipo === "Historia Clinica" && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Valor (HCPDIAAUT)</label>
            <input
              type="number"
              value={hcpdiaaut}
              onChange={(e) => setHcpdiaaut(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
            />
          </div>
        )}
        {tipo === "Enfermeria" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Valor (HCNMHRCRENF)</label>
              <input
                type="number"
                value={hcnmhcrenf}
                onChange={(e) => setHcnmhcrenf(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Valor (HCNHAPLMED)</label>
              <input
                type="number"
                value={hcnhaplmed}
                onChange={(e) => setHcnhaplmed(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              />
            </div>
          </div>
        )}
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Observación {tipo === "Otros" && <span className="normal-case text-slate-400">(Describa qué parámetro se está habilitando)</span>}</label>
          <textarea
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            placeholder={tipo === "Otros" ? "Describa qué parámetro se está habilitando..." : "¿Para quién y qué se solicitó?"}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white min-h-[80px]"
          />
        </div>
        <div className="flex gap-2 pt-4 border-t border-slate-100">
          <Btn v="primary" onClick={handleSubmit} disabled={!canSubmit || saving}>
            Confirmar
          </Btn>
          <Btn v="secondary" onClick={onClose}>Cancelar</Btn>
        </div>
      </div>
    </Modal>
  );
}

function SolicitudParametroSection({
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
  const [form, setForm] = useState({
    tipoParametro: "Enfermeria" as SolicitudParametro["tipoParametro"],
    descripcion: "",
    fechaApertura: "",
    fechaCierre: "",
    horaApertura: "",
    horaCierre: "",
    solicitante: "",
    area: "",
    ingreso: "",
    medico: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [open, setOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [coordModalOpen, setCoordModalOpen] = useState(false);
  const [selectedSolicitud, setSelectedSolicitud] = useState<SolicitudParametro | null>(null);
  
  const [paramEstado, setParamEstado] = useState<ParametrosEstado | null>(null);

  const fetchParamEstado = () => {
    api<ParametrosEstado>("/parametros-clinicos/estado").then(setParamEstado).catch(() => {});
  };

  useEffect(() => {
    fetchParamEstado();
  }, []);

  const isOtros = form.tipoParametro === "Otros";
  const isEnfermeria = form.tipoParametro === "Enfermeria";
  const isHistoriaClinica = form.tipoParametro === "Historia Clinica";
  const descriptionLength = form.descripcion.trim().length;
  const minDescriptionMet = !isOtros || descriptionLength >= 50;
  const parsedApertura = form.fechaApertura ? new Date(`${form.fechaApertura}T00:00:00`) : null;
  const parsedCierre = form.fechaCierre ? new Date(`${form.fechaCierre}T00:00:00`) : null;
  const dateRangeValid =
    !form.fechaApertura ||
    !form.fechaCierre ||
    (parsedApertura !== null && parsedCierre !== null && parsedCierre.getTime() >= parsedApertura.getTime());

  const datesValid = isOtros
    ? (form.fechaApertura.trim() !== "" && form.horaApertura.trim() !== "" && dateRangeValid)
    : (form.fechaApertura.trim() !== "" && form.fechaCierre.trim() !== "" && dateRangeValid);

  const totalPreview = (() => {
    if (isOtros || !parsedApertura || !parsedCierre || !dateRangeValid) return null;
    const msPerDay = 1000 * 60 * 60 * 24;
    const diffDays = Math.floor((parsedCierre.getTime() - parsedApertura.getTime()) / msPerDay) + 1;
    if (form.tipoParametro === "Enfermeria") return `${diffDays * 24} hr`;
    if (form.tipoParametro === "Historia Clinica") return `${diffDays} dias`;
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

  const canSubmit =
    form.descripcion.trim() &&
    minDescriptionMet &&
    form.solicitante.trim() &&
    form.area.trim() &&
    extraFieldsValid() &&
    datesValid;

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

  const handleSave = () => {
    if (!canSubmit) return;
    setSaving(true);
    api<ApiSolicitudParametro>("/solicitud-parametro/", {
      method: "POST",
      body: JSON.stringify({
        tipo_parametro: form.tipoParametro,
        descripcion: form.descripcion.trim(),
        fecha_apertura: form.fechaApertura ? form.fechaApertura : null,
        fecha_cierre: form.fechaCierre ? form.fechaCierre : null,
        hora_apertura: isOtros && form.horaApertura ? form.horaApertura : null,
        hora_cierre: isOtros && form.horaCierre ? form.horaCierre : null,
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
          fechaApertura: "",
          fechaCierre: "",
          horaApertura: "",
          horaCierre: "",
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

  const handleApprove = (id: number) => {
    api<ApiSolicitudParametro>(`/solicitud-parametro/${id}/aprobar`, {
      method: "PUT",
    })
      .then((updated) => {
        const row = toSolicitudParametro(updated);
        setSolicitudes((prev) => prev.map((item) => (item.id === id ? row : item)));
      })
      .catch((error) => {
        onError(error instanceof Error ? error.message : "No fue posible aprobar la solicitud.");
      });
  };

  const handleViewDetail = (item: SolicitudParametro) => {
    setSelectedSolicitud(item);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <SectionHeader
          title="Solicitud Parámetro"
          subtitle="Cree y revise solicitudes de parámetros para soporte clínico."
        />
        <div className="flex flex-col items-end gap-3">
          <div className="flex gap-2">
            {canHabilitarParametro && (
              <Btn v="warning" onClick={() => setCoordModalOpen(true)}>
                Habilitar/Cerrar Parámetro
              </Btn>
            )}
            <Btn v="primary" onClick={() => setOpen(true)}>
              <Plus size={14} /> Nueva Solicitud
            </Btn>
          </div>
          {paramEstado && (
            <div className="flex flex-col items-end gap-1.5">
              <ParametroBadge title="Enfermeria" abierto={paramEstado.enfermeria_abierto} valor={paramEstado.enfermeria_hcrenf} valor2={paramEstado.enfermeria_haplmed} />
              <ParametroBadge title="Historia Clinica" abierto={paramEstado.historia_clinica_abierto} valor={paramEstado.historia_clinica_valor} />
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-[#0778ac]/15 bg-[#0778ac]/5 p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-[#0778ac]/70">Solicitudes</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{solicitudes.length}</p>
          <p className="mt-2 text-sm text-slate-500">Total de solicitudes registradas.</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Pendientes</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{solicitudes.filter((s) => s.estado === "Pendiente").length}</p>
          <p className="mt-2 text-sm text-slate-500">Solicitudes en espera de revisión.</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Aprobadas</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{solicitudes.filter((s) => s.estado === "Aprobado").length}</p>
          <p className="mt-2 text-sm text-slate-500">Solicitudes aprobadas por el coordinador.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {["Tipo de Parámetro", "Solicitante", "Área", "Apertura", "Cierre", "Total", "Estado", "Acciones"].map((heading) => (
                <th
                  key={heading}
                  className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400 text-sm">
                    Cargando solicitudes...
                  </td>
                </tr>
              ) : solicitudes.length === 0 ? (
              <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400 text-sm">
                  No hay solicitudes registradas.
                </td>
              </tr>
              ) : (
              solicitudes.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3 text-xs font-semibold text-[#0778ac]">{item.tipoParametro}</td>
                  <td className="px-4 py-3 text-slate-700">{item.solicitante}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{item.area || "—"}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs font-mono">{item.fechaApertura || "—"}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs font-mono">{item.fechaCierre || "—"}</td>
                  <td className="px-4 py-3 text-slate-700 text-xs font-semibold">{formatTotal(item)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge estado={item.estado} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Btn v="secondary" sm onClick={() => handleViewDetail(item)}>
                        Consultar
                      </Btn>
                      {canApprove && (
                        item.estado === "Aprobado" ? (
                          <span className="text-xs text-slate-500 self-center">Aprobada</span>
                        ) : (
                          <Btn v="primary" sm onClick={() => handleApprove(item.id)}>
                            Aprobar
                          </Btn>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <HabilitarParametroModal 
        open={coordModalOpen} 
        onClose={() => setCoordModalOpen(false)} 
        onRefresh={fetchParamEstado}
        onError={onError}
      />

      <Modal open={open} onClose={() => setOpen(false)} title="Nueva Solicitud de Parámetro" size="md">
        <div className="space-y-4">
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
                <option value="Enfermeria">Enfermería</option>
                <option value="Historia Clinica">Historia Clínica</option>
                <option value="Otros">Otros</option>
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
                Fecha de apertura *
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
                Fecha de cierre {isOtros ? <span className="normal-case text-slate-400 font-normal">(Opcional)</span> : "*"}
              </label>
              <input
                type="date"
                value={form.fechaCierre}
                onChange={(e) => setForm({ ...form, fechaCierre: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0778ac]"
              />
            </div>
          </div>
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
          {!isOtros && totalPreview && (
            <p className="text-xs text-slate-600">Total calculado: <span className="font-semibold text-slate-900">{totalPreview}</span></p>
          )}
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <Btn v="primary" onClick={handleSave} disabled={!canSubmit || saving}>
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
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-[11px] uppercase tracking-wider text-slate-400">Total</p>
                <p className="font-semibold text-slate-800 mt-1">{formatTotal(selectedSolicitud)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-[11px] uppercase tracking-wider text-slate-400">Estado</p>
                <div className="mt-1"><StatusBadge estado={selectedSolicitud.estado} /></div>
              </div>
            </div>
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

// ─── Coordinator Module ───────────────────────────────────────────────────────

type CoordTab = "registro" | "consulta" | "detalles" | "solicitudParametro" | "reporteFirmas" | "reporteDetalles";

function CoordinatorModule({
  versions, setVersions, observaciones, setObservaciones, onError,
  selectedSection,
  onSelectSection,
  loggedUser,
}: {
  loggedUser: string;
  versions: Version[];
  setVersions: React.Dispatch<React.SetStateAction<Version[]>>;
  observaciones: Observacion[];
  setObservaciones: React.Dispatch<React.SetStateAction<Observacion[]>>;
  onError: (message: string) => void;
  selectedSection: CoordTab;
  onSelectSection: React.Dispatch<React.SetStateAction<CoordTab>>;
}) {
  const [tab, setTab] = useState<CoordTab>(selectedSection);
  const [activeSection, setActiveSection] = useState<CoordTab | "reportes" | "documentos">(selectedSection);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [documentView, setDocumentView] = useState<"boletines" | "manuales" | null>(null);
  const [solicitudes, setSolicitudes] = useState<SolicitudParametro[]>([]);

  useEffect(() => {
    setTab(selectedSection);
    setActiveSection(selectedSection);
  }, [selectedSection]);

  const goToSection = (section: CoordTab) => {
    setTab(section);
    setActiveSection(section);
    onSelectSection(section);
    setReportsOpen(false);
    setDocumentsOpen(false);
    setDocumentView(null);
  };

  const allNavItems: { key: "registro" | "consulta" | "detalles" | "solicitudParametro"; label: string; icon: React.ReactNode }[] = [
    { key: "registro", label: "Registro de Versión", icon: <Plus size={14} /> },
    { key: "consulta", label: "Consulta de Versión", icon: <ClipboardList size={14} /> },
    { key: "detalles", label: "Detalles de Validación", icon: <Eye size={14} /> },
    { key: "solicitudParametro", label: "Solicitud Parámetro", icon: <ClipboardList size={14} /> },
  ];
  
  const navItems = loggedUser === "practicante" 
    ? allNavItems.filter(item => item.key === "solicitudParametro") 
    : allNavItems;


  return (
    <div className="flex flex-col h-full">
      <nav className="bg-[#0778ac] text-white px-4 flex items-center gap-1 h-13 shrink-0">
        <span className="text-xs font-bold tracking-widest uppercase text-white/90 mr-4 shrink-0">
          COORDINADOR
        </span>
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => goToSection(item.key)}
            className={`flex items-center gap-1.5 px-3.5 py-3 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
              activeSection === item.key
                ? "border-white text-white bg-white/10"
                : "border-transparent text-white/85 hover:text-white hover:border-white/60"
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
        <div className="relative">
          <button
            onClick={() => { setReportsOpen(!reportsOpen); setDocumentsOpen(false); }}
            className={`flex items-center gap-1.5 px-3.5 py-3 text-sm font-semibold transition-all border-b-2 ${
              activeSection === "reportes"
                ? "border-white text-white bg-white/10"
                : "border-transparent text-white/85 hover:text-white hover:border-white/60"
            }`}
          >
            <BarChart3 size={14} />
            Reportes
            <ChevronDown
              size={12}
              className={`transition-transform ${reportsOpen ? "rotate-180" : ""}`}
            />
          </button>
          {reportsOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-30 min-w-56">
              <button
                onClick={() => { setTab("reporteFirmas"); setActiveSection("reportes"); setReportsOpen(false); setDocumentsOpen(false); setDocumentView(null); }}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-[#0778ac]/10 hover:text-[#0778ac] transition-colors"
              >
                Reporte de Firmas de Directivos
              </button>
              <button
                onClick={() => { setTab("reporteDetalles"); setActiveSection("reportes"); setReportsOpen(false); setDocumentsOpen(false); setDocumentView(null); }}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-[#0778ac]/10 hover:text-[#0778ac] transition-colors"
              >
                Reporte de Detalles de Validación
              </button>
            </div>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => { setDocumentsOpen(!documentsOpen); setReportsOpen(false); }}
            className={`flex items-center gap-1.5 px-3.5 py-3 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
              activeSection === "documentos"
                ? "border-white text-white bg-white/10"
                : "border-transparent text-white/85 hover:text-white hover:border-white/60"
            }`}
          >
            <FileText size={14} />
            Documentos
            <ChevronDown
              size={12}
              className={`transition-transform ${documentsOpen ? "rotate-180" : ""}`}
            />
          </button>
          {documentsOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-30 min-w-56">
              <button
                onClick={() => { setActiveSection("documentos"); setDocumentView("boletines"); setDocumentsOpen(false); setReportsOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-[#0778ac]/10 hover:text-[#0778ac] transition-colors"
              >
                Boletines
              </button>
              <button
                onClick={() => { setActiveSection("documentos"); setDocumentView("manuales"); setDocumentsOpen(false); setReportsOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-[#0778ac]/10 hover:text-[#0778ac] transition-colors"
              >
                Manuales de Usuarios
              </button>
            </div>
          )}
        </div>
      </nav>

      <div className="flex-1 overflow-auto bg-[#f8f9fa] p-6">
        {activeSection === "registro" && (
          <VersionRegistration versions={versions} setVersions={setVersions} onError={onError} />
        )}
        {activeSection === "consulta" && (
          <VersionQuery versions={versions} setVersions={setVersions} onError={onError} />
        )}
        {activeSection === "detalles" && (
          <ValidationDetails versions={versions} observaciones={observaciones} />
        )}
        {activeSection === "documentos" && (
          <>
            {documentView === "boletines" && <Boletines />}
            {documentView === "manuales" && <ManualesUsuarios />}
            {documentView === null && (
              <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500">
                Seleccione Documentos → Boletines o Manuales de Usuarios.
              </div>
            )}
          </>
        )}
        {activeSection === "solicitudParametro" && (
          <SolicitudParametroSection
            solicitudes={solicitudes}
            setSolicitudes={setSolicitudes}
            onError={onError}
            canApprove={true}
            canHabilitarParametro={true}
          />
        )}
        {activeSection === "reportes" && tab === "reporteFirmas" && (
          <ReportFirmas versions={versions} observaciones={observaciones} />
        )}
        {activeSection === "reportes" && tab === "reporteDetalles" && (
          <ReportDetalles versions={versions} observaciones={observaciones} />
        )}
      </div>
    </div>
  );
}

// ─── 1. Version Registration ──────────────────────────────────────────────────

function VersionRegistration({
  setVersions,
  onError,
}: {
  versions: Version[];
  setVersions: React.Dispatch<React.SetStateAction<Version[]>>;
  onError: (message: string) => void;
}) {
  const [form, setForm] = useState({ titulo: "", descripcion: "", enlace: "" });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.titulo.trim() || !form.descripcion.trim() || !form.enlace.trim()) return;
    setSaving(true);
    try {
      const created = await api<ApiVersion>("/versions/", {
        method: "POST",
        body: JSON.stringify({ ...form, usuario: "Coordinador de Sistemas" }),
      });
      setVersions((prev) => [toVersion(created), ...prev]);
      setForm({ titulo: "", descripcion: "", enlace: "" });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      onError(error instanceof Error ? error.message : "No fue posible guardar la versión.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <SectionHeader
        title="Registro de Versión del Sistema"
        subtitle="Complete los datos para registrar una nueva versión de pruebas."
      />
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-5">
        <FormInput
          label="Título (Versión del Sistema)"
          required
          placeholder=""
          value={form.titulo}
          onChange={(e) => setForm({ ...form, titulo: e.target.value })}
        />
        <FormTextarea
          label="Descripción (Detalles de mejoras en la actualización)"
          required
          rows={5}
          placeholder=""
          value={form.descripcion}
          onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
        />
        <FormInput
          label="Enlace (URL de la versión de pruebas)"
          required
          type="url"
          placeholder=""
          value={form.enlace}
          onChange={(e) => setForm({ ...form, enlace: e.target.value })}
        />
        <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
          <Btn v="primary" onClick={handleSave} disabled={saving}>
            <Plus size={15} /> Guardar Versión
          </Btn>
          {saved && (
            <span className="text-sm text-emerald-600 flex items-center gap-1.5 font-medium">
              <CheckCircle size={15} /> Versión registrada exitosamente
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 2. Version Query ─────────────────────────────────────────────────────────

function VersionQuery({
  versions, setVersions, onError,
}: {
  versions: Version[];
  setVersions: React.Dispatch<React.SetStateAction<Version[]>>;
  onError: (message: string) => void;
}) {
  const [detailsModal, setDetailsModal] = useState<Version | null>(null);
  const [editModal, setEditModal] = useState<Version | null>(null);
  const [editForm, setEditForm] = useState({ titulo: "", descripcion: "", enlace: "" });

  function openEdit(v: Version) {
    setEditForm({ titulo: v.titulo, descripcion: v.descripcion, enlace: v.enlace });
    setEditModal(v);
  }

  async function saveEdit() {
    if (!editModal) return;
    try {
      const updated = await api<ApiVersion>(`/versions/${editModal.id.slice(1)}`, {
        method: "PUT",
        body: JSON.stringify(editForm),
      });
      setVersions((prev) => prev.map((v) => (v.id === editModal.id ? toVersion(updated) : v)));
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
      setVersions((prev) => prev.map((v) => (v.id === version.id ? toVersion(updated) : v)));
    } catch (error) {
      onError(error instanceof Error ? error.message : "No fue posible cambiar el estado.");
    }
  }

  return (
    <div>
      <SectionHeader
        title="Consulta de Versiones del Sistema"
        subtitle={`${versions.length} versión(es) registradas`}
      />
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {["Título Versión", "Fecha Registro", "Estado", "Enlace", "Acciones"].map((h) => (
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
            {versions.map((v) => (
              <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-900 max-w-xs">{v.titulo}</td>
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
                  <div className="flex items-center gap-1">
                    <Btn v="ghost" sm onClick={() => setDetailsModal(v)}>
                      <Eye size={13} /> Consultar
                    </Btn>
                    <Btn v="ghost" sm onClick={() => openEdit(v)}>
                      <Pencil size={13} /> Editar
                    </Btn>
                    <Btn
                      v={v.estado === "activo" ? "warning" : "success"}
                      sm
                      onClick={() => toggleEstado(v)}
                    >
                      <Power size={13} />
                      {v.estado === "activo" ? "Inactivar" : "Activar"}
                    </Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!detailsModal} onClose={() => setDetailsModal(null)} title="Detalles de la Versión">
        {detailsModal && (
          <div className="flex flex-col gap-5">
            <Field label="Título" value={detailsModal.titulo} />
            <Field label="Descripción" value={detailsModal.descripcion} />
            <div className="flex gap-6">
              <Field label="Estado" value={detailsModal.estado} />
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
    </div>
  );
}

// ─── 3. Validation Details ────────────────────────────────────────────────────

function ValidationDetails({
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
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
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
              {MODULOS.map((modulo) => {
                const s = getStats(modulo);
                return (
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={versionSelectorOpen}
        onClose={() => setVersionSelectorOpen(false)}
        title="Seleccionar Versión"
        size="lg"
      >
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {["Título", "Fecha Registro", "Estado", "Acción"].map((h) => (
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
            {versions.map((v) => (
              <tr key={v.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{v.titulo}</td>
                <td className="px-4 py-3 text-slate-500 font-mono text-xs">{v.fechaRegistro}</td>
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

function ReportFirmas({
  versions, observaciones,
}: {
  versions: Version[];
  observaciones: Observacion[];
}) {
  const [selectedVid, setSelectedVid] = useState("");
  const [reportContextOpen, setReportContextOpen] = useState(false);
  const [reportContext, setReportContext] = useState({ conclusion: "", observacion: "" });
  const version = versions.find((v) => v.id === selectedVid);
  const filteredObs = observaciones.filter((o) => o.versionId === selectedVid);

  function generatePDF() {
    if (!version) return;
    const reportLogoUrl = new URL("../image/logo.png", import.meta.url).href;
    const reportFooterStripUrl = new URL("../image/firmas.png", import.meta.url).href;

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

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Acta de Reunión</title>
<style>
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
</style></head><body>
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

</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 300);
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
            <Printer size={15} /> Generar PDF
          </Btn>
        </div>

        {selectedVid &&
          (filteredObs.length === 0 ? (
            <EmptyState message="No hay observaciones registradas para esta versión." />
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
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
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredObs.map((o, i) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-400 text-xs">{i + 1}</td>
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
              <Printer size={15} /> Generar Informe
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

// ─── 4.2 Report Detalles ──────────────────────────────────────────────────────

function ReportDetalles({
  versions, observaciones,
}: {
  versions: Version[];
  observaciones: Observacion[];
}) {
  const [selectedVid, setSelectedVid] = useState("");
  const version = versions.find((v) => v.id === selectedVid);
  const filteredObs = observaciones.filter((o) => o.versionId === selectedVid);

  function generatePDF() {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Reporte de Validación</title>
<style>
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
</style></head><body>
<h1>Reporte de Detalles de Validación</h1>
<div class="sub">${version?.titulo ?? ""} &nbsp;|&nbsp; Generado: ${new Date().toLocaleDateString("es-CO", { dateStyle: "long" })}</div>
${filteredObs
  .map(
    (o) => `<div class="obs ${o.estado === "aprobacion" ? "ap" : "re"}">
  <div class="obs-head">
    <strong>${o.nombre}</strong>
    <span class="badge ${o.estado === "aprobacion" ? "apb" : "reb"}">${o.estado === "aprobacion" ? "Aprobación" : "Rechazo"}</span>
  </div>
  <div class="meta">Módulo: <strong>${o.modulo}</strong> &nbsp;|&nbsp; ${o.fechaHora}</div>
  <div class="text">${o.observacion}</div>
  ${o.incidencia || o.ruta ? `<div class="extra">${o.incidencia ? `Incidencia: <strong>${o.incidencia}</strong>` : ""}${o.ruta ? ` &nbsp;|&nbsp; Ruta: ${o.ruta}` : ""}</div>` : ""}
</div>`
  )
  .join("")}
</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 300);
  }

  return (
    <div>
      <SectionHeader
        title="Reporte de Detalles de Validación"
        subtitle="Genera un reporte PDF con todos los registros de validación de una versión."
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
            onClick={generatePDF}
            disabled={!selectedVid || filteredObs.length === 0}
          >
            <Printer size={15} /> Generar PDF
          </Btn>
        </div>

        {selectedVid &&
          (filteredObs.length === 0 ? (
            <EmptyState message="No hay observaciones registradas para esta versión." />
          ) : (
            <div className="flex flex-col gap-3">
              {filteredObs.map((o) => (
                <div
                  key={o.id}
                  className={`p-4 rounded-xl border ${
                    o.estado === "aprobacion"
                      ? "border-emerald-200 bg-emerald-50 border-l-4 border-l-emerald-500"
                      : "border-[#d43a39]/20 bg-[#d43a39]/10 border-l-4 border-l-[#d43a39]"
                  }`}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <div>
                      <span className="font-semibold text-slate-900 text-sm">{o.nombre}</span>
                      <span className="text-xs text-slate-500 ml-2">— {o.modulo}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge estado={o.estado} />
                      <span className="text-xs font-mono text-slate-400">{o.fechaHora}</span>
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{o.observacion}</p>
                  {(o.incidencia || o.ruta) && (
                    <div className="mt-2.5 pt-2.5 border-t border-[#d43a39]/20 flex gap-6">
                      {o.incidencia && <Field label="Incidencia" value={o.incidencia} />}
                      {o.ruta && <Field label="Ruta" value={o.ruta} />}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}

// ─── Validator Module ─────────────────────────────────────────────────────────

type ValidatorTab = "registro" | "boletines" | "manuales";

function ValidatorModule({
  versions, observaciones, setObservaciones, onError,
}: {
  versions: Version[];
  observaciones: Observacion[];
  setObservaciones: React.Dispatch<React.SetStateAction<Observacion[]>>;
  onError: (message: string) => void;
}) {
  const [tab, setTab] = useState<ValidatorTab>("registro");

  const navItems: { key: ValidatorTab; label: string; icon: React.ReactNode }[] = [
    { key: "registro", label: "Registro de Validación", icon: <ClipboardList size={14} /> },
    { key: "boletines", label: "Boletines", icon: <FileText size={14} /> },
    { key: "manuales", label: "Manuales de Usuarios", icon: <BookOpen size={14} /> },
  ];

  return (
    <div className="flex flex-col h-full">
      <nav className="bg-[#0778ac] text-white px-4 flex items-center gap-1 h-13 shrink-0">
        <span className="text-xs font-bold tracking-widest uppercase text-white/90 mr-4 shrink-0">
          VALIDADOR
        </span>
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`flex items-center gap-1.5 px-3.5 py-3 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
              tab === item.key
                ? "border-white text-white bg-white/10"
                : "border-transparent text-white/85 hover:text-white hover:border-white/60"
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
      <div className="flex-1 overflow-auto bg-slate-50 p-6">
        {tab === "registro" && (
          <ValidationRegistration
            versions={versions}
            observaciones={observaciones}
            setObservaciones={setObservaciones}
            onError={onError}
          />
        )}
        {tab === "boletines" && <Boletines canUpload={false} />}
        {tab === "manuales" && <ManualesUsuarios canUpload={false} />}
      </div>
    </div>
  );
}

function DocumentModule({ onError }: { onError: (message: string) => void }) {
  const [tab, setTab] = useState<"boletines" | "manuales">("boletines");

  return (
    <div className="flex flex-col h-full">
      <nav className="bg-slate-950 text-white px-4 flex items-center gap-0.5 h-11 shrink-0">
        <span className="text-[10px] font-bold tracking-widest uppercase text-slate-300/80 mr-4 shrink-0">
          DOCUMENTOS
        </span>
        <button
          onClick={() => setTab("boletines")}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium transition-all border-b-2 whitespace-nowrap ${
            tab === "boletines"
              ? "border-slate-300 text-white bg-white/5"
              : "border-transparent text-slate-300 hover:text-white hover:border-slate-400/50"
          }`}
        >
          <FileText size={14} /> Boletines
        </button>
        <button
          onClick={() => setTab("manuales")}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium transition-all border-b-2 whitespace-nowrap ${
            tab === "manuales"
              ? "border-slate-300 text-white bg-white/5"
              : "border-transparent text-slate-300 hover:text-white hover:border-slate-400/50"
          }`}
        >
          <BookOpen size={14} /> Manuales de Usuarios
        </button>
      </nav>

      <div className="flex-1 overflow-auto bg-slate-50 p-6">
        {tab === "boletines" && <Boletines />}
        {tab === "manuales" && <ManualesUsuarios />}
      </div>
    </div>
  );
}

// ─── Validator: Registration ──────────────────────────────────────────────────

function ValidationRegistration({
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

  return (
    <div>
      <SectionHeader
        title="Registro de Validación del Sistema"
        subtitle="Versiones disponibles para validación. Registre sus observaciones, aprobaciones o rechazos."
      />
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {["Título Versión", "Fecha Registro", "Estado", "Enlace", "Obs.", "Acciones"].map((h) => (
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
            {versions.map((v) => (
              <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-900 max-w-xs">{v.titulo}</td>
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

// ─── Boletines ────────────────────────────────────────────────────────────────

function Boletines({ canUpload = true }: { canUpload?: boolean }) {
  const [items, setItems] = useState<ApiBoletin[]>([]);
  const [periodos, setPeriodos] = useState<ApiBoletinPeriodo[]>([]);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedBoletin, setSelectedBoletin] = useState<ApiBoletin | null>(null);
  const [selectedMes, setSelectedMes] = useState<number | "">("");
  const [selectedAnio, setSelectedAnio] = useState<number | "">("");
  const [filters, setFilters] = useState({
    consecutivo: "",
    modulo: "",
    fecha: "",
    opcion: "",
    impacto: "",
    categoria: "",
    clase_documento: "",
    asunto: "",
  });
  const [form, setForm] = useState({
    mes: new Date().getMonth() + 1,
    anio: new Date().getFullYear(),
    archivo: null as File | null,
  });

  const monthName = (month: number) => {
    const names = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
    ];
    return names[month - 1] ?? `Mes ${month}`;
  };

  const loadPeriodos = async () => {
    const data = await api<ApiBoletinPeriodo[]>("/boletines/periodos");
    setPeriodos(data);
    return data;
  };

  const loadItems = async (mes: number | "", anio: number | "") => {
    setLoading(true);
    try {
      const query = mes && anio ? `?mes=${mes}&anio=${anio}` : "";
      const data = await api<ApiBoletin[]>(`/boletines/${query}`);
      setItems(data);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible consultar boletines.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await loadPeriodos();
        if (!active) return;
        if (data.length > 0) {
          setSelectedMes(data[0].mes);
          setSelectedAnio(data[0].anio);
          await loadItems(data[0].mes, data[0].anio);
        } else {
          await loadItems("", "");
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "No fue posible cargar periodos.");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedMes || !selectedAnio) return;
    loadItems(selectedMes, selectedAnio);
  }, [selectedMes, selectedAnio]);

  const periodKey = (p: ApiBoletinPeriodo) => `${p.anio}-${p.mes}`;
  const uniqueYears = [...new Set(periodos.map((p) => p.anio))].sort((a, b) => b - a);
  const monthsForYear = periodos
    .filter((p) => (selectedAnio ? p.anio === selectedAnio : true))
    .map((p) => p.mes)
    .filter((value, index, arr) => arr.indexOf(value) === index)
    .sort((a, b) => a - b);

  const normalize = (value: string | null | undefined) => (value ?? "").toLowerCase().trim();
  const formatDate = (value: string | null) => (value ? value.slice(0, 10) : "");

  const uniqueValues = {
    consecutivo: [...new Set(items.map((b) => (b.consecutivo != null ? String(b.consecutivo) : "")).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    fecha: [...new Set(items.map((b) => formatDate(b.fecha)).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    modulo: [...new Set(items.map((b) => b.modulo).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b)),
    opcion: [...new Set(items.map((b) => b.opcion).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b)),
    impacto: [...new Set(items.map((b) => b.impacto).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b)),
    categoria: [...new Set(items.map((b) => b.categoria).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b)),
    clase_documento: [...new Set(items.map((b) => b.clase_documento).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b)),
    asunto: [...new Set(items.map((b) => b.asunto).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b)),
  };

  const filteredItems = items.filter((b) => {
    const byConsecutivo = String(b.consecutivo ?? "").toLowerCase().includes(normalize(filters.consecutivo));
    const byModulo = normalize(b.modulo).includes(normalize(filters.modulo));
    const byFecha = formatDate(b.fecha).toLowerCase().includes(normalize(filters.fecha));
    const byOpcion = normalize(b.opcion).includes(normalize(filters.opcion));
    const byImpacto = normalize(b.impacto).includes(normalize(filters.impacto));
    const byCategoria = normalize(b.categoria).includes(normalize(filters.categoria));
    const byClaseDoc = normalize(b.clase_documento).includes(normalize(filters.clase_documento));
    const byAsunto = normalize(b.asunto).includes(normalize(filters.asunto));

    return byConsecutivo && byModulo && byFecha && byOpcion && byImpacto && byCategoria && byClaseDoc && byAsunto;
  });

  const handleOpenDetail = (item: ApiBoletin) => {
    setSelectedBoletin(item);
    setDetailOpen(true);
  };

  async function handleSubmit() {
    if (!form.archivo) {
      setError("Debe seleccionar un archivo Excel (.xlsx).");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const body = new FormData();
      body.append("mes", String(form.mes));
      body.append("anio", String(form.anio));
      body.append("archivo", form.archivo);

      const imported = await api<ApiBoletinImportResult>("/boletines/", {
        method: "POST",
        body,
      });

      const updatedPeriodos = await loadPeriodos();
      const exists = updatedPeriodos.some((p) => p.mes === imported.mes && p.anio === imported.anio);
      if (!exists) {
        setPeriodos((prev) => [...prev, { mes: imported.mes, anio: imported.anio }]);
      }
      setSelectedMes(imported.mes);
      setSelectedAnio(imported.anio);
      await loadItems(imported.mes, imported.anio);

      setForm({
        mes: new Date().getMonth() + 1,
        anio: new Date().getFullYear(),
        archivo: null,
      });
      setFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible importar el archivo de boletines.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <SectionHeader
          title="Boletines"
          subtitle="Cargue el archivo Excel por mes/año y consulte el detalle por periodo."
        />
        {canUpload && (
          <Btn v="primary" onClick={() => setFormOpen(true)}>
            <Plus size={14} /> Cargar Excel
          </Btn>
        )}
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-4">
        <div className="grid gap-3 md:grid-cols-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Año</label>
            <select
              value={selectedAnio}
              onChange={(e) => {
                const year = Number(e.target.value);
                setSelectedAnio(year);
                const firstMonth = periodos.find((p) => p.anio === year)?.mes;
                setSelectedMes(firstMonth ?? "");
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              disabled={uniqueYears.length === 0}
            >
              <option value="">Seleccione...</option>
              {uniqueYears.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Mes</label>
            <select
              value={selectedMes}
              onChange={(e) => setSelectedMes(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              disabled={monthsForYear.length === 0}
            >
              <option value="">Seleccione...</option>
              {monthsForYear.map((month) => (
                <option key={month} value={month}>{monthName(month)}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 text-sm text-slate-500">
            {selectedMes && selectedAnio
              ? `Mostrando boletines de ${monthName(selectedMes)} ${selectedAnio}.`
              : "Seleccione un mes y año para consultar los boletines."}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        {error && <EmptyState message={error} />}
        {!error && loading && <EmptyState message="Cargando boletines..." />}
        {!error && !loading && items.length === 0 && <EmptyState message="No hay boletines para el periodo seleccionado." />}
        {!error && !loading && items.length > 0 && (
          <table className="w-full text-sm min-w-[960px] table-fixed">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {[
                  "Accion",
                  "Consecutivo",
                  "Modulo",
                  "Fecha",
                  "Opcion",
                  "Impacto",
                  "Categoria",
                  "Clase de documento",
                  "Asunto",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-3 py-2 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
              <tr className="border-t border-slate-200">
                <th className="px-3 py-2">
                  <span className="text-[10px] text-slate-400 uppercase">Filtro</span>
                </th>
                <th className="px-3 py-2">
                  <input
                    list="boletin-consecutivo-options"
                    value={filters.consecutivo}
                    onChange={(e) => setFilters((prev) => ({ ...prev, consecutivo: e.target.value }))}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                    placeholder="Filtrar"
                  />
                  <datalist id="boletin-consecutivo-options">
                    {uniqueValues.consecutivo.map((value) => (
                      <option key={value} value={value} />
                    ))}
                  </datalist>
                </th>
                <th className="px-3 py-2">
                  <input
                    list="boletin-modulo-options"
                    value={filters.modulo}
                    onChange={(e) => setFilters((prev) => ({ ...prev, modulo: e.target.value }))}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                    placeholder="Filtrar"
                  />
                  <datalist id="boletin-modulo-options">
                    {uniqueValues.modulo.map((value) => (
                      <option key={value} value={value} />
                    ))}
                  </datalist>
                </th>
                <th className="px-3 py-2">
                  <input
                    list="boletin-fecha-options"
                    value={filters.fecha}
                    onChange={(e) => setFilters((prev) => ({ ...prev, fecha: e.target.value }))}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                    placeholder="yyyy-mm-dd"
                  />
                  <datalist id="boletin-fecha-options">
                    {uniqueValues.fecha.map((value) => (
                      <option key={value} value={value} />
                    ))}
                  </datalist>
                </th>
                <th className="px-3 py-2">
                  <input
                    value={filters.opcion ?? ""}
                    onChange={(e) => setFilters((prev) => ({ ...prev, opcion: e.target.value }))}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                    placeholder="Filtrar"
                  />
                </th>
                <th className="px-3 py-2">
                  <input
                    list="boletin-impacto-options"
                    value={filters.impacto}
                    onChange={(e) => setFilters((prev) => ({ ...prev, impacto: e.target.value }))}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                    placeholder="alto/medio/bajo"
                  />
                  <datalist id="boletin-impacto-options">
                    {uniqueValues.impacto.map((value) => (
                      <option key={value} value={value} />
                    ))}
                  </datalist>
                </th>
                <th className="px-3 py-2">
                  <input
                    value={filters.categoria ?? ""}
                    onChange={(e) => setFilters((prev) => ({ ...prev, categoria: e.target.value }))}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                    placeholder="Filtrar"
                  />
                </th>
                <th className="px-3 py-2">
                  <input
                    value={filters.clase_documento ?? ""}
                    onChange={(e) => setFilters((prev) => ({ ...prev, clase_documento: e.target.value }))}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                    placeholder="Filtrar"
                  />
                </th>
                <th className="px-3 py-2">
                  <input
                    list="boletin-asunto-options"
                    value={filters.asunto}
                    onChange={(e) => setFilters((prev) => ({ ...prev, asunto: e.target.value }))}
                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                    placeholder="Filtrar"
                  />
                  <datalist id="boletin-asunto-options">
                    {uniqueValues.asunto.map((value) => (
                      <option key={value} value={value} />
                    ))}
                  </datalist>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((b) => {
                const impactoLower = (b.impacto || "").toLowerCase();
                const impactoColor = impactoLower === "alto" ? "text-red-600 font-semibold" 
                  : impactoLower === "medio" ? "text-orange-500 font-semibold" 
                  : impactoLower === "bajo" ? "text-yellow-500 font-semibold" 
                  : "text-slate-600";
                return (
                <tr key={b.oid} className="hover:bg-slate-50/70">
                  <td className="px-3 py-2 text-center">
                    <Btn v="secondary" sm onClick={() => handleOpenDetail(b)}>
                      Consultar
                    </Btn>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{b.consecutivo ?? "—"}</td>
                  <td className="px-3 py-2 text-slate-600">{b.modulo || "—"}</td>
                  <td className="px-3 py-2 text-slate-600">{b.fecha?.slice(0, 10) ?? "—"}</td>
                  <td className="px-3 py-2 text-slate-600">{b.opcion || "—"}</td>
                  <td className={`px-3 py-2 ${impactoColor}`}>{b.impacto || "—"}</td>
                  <td className="px-3 py-2 text-slate-600">{b.categoria || "—"}</td>
                  <td className="px-3 py-2 text-slate-600">{b.clase_documento || "—"}</td>
                  <td className="px-3 py-2 text-slate-700 max-w-[280px] truncate" title={b.asunto || ""}>{b.asunto || "—"}</td>
                </tr>
                );
              })}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-400 text-sm">
                    No hay resultados para los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedBoletin(null);
        }}
        title="Detalle del Boletin"
        size="lg"
      >
        {!selectedBoletin ? null : (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              {[
                ["Tipo de Documento", selectedBoletin.tipo_documento],
                ["Consecutivo", selectedBoletin.consecutivo?.toString() ?? "—"],
                ["Fecha", selectedBoletin.fecha?.slice(0, 10) ?? "—"],
                ["Modulo", selectedBoletin.modulo],
                ["Opcion", selectedBoletin.opcion],
                ["Impacto", selectedBoletin.impacto],
                ["Categoria", selectedBoletin.categoria],
                ["Con Documentacion", selectedBoletin.con_documentacion ? "Si" : "No"],
                ["Clase de documento", selectedBoletin.clase_documento],
                ["Advertencia", selectedBoletin.advertencia],
              ].map(([label, value]) => (
                <div key={label as string} className="rounded-xl border border-slate-200 p-3">
                  <p className="text-[11px] uppercase tracking-wider text-slate-400">{label}</p>
                  <p className="text-sm text-slate-700 mt-1 break-words">{value || "—"}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-400">Asunto</p>
              <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{selectedBoletin.asunto || "—"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-400">Instructivos - Descripcion</p>
              <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{selectedBoletin.instructivo_descripcion || "—"}</p>
            </div>
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Btn v="secondary" onClick={() => setDetailOpen(false)}>Cerrar</Btn>
            </div>
          </div>
        )}
      </Modal>

      {canUpload && (
        <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Importar Boletines desde Excel" size="lg">
          <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Mes</label>
              <select
                value={form.mes}
                onChange={(e) => setForm({ ...form, mes: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <option key={month} value={month}>{monthName(month)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Año</label>
              <input
                type="number"
                min={2000}
                max={2100}
                value={form.anio}
                onChange={(e) => setForm({ ...form, anio: Number(e.target.value) })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Archivo Excel (.xlsx)</label>
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => setForm({ ...form, archivo: e.target.files?.[0] ?? null })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
            />
            <p className="text-xs text-slate-500 mt-2">
              El archivo debe contener las columnas requeridas del formato de boletines.
            </p>
          </div>
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <Btn v="primary" onClick={handleSubmit} disabled={saving}>
              <Upload size={15} /> Importar Excel
            </Btn>
            <Btn v="secondary" onClick={() => setFormOpen(false)}>
              Cancelar
            </Btn>
          </div>
        </div>
      </Modal>
      )}
    </div>
  );
}

// ─── Manuales ─────────────────────────────────────────────────────────────────

function ManualesUsuarios({ canUpload = true }: { canUpload?: boolean }) {
  const [items, setItems] = useState<ApiManual[]>([]);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    modulo: MODULOS[0] ?? "ADMISIONES",
    titulo: "",
    version: "",
    archivo: null as File | null,
  });
  useEffect(() => {
    api<ApiManual[]>("/manuales/").then(setItems).catch((err) => setError(err.message));
  }, []);

  async function handleSubmit() {
    if (!form.titulo.trim()) {
      setError("El título es obligatorio.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const body = new FormData();
      body.append("modulo", form.modulo);
      body.append("titulo", form.titulo);
      if (form.version.trim()) body.append("version", form.version);
      if (form.archivo) body.append("archivo", form.archivo);

      const created = await api<ApiManual>("/manuales/", {
        method: "POST",
        body,
      });
      setItems((prev) => [created, ...prev]);
      setForm({
        modulo: MODULOS[0] ?? "ADMISIONES",
        titulo: "",
        version: "",
        archivo: null,
      });
      setFormOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible guardar el manual.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <SectionHeader
          title="Manuales de Usuarios"
          subtitle="Documentación oficial por módulo del sistema."
        />
        {canUpload && (
          <Btn v="primary" onClick={() => setFormOpen(true)}>
            <Plus size={14} /> Cargar Manual
          </Btn>
        )}
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['Módulo', 'Título', 'Versión', 'Fecha', 'Páginas', 'Descarga'].map((h) => (
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
            {items.map((m) => (
              <tr key={m.oid} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-4 py-3 text-xs font-bold text-[#0778ac]">{MODULO_LABELS[m.modulo] ?? m.modulo}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{m.titulo}</td>
                <td className="px-4 py-3 text-slate-500 text-xs font-mono">v{m.version}</td>
                <td className="px-4 py-3 text-slate-500 text-xs font-mono">{m.fecha_registro.slice(0, 10)}</td>
                <td className="px-4 py-3 text-slate-500 text-xs font-mono">—</td>
                <td className="px-4 py-3">
                  {m.archivo ? (
                    <a href={m.archivo} target="_blank" rel="noreferrer">
                      <Btn v="primary" sm><Download size={13} /> PDF</Btn>
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">Sin archivo</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {error && <EmptyState message={error} />}
        {!error && items.length === 0 && <EmptyState message="No hay manuales publicados." />}
      </div>

      {canUpload && (
        <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Cargar Manual" size="lg">
          <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Módulo</label>
              <select
                value={form.modulo}
                onChange={(e) => setForm({ ...form, modulo: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              >
                {MODULOS.map((modulo) => (
                  <option key={modulo} value={modulo}>{MODULO_LABELS[modulo] ?? modulo}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Versión</label>
              <input
                type="text"
                value={form.version}
                onChange={(e) => setForm({ ...form, version: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Título</label>
            <input
              type="text"
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Archivo PDF</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setForm({ ...form, archivo: e.target.files?.[0] ?? null })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
            />
          </div>
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <Btn v="primary" onClick={handleSubmit} disabled={saving}>
              <Upload size={15} /> Guardar Manual
            </Btn>
            <Btn v="secondary" onClick={() => setFormOpen(false)}>
              Cancelar
            </Btn>
          </div>
        </div>
      </Modal>
      )}
    </div>
  );
}

// ─── Home / Module Selector ───────────────────────────────────────────────────

function ModuleSelector({ onSelect }: { onSelect: (m: "coordinator" | "validator" | "solicitud") => void }) {
  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-8">
      <div className="text-center mb-14">
        <div className="inline-flex items-center gap-3.5 mb-5">
          <div className="w-13 h-13 bg-[#0778ac]/15 border border-[#0778ac]/30 rounded-2xl flex items-center justify-center p-3">
            <Monitor size={26} className="text-[#0778ac]" />
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-bold text-[#0778ac] tracking-tight">Validacion y Solicitudes</h1>
            <p className="text-[#0778ac]/70 text-xs tracking-widest uppercase font-semibold">
              Plataforma para Validacion de Dinamica de Prueba y Solicitud de Parametros
            </p>
          </div>
        </div>
        <div className="w-px h-8 bg-white/10 mx-auto mb-5" />
        <p className="text-slate-600 text-sm">
          Seleccione el módulo al cual desea acceder
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-5xl">
        <button
          onClick={() => onSelect("coordinator")}
          className="group bg-white border border-slate-200 hover:border-[#0778ac]/40 rounded-3xl p-8 text-left transition-all duration-200 shadow-sm hover:shadow-xl h-full"
        >
          <div className="w-12 h-12 bg-[#0778ac]/15 group-hover:bg-[#0778ac]/25 border border-[#0778ac]/20 rounded-2xl flex items-center justify-center mb-6 transition-all">
            <Settings size={22} className="text-[#0778ac]" />
          </div>
          <h2 className="text-base font-bold text-slate-900 mb-2">
            Coordinador de Sistemas
          </h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            Gestión de versiones del sistema, consulta de validaciones por módulo y generación de reportes ejecutivos.
          </p>
          <div className="mt-6 flex items-center gap-1.5 text-[#0778ac] text-xs font-semibold group-hover:gap-2.5 transition-all uppercase tracking-wide">
            Ingresar <ChevronRight size={14} />
          </div>
        </button>

        <button
          onClick={() => onSelect("validator")}
          className="group bg-white border border-slate-200 hover:border-[#d43a39]/40 rounded-3xl p-8 text-left transition-all duration-200 shadow-sm hover:shadow-xl h-full"
        >
          <div className="w-12 h-12 bg-[#d43a39]/15 group-hover:bg-[#d43a39]/25 border border-[#d43a39]/20 rounded-2xl flex items-center justify-center mb-6 transition-all">
            <ShieldCheck size={22} className="text-[#d43a39]" />
          </div>
          <h2 className="text-base font-bold text-slate-900 mb-2">
            Validación del Sistema
          </h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            Registro de observaciones, aprobaciones y rechazos por módulo. Acceso a boletines y manuales de usuario.
          </p>
          <div className="mt-6 flex items-center gap-1.5 text-[#d43a39] text-xs font-semibold group-hover:gap-2.5 transition-all uppercase tracking-wide">
            Ingresar <ChevronRight size={14} />
          </div>
        </button>

        <button
          onClick={() => onSelect("solicitud")}
          className="group bg-white border border-slate-200 hover:border-[#0778ac]/40 rounded-3xl p-8 text-left transition-all duration-200 shadow-sm hover:shadow-xl h-full"
        >
          <div className="w-12 h-12 bg-[#0778ac]/15 group-hover:bg-[#0778ac]/25 border border-[#0778ac]/20 rounded-2xl flex items-center justify-center mb-6 transition-all">
            <ClipboardList size={22} className="text-[#0778ac]" />
          </div>
          <h2 className="text-base font-bold text-slate-900 mb-2">
            Solicitud Parámetro
          </h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            Registro y consulta de solicitudes de parámetros para soporte clínico.
          </p>
          <div className="mt-6 flex items-center gap-1.5 text-[#0778ac] text-xs font-semibold group-hover:gap-2.5 transition-all uppercase tracking-wide">
            Ingresar <ChevronRight size={14} />
          </div>
        </button>

      </div>

      <p className="text-slate-500 text-xs mt-12">
        © 2026 Validacion y Solicitudes - Area de Tecnología de la Información. Todos los derechos reservados.
      </p>
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────

export default function App() {
  const [module, setModule] = useState<"home" | "coordinator" | "validator" | "solicitud">("home");
  const [coordinatorLoggedIn, setCoordinatorLoggedIn] = useState(false);
  const [loggedUser, setLoggedUser] = useState("");
  const [coordinatorLogin, setCoordinatorLogin] = useState({ usuario: "", password: "" });
  const [coordinatorLoginError, setCoordinatorLoginError] = useState("");
  const [coordinatorSection, setCoordinatorSection] = useState<CoordTab>("registro");
  const [solicitudesPublicas, setSolicitudesPublicas] = useState<SolicitudParametro[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [observaciones, setObservaciones] = useState<Observacion[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([api<ApiVersion[]>("/versions/"), api<Observacion[]>("/observaciones/")])
      .then(([apiVersions, apiObservaciones]) => {
        if (!active) return;
        setVersions(apiVersions.map(toVersion));
        setObservaciones(apiObservaciones);
      })
      .catch((requestError) => active && setError(requestError instanceof Error ? requestError.message : "No fue posible conectar con el servidor."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  if (module === "home") {
    return <ModuleSelector onSelect={setModule} />;
  }

  if (module === "solicitud") {
    return (
      <div className="h-screen flex flex-col overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="bg-[#0778ac] text-white px-5 h-11 flex items-center justify-between shrink-0 border-b border-[#0778ac]/40">
          <div className="flex items-center gap-2.5">
            <Monitor size={16} className="text-white" />
            <span className="text-sm font-bold text-white">Validacion y Solicitudes</span>
            <span className="text-white/60 text-sm">/</span>
            <span className="text-sm text-white/85">Solicitud Parámetro</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.open("https://syac.net.co/boletines/", "_blank")}
              className="rounded-full bg-white/15 text-white px-3 py-1.5 text-xs font-semibold hover:bg-white/20 transition-colors"
            >
              Boletines SYAC
            </button>
            <button
              onClick={() => setModule("home")}
              className="text-xs text-white/85 hover:text-white flex items-center gap-1 transition-colors font-medium"
            >
              <Home size={12} /> Inicio
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-[#f8f9fa] p-6">
          {error && <div className="mb-6 rounded-lg border border-[#d43a39]/20 bg-[#d43a39]/10 p-3 text-sm text-[#d43a39]">{error}</div>}
          <SolicitudParametroSection
            solicitudes={solicitudesPublicas}
            setSolicitudes={setSolicitudesPublicas}
            onError={setError}
            canApprove={false}
          />
        </div>
      </div>
    );
  }

  if (module === "coordinator" && !coordinatorLoggedIn) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-8 text-slate-900">
        <div className="w-full max-w-md rounded-3xl border border-[#0778ac]/20 bg-white p-8 shadow-xl">
          <h1 className="text-2xl font-semibold mb-3 text-[#0778ac]">Acceso Coordinador</h1>
          <p className="text-sm text-slate-600 mb-6">
            Ingrese con el usuario y contraseña de coordinador para acceder al módulo de Coordinador de Sistemas.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Usuario</label>
              <input
                value={coordinatorLogin.usuario}
                onChange={(e) => setCoordinatorLogin((f) => ({ ...f, usuario: e.target.value }))}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Contraseña</label>
              <input
                type="password"
                value={coordinatorLogin.password}
                onChange={(e) => setCoordinatorLogin((f) => ({ ...f, password: e.target.value }))}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
                autoComplete="current-password"
              />
            </div>
            {coordinatorLoginError && (
              <div className="rounded-2xl bg-[#d43a39]/10 border border-[#d43a39]/20 px-4 py-3 text-sm text-[#d43a39]/80">
                {coordinatorLoginError}
              </div>
            )}
            <div className="flex justify-between items-center gap-3 pt-2">
              <button
                onClick={() => setModule("home")}
                className="rounded-2xl border border-slate-700 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800"
              >
                Volver
              </button>
              <button
                onClick={() => {
                  const user = coordinatorLogin.usuario.trim().toLowerCase();
                  const pass = coordinatorLogin.password;
                  let isValid = false;
                  
                  if (user === "sistemas" && pass === "159357**Cesar**") isValid = true;
                  else if (user === "practicante" && pass === "Icvc2024") isValid = true;
                  else if (user === "ingeniero" && pass === "159357**Cesar**") isValid = true;

                  if (!isValid) {
                    setCoordinatorLoginError("Usuario o contraseña incorrectos.");
                    return;
                  }
                  setCoordinatorLoginError("");
                  setLoggedUser(user);
                  setCoordinatorLoggedIn(true);
                  if (user === "practicante") {
                    setCoordinatorSection("solicitudParametro");
                  }
                }}
                className="rounded-2xl bg-[#0778ac] px-5 py-3 text-sm font-semibold text-white hover:bg-[#056b95]"
              >
                Iniciar sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isCoord = module === "coordinator";
  const isValidator = module === "validator";

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Global top bar */}
      <div className="bg-[#0778ac] text-white px-5 h-11 flex items-center justify-between shrink-0 border-b border-[#0778ac]/40">
        <div className="flex items-center gap-2.5">
          <Monitor size={16} className="text-white" />
          <span className="text-sm font-bold text-white">Validacion y Solicitudes</span>
          <span className="text-white/60 text-sm">/</span>
          <span className="text-sm text-white/85">
            {isCoord ? "Coordinador de Sistemas" : "Módulo de Validación"}
          </span>
        </div>
        <div className="flex items-center gap-3">
            <button
              onClick={() => window.open("https://syac.net.co/boletines/", "_blank")}
              className="rounded-full bg-white/15 text-white px-3 py-1.5 text-xs font-semibold hover:bg-white/20 transition-colors"
            >
              Boletines SYAC
            </button>
          <button
            onClick={() => setModule("home")}
              className="text-xs text-white/85 hover:text-white flex items-center gap-1 transition-colors font-medium"
          >
            <Home size={12} /> Inicio
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {loading && <div className="p-6 text-sm text-slate-500">Cargando información...</div>}
        {error && <div className="m-6 rounded-lg border border-[#d43a39]/20 bg-[#d43a39]/10 p-3 text-sm text-[#d43a39]">{error}</div>}
        {!loading && !error && (isCoord ? (
          <CoordinatorModule
            versions={versions}
            setVersions={setVersions}
            observaciones={observaciones}
            setObservaciones={setObservaciones}
            onError={setError}
            selectedSection={coordinatorSection}
            onSelectSection={setCoordinatorSection}
            loggedUser={loggedUser}
          />
        ) : (
          <ValidatorModule
            versions={versions}
            observaciones={observaciones}
            setObservaciones={setObservaciones}
            onError={setError}
          />
        ))}
      </div>
    </div>
  );
}
