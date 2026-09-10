import { Monitor, ShieldCheck, ClipboardList, UserPlus, KeyRound, Settings, ChevronRight } from "lucide-react";

export function ModuleSelector({ onSelect }: { onSelect: (m: "coordinator" | "validator" | "solicitud" | "creacionUsuario" | "restablecimientoPassword") => void }) {
  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-8">
      <div className="text-center mb-14">
        <div className="inline-flex items-center gap-3.5 mb-5">
          <div className="w-13 h-13 bg-[#0778ac]/15 border border-[#0778ac]/30 rounded-2xl flex items-center justify-center p-3"><Monitor size={26} className="text-[#0778ac]" /></div>
          <div className="text-left">
            <h1 className="text-2xl font-bold text-[#0778ac] tracking-tight">Gestion de solicitudes y Validacion de Compilaciones</h1>
            <p className="text-[#0778ac]/70 text-xs tracking-widest uppercase font-semibold">Plataforma integral para solicitudes, validacion de aprobacion y rechazo de versiones de compilacion.</p>
          </div>
        </div>
        <div className="w-px h-8 bg-white/10 mx-auto mb-5" />
        <p className="text-slate-600 text-sm">Seleccione el módulo al cual desea acceder</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5 w-full max-w-7xl">
        <button onClick={() => onSelect("coordinator")} className="group bg-white border border-slate-200 hover:border-[#0778ac]/40 rounded-3xl p-8 text-left transition-all duration-200 shadow-sm hover:shadow-xl h-full">
          <div className="w-12 h-12 bg-[#0778ac]/15 group-hover:bg-[#0778ac]/25 border border-[#0778ac]/20 rounded-2xl flex items-center justify-center mb-6 transition-all"><Settings size={22} className="text-[#0778ac]" /></div>
          <h2 className="text-base font-bold text-slate-900 mb-2">Administrador de Sistemas</h2>
          <p className="text-slate-600 text-sm leading-relaxed">Gestión de versiones del sistema, consulta de validaciones por módulo y generación de reportes ejecutivos.</p>
          <div className="mt-6 flex items-center gap-1.5 text-[#0778ac] text-xs font-semibold group-hover:gap-2.5 transition-all uppercase tracking-wide">Ingresar <ChevronRight size={14} /></div>
        </button>
        <button onClick={() => onSelect("creacionUsuario")} className="group bg-white border border-slate-200 hover:border-[#0778ac]/40 rounded-3xl p-8 text-left transition-all duration-200 shadow-sm hover:shadow-xl h-full">
          <div className="w-12 h-12 bg-[#0778ac]/15 group-hover:bg-[#0778ac]/25 border border-[#0778ac]/20 rounded-2xl flex items-center justify-center mb-6 transition-all"><UserPlus size={22} className="text-[#0778ac]" /></div>
          <h2 className="text-base font-bold text-slate-900 mb-2">Solicitudes de Creación de Usuario</h2>
          <p className="text-slate-600 text-sm leading-relaxed">Módulo para solicitar la creación y habilitación de usuarios o correos laborales para ingreso de nuevos funcionarios.</p>
          <div className="mt-6 flex items-center gap-1.5 text-[#0778ac] text-xs font-semibold group-hover:gap-2.5 transition-all uppercase tracking-wide">Ingresar <ChevronRight size={14} /></div>
        </button>
        <button onClick={() => onSelect("restablecimientoPassword")} className="group bg-white border border-slate-200 hover:border-[#0778ac]/40 rounded-3xl p-8 text-left transition-all duration-200 shadow-sm hover:shadow-xl h-full">
          <div className="w-12 h-12 bg-[#0778ac]/15 group-hover:bg-[#0778ac]/25 border border-[#0778ac]/20 rounded-2xl flex items-center justify-center mb-6 transition-all"><KeyRound size={22} className="text-[#0778ac]" /></div>
          <h2 className="text-base font-bold text-slate-900 mb-2">Solicitudes de Restablecimiento de Contraseña</h2>
          <p className="text-slate-600 text-sm leading-relaxed">Módulo para solicitar el restablecimiento de contraseñas para las plataformas disponibles.</p>
          <div className="mt-6 flex items-center gap-1.5 text-[#0778ac] text-xs font-semibold group-hover:gap-2.5 transition-all uppercase tracking-wide">Ingresar <ChevronRight size={14} /></div>
        </button>
        <button onClick={() => onSelect("validator")} className="group bg-white border border-slate-200 hover:border-[#d43a39]/40 rounded-3xl p-8 text-left transition-all duration-200 shadow-sm hover:shadow-xl h-full">
          <div className="w-12 h-12 bg-[#d43a39]/15 group-hover:bg-[#d43a39]/25 border border-[#d43a39]/20 rounded-2xl flex items-center justify-center mb-6 transition-all"><ShieldCheck size={22} className="text-[#d43a39]" /></div>
          <h2 className="text-base font-bold text-slate-900 mb-2">Validación del Sistema</h2>
          <p className="text-slate-600 text-sm leading-relaxed">Módulo para el Registro de observaciones, aprobaciones y rechazos por módulo. Acceso a boletines y manuales de usuario.</p>
          <div className="mt-6 flex items-center gap-1.5 text-[#d43a39] text-xs font-semibold group-hover:gap-2.5 transition-all uppercase tracking-wide">Ingresar <ChevronRight size={14} /></div>
        </button>
        <button onClick={() => onSelect("solicitud")} className="group bg-white border border-slate-200 hover:border-[#0778ac]/40 rounded-3xl p-8 text-left transition-all duration-200 shadow-sm hover:shadow-xl h-full">
          <div className="w-12 h-12 bg-[#0778ac]/15 group-hover:bg-[#0778ac]/25 border border-[#0778ac]/20 rounded-2xl flex items-center justify-center mb-6 transition-all"><ClipboardList size={22} className="text-[#0778ac]" /></div>
          <h2 className="text-base font-bold text-slate-900 mb-2">Solicitud Parámetro</h2>
          <p className="text-slate-600 text-sm leading-relaxed">Registro y consulta de solicitudes de parámetros para soporte clínico.</p>
          <div className="mt-6 flex items-center gap-1.5 text-[#0778ac] text-xs font-semibold group-hover:gap-2.5 transition-all uppercase tracking-wide">Ingresar <ChevronRight size={14} /></div>
        </button>
      </div>
      <p className="text-slate-500 text-xs mt-12">© 2026 Validacion y Solicitudes - Area de Tecnología de la Información. Todos los derechos reservados.</p>
    </div>
  );
}
