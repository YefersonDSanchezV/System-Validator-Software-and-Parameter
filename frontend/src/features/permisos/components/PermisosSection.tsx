import { useState, useEffect } from "react";
import { ShieldCheck, UserPlus, Save, Lock, Settings, Search } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { Modal, Btn, StatusBadge, Field, FormInput, SectionHeader, EmptyState } from "@/components/ui/custom";
import { TablePaginationControls } from "@/components/ui/TablePagination";
import { useTablePagination } from "@/hooks/useTablePagination";
import type { Version } from "@/types/version";
import type { Observacion } from "@/types/observacion";

// ─── Permisos Section ─────────────────────────────────────────────────────────
// Extraído desde src/app/App.tsx:2198-3237 (justo antes de function RestaurarDBSection en 3238).
// Esta copia mantiene TODO el contenido original incluyendo la función PermisosSection,
// constantes ALL_SECTION_LABELS / ALL_SECTION_KEYS y tipo PermisoUser.
// No modifica App.tsx.

const ALL_SECTION_LABELS: Record<string, string> = {
  registro: "Registro de Versión",
  restaurarDB: "Restaurar DB",
  consultaVersiones: "Consultar versión",
  consultaRestauracionDB: "Consultar restauración BD",
  versionParametros: "Parámetros (legacy)",
  detalles: "Detalles de Validación",
  solicitudParametro: "Habilitación de Parámetro",
  solicitudUsuario: "Creación de Usuario",
  solicitudPassword: "Restablecimiento de contraseña",
  parametrosConfig: "Parámetros Solicitudes (legacy)",
  solicitudesManuales: "Solicitudes de manuales",
  reporteFirmas: "Reportes Generados",
  reporteDetalles: "Indicadores Generados",
  documentos_boletines: "Boletines Técnicos",
  documentos_manuales: "Manuales de Usuarios",
  auditoria: "Auditoría",
  permisos: "Permisos (legacy)",
  // Nuevos módulos
  parametrosCorreos: "Parámetros de Correos",
  valoresParametros: "Valores Parámetros",
  generalesPermisos: "Generales - Permisos",
  generalesPlataformas: "Generales - Plataformas",
  generalesUsuarios: "Generales - Usuarios",
  generalesUsuariosPermisos: "Generales - Usuarios Permisos",
};

const ALL_SECTION_KEYS = Object.keys(ALL_SECTION_LABELS);

type PermisoUser = {
  usuario: string;
  permisos: string[];
};

export function PermisosSection({ onError }: { onError: (msg: string) => void }) {
  const [permisos, setPermisos] = useState<PermisoUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("sistemas");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchPermisos = () => {
    setLoading(true);
    api<PermisoUser[]>(`/versions/permisos?_ts=${Date.now()}`, { cache: "no-store" })
      .then((data) => {
        setPermisos(data);
        if (data.length > 0 && !data.some((u) => u.usuario === selectedUser)) {
          setSelectedUser(data[0].usuario);
        }
      })
      .catch((e) => onError(e instanceof Error ? e.message : "Error cargando permisos"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPermisos();
  }, []);

  const togglePermission = (usuario: string, section: string) => {
    setPermisos((prev) =>
      prev.map((p) => {
        if (p.usuario !== usuario) return p;
        const has = p.permisos.includes(section);
        return {
          ...p,
          permisos: has
            ? p.permisos.filter((s) => s !== section)
            : [...p.permisos, section],
        };
      })
    );
  };

  const toggleAll = (usuario: string, checked: boolean) => {
    setPermisos((prev) =>
      prev.map((p) => {
        if (p.usuario !== usuario) return p;
        return { ...p, permisos: checked ? [...ALL_SECTION_KEYS] : [] };
      })
    );
  };

  const handleSave = (usuario: string) => {
    const user = permisos.find((p) => p.usuario === usuario);
    if (!user) return;
    setSaving(usuario);
    api(`/versions/permisos`, {
      method: "PUT",
      body: JSON.stringify({ usuario: user.usuario, permisos: user.permisos }),
    })
      .then(() => {
        toast.success(`Permisos de "${usuario}" guardados exitosamente.`);
        fetchPermisos();
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Error guardando permisos"))
      .finally(() => setSaving(null));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 text-sm">
        Cargando permisos...
      </div>
    );
  }

  const currentUser = permisos.find((p) => p.usuario === selectedUser) || permisos[0];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Gestión de Permisos"
        subtitle="Configure los módulos y submódulos a los que cada usuario coordinador tiene acceso."
      />

      {permisos.length === 0 && (
        <EmptyState message="No se encontraron usuarios configurados." />
      )}

      {currentUser && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Card Header con Selector de Usuario */}
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#0091ea] flex items-center justify-center text-white font-bold text-sm uppercase shadow-sm">
                {currentUser.usuario.charAt(0)}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Seleccionar Usuario Coordinador
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={currentUser.usuario}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0091ea] shadow-sm"
                  >
                    {permisos.map((p) => (
                      <option key={p.usuario} value={p.usuario} className="capitalize">
                        {p.usuario.charAt(0).toUpperCase() + p.usuario.slice(1)}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-slate-500 font-medium ml-2">
                    ({currentUser.permisos.length} de {ALL_SECTION_KEYS.length} activos)
                  </span>
                </div>
              </div>
            </div>
            <Btn
              v="primary"
              onClick={() => handleSave(currentUser.usuario)}
              disabled={saving === currentUser.usuario}
            >
              <Save size={14} /> {saving === currentUser.usuario ? "Guardando..." : "Guardar Permisos"}
            </Btn>
          </div>

          {/* Select all / Deselect all */}
          <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-4 bg-white">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={ALL_SECTION_KEYS.every((k) => currentUser.permisos.includes(k))}
                onChange={() =>
                  toggleAll(
                    currentUser.usuario,
                    !ALL_SECTION_KEYS.every((k) => currentUser.permisos.includes(k))
                  )
                }
                className="accent-[#0091ea] w-4 h-4 rounded"
              />
              {ALL_SECTION_KEYS.every((k) => currentUser.permisos.includes(k))
                ? "Deseleccionar todos"
                : "Seleccionar todos"}
            </label>
            {currentUser.permisos.length === 0 && (
              <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                Sin permisos asignados
              </span>
            )}
          </div>

          {/* Permissions Grid */}
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ALL_SECTION_KEYS.map((key) => {
                const checked = currentUser.permisos.includes(key);
                return (
                  <label
                    key={key}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer select-none transition-all ${
                      checked
                        ? "bg-[#0091ea]/5 border-[#0091ea]/30 shadow-sm"
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePermission(currentUser.usuario, key)}
                      className="accent-[#0091ea] w-4 h-4 rounded shrink-0"
                    />
                    <span
                      className={`text-xs font-medium ${
                        checked ? "text-[#0778ac] font-semibold" : "text-slate-500"
                      }`}
                    >
                      {ALL_SECTION_LABELS[key]}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
