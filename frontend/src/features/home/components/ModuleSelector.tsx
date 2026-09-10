import { useState, useEffect } from "react";
import { Monitor, ShieldCheck, ClipboardList, UserPlus, KeyRound, Settings, ChevronRight } from "lucide-react";
import { api } from "@/lib/api/client";
import { type ConfiguracionModulosInicioDTO } from "@/types/solicitud-parametro";

const MODULE_CARDS = [
  {
    key: "coordinator" as const,
    target: "coordinator" as const,
    title: "Administrador de Sistemas",
    description: "Gestión de versiones del sistema, consulta de validaciones por módulo y generación de reportes ejecutivos.",
    icon: Settings,
    color: "#0778ac",
    btnColor: "text-[#0778ac]",
    hoverBorder: "hover:border-[#0778ac]/40",
  },
  {
    key: "creacionUsuario" as const,
    target: "creacionUsuario" as const,
    title: "Solicitudes de Creación de Usuario",
    description: "Módulo para solicitar la creación y habilitación de usuarios o correos laborales para ingreso de nuevos funcionarios.",
    icon: UserPlus,
    color: "#0778ac",
    btnColor: "text-[#0778ac]",
    hoverBorder: "hover:border-[#0778ac]/40",
  },
  {
    key: "restablecimientoPassword" as const,
    target: "restablecimientoPassword" as const,
    title: "Solicitudes de Restablecimiento de Contraseña",
    description: "Módulo para solicitar el restablecimiento de contraseñas para las plataformas disponibles.",
    icon: KeyRound,
    color: "#0778ac",
    btnColor: "text-[#0778ac]",
    hoverBorder: "hover:border-[#0778ac]/40",
  },
  {
    key: "validator" as const,
    target: "validator" as const,
    title: "Validación del Sistema",
    description: "Módulo para el Registro de observaciones, aprobaciones y rechazos por módulo. Acceso a boletines y manuales de usuario.",
    icon: ShieldCheck,
    color: "#d43a39",
    btnColor: "text-[#d43a39]",
    hoverBorder: "hover:border-[#d43a39]/40",
  },
  {
    key: "solicitud" as const,
    target: "solicitud" as const,
    title: "Solicitud Parámetro",
    description: "Registro y consulta de solicitudes de parámetros para soporte clínico.",
    icon: ClipboardList,
    color: "#0778ac",
    btnColor: "text-[#0778ac]",
    hoverBorder: "hover:border-[#0778ac]/40",
  },
];

export function ModuleSelector({ onSelect }: { onSelect: (m: "coordinator" | "validator" | "solicitud" | "creacionUsuario" | "restablecimientoPassword") => void }) {
  const [activeModules, setActiveModules] = useState<ConfiguracionModulosInicioDTO>({
    coordinator: true,
    creacionUsuario: true,
    restablecimientoPassword: true,
    validator: true,
    solicitud: true,
  });

  useEffect(() => {
    api<ConfiguracionModulosInicioDTO>("/parametros-clinicos/modulos-inicio")
      .then((data) => {
        if (data) setActiveModules(data);
      })
      .catch(() => {});
  }, []);

  const visibleModules = MODULE_CARDS.filter((mod) => activeModules[mod.key] !== false);

  const getGridColsClass = (count: number) => {
    if (count === 1) return "grid-cols-1 max-w-md";
    if (count === 2) return "grid-cols-1 md:grid-cols-2 max-w-3xl";
    if (count === 3) return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-5xl";
    if (count === 4) return "grid-cols-1 md:grid-cols-2 lg:grid-cols-4 max-w-6xl";
    return "grid-cols-1 md:grid-cols-2 xl:grid-cols-5 max-w-7xl";
  };

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
        <p className="text-slate-600 text-sm">Seleccione el módulo al cual desea acceder</p>
      </div>

      <div className={`grid ${getGridColsClass(visibleModules.length)} gap-5 w-full justify-center`}>
        {visibleModules.map((mod) => {
          const Icon = mod.icon;
          return (
            <button
              key={mod.key}
              onClick={() => onSelect(mod.target)}
              className={`group bg-white border rounded-3xl p-8 text-left transition-all duration-200 h-full relative border-slate-200 ${mod.hoverBorder} shadow-sm hover:shadow-xl cursor-pointer flex flex-col justify-between`}
            >
              <div>
                <div
                  className="w-12 h-12 border rounded-2xl flex items-center justify-center mb-6 transition-all"
                  style={{
                    backgroundColor: `${mod.color}15`,
                    borderColor: `${mod.color}25`,
                  }}
                >
                  <Icon size={22} style={{ color: mod.color }} />
                </div>
                <h2 className="text-base font-bold text-slate-900 mb-2">{mod.title}</h2>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {mod.description}
                </p>
              </div>
              <div className={`mt-6 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide transition-all ${mod.btnColor} group-hover:gap-2.5`}>
                Ingresar <ChevronRight size={14} />
              </div>
            </button>
          );
        })}
        {visibleModules.length === 0 && (
          <div className="col-span-full bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500 shadow-sm">
            No hay módulos habilitados en la pantalla de inicio en este momento.
          </div>
        )}
      </div>
      <p className="text-slate-500 text-xs mt-12">© 2026 Validacion y Solicitudes - Area de Tecnología de la Información. Todos los derechos reservados.</p>
    </div>
  );
}


