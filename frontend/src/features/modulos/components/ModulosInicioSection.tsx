import { useState, useEffect } from "react";
import { Monitor, UserPlus, KeyRound, ShieldCheck, ClipboardList, Save, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { SectionHeader, Btn } from "@/components/ui/custom";
import { type ConfiguracionModulosInicioDTO } from "@/types/solicitud-parametro";

interface ModuleMeta {
  key: keyof ConfiguracionModulosInicioDTO;
  title: string;
  description: string;
  icon: typeof Monitor;
  color: string;
  badge: string;
}

const MODULES_META: ModuleMeta[] = [
  {
    key: "coordinator",
    title: "Administrador de Sistemas",
    description: "Gestión de versiones del sistema, consulta de validaciones por módulo y generación de reportes ejecutivos.",
    icon: Monitor,
    color: "#0778ac",
    badge: "COORDINACIÓN",
  },
  {
    key: "creacionUsuario",
    title: "Solicitudes de Creación de Usuario",
    description: "Módulo para solicitar la creación y habilitación de usuarios o correos laborales para ingreso de nuevos funcionarios.",
    icon: UserPlus,
    color: "#0778ac",
    badge: "ACCESOS",
  },
  {
    key: "restablecimientoPassword",
    title: "Solicitudes de Restablecimiento de Contraseña",
    description: "Módulo para solicitar el restablecimiento de contraseñas para las plataformas disponibles.",
    icon: KeyRound,
    color: "#0778ac",
    badge: "ACCESOS",
  },
  {
    key: "validator",
    title: "Validación del Sistema",
    description: "Módulo para el Registro de observaciones, aprobaciones y rechazos por módulo. Acceso a boletines y manuales de usuario.",
    icon: ShieldCheck,
    color: "#d43a39",
    badge: "VALIDACIÓN",
  },
  {
    key: "solicitud",
    title: "Solicitud Parámetro",
    description: "Registro y consulta de solicitudes de parámetros para soporte clínico.",
    icon: ClipboardList,
    color: "#0778ac",
    badge: "CLÍNICO",
  },
];

export function ModulosInicioSection({ onError }: { onError: (msg: string) => void }) {
  const [config, setConfig] = useState<ConfiguracionModulosInicioDTO>({
    coordinator: true,
    creacionUsuario: true,
    restablecimientoPassword: true,
    validator: true,
    solicitud: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConfig = () => {
    setLoading(true);
    api<ConfiguracionModulosInicioDTO>("/parametros-clinicos/modulos-inicio")
      .then((data) => setConfig(data))
      .catch((err) => onError(err instanceof Error ? err.message : "Error cargando módulos de inicio"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleToggle = (key: keyof ConfiguracionModulosInicioDTO) => {
    setConfig((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = () => {
    setSaving(true);
    api<ConfiguracionModulosInicioDTO>("/parametros-clinicos/modulos-inicio", {
      method: "PUT",
      body: JSON.stringify(config),
    })
      .then((data) => {
        setConfig(data);
        toast.success("Configuración de módulos de inicio guardada correctamente.");
      })
      .catch((err) => onError(err instanceof Error ? err.message : "Error guardando módulos"))
      .finally(() => setSaving(false));
  };

  const handleToggleAll = (enable: boolean) => {
    setConfig({
      coordinator: enable,
      creacionUsuario: enable,
      restablecimientoPassword: enable,
      validator: enable,
      solicitud: enable,
    });
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Cargando configuración de módulos...</div>;
  }

  const activeCount = Object.values(config).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <SectionHeader
          title="Módulos de Inicio"
          subtitle="Habilite o inhabilite los módulos que se muestran en la pantalla principal del sistema."
        />
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleToggleAll(true)}
            className="px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Habilitar Todos
          </button>
          <button
            onClick={() => handleToggleAll(false)}
            className="px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Inhabilitar Todos
          </button>
          <Btn v="primary" onClick={handleSave} disabled={saving}>
            <Save size={14} /> {saving ? "Guardando..." : "Guardar Cambios"}
          </Btn>
        </div>
      </div>

      {/* Summary card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-800">Estado general de la plataforma</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeCount} de {MODULES_META.length} módulos habilitados actualmente en la pantalla de inicio.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#0778ac]/10 text-[#0778ac]">
            {activeCount === MODULES_META.length ? "Todos Activos" : `${activeCount} Activos`}
          </span>
        </div>
      </div>

      {/* Grid of initial modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {MODULES_META.map((mod) => {
          const isEnabled = !!config[mod.key];
          const Icon = mod.icon;

          return (
            <div
              key={mod.key}
              className={`rounded-3xl border transition-all duration-200 p-6 flex flex-col justify-between shadow-sm ${
                isEnabled
                  ? "bg-white border-slate-200 hover:border-[#0778ac]/30 hover:shadow-md"
                  : "bg-slate-50 border-slate-200/70 opacity-60"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all"
                    style={{
                      backgroundColor: isEnabled ? `${mod.color}15` : "#e2e8f0",
                      borderColor: isEnabled ? `${mod.color}30` : "#cbd5e1",
                      borderWidth: 1,
                    }}
                  >
                    <Icon size={22} style={{ color: isEnabled ? mod.color : "#64748b" }} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600">
                    {mod.badge}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 mb-2">{mod.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed min-h-[48px]">{mod.description}</p>
              </div>

              <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isEnabled ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                      <CheckCircle2 size={12} /> Habilitado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full">
                      <XCircle size={12} /> Inhabilitado
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleToggle(mod.key)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isEnabled ? "bg-[#0778ac]" : "bg-slate-300"
                  }`}
                  role="switch"
                  aria-checked={isEnabled}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      isEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ModulosInicioSection;
