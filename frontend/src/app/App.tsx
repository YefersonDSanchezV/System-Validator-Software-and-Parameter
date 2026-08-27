import { useState, useRef, useEffect } from "react";
import {
  Monitor, ShieldCheck, X, Eye, Pencil, Power, CheckCircle,
  XCircle, Download, Plus, ExternalLink, FileText, BookOpen,
  BarChart3, ArrowLeft, Upload, Printer, AlertCircle,
  ChevronDown, ChevronRight, Settings, Home, ClipboardList,
  Link, RotateCcw, Mail,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "sonner";
import { MODULOS, MODULO_LABELS, MODULOS_VALIDATOR } from "@/config/constants";
import { api, clearAuthenticatedApiUser, downloadApiFile, setAuthenticatedApiUser } from "@/lib/api/client";
import { openPrintPreviewWindow } from "@/lib/print";
import { Modal, StatusBadge, Btn, Field, FormInput, FormTextarea, SectionHeader, EmptyState, type BtnVariant } from "@/components/ui/custom";
import { type EstadoVersion, type Version, type ApiVersion, type RestauracionDB, toVersion } from "@/types/version";
import { type EstadoObs, type Observacion } from "@/types/observacion";
import { type ApiBoletin, type ApiBoletinPeriodo, type ApiBoletinImportResult } from "@/types/boletin";
import { type ApiManual, type SolicitudManual } from "@/types/manual";
import { type ApiSolicitudParametro, type SolicitudParametro, type EstadoSolicitud, type ConfiguracionParametrosDTO, toSolicitudParametro } from "@/types/solicitud-parametro";
import { type ParametrosEstado } from "@/types/parametros";

const DEFAULT_DB_CONTAINERS = ["DGEMPRES99", "DGEMPRES98", "DGEMPRES10"] as const;
const PAGE_SIZE_OPTIONS = [10, 20, 30] as const;

function normalizeContainerName(value: string) {
  return value.trim();
}

function toTimestamp(value?: string | null) {
  if (!value) return Number.NEGATIVE_INFINITY;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value.replace(" ", "T");
  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}

function sortVersionsByCompilationDateDesc(items: Version[]) {
  return [...items].sort((a, b) => {
    const byCompilation = toTimestamp(b.fecha_compilacion) - toTimestamp(a.fecha_compilacion);
    if (byCompilation !== 0) return byCompilation;

    const byRegistration = toTimestamp(b.fechaRegistro) - toTimestamp(a.fechaRegistro);
    if (byRegistration !== 0) return byRegistration;

    return b.oid - a.oid;
  });
}

function getContainerOptions(versions: Version[]) {
  return Array.from(
    new Set(
      [...DEFAULT_DB_CONTAINERS, ...versions.map((version) => normalizeContainerName(version.contenedor_bd ?? ""))]
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));
}

type TablePaginationResult<T> = {
  rows: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  rangeStart: number;
  rangeEnd: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  setPageSize: (size: number) => void;
};

function useTablePagination<T>(rows: T[]): TablePaginationResult<T> {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState<number>(PAGE_SIZE_OPTIONS[0]);
  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const rangeStart = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = totalItems === 0 ? 0 : Math.min(totalItems, page * pageSize);

  return {
    rows: rows.slice((page - 1) * pageSize, page * pageSize),
    page,
    pageSize,
    totalItems,
    totalPages,
    rangeStart,
    rangeEnd,
    setPage,
    setPageSize: (size: number) => {
      setPageSizeState(size);
      setPage(1);
    },
  };
}

function TablePaginationControls({
  pagination,
  itemLabel = "resultados",
}: {
  pagination: TablePaginationResult<unknown>;
  itemLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between bg-white">
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <span>Mostrar</span>
        <select
          value={pagination.pageSize}
          onChange={(e) => pagination.setPageSize(Number(e.target.value))}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
        >
          {PAGE_SIZE_OPTIONS.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        <span>{itemLabel}</span>
      </div>

      <div className="flex flex-col gap-2 text-sm text-slate-500 sm:items-end">
        <span>
          Mostrando {pagination.rangeStart}-{pagination.rangeEnd} de {pagination.totalItems} {itemLabel}
        </span>
        <div className="flex items-center gap-2">
          <Btn
            v="secondary"
            sm
            onClick={() => pagination.setPage((prev) => Math.max(1, prev - 1))}
            disabled={pagination.page <= 1}
          >
            Anterior
          </Btn>
          <span className="min-w-24 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
            Pagina {pagination.page} de {pagination.totalPages}
          </span>
          <Btn
            v="secondary"
            sm
            onClick={() => pagination.setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
            disabled={pagination.page >= pagination.totalPages}
          >
            Siguiente
          </Btn>
        </div>
      </div>
    </div>
  );
}

function ContainerAutocompleteField({
  label,
  listId,
  value,
  onChange,
  options,
}: {
  label: string;
  listId: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">{label}</label>
      <input
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Seleccione o escriba un contenedor"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0778ac]"
      />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
      <p className="mt-2 text-xs text-slate-500">Puede elegir un contenedor existente o escribir uno nuevo.</p>
    </div>
  );
}

function ParametroBadge({ title, abierto, valor, valor2 }: { title: string, abierto: boolean, valor: number, valor2?: number }) {
  const valueText = valor2 !== undefined ? `: ${valor}, : ${valor2}` : `${valor}`;
  if (abierto) {
    return (
      <div className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-2xl text-xs md:text-sm font-bold ring-1 ring-emerald-300 shadow-sm flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
        Parametro {title} Abierto {valueText}
      </div>
    );
  }
  return (
    <div className="bg-red-100 text-red-800 px-4 py-2 rounded-2xl text-xs md:text-sm font-bold ring-1 ring-red-300 shadow-sm flex items-center gap-2">
      <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
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
    <Modal open={open} onClose={onClose} title="Habilitar/Cerrar Parámetro General">
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

function HabilitarSolicitudModal({
  solicitud,
  open,
  onClose,
  onSuccess,
  onError,
}: {
  solicitud: SolicitudParametro | null;
  open: boolean;
  onClose: () => void;
  onSuccess: (updated: SolicitudParametro) => void;
  onError: (msg: string) => void;
}) {
  if (!solicitud) return null;

  const tipo = solicitud.tipoParametro;
  const defaultValue = solicitud.totalValor ?? (tipo === "Historia Clinica" ? 30 : 48);

  const [hcpdiaaut, setHcpdiaaut] = useState(defaultValue);
  const [hcnmhcrenf, setHcnmhcrenf] = useState(defaultValue);
  const [hcnhaplmed, setHcnhaplmed] = useState(defaultValue);
  const [observacion, setObservacion] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (solicitud) {
      const val = solicitud.totalValor ?? (solicitud.tipoParametro === "Historia Clinica" ? 30 : 48);
      setHcpdiaaut(val);
      setHcnmhcrenf(val);
      setHcnhaplmed(val);
      setObservacion(`Habilitado según solicitud ${solicitud.consecutivo} para ${solicitud.solicitante}`);
    }
  }, [solicitud]);

  const handleSubmit = () => {
    setSaving(true);
    api<ApiSolicitudParametro>(`/solicitud-parametro/${solicitud.id}/habilitar`, {
      method: "PUT",
      body: JSON.stringify({
        hcpdiaaut: tipo === "Historia Clinica" ? hcpdiaaut : null,
        hcnmhcrenf: tipo === "Enfermeria" ? hcnmhcrenf : null,
        hcnhaplmed: tipo === "Enfermeria" ? hcnhaplmed : null,
        observacion: observacion.trim(),
      }),
    })
      .then((res) => {
        onSuccess(toSolicitudParametro(res));
        onClose();
      })
      .catch((e) => {
        onError(e instanceof Error ? e.message : "Error al habilitar el parámetro");
      })
      .finally(() => {
        setSaving(false);
      });
  };

  return (
    <Modal open={open} onClose={onClose} title={`Habilitar Parámetro - Solicitud ${solicitud.consecutivo}`} size="md">
      <div className="space-y-4">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 grid grid-cols-2 gap-2">
          <div><span className="text-slate-400 font-semibold uppercase">Tipo:</span> <span className="font-bold text-[#0778ac]">{solicitud.tipoParametro}</span></div>
          <div><span className="text-slate-400 font-semibold uppercase">Solicitante:</span> <span className="font-semibold">{solicitud.solicitante}</span></div>
          <div><span className="text-slate-400 font-semibold uppercase">Área:</span> <span className="font-semibold">{solicitud.area || "—"}</span></div>
          <div><span className="text-slate-400 font-semibold uppercase">Total Solicitado:</span> <span className="font-bold text-slate-900">{solicitud.totalValor ? `${solicitud.totalValor} ${solicitud.totalUnidad}` : "—"}</span></div>
        </div>

        {tipo === "Historia Clinica" && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Valor (HCPDIAAUT)</label>
            <input
              type="number"
              value={hcpdiaaut}
              onChange={(e) => setHcpdiaaut(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white font-semibold"
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
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Valor (HCNHAPLMED)</label>
              <input
                type="number"
                value={hcnhaplmed}
                onChange={(e) => setHcnhaplmed(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white font-semibold"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">
            Observación {tipo === "Otros" && <span className="normal-case text-slate-400">(Describa qué parámetro se está habilitando)</span>}
          </label>
          <textarea
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            placeholder="Observación o justificación..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white min-h-[80px]"
          />
        </div>

        <div className="flex gap-2 pt-4 border-t border-slate-100 justify-end">
          <Btn v="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn v="primary" onClick={handleSubmit} disabled={saving}>
            Confirmar Habilitación
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

function RechazarSolicitudModal({
  solicitud,
  open,
  onClose,
  onSuccess,
  onError,
}: {
  solicitud: SolicitudParametro | null;
  open: boolean;
  onClose: () => void;
  onSuccess: (updated: SolicitudParametro) => void;
  onError: (msg: string) => void;
}) {
  if (!solicitud) return null;
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMotivo("");
  }, [solicitud]);

  const handleSubmit = () => {
    if (!motivo.trim()) return;
    setSaving(true);
    api<ApiSolicitudParametro>(`/solicitud-parametro/${solicitud.id}/rechazar`, {
      method: "PUT",
      body: JSON.stringify({ motivo: motivo.trim() }),
    })
      .then((res) => {
        onSuccess(toSolicitudParametro(res));
        onClose();
      })
      .catch((e) => {
        onError(e instanceof Error ? e.message : "Error al rechazar la solicitud");
      })
      .finally(() => {
        setSaving(false);
      });
  };

  return (
    <Modal open={open} onClose={onClose} title={`Rechazar Parámetro - Solicitud ${solicitud.consecutivo}`} size="md">
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-900 grid grid-cols-2 gap-2">
          <div><span className="text-red-500 font-semibold uppercase">Tipo:</span> <span className="font-bold">{solicitud.tipoParametro}</span></div>
          <div><span className="text-red-500 font-semibold uppercase">Solicitante:</span> <span className="font-semibold">{solicitud.solicitante}</span></div>
          <div><span className="text-red-500 font-semibold uppercase">Área:</span> <span className="font-semibold">{solicitud.area || "—"}</span></div>
          <div><span className="text-red-500 font-semibold uppercase">Total:</span> <span className="font-bold">{solicitud.totalValor ? `${solicitud.totalValor} ${solicitud.totalUnidad}` : "—"}</span></div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">
            Motivo de Rechazo *
          </label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Indique claramente por qué se rechaza la habilitación de este parámetro..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white min-h-[100px]"
          />
        </div>

        <div className="flex gap-2 pt-4 border-t border-slate-100 justify-end">
          <Btn v="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn v="danger" onClick={handleSubmit} disabled={!motivo.trim() || saving}>
            Confirmar Rechazo
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

function AutorizadoPreviaSolicitudModal({
  solicitud,
  solicitudes,
  open,
  onClose,
  onSuccess,
  onError,
}: {
  solicitud: SolicitudParametro | null;
  solicitudes: SolicitudParametro[];
  open: boolean;
  onClose: () => void;
  onSuccess: (updated: SolicitudParametro) => void;
  onError: (msg: string) => void;
}) {
  if (!solicitud) return null;
  const [solicitudExtension, setSolicitudExtension] = useState("");
  const [observacion, setObservacion] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSolicitudExtension("");
    setObservacion("");
  }, [solicitud]);

  const otrasSolicitudes = solicitudes.filter(s => s.id !== solicitud.id);

  const handleSubmit = () => {
    if (!solicitudExtension.trim()) return;
    setSaving(true);
    api<ApiSolicitudParametro>(`/solicitud-parametro/${solicitud.id}/habilitar-extension`, {
      method: "PUT",
      body: JSON.stringify({
        solicitud_extension: solicitudExtension.trim(),
        observacion: observacion.trim(),
      }),
    })
      .then((res) => {
        onSuccess(toSolicitudParametro(res));
        onClose();
      })
      .catch((e) => {
        onError(e instanceof Error ? e.message : "Error al registrar autorización previa");
      })
      .finally(() => {
        setSaving(false);
      });
  };

  return (
    <Modal open={open} onClose={onClose} title={`Autorizar Solicitud Previa - Solicitud ${solicitud.consecutivo}`} size="md">
      <div className="space-y-4">
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 text-xs text-indigo-900 grid grid-cols-2 gap-2">
          <div><span className="text-indigo-500 font-semibold uppercase">Tipo:</span> <span className="font-bold">{solicitud.tipoParametro}</span></div>
          <div><span className="text-indigo-500 font-semibold uppercase">Solicitante:</span> <span className="font-semibold">{solicitud.solicitante}</span></div>
          <div><span className="text-indigo-500 font-semibold uppercase">Área:</span> <span className="font-semibold">{solicitud.area || "—"}</span></div>
          <div><span className="text-indigo-500 font-semibold uppercase">Total:</span> <span className="font-bold">{solicitud.totalValor ? `${solicitud.totalValor} ${solicitud.totalUnidad}` : "—"}</span></div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">
            Bajo qué otra solicitud se autoriza este parámetro *
          </label>
          <input
            list="solicitudes-extension-list"
            value={solicitudExtension}
            onChange={(e) => setSolicitudExtension(e.target.value)}
            placeholder="Seleccione o digite el consecutivo (ej. 2026-08-001)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
          />
          <datalist id="solicitudes-extension-list">
            {otrasSolicitudes.map(s => (
              <option key={s.id} value={s.consecutivo}>{s.consecutivo} - {s.tipoParametro} ({s.solicitante})</option>
            ))}
          </datalist>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">
            Observación / Justificación (Opcional)
          </label>
          <textarea
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            placeholder="Detalles sobre la autorización previa..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white min-h-[80px]"
          />
        </div>

        <div className="flex gap-2 pt-4 border-t border-slate-100 justify-end">
          <Btn v="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn v="primary" onClick={handleSubmit} disabled={!solicitudExtension.trim() || saving}>
            Confirmar Autorización Previa
          </Btn>
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

  const fetchParamEstado = () => {
    api<ParametrosEstado>("/parametros-clinicos/estado").then(setParamEstado).catch(() => {});
  };

  const fetchTipos = () => {
    api<string[]>("/parametros-clinicos/tipos").then(setAvailableTipos).catch(() => {});
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
          <Btn v="primary" onClick={() => { fetchTipos(); setOpen(true); }}>
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
              {["Consecutivo", "Tipo de Parámetro", "Solicitante", "Área", "Apertura", "Cierre", "Total", "Estado", "Acciones"].map((heading) => (
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
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-400 text-sm">
                    Cargando solicitudes...
                  </td>
                </tr>
              ) : filteredSolicitudes.length === 0 ? (
              <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-400 text-sm">
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
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-[11px] uppercase tracking-wider text-slate-400">Total</p>
                <p className="font-semibold text-slate-800 mt-1">{formatTotal(selectedSolicitud)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-[11px] uppercase tracking-wider text-slate-400">Estado</p>
                <div className="mt-1"><StatusBadge estado={selectedSolicitud.estado} /></div>
              </div>
            </div>

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

// ─── Parametros Config Section ────────────────────────────────────────────────

function ParametrosConfigSection({
  onError,
}: {
  onError: (msg: string) => void;
}) {
  const [config, setConfig] = useState<ConfiguracionParametrosDTO>({
    hc_default: 30,
    enf_hcrenf_default: 48,
    enf_haplmed_default: 48,
    hora_restablecimiento: "20:05",
    auto_restablecer: true,
    tipos_habilitados: ["Historia Clinica", "Enfermeria", "Otros"],
    correos_historia_clinica: "",
    correos_enfermeria: "",
    correos_otros: "",
  });
  const [loading, setLoading] = useState(true);
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [savingHora, setSavingHora] = useState(false);
  const [savingTipos, setSavingTipos] = useState(false);
  const [savingCorreos, setSavingCorreos] = useState(false);
  const [resetting, setResetting] = useState(false);

  const fetchConfig = () => {
    api<ConfiguracionParametrosDTO>("/parametros-clinicos/config")
      .then((data) => {
        setConfig(data);
      })
      .catch((err) => {
        onError(err instanceof Error ? err.message : "Error cargando configuración de parámetros");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSaveDefaults = () => {
    setSavingDefaults(true);
    api<ConfiguracionParametrosDTO>("/parametros-clinicos/config", {
      method: "PUT",
      body: JSON.stringify(config),
    })
      .then((data) => {
        setConfig(data);
        toast.success("Valores por defecto guardados correctamente.");
      })
      .catch((e) => {
        onError(e instanceof Error ? e.message : "Error guardando valores por defecto");
      })
      .finally(() => setSavingDefaults(false));
  };

  const handleSaveHora = () => {
    setSavingHora(true);
    api<ConfiguracionParametrosDTO>("/parametros-clinicos/config", {
      method: "PUT",
      body: JSON.stringify(config),
    })
      .then((data) => {
        setConfig(data);
        toast.success("Hora de restablecimiento automático programada correctamente.");
      })
      .catch((e) => {
        onError(e instanceof Error ? e.message : "Error guardando hora de restablecimiento");
      })
      .finally(() => setSavingHora(false));
  };

  const handleSaveCorreos = () => {
    setSavingCorreos(true);
    api<ConfiguracionParametrosDTO>("/parametros-clinicos/config", {
      method: "PUT",
      body: JSON.stringify(config),
    })
      .then((data) => {
        setConfig(data);
        toast.success("Correos de notificación guardados correctamente.");
      })
      .catch((e) => {
        onError(e instanceof Error ? e.message : "Error guardando correos de notificación");
      })
      .finally(() => setSavingCorreos(false));
  };

  const handleToggleTipo = (tipoName: string) => {
    const exists = config.tipos_habilitados.includes(tipoName);
    const updated = exists
      ? config.tipos_habilitados.filter((t) => t !== tipoName)
      : [...config.tipos_habilitados, tipoName];

    const nextConfig = { ...config, tipos_habilitados: updated };
    setConfig(nextConfig);

    setSavingTipos(true);
    api<ConfiguracionParametrosDTO>("/parametros-clinicos/config", {
      method: "PUT",
      body: JSON.stringify(nextConfig),
    })
      .then((data) => {
        setConfig(data);
        toast.success(`Tipo "${tipoName}" ${exists ? "deshabilitado" : "habilitado"} con éxito.`);
      })
      .catch((e) => {
        onError(e instanceof Error ? e.message : "Error al actualizar tipo de parámetro");
      })
      .finally(() => setSavingTipos(false));
  };

  const handleResetNow = () => {
    if (!window.confirm("¿Está seguro de restablecer los parámetros clínicos a los valores por defecto en el servidor de base de datos?")) {
      return;
    }
    setResetting(true);
    api<{ message: string }>("/parametros-clinicos/restablecer-defecto", {
      method: "POST",
    })
      .then((res) => {
        toast.success(res.message || "Parámetros restablecidos a sus valores por defecto.");
      })
      .catch((e) => {
        onError(e instanceof Error ? e.message : "Error restableciendo los parámetros");
      })
      .finally(() => setResetting(false));
  };

  const allAvailableTypes = [
    { key: "Historia Clinica", label: "Historia Clínica", desc: "Parámetro HCPDIAAUT (Control de días de autorización de HC)" },
    { key: "Enfermeria", label: "Enfermería", desc: "Parámetros HCNMHRCRENF y HCNHAPLMED (Control de horas de enfermería)" },
    { key: "Otros", label: "Otros", desc: "Habilitación general con registro de observación y soporte de horas" },
  ];

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500">
        Cargando configuración de parámetros...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Parámetros"
        subtitle="Configuración y parametrización de valores por defecto, horarios, tipos de soporte clínico y correos de notificación."
      />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Card 1: Valores por Defecto */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="p-2 bg-[#0778ac]/10 text-[#0778ac] rounded-xl font-bold">⚙</div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Valores por Defecto</h3>
                <p className="text-xs text-slate-400">Valores estándar de cierre</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Historia Clínica (HCPDIAAUT)
              </label>
              <input
                type="number"
                value={config.hc_default}
                onChange={(e) => setConfig({ ...config, hc_default: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Enfermería (HCNMHRCRENF)
              </label>
              <input
                type="number"
                value={config.enf_hcrenf_default}
                onChange={(e) => setConfig({ ...config, enf_hcrenf_default: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Enfermería (HCNHAPLMED)
              </label>
              <input
                type="number"
                value={config.enf_haplmed_default}
                onChange={(e) => setConfig({ ...config, enf_haplmed_default: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white font-semibold"
              />
            </div>
          </div>

          <div className="pt-5 mt-4 border-t border-slate-100 space-y-2">
            <button
              onClick={handleSaveDefaults}
              disabled={savingDefaults}
              className="w-full py-2.5 px-4 rounded-xl bg-[#0778ac] hover:bg-[#066591] text-white text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
            >
              {savingDefaults ? "Guardando..." : "Guardar Valores por Defecto"}
            </button>
            <button
              onClick={handleResetNow}
              disabled={resetting}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <RotateCcw size={13} /> {resetting ? "Restableciendo..." : "Restablecer Valores Ahora"}
            </button>
          </div>
        </div>

        {/* Card 2: Hora de Restablecimiento Automático */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl font-bold">⏰</div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Restablecimiento Automático</h3>
                <p className="text-xs text-slate-400">Programación diaria nocturna</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-700">Activar tarea automática</span>
              <input
                type="checkbox"
                checked={config.auto_restablecer}
                onChange={(e) => setConfig({ ...config, auto_restablecer: e.target.checked })}
                className="w-5 h-5 accent-[#0778ac] rounded cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Hora de Restablecimiento Diario (24h)
              </label>
              <input
                type="time"
                value={config.hora_restablecimiento}
                onChange={(e) => setConfig({ ...config, hora_restablecimiento: e.target.value })}
                disabled={!config.auto_restablecer}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white font-semibold disabled:bg-slate-100 disabled:text-slate-400"
              />
            </div>

            <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-2xl text-xs text-blue-800 leading-relaxed">
              <strong>Nota:</strong> Todos los días a la hora configurada (<strong>{config.hora_restablecimiento}</strong>), el sistema verificará automáticamente el servidor y restablecerá los parámetros que se encuentren abiertos.
            </div>
          </div>

          <div className="pt-5 mt-4 border-t border-slate-100">
            <button
              onClick={handleSaveHora}
              disabled={savingHora}
              className="w-full py-2.5 px-4 rounded-xl bg-[#0778ac] hover:bg-[#066591] text-white text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
            >
              {savingHora ? "Guardando..." : "Guardar Horario"}
            </button>
          </div>
        </div>

        {/* Card 3: Tipos de Parámetros */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl font-bold">📋</div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Tipos de Parámetros</h3>
                <p className="text-xs text-slate-400">Activar o desactivar módulos</p>
              </div>
            </div>

            <div className="space-y-3">
              {allAvailableTypes.map((tipo) => {
                const isEnabled = config.tipos_habilitados.includes(tipo.key);
                return (
                  <div
                    key={tipo.key}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isEnabled ? "bg-emerald-50/50 border-emerald-200" : "bg-slate-50 border-slate-200 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">{tipo.label}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleTipo(tipo.key)}
                        disabled={savingTipos}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                          isEnabled
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : "bg-slate-300 hover:bg-slate-400 text-slate-700"
                        }`}
                      >
                        {isEnabled ? "Habilitado" : "Deshabilitado"}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">{tipo.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] text-slate-500 text-center mt-4">
            Solo los tipos habilitados se mostrarán en el formulario de nuevas solicitudes.
          </div>
        </div>

        {/* Card 4: Correos de Notificación por Tipo */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between md:col-span-3">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-xl font-bold">✉</div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Correos Electrónicos de Notificación por Tipo de Parámetro</h3>
                <p className="text-xs text-slate-400">Ingrese las direcciones de correo separadas por comas para cada tipo de parámetro.</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Correos - Historia Clínica
                </label>
                <textarea
                  value={config.correos_historia_clinica || ""}
                  onChange={(e) => setConfig({ ...config, correos_historia_clinica: e.target.value })}
                  placeholder="ejemplo1@empresa.com, ejemplo2@empresa.com"
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Correos - Enfermería
                </label>
                <textarea
                  value={config.correos_enfermeria || ""}
                  onChange={(e) => setConfig({ ...config, correos_enfermeria: e.target.value })}
                  placeholder="ejemplo1@empresa.com, ejemplo2@empresa.com"
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Correos - Tipo Otros
                </label>
                <textarea
                  value={config.correos_otros || ""}
                  onChange={(e) => setConfig({ ...config, correos_otros: e.target.value })}
                  placeholder="ejemplo1@empresa.com, ejemplo2@empresa.com"
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white font-mono"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={handleSaveCorreos}
              disabled={savingCorreos}
              className="py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {savingCorreos ? "Guardando..." : "Guardar Correos de Notificación"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Auditoria Section ────────────────────────────────────────────────────────

interface AuditLogItem {
  oid: number;
  fecha_hora: string;
  tipo_accion: string;
  ip_equipo: string;
  nombre_equipo?: string | null;
  usuario_windows_equipo?: string | null;
  modulo: string;
  submodulo: "LOGS_SISTEMAS" | "LOGS_DESCARGAS" | "LOGS_ACCESOS";
  usuario: string;
  detalle?: string | null;
  payload_json?: Record<string, unknown> | null;
}

type AuditSubmodulo = "LOGS_SISTEMAS" | "LOGS_DESCARGAS" | "LOGS_ACCESOS";

function AuditoriaSection({ submodulo }: { submodulo: AuditSubmodulo }) {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [filters, setFilters] = useState({
    tipo_accion: "",
    ip_equipo: "",
    nombre_equipo: "",
    usuario_windows_equipo: "",
    modulo: "",
    usuario: "",
    fecha_inicio: "",
    fecha_fin: "",
  });

  const buildQueryParams = () => {
    const queryParams = new URLSearchParams();
    queryParams.append("submodulo", submodulo);
    if (filters.tipo_accion) queryParams.append("tipo_accion", filters.tipo_accion);
    if (filters.ip_equipo) queryParams.append("ip_equipo", filters.ip_equipo);
    if (filters.nombre_equipo) queryParams.append("nombre_equipo", filters.nombre_equipo);
    if (filters.usuario_windows_equipo) queryParams.append("usuario_windows_equipo", filters.usuario_windows_equipo);
    if (filters.modulo) queryParams.append("modulo", filters.modulo);
    if (filters.usuario) queryParams.append("usuario", filters.usuario);
    if (filters.fecha_inicio) queryParams.append("fecha_inicio", filters.fecha_inicio);
    if (filters.fecha_fin) queryParams.append("fecha_fin", filters.fecha_fin);
    return queryParams;
  };

  const fetchLogs = () => {
    setLoading(true);
    const queryParams = buildQueryParams();
    api<AuditLogItem[]>(`/auditoria/?${queryParams.toString()}`)
      .then(setLogs)
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, [submodulo]);

  const handleExportExcel = () => {
    const queryParams = buildQueryParams();
    window.open(`/api/v1/auditoria/exportar-excel?${queryParams.toString()}`, "_blank");
  };
  const logPagination = useTablePagination(logs);

  const submoduloTitles = {
    LOGS_SISTEMAS: "Logs Sistemas",
    LOGS_DESCARGAS: "Logs Descargas",
    LOGS_ACCESOS: "Logs Accesos",
  } as const;
  const subtitleBySubmodulo = {
    LOGS_SISTEMAS: "Historial de operaciones del sistema con detalle de solicitud/respuesta.",
    LOGS_DESCARGAS: "Historial de descargas de documentos y reportes del sistema.",
    LOGS_ACCESOS: "Historial de accesos de lectura (GET) a recursos del sistema.",
  } as const;

  return (
    <div className="space-y-6">
      <SectionHeader
        title={`Auditoría - ${submoduloTitles[submodulo]}`}
        subtitle={subtitleBySubmodulo[submodulo]}
      />

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-9 items-end bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Acción (HTTP)</label>
            <select
              value={filters.tipo_accion}
              onChange={(e) => setFilters({ ...filters, tipo_accion: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
            >
              <option value="">Todas</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="OPTIONS">OPTIONS</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">IP del Equipo</label>
            <input
              type="text"
              value={filters.ip_equipo}
              onChange={(e) => setFilters({ ...filters, ip_equipo: e.target.value })}
              placeholder="Ej: 192.168.1.1"
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Nombre del Equipo</label>
            <input
            type="text"
            value={filters.nombre_equipo}
            onChange={(e) => setFilters({ ...filters, nombre_equipo: e.target.value })}
            placeholder="Ej: EQUIPO-01"
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Usuario Windows</label>
            <input
            type="text"
            value={filters.usuario_windows_equipo}
            onChange={(e) => setFilters({ ...filters, usuario_windows_equipo: e.target.value })}
            placeholder="Ej: sistemas"
            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Módulo</label>
            <input
              type="text"
              value={filters.modulo}
              onChange={(e) => setFilters({ ...filters, modulo: e.target.value })}
              placeholder="Ej: Versiones"
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Usuario</label>
            <input
              type="text"
              value={filters.usuario}
              onChange={(e) => setFilters({ ...filters, usuario: e.target.value })}
              placeholder="Ej: Coordinador"
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Desde</label>
            <input
              type="date"
              value={filters.fecha_inicio}
              onChange={(e) => setFilters({ ...filters, fecha_inicio: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Hasta</label>
            <input
              type="date"
              value={filters.fecha_fin}
              onChange={(e) => setFilters({ ...filters, fecha_fin: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
            />
          </div>

          <div className="flex gap-2">
            <Btn v="primary" sm onClick={fetchLogs} className="flex-1 justify-center">
              Filtrar
            </Btn>
            <Btn v="success" sm onClick={handleExportExcel} className="flex-1 justify-center">
              <Download size={13} /> Excel
            </Btn>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                {["#", "Fecha y Hora", "Acción", "IP del Equipo", "Nombre del Equipo", "Usuario Windows", "Módulo", "Detalle", "Acción"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left font-bold text-slate-500 uppercase tracking-wider bg-slate-50">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logPagination.rows.map((log) => {
                const badgeColor =
                  log.tipo_accion === "POST" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                  log.tipo_accion === "PUT" ? "bg-amber-100 text-amber-800 border-amber-200" :
                  log.tipo_accion === "DELETE" ? "bg-rose-100 text-rose-800 border-rose-200" :
                  "bg-slate-100 text-slate-700 border-slate-200";
                return (
                  <tr key={log.oid} className="hover:bg-slate-50/70">
                    <td className="px-3 py-2 text-slate-400 font-mono">#{log.oid}</td>
                    <td className="px-3 py-2 text-slate-600 font-mono whitespace-nowrap">{log.fecha_hora}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${badgeColor}`}>
                        {log.tipo_accion}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-600">{log.ip_equipo}</td>
                    <td className="px-3 py-2 text-slate-700">{log.nombre_equipo || "No disponible"}</td>
                    <td className="px-3 py-2 text-slate-700">{log.usuario_windows_equipo || "No disponible"}</td>
                    <td className="px-3 py-2 font-bold text-[#0778ac]">{log.modulo}</td>
                    <td className="px-3 py-2 text-slate-600 max-w-md truncate" title={log.detalle || ""}>{log.detalle || "—"}</td>
                    <td className="px-3 py-2">
                      <Btn v="ghost" sm onClick={() => setSelectedLog(log)}>
                        <Eye size={13} /> Consultar
                      </Btn>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          <TablePaginationControls pagination={logPagination} itemLabel="registros" />
          {!loading && logs.length === 0 && <EmptyState message="No se encontraron registros de auditoría." />}
        </div>
      </div>

      <Modal
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={`Detalle del Log #${selectedLog?.oid ?? ""}`}
        size="lg"
      >
        {!selectedLog ? null : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-slate-200 p-3"><p className="text-[11px] uppercase tracking-wider text-slate-400">Fecha y hora</p><p className="mt-1 font-semibold text-slate-800">{selectedLog.fecha_hora}</p></div>
              <div className="rounded-xl border border-slate-200 p-3"><p className="text-[11px] uppercase tracking-wider text-slate-400">Acción</p><p className="mt-1 font-semibold text-slate-800">{selectedLog.tipo_accion}</p></div>
              <div className="rounded-xl border border-slate-200 p-3"><p className="text-[11px] uppercase tracking-wider text-slate-400">IP del equipo</p><p className="mt-1 font-semibold text-slate-800">{selectedLog.ip_equipo}</p></div>
              <div className="rounded-xl border border-slate-200 p-3"><p className="text-[11px] uppercase tracking-wider text-slate-400">Nombre del equipo</p><p className="mt-1 font-semibold text-slate-800">{selectedLog.nombre_equipo || "No disponible"}</p></div>
              <div className="rounded-xl border border-slate-200 p-3"><p className="text-[11px] uppercase tracking-wider text-slate-400">Usuario windows</p><p className="mt-1 font-semibold text-slate-800">{selectedLog.usuario_windows_equipo || "No disponible"}</p></div>
              <div className="rounded-xl border border-slate-200 p-3"><p className="text-[11px] uppercase tracking-wider text-slate-400">Módulo</p><p className="mt-1 font-semibold text-slate-800">{selectedLog.modulo}</p></div>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-400">Detalle</p>
              <p className="mt-1 text-sm text-slate-700">{selectedLog.detalle || "—"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-400">Estructura JSON</p>
              <pre className="mt-2 max-h-[320px] overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
{JSON.stringify(selectedLog.payload_json || {}, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── Coordinator Module ───────────────────────────────────────────────────────

type CoordTab = "registro" | "restaurarDB" | "consulta" | "consultaVersiones" | "versionParametros" | "detalles" | "solicitudParametro" | "parametrosConfig" | "reporteFirmas" | "reporteDetalles" | "solicitudesManuales" | "auditoria";

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
  const [activeSection, setActiveSection] = useState<CoordTab | "reportes" | "documentos" | "solicitudesDropdown">(selectedSection);
  const [registroOpen, setRegistroOpen] = useState(false);
  const [consultaOpen, setConsultaOpen] = useState(false);
  const [solicitudOpen, setSolicitudOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [auditoriaOpen, setAuditoriaOpen] = useState(false);
  const [auditoriaSubmodulo, setAuditoriaSubmodulo] = useState<AuditSubmodulo>("LOGS_SISTEMAS");
  const [documentView, setDocumentView] = useState<"boletines" | "manuales" | "solicitudesManuales" | null>(null);
  const [solicitudes, setSolicitudes] = useState<SolicitudParametro[]>([]);

  useEffect(() => {
    setTab(selectedSection);
    setActiveSection(selectedSection);
  }, [selectedSection]);

  const goToSection = (section: CoordTab) => {
    const normalized = section === "consulta" ? "consultaVersiones" as CoordTab : section;
    setTab(normalized);
    setActiveSection(normalized as any);
    onSelectSection(normalized);
    setRegistroOpen(false);
    setConsultaOpen(false);
    setSolicitudOpen(false);
    setReportsOpen(false);
    setDocumentsOpen(false);
    setAuditoriaOpen(false);
    setDocumentView(null);
  };

  return (
    <div className="flex flex-col h-full">
      <nav className="bg-[#0778ac] text-white px-4 flex items-center gap-1 h-13 shrink-0">
        <span className="text-xs font-bold tracking-widest uppercase text-white/90 mr-4 shrink-0">
          COORDINADOR
        </span>

        {/* Dropdown Registro */}
        <div className="relative">
          <button
            onClick={() => {
              setRegistroOpen(!registroOpen);
              setSolicitudOpen(false);
              setReportsOpen(false);
              setDocumentsOpen(false);
              setAuditoriaOpen(false);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-3 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
              activeSection === "registro" || activeSection === "restaurarDB"
                ? "border-white text-white bg-white/10"
                : "border-transparent text-white/85 hover:text-white hover:border-white/60"
            }`}
          >
            <Plus size={14} />
            Registro
            <ChevronDown
              size={12}
              className={`transition-transform ${registroOpen ? "rotate-180" : ""}`}
            />
          </button>
          {registroOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-30 min-w-56">
              <button
                onClick={() => goToSection("registro")}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  activeSection === "registro"
                    ? "bg-[#0778ac]/10 text-[#0778ac] font-bold"
                    : "text-slate-700 hover:bg-[#0778ac]/10 hover:text-[#0778ac]"
                }`}
              >
                Versión
              </button>
              <button
                onClick={() => goToSection("restaurarDB")}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  activeSection === "restaurarDB"
                    ? "bg-[#0778ac]/10 text-[#0778ac] font-bold"
                    : "text-slate-700 hover:bg-[#0778ac]/10 hover:text-[#0778ac]"
                }`}
              >
                Restaurar DB
              </button>
            </div>
          )}
        </div>

        {/* Dropdown Consulta de Versión */}
        <div className="relative">
          <button
            onClick={() => {
              setConsultaOpen(!consultaOpen);
              setRegistroOpen(false);
              setSolicitudOpen(false);
              setReportsOpen(false);
              setDocumentsOpen(false);
              setAuditoriaOpen(false);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-3 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
              activeSection === "consultaVersiones" || activeSection === "consulta" || activeSection === "versionParametros"
                ? "border-white text-white bg-white/10"
                : "border-transparent text-white/85 hover:text-white hover:border-white/60"
            }`}
          >
            <ClipboardList size={14} />
            Consulta de Versión
            <ChevronDown size={12} className={`transition-transform ${consultaOpen ? "rotate-180" : ""}`} />
          </button>
          {consultaOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-30 min-w-60">
              <button
                onClick={() => goToSection("consultaVersiones")}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  activeSection === "consultaVersiones" || activeSection === "consulta"
                    ? "bg-[#0778ac]/10 text-[#0778ac] font-bold"
                    : "text-slate-700 hover:bg-[#0778ac]/10 hover:text-[#0778ac]"
                }`}
              >
                Consultar versiones
              </button>
              <button
                onClick={() => goToSection("versionParametros")}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  activeSection === "versionParametros"
                    ? "bg-[#0778ac]/10 text-[#0778ac] font-bold"
                    : "text-slate-700 hover:bg-[#0778ac]/10 hover:text-[#0778ac]"
                }`}
              >
                Parámetros
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => goToSection("detalles")}
          className={`flex items-center gap-1.5 px-3.5 py-3 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
            activeSection === "detalles"
              ? "border-white text-white bg-white/10"
              : "border-transparent text-white/85 hover:text-white hover:border-white/60"
          }`}
        >
          <Eye size={14} />
          Detalles de Validación
        </button>

        {/* Dropdown Solicitud de Parámetro */}
        <div className="relative">
          <button
            onClick={() => {
              setSolicitudOpen(!solicitudOpen);
              setRegistroOpen(false);
              setConsultaOpen(false);
              setReportsOpen(false);
              setDocumentsOpen(false);
              setAuditoriaOpen(false);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-3 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
              activeSection === "solicitudParametro" || activeSection === "parametrosConfig"
                ? "border-white text-white bg-white/10"
                : "border-transparent text-white/85 hover:text-white hover:border-white/60"
            }`}
          >
            <ClipboardList size={14} />
            Solicitud de Parámetro
            <ChevronDown
              size={12}
              className={`transition-transform ${solicitudOpen ? "rotate-180" : ""}`}
            />
          </button>
          {solicitudOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-30 min-w-60">
              <button
                onClick={() => goToSection("solicitudParametro")}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  activeSection === "solicitudParametro"
                    ? "bg-[#0778ac]/10 text-[#0778ac] font-bold"
                    : "text-slate-700 hover:bg-[#0778ac]/10 hover:text-[#0778ac]"
                }`}
              >
                Habilitación de Parámetro
              </button>
              <button
                onClick={() => goToSection("parametrosConfig")}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  activeSection === "parametrosConfig"
                    ? "bg-[#0778ac]/10 text-[#0778ac] font-bold"
                    : "text-slate-700 hover:bg-[#0778ac]/10 hover:text-[#0778ac]"
                }`}
              >
                Parámetros
              </button>
            </div>
          )}
        </div>

        {/* Dropdown Reportes */}
        <div className="relative">
          <button
            onClick={() => { setReportsOpen(!reportsOpen); setRegistroOpen(false); setConsultaOpen(false); setDocumentsOpen(false); setSolicitudOpen(false); setAuditoriaOpen(false); }}
            className={`flex items-center gap-1.5 px-3.5 py-3 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
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
                onClick={() => { setTab("reporteFirmas"); setActiveSection("reportes"); setReportsOpen(false); setDocumentsOpen(false); setSolicitudOpen(false); setAuditoriaOpen(false); setDocumentView(null); }}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-[#0778ac]/10 hover:text-[#0778ac] transition-colors"
              >
                Reporte de Firmas de Directivos
              </button>
              <button
                onClick={() => { setTab("reporteDetalles"); setActiveSection("reportes"); setReportsOpen(false); setDocumentsOpen(false); setSolicitudOpen(false); setAuditoriaOpen(false); setDocumentView(null); }}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-[#0778ac]/10 hover:text-[#0778ac] transition-colors"
              >
                Reporte de Detalles de Validación
              </button>
            </div>
          )}
        </div>

        {/* Dropdown Documentos */}
        <div className="relative">
           <button
            onClick={() => { setDocumentsOpen(!documentsOpen); setRegistroOpen(false); setConsultaOpen(false); setReportsOpen(false); setSolicitudOpen(false); setAuditoriaOpen(false); }}
            className={`flex items-center gap-1.5 px-3.5 py-3 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
              activeSection === "documentos" || activeSection === "solicitudesManuales"
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
            <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-30 min-w-60">
              <button
                onClick={() => { setActiveSection("documentos"); setDocumentView("boletines"); setDocumentsOpen(false); setReportsOpen(false); setSolicitudOpen(false); setAuditoriaOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-[#0778ac]/10 hover:text-[#0778ac] transition-colors"
              >
                Boletines Tecnicos
              </button>
              <button
                onClick={() => { setActiveSection("documentos"); setDocumentView("manuales"); setDocumentsOpen(false); setReportsOpen(false); setSolicitudOpen(false); setAuditoriaOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-[#0778ac]/10 hover:text-[#0778ac] transition-colors"
              >
                Manuales de Usuarios
              </button>
              <button
                onClick={() => { goToSection("solicitudesManuales"); setDocumentsOpen(false); setReportsOpen(false); setSolicitudOpen(false); setAuditoriaOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-[#0778ac]/10 hover:text-[#0778ac] transition-colors border-t border-slate-100"
              >
                Solicitudes de manuales
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => { setAuditoriaOpen(!auditoriaOpen); setRegistroOpen(false); setConsultaOpen(false); setReportsOpen(false); setDocumentsOpen(false); setSolicitudOpen(false); }}
            className={`flex items-center gap-1.5 px-3.5 py-3 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
              activeSection === "auditoria"
                ? "border-white text-white bg-white/10"
                : "border-transparent text-white/85 hover:text-white hover:border-white/60"
            }`}
          >
            <ShieldCheck size={14} />
            Auditoría
            <ChevronDown
              size={12}
              className={`transition-transform ${auditoriaOpen ? "rotate-180" : ""}`}
            />
          </button>
          {auditoriaOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-30 min-w-56">
              {([
                ["LOGS_SISTEMAS", "Logs Sistemas"],
                ["LOGS_DESCARGAS", "Logs Descargas"],
                ["LOGS_ACCESOS", "Logs Accesos"],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => {
                    setAuditoriaSubmodulo(key);
                    setActiveSection("auditoria");
                    onSelectSection("auditoria");
                    setAuditoriaOpen(false);
                    setRegistroOpen(false);
                    setConsultaOpen(false);
                    setSolicitudOpen(false);
                    setReportsOpen(false);
                    setDocumentsOpen(false);
                    setDocumentView(null);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    activeSection === "auditoria" && auditoriaSubmodulo === key
                      ? "bg-[#0778ac]/10 text-[#0778ac] font-bold"
                      : "text-slate-700 hover:bg-[#0778ac]/10 hover:text-[#0778ac]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>

      <div className="flex-1 overflow-auto bg-[#f8f9fa] p-6">
        {activeSection === "registro" && (
          <VersionRegistration versions={versions} setVersions={setVersions} onError={onError} />
        )}
        {activeSection === "restaurarDB" && (
          <RestaurarDBSection versions={versions} onError={onError} />
        )}
        {(activeSection === "consulta" || activeSection === "consultaVersiones") && (
          <VersionQuery versions={versions} setVersions={setVersions} onError={onError} loggedUser={loggedUser} />
        )}
        {activeSection === "versionParametros" && (
          <VersionCorreoParametrosSection onError={onError} />
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
                Seleccione Documentos → Boletines, Manuales de Usuarios o Solicitudes de manuales.
              </div>
            )}
          </>
        )}
        {activeSection === "solicitudesManuales" && (
          <SolicitudesManualesSection onError={onError} />
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
        {activeSection === "parametrosConfig" && (
          <ParametrosConfigSection onError={onError} />
        )}
        {activeSection === "reportes" && tab === "reporteFirmas" && (
          <ReportFirmas versions={versions} observaciones={observaciones} />
        )}
        {activeSection === "reportes" && tab === "reporteDetalles" && (
          <ReportDetalles versions={versions} observaciones={observaciones} />
        )}
        {activeSection === "auditoria" && (
          <AuditoriaSection submodulo={auditoriaSubmodulo} />
        )}
      </div>
    </div>
  );
}

// ─── 1. Version Registration ──────────────────────────────────────────────────

function VersionRegistration({
  versions,
  setVersions,
  onError,
}: {
  versions: Version[];
  setVersions: React.Dispatch<React.SetStateAction<Version[]>>;
  onError: (message: string) => void;
}) {
  const containerOptions = getContainerOptions(versions);
  const [form, setForm] = useState({
    titulo: "",
    descripcion: "",
    enlace: "",
    contenedor_bd: DEFAULT_DB_CONTAINERS[0],
    num_compilacion: "",
    fecha_compilacion: "",
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.titulo.trim() || !form.descripcion.trim() || !form.enlace.trim()) {
      onError("Título, descripción y enlace son obligatorios para registrar la versión.");
      return;
    }

    setSaving(true);
    try {
      const created = await api<ApiVersion>("/versions/", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          titulo: form.titulo.trim(),
          descripcion: form.descripcion.trim(),
          enlace: form.enlace.trim(),
          contenedor_bd: normalizeContainerName(form.contenedor_bd) || null,
          fecha_compilacion: form.fecha_compilacion ? form.fecha_compilacion : null,
          usuario: "Coordinador de Sistemas",
        }),
      });
      setVersions((prev) => sortVersionsByCompilationDateDesc([toVersion(created), ...prev]));
      setForm({
        titulo: "",
        descripcion: "",
        enlace: "",
        contenedor_bd: DEFAULT_DB_CONTAINERS[0],
        num_compilacion: "",
        fecha_compilacion: "",
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      onError(error instanceof Error ? error.message : "No fue posible guardar la versión.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <SectionHeader
        title="Registro de Versión del Sistema"
        subtitle="Complete los datos para registrar una nueva versión del sistema."
      />
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-5">
        <div className="grid gap-4 md:grid-cols-2">
          <FormInput
            label="Título (Versión del Sistema)"
            required
            placeholder="Ej: Versión 2.4.1"
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
          />
          <ContainerAutocompleteField
            label="Contenedor de Base de Datos"
            listId="version-registration-container-options"
            value={form.contenedor_bd}
            onChange={(value) => setForm({ ...form, contenedor_bd: value })}
            options={containerOptions}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormInput
            label="Número de compilación"
            placeholder="Ej: BUILD-2026-08-22"
            value={form.num_compilacion}
            onChange={(e) => setForm({ ...form, num_compilacion: e.target.value })}
          />
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Fecha de compilación</label>
            <input
              type="datetime-local"
              value={form.fecha_compilacion}
              onChange={(e) => setForm({ ...form, fecha_compilacion: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0778ac]"
            />
          </div>
        </div>

        <FormTextarea
          label="Descripción (Detalles de mejoras en la actualización)"
          required
          rows={4}
          placeholder="Describa los cambios principales..."
          value={form.descripcion}
          onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
        />
        <FormInput
          label="Enlace (URL de la versión)"
          required
          type="url"
          placeholder="http://..."
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

// ─── Restaurar DB Section ──────────────────────────────────────────────────

function RestaurarDBSection({
  versions,
  onError,
}: {
  versions: Version[];
  onError: (message: string) => void;
}) {
  const [contenedorBd, setContenedorBd] = useState<"DGEMPRES99" | "DGEMPRES98" | "DGEMPRES10">("DGEMPRES99");
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
        <div className="p-4 border-b border-slate-200 sticky top-0 bg-white z-20">
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Historial de Restauraciones de BD</h4>
        </div>
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-12 z-10">
            <tr>
              {["ID", "Contenedor BD", "Fecha Restauración", "Fecha Última Copia BD", "Compilación Anclada", "Usuario"].map((h) => (
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

// ─── 2. Version Query ─────────────────────────────────────────────────────────

function VersionQuery({
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

  const [editForm, setEditForm] = useState({
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
            {versionPagination.rows.map((v) => (
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
                    <button
                      onClick={() => { setCorreoModal(v); setCorreoTipo("pruebas"); setCorreoMejoras(""); setCorreoFechaDespliegue(""); }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#0778ac] hover:bg-[#066591] text-white transition-colors shadow-sm"
                    >
                      <Mail size={13} /> Enviar correo
                    </button>
                  </div>
                </td>
              </tr>
            ))}
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
              label={correoTipo==="pruebas" ? "Descripción de mejoras de esta compilación *" : "Detalles de mejora *"}
              required
              rows={5}
              placeholder={correoTipo==="pruebas" ? "Describa las mejoras/cambios incluidos en esta compilación..." : "Detalle las mejoras, correcciones e impactos de la versión estable..."}
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

// ─── 2b. Version Correo Parametros ────────────────────────────────────────────

function VersionCorreoParametrosSection({ onError }: { onError: (msg: string) => void }) {
  const [config, setConfig] = useState({ correos_pruebas: "", correos_produccion: "" });
  const [loading, setLoading] = useState(true);
  const [savingPruebas, setSavingPruebas] = useState(false);
  const [savingProduccion, setSavingProduccion] = useState(false);
  const [savingBoth, setSavingBoth] = useState(false);

  const fetchConfig = () => {
    setLoading(true);
    api<{ correos_pruebas: string; correos_produccion: string }>("/versions/config/correos")
      .then((data) => setConfig({ correos_pruebas: data.correos_pruebas || "", correos_produccion: data.correos_produccion || "" }))
      .catch((e) => onError(e instanceof Error ? e.message : "Error cargando configuración de correos"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchConfig(); }, []);

  const save = (payload: { correos_pruebas: string; correos_produccion: string }, mode: "pruebas" | "produccion" | "both") => {
    if (mode === "pruebas") setSavingPruebas(true);
    else if (mode === "produccion") setSavingProduccion(true);
    else setSavingBoth(true);
    api<{ correos_pruebas: string; correos_produccion: string }>("/versions/config/correos", {
      method: "PUT",
      body: JSON.stringify(payload),
    })
      .then((data) => {
        setConfig({ correos_pruebas: data.correos_pruebas || "", correos_produccion: data.correos_produccion || "" });
        toast.success(mode === "both" ? "Correos guardados correctamente." : `Correos de ${mode} guardados.`);
      })
      .catch((e) => onError(e instanceof Error ? e.message : "Error guardando correos"))
      .finally(() => {
        setSavingPruebas(false); setSavingProduccion(false); setSavingBoth(false);
      });
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando configuración de correos de versiones...</div>;

  return (
    <div className="space-y-6">
      <SectionHeader title="Parámetros de Correos de Versiones" subtitle="Configure los destinatarios para los correos de pruebas y producción. Misma lógica que Solicitud de Parámetros." />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="p-2 bg-[#0778ac]/10 text-[#0778ac] rounded-xl font-bold">✉</div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Correos — Pruebas</h3>
                <p className="text-xs text-slate-400">Notificaciones de pruebas</p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Destinatarios (separados por coma)</label>
              <textarea
                value={config.correos_pruebas}
                onChange={(e) => setConfig({ ...config, correos_pruebas: e.target.value })}
                placeholder="pruebas@empresa.com, qa@empresa.com"
                rows={5}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white font-mono"
              />
              <p className="mt-1 text-xs text-slate-400">Se aplicará split por coma o punto y coma.</p>
            </div>
          </div>
          <div className="pt-5 mt-4 border-t border-slate-100">
            <button
              onClick={() => save(config, "pruebas")}
              disabled={savingPruebas}
              className="w-full py-2.5 px-4 rounded-xl bg-[#0778ac] hover:bg-[#066591] text-white text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
            >
              {savingPruebas ? "Guardando..." : "Guardar Correos Pruebas"}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl font-bold">✉</div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Correos — Producción</h3>
                <p className="text-xs text-slate-400">Notificaciones de despliegue</p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Destinatarios (separados por coma)</label>
              <textarea
                value={config.correos_produccion}
                onChange={(e) => setConfig({ ...config, correos_produccion: e.target.value })}
                placeholder="produccion@empresa.com, direccion@empresa.com"
                rows={5}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white font-mono"
              />
              <p className="mt-1 text-xs text-slate-400">Formato dd/MM/yyyy hh:mm a.m./p.m. America/Bogota.</p>
            </div>
          </div>
          <div className="pt-5 mt-4 border-t border-slate-100">
            <button
              onClick={() => save(config, "produccion")}
              disabled={savingProduccion}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
            >
              {savingProduccion ? "Guardando..." : "Guardar Correos Producción"}
            </button>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Guardar ambos</h3>
            <p className="text-xs text-slate-400">Aplica la misma lógica de envío que Solicitud de Parámetros (SMTP reportado por warning si falla).</p>
          </div>
          <button
            onClick={() => save(config, "both")}
            disabled={savingBoth}
            className="py-2.5 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
          >
            {savingBoth ? "Guardando..." : "Guardar Todo"}
          </button>
        </div>
      </div>
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

function ReportFirmas({
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
    const asistenciaMap = new Map<string, { nombre: string; cargo: string; modulo: string; fecha_hora: string; estado: string; tiene_firma: boolean }>();

    filteredObs.forEach((o) => {
      const key = `${o.nombre}__${o.cargo ?? ""}__${o.modulo}__${o.fechaHora}__${o.estado}`;
      if (!asistenciaMap.has(key)) {
        asistenciaMap.set(key, {
          nombre: o.nombre,
          cargo: o.cargo ?? "",
          modulo: MODULO_LABELS[o.modulo] ?? o.modulo,
          fecha_hora: o.fechaHora,
          estado: o.estado,
          tiene_firma: Boolean(o.firma),
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

// ─── 4.2 Report Detalles ──────────────────────────────────────────────────────

function ReportDetalles({
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
    { key: "boletines", label: "Boletines técnicos", icon: <FileText size={14} /> },
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

  return (
    <div>
      <SectionHeader
        title="Registro de Validación del Sistema"
        subtitle="Versiones disponibles para validación. Registre sus observaciones, aprobaciones o rechazos."
      />
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

function renderImpactoBadge(impacto?: string | null) {
  const imp = (impacto || "").toLowerCase().trim();
  if (imp === "alto") {
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200 uppercase">Alto</span>;
  }
  if (imp === "medio") {
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 uppercase">Medio</span>;
  }
  if (imp === "bajo") {
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase">Bajo</span>;
  }
  return <span className="text-slate-600 text-xs">{impacto || "—"}</span>;
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
  const [exportPreviewOpen, setExportPreviewOpen] = useState(false);
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
  const boletinPagination = useTablePagination(filteredItems);

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

  async function handleExportExcel() {
    if (!selectedMes || !selectedAnio) {
      setError("Seleccione un mes y año para exportar los boletines.");
      return;
    }

    try {
      setError("");
      const params = new URLSearchParams({
        mes: String(selectedMes),
        anio: String(selectedAnio),
      });

      Object.entries(filters).forEach(([key, value]) => {
        const normalized = value.trim();
        if (normalized) {
          params.set(key, normalized);
        }
      });

      await downloadApiFile(
        `/boletines/exportar-excel?${params.toString()}`,
        `boletines_filtrados_${selectedAnio}_${String(selectedMes).padStart(2, "0")}.xlsx`
      );
      window.setTimeout(() => {
        setExportPreviewOpen(false);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible exportar el archivo Excel.");
    }
  }

  function handleOpenExportPreview() {
    if (!selectedMes || !selectedAnio) {
      setError("Seleccione un mes y año para exportar los boletines.");
      return;
    }
    if (filteredItems.length === 0) {
      setError("No hay boletines filtrados para exportar.");
      return;
    }
    setError("");
    setExportPreviewOpen(true);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <SectionHeader
          title="Boletines técnicos"
          subtitle="Cargue el archivo Excel por mes/año y consulte el detalle por periodo."
        />
        <div className="flex items-center gap-2">
          <Btn
            v="secondary"
            onClick={handleOpenExportPreview}
            disabled={!selectedMes || !selectedAnio || loading || items.length === 0}
          >
            <Download size={14} /> Vista previa XLSX
          </Btn>
          {canUpload && (
            <Btn v="primary" onClick={() => setFormOpen(true)}>
              <Plus size={14} /> Cargar Excel
            </Btn>
          )}
        </div>
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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        {error && <EmptyState message={error} />}
        {!error && loading && <EmptyState message="Cargando boletines..." />}
        {!error && !loading && items.length === 0 && <EmptyState message="No hay boletines para el periodo seleccionado." />}
        {!error && !loading && items.length > 0 && (
          <>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm min-w-[960px] table-fixed">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
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
                    className="px-3 py-2 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
              <tr className="border-t border-slate-200 bg-slate-50">
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
              {boletinPagination.rows.map((b) => (
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
                  <td className="px-3 py-2">{renderImpactoBadge(b.impacto)}</td>
                  <td className="px-3 py-2 text-slate-600">{b.categoria || "—"}</td>
                  <td className="px-3 py-2 text-slate-600">{b.clase_documento || "—"}</td>
                  <td className="px-3 py-2 text-slate-700 max-w-[280px] truncate" title={b.asunto || ""}>{b.asunto || "—"}</td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-400 text-sm">
                    No hay resultados para los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
          <TablePaginationControls pagination={boletinPagination} itemLabel="boletines" />
          </>
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
                ["Impacto", renderImpactoBadge(selectedBoletin.impacto)],
                ["Categoria", selectedBoletin.categoria],
                ["Con Documentacion", selectedBoletin.con_documentacion ? "Si" : "No"],
                ["Clase de documento", selectedBoletin.clase_documento],
                ["Advertencia", selectedBoletin.advertencia],
              ].map(([label, value]) => (
                <div key={label as string} className="rounded-xl border border-slate-200 p-3">
                  <p className="text-[11px] uppercase tracking-wider text-slate-400">{label as string}</p>
                  <div className="text-sm text-slate-700 mt-1 break-words">
                    {typeof value === "string" ? value || "—" : value}
                  </div>
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
            <div className="flex justify-end items-center gap-2 pt-2 border-t border-slate-100">
              <Btn
                v="primary"
                onClick={() => {
                  window.open(`/api/v1/boletines/${selectedBoletin.oid}/pdf`, "_blank");
                }}
              >
                <Printer size={14} /> Descargar detalle
              </Btn>
              <Btn v="secondary" onClick={() => setDetailOpen(false)}>Cerrar</Btn>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={exportPreviewOpen}
        onClose={() => setExportPreviewOpen(false)}
        title="Vista previa de exportación XLSX"
        size="xl"
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold text-slate-800">
                {selectedMes && selectedAnio
                  ? `Boletines de ${monthName(selectedMes)} ${selectedAnio}`
                  : "Boletines filtrados"}
              </p>
              <p>Se exportarán {filteredItems.length} registro(s) con los filtros actuales.</p>
            </div>
            <Btn v="primary" onClick={handleExportExcel} disabled={filteredItems.length === 0}>
              <Download size={14} /> Descargar XLSX
            </Btn>
          </div>

          <div className="overflow-x-auto overflow-y-auto max-h-[520px] rounded-xl border border-slate-200">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50">
                <tr>
                  {[
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
                      className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredItems.map((b) => (
                  <tr key={`preview-${b.oid}`} className="hover:bg-slate-50/70">
                    <td className="px-3 py-2 text-slate-600">{b.consecutivo ?? "—"}</td>
                    <td className="px-3 py-2 text-slate-600">{b.modulo || "—"}</td>
                    <td className="px-3 py-2 text-slate-600">{b.fecha?.slice(0, 10) ?? "—"}</td>
                    <td className="px-3 py-2 text-slate-600">{b.opcion || "—"}</td>
                    <td className="px-3 py-2">{renderImpactoBadge(b.impacto)}</td>
                    <td className="px-3 py-2 text-slate-600">{b.categoria || "—"}</td>
                    <td className="px-3 py-2 text-slate-600">{b.clase_documento || "—"}</td>
                    <td className="max-w-[360px] truncate px-3 py-2 text-slate-700" title={b.asunto || ""}>
                      {b.asunto || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-2">
            <Btn v="secondary" onClick={() => setExportPreviewOpen(false)}>
              Cerrar
            </Btn>
          </div>
        </div>
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

// ─── Manuales Row with Download Request Flow ──────────────────────────────────

function ManualRow({ m }: { m: ApiManual }) {
  const [downloadStatus, setDownloadStatus] = useState<{ activo: boolean; minutos_restantes: number }>({ activo: false, minutos_restantes: 0 });
  const [solicitudOpen, setSolicitudOpen] = useState(false);
  const [solForm, setSolForm] = useState({ nombre_solicitante: "", area: "", descripcion: "" });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const checkStatus = () => {
    api<{ activo: boolean; minutos_restantes: number }>(`/manuales/solicitudes/estado-descarga/${m.oid}`)
      .then(setDownloadStatus)
      .catch(() => setDownloadStatus({ activo: false, minutos_restantes: 0 }));
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [m.oid]);

  const handleSendSolicitud = () => {
    if (!solForm.nombre_solicitante.trim() || !solForm.area.trim() || !solForm.descripcion.trim()) {
      setErrorMsg("Todos los campos (Nombre, Área y Descripción) son obligatorios.");
      return;
    }
    setSubmitting(true);
    setErrorMsg("");
    api("/manuales/solicitudes", {
      method: "POST",
      body: JSON.stringify({
        manual_oid: m.oid,
        nombre_solicitante: solForm.nombre_solicitante.trim(),
        area: solForm.area.trim(),
        descripcion: solForm.descripcion.trim(),
      }),
    })
      .then(() => {
        toast.success("Solicitud enviada a Coordinador de Sistemas para su aprobación.");
        setSolicitudOpen(false);
        setSolForm({ nombre_solicitante: "", area: "", descripcion: "" });
      })
      .catch((e) => setErrorMsg(e instanceof Error ? e.message : "Error al enviar la solicitud"))
      .finally(() => setSubmitting(false));
  };

  return (
    <tr className="hover:bg-slate-50/80 transition-colors">
      <td className="px-4 py-3 text-xs font-bold text-[#0778ac]">{MODULO_LABELS[m.modulo] ?? m.modulo}</td>
      <td className="px-4 py-3 font-medium text-slate-900">{m.titulo}</td>
      <td className="px-4 py-3 text-slate-500 text-xs font-mono">v{m.version || "1.0"}</td>
      <td className="px-4 py-3 text-slate-500 text-xs font-mono">{m.fecha_registro.slice(0, 10)}</td>
      <td className="px-4 py-3 text-slate-500 text-xs font-mono">—</td>
      <td className="px-4 py-3">
        {m.archivo ? (
          downloadStatus.activo ? (
            <a href={m.archivo} target="_blank" rel="noreferrer">
              <Btn v="success" sm>
                <Download size={13} /> Descargar PDF ({downloadStatus.minutos_restantes} min)
              </Btn>
            </a>
          ) : (
            <Btn v="secondary" sm onClick={() => setSolicitudOpen(true)}>
              <FileText size={13} /> Solicitar descarga
            </Btn>
          )
        ) : (
          <span className="text-xs text-slate-400">Sin archivo</span>
        )}

        <Modal open={solicitudOpen} onClose={() => setSolicitudOpen(false)} title={`Solicitar Descarga: ${m.titulo}`} size="md">
          <div className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={15} className="text-amber-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Nombre de quien solicita *</label>
              <input
                type="text"
                value={solForm.nombre_solicitante}
                onChange={(e) => setSolForm({ ...solForm, nombre_solicitante: e.target.value })}
                placeholder="Ingrese su nombre completo"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Área *</label>
              <input
                type="text"
                value={solForm.area}
                onChange={(e) => setSolForm({ ...solForm, area: e.target.value })}
                placeholder="Ingrese el área solicitante"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Descripción *</label>
              <textarea
                value={solForm.descripcion}
                onChange={(e) => setSolForm({ ...solForm, descripcion: e.target.value })}
                placeholder="Justifique el motivo de la solicitud..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white min-h-[90px]"
              />
            </div>
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <Btn v="primary" onClick={handleSendSolicitud} disabled={submitting}>
                Enviar Solicitud
              </Btn>
              <Btn v="secondary" onClick={() => setSolicitudOpen(false)}>
                Cancelar
              </Btn>
            </div>
          </div>
        </Modal>
      </td>
    </tr>
  );
}

// ─── Manuales ─────────────────────────────────────────────────────────────────

function ManualesUsuarios({ canUpload = true }: { canUpload?: boolean }) {
  const [items, setItems] = useState<ApiManual[]>([]);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [muColFilters, setMuColFilters] = useState({ modulo: "", titulo: "", version: "", fecha: "" });
  const [form, setForm] = useState({
    modulo: MODULOS[0] ?? "ADMISIONES",
    titulo: "",
    version: "",
    archivo: null as File | null,
  });

  useEffect(() => {
    api<ApiManual[]>("/manuales/").then(setItems).catch((err) => setError(err.message));
  }, []);
  const filteredManuales = items.filter((m) =>
    (!muColFilters.modulo || m.modulo.toLowerCase().includes(muColFilters.modulo.toLowerCase())) &&
    (!muColFilters.titulo || m.titulo.toLowerCase().includes(muColFilters.titulo.toLowerCase())) &&
    (!muColFilters.version || (m.version ?? "").toLowerCase().includes(muColFilters.version.toLowerCase())) &&
    (!muColFilters.fecha || (m.fecha ?? "").toLowerCase().includes(muColFilters.fecha.toLowerCase()))
  );
  const manualPagination = useTablePagination(filteredManuales);

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
        <div className="max-h-[600px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              {['Módulo', 'Título', 'Versión', 'Fecha', 'Páginas', 'Acciones'].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
            <tr className="bg-slate-100/90 border-t border-slate-200">
              <th className="px-4 py-1.5"><input className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-normal" placeholder="Filtrar módulo" onChange={(e) => setMuColFilters((p) => ({ ...p, modulo: e.target.value }))} /></th>
              <th className="px-4 py-1.5"><input className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-normal" placeholder="Filtrar título" onChange={(e) => setMuColFilters((p) => ({ ...p, titulo: e.target.value }))} /></th>
              <th className="px-4 py-1.5"><input className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-normal" placeholder="Filtrar versión" onChange={(e) => setMuColFilters((p) => ({ ...p, version: e.target.value }))} /></th>
              <th className="px-4 py-1.5"><input className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-normal" placeholder="Filtrar fecha" onChange={(e) => setMuColFilters((p) => ({ ...p, fecha: e.target.value }))} /></th>
              <th className="px-4 py-1.5"></th>
              <th className="px-4 py-1.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {manualPagination.rows.map((m) => (
              <ManualRow key={m.oid} m={m} />
            ))}
          </tbody>
        </table>
        </div>
        <TablePaginationControls pagination={manualPagination} itemLabel="manuales" />
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

// ─── Solicitudes de Manuales Section (Coordinator / Admin) ────────────────────

function SolicitudesManualesSection({ onError }: { onError: (msg: string) => void }) {
  const [solicitudes, setSolicitudes] = useState<SolicitudManual[]>([]);
  const [loading, setLoading] = useState(true);
  const [smColFilters, setSmColFilters] = useState({ manual: "", modulo: "", solicitante: "", area: "", fecha: "", estado: "" });

  const fetchSolicitudes = () => {
    setLoading(true);
    api<SolicitudManual[]>("/manuales/solicitudes")
      .then(setSolicitudes)
      .catch((e) => onError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSolicitudes();
  }, []);

  const handleAprobar = (oid: number) => {
    api<SolicitudManual>(`/manuales/solicitudes/${oid}/aprobar`, { method: "PUT" })
      .then((updated) => {
        setSolicitudes((prev) => prev.map((s) => (s.oid === oid ? updated : s)));
        toast.success("Solicitud aprobada por 30 minutos.");
      })
      .catch((e) => onError(e instanceof Error ? e.message : "Error al aprobar la solicitud."));
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
      <SectionHeader
        title="Solicitudes de Descarga de Manuales"
        subtitle="Administre las solicitudes de descarga de manuales de usuario. Al aprobar, el usuario tendrá 30 minutos para descargar el PDF."
      />

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              {["Manual", "Módulo", "Solicitante", "Área", "Descripción", "Fecha Solicitud", "Estado", "Acciones"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
            <tr className="bg-slate-100/90 border-t border-slate-200">
              <th className="px-4 py-1.5"><input className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-normal" placeholder="Filtrar manual" onChange={(e) => setSmColFilters((p) => ({ ...p, manual: e.target.value }))} /></th>
              <th className="px-4 py-1.5"><input className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-normal" placeholder="Filtrar módulo" onChange={(e) => setSmColFilters((p) => ({ ...p, modulo: e.target.value }))} /></th>
              <th className="px-4 py-1.5"><input className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-normal" placeholder="Filtrar solicitante" onChange={(e) => setSmColFilters((p) => ({ ...p, solicitante: e.target.value }))} /></th>
              <th className="px-4 py-1.5"><input className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-normal" placeholder="Filtrar área" onChange={(e) => setSmColFilters((p) => ({ ...p, area: e.target.value }))} /></th>
              <th className="px-4 py-1.5"></th>
              <th className="px-4 py-1.5"><input className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-normal" placeholder="Filtrar fecha" onChange={(e) => setSmColFilters((p) => ({ ...p, fecha: e.target.value }))} /></th>
              <th className="px-4 py-1.5">
                <select className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-normal" onChange={(e) => setSmColFilters((p) => ({ ...p, estado: e.target.value }))}>
                  <option value="">Todos</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Aprobado">Aprobado</option>
                </select>
              </th>
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
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold ${
                    sol.estado === "Aprobado"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : "bg-amber-100 text-amber-800 border border-amber-200"
                  }`}>
                    {sol.estado}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {sol.estado === "Pendiente" ? (
                    <Btn v="success" sm onClick={() => handleAprobar(sol.oid)}>
                      <CheckCircle size={13} /> Aprobar (30 min)
                    </Btn>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">Activo</span>
                  )}
                </td>
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
            <h1 className="text-2xl font-bold text-[#0778ac] tracking-tight">Gestion de solicitudes y Validacion de Compilaciones</h1>
            <p className="text-[#0778ac]/70 text-xs tracking-widest uppercase font-semibold">
              Plataforma integral para solicitudes, validacion de aprobacion y rechazo de versiones de compilacion.
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
            Adminsitrador de Sistemas
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

  function returnToHome() {
    clearAuthenticatedApiUser();
    setCoordinatorLoggedIn(false);
    setLoggedUser("");
    setCoordinatorLogin({ usuario: "", password: "" });
    setCoordinatorLoginError("");
    setModule("home");
  }

  useEffect(() => {
    let active = true;
    Promise.all([api<ApiVersion[]>("/versions/"), api<Observacion[]>("/observaciones/")])
      .then(([apiVersions, apiObservaciones]) => {
        if (!active) return;
        setVersions(sortVersionsByCompilationDateDesc(apiVersions.map(toVersion)));
        setObservaciones(apiObservaciones);
      })
      .catch((requestError) => active && setError(requestError instanceof Error ? requestError.message : "No fue posible conectar con el servidor."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  if (module === "home") {
    return <><Toaster /><ModuleSelector onSelect={setModule} /></>;
  }

  if (module === "solicitud") {
    return (
      <><Toaster /><div className="h-screen flex flex-col overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
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
              onClick={returnToHome}
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
      </div></>
    );
  }

  if (module === "coordinator" && !coordinatorLoggedIn) {
    return (
      <><Toaster /><div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-8 text-slate-900">
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
                  setAuthenticatedApiUser(user);
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
      </div></>
    );
  }

  const isCoord = module === "coordinator";
  const isValidator = module === "validator";

  return (
    <><Toaster /><div className="h-screen flex flex-col overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
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
            onClick={returnToHome}
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
    </div></>
  );
}