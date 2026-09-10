import { useState, useEffect } from "react";
import {
  Monitor, ShieldCheck, X, Eye, Pencil, Power, CheckCircle,
  XCircle, Download, Plus, ExternalLink, FileText, BookOpen,
  BarChart3, ArrowLeft, Upload, Printer, AlertCircle,
  ChevronDown, ChevronRight, ChevronLeft, Settings, Home, ClipboardList,
  Link, RotateCcw, Mail, UserPlus, KeyRound, Trash2, Folder, Search, Menu,
  Lock, Save,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { Modal, StatusBadge, Btn, Field, FormInput, FormTextarea, SectionHeader, EmptyState, type BtnVariant } from "@/components/ui/custom";
import { type Version } from "@/types/version";
import { type Observacion } from "@/types/observacion";
import { type SolicitudParametro, type ConfiguracionParametrosDTO } from "@/types/solicitud-parametro";
import { type ParametrosEstado } from "@/types/parametros";
import { useTablePagination, type TablePaginationResult } from "@/hooks/useTablePagination";
import { TablePaginationControls } from "@/components/ui/TablePagination";
import { ParametroBadge } from "@/features/solicitud-parametro/components/ParametroBadge";

// ─── Helpers de paginación y utilidades (copiados de App.tsx para compatibilidad) ─
function useLocalPagination<T>(items: T[]): TablePaginationResult<T> {
  // wrapper stub que delega al hook real para mantener import requerido
  return useTablePagination(items);
}


// ─────────────────────────────────────────────────────────────────────────────
// Notas de implementación (se mantiene duplicación temporal con App.tsx)
// - Esta sección gestiona correos de pruebas y producción para versiones.
// - Usa api PUT /versions/config/correos y toast para feedback.
// - Imports replican los necesarios de App.tsx: react, lucide, sonner, api,
//   custom ui (SectionHeader), types, pagination helpers, etc.
// - No se modifica App.tsx; duplicación temporal permitida.
// ─────────────────────────────────────────────────────────────────────────────

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


export { VersionCorreoParametrosSection };
export default VersionCorreoParametrosSection;
