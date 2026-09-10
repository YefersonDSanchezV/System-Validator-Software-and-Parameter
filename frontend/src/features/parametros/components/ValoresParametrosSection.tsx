import { useState, useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { SectionHeader } from "@/components/ui/custom";
import { type ConfiguracionParametrosDTO } from "@/types/solicitud-parametro";

export function ValoresParametrosSection({ onError }: { onError: (msg: string) => void }) {
  const [config, setConfig] = useState<ConfiguracionParametrosDTO>({
    hc_default: 30, enf_hcrenf_default: 48, enf_haplmed_default: 48,
    hora_restablecimiento: "20:05", auto_restablecer: true,
    tipos_habilitados: ["Historia Clinica", "Enfermeria", "Otros"],
    correos_historia_clinica: "", correos_enfermeria: "", correos_otros: "",
  });
  const [loading, setLoading] = useState(true);
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [savingHora, setSavingHora] = useState(false);
  const [savingTipos, setSavingTipos] = useState(false);
  const [resetting, setResetting] = useState(false);
  const fetchConfig = () => {
    api<ConfiguracionParametrosDTO>("/parametros-clinicos/config").then((data)=>setConfig(data)).catch((err)=>onError(err instanceof Error?err.message:"Error cargando configuración")).finally(()=>setLoading(false));
  };
  useEffect(()=>{ fetchConfig(); }, []);
  const handleSaveDefaults = () => { setSavingDefaults(true); api<ConfiguracionParametrosDTO>("/parametros-clinicos/config",{method:"PUT",body:JSON.stringify(config)}).then((data)=>{setConfig(data); toast.success("Valores por defecto guardados.");}).catch((e)=>onError(e instanceof Error?e.message:"Error")).finally(()=>setSavingDefaults(false)); };
  const handleSaveHora = () => { setSavingHora(true); api<ConfiguracionParametrosDTO>("/parametros-clinicos/config",{method:"PUT",body:JSON.stringify(config)}).then((data)=>{setConfig(data); toast.success("Horario guardado.");}).catch((e)=>onError(e instanceof Error?e.message:"Error")).finally(()=>setSavingHora(false)); };
  const handleToggleTipo = (tipoName: string) => {
    const exists = config.tipos_habilitados.includes(tipoName);
    const updated = exists ? config.tipos_habilitados.filter((t)=>t!==tipoName) : [...config.tipos_habilitados, tipoName];
    const nextConfig = { ...config, tipos_habilitados: updated }; setConfig(nextConfig); setSavingTipos(true);
    api<ConfiguracionParametrosDTO>("/parametros-clinicos/config",{method:"PUT",body:JSON.stringify(nextConfig)}).then((data)=>{setConfig(data); toast.success(`Tipo "${tipoName}" ${exists?"deshabilitado":"habilitado"}.`);}).catch((e)=>onError(e instanceof Error?e.message:"Error")).finally(()=>setSavingTipos(false));
  };
  const handleResetNow = () => {
    if(!window.confirm("¿Restablecer parámetros a valores por defecto?")) return;
    setResetting(true); api<{message:string}>("/parametros-clinicos/restablecer-defecto",{method:"POST"}).then((res)=>toast.success(res.message||"Restablecidos")).catch((e)=>onError(e instanceof Error?e.message:"Error")).finally(()=>setResetting(false));
  };
  const allAvailableTypes = [
    { key: "Historia Clinica", label: "Historia Clínica", desc: "HCPDIAAUT" },
    { key: "Enfermeria", label: "Enfermería", desc: "HCNMHRCRENF y HCNHAPLMED" },
    { key: "Otros", label: "Otros", desc: "Habilitación general con observación" },
  ];
  if(loading) return <div className="p-8 text-center text-slate-500">Cargando configuración...</div>;
  return (
    <div className="space-y-6">
      <SectionHeader title="Valores Parámetros" subtitle="Valores por defecto, restablecimiento automático y tipos de parámetros." />
      <div className="grid gap-6 md:grid-cols-3">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3"><div className="p-2 bg-[#0778ac]/10 text-[#0778ac] rounded-xl font-bold">⚙</div><div><h3 className="font-bold text-slate-800 text-sm">Valores por Defecto</h3><p className="text-xs text-slate-400">Valores estándar de cierre</p></div></div>
            <div><label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Historia Clínica (HCPDIAAUT)</label><input type="number" value={config.hc_default} onChange={(e)=>setConfig({...config, hc_default:Number(e.target.value)})} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white font-semibold" /></div>
            <div><label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Enfermería (HCNMHRCRENF)</label><input type="number" value={config.enf_hcrenf_default} onChange={(e)=>setConfig({...config, enf_hcrenf_default:Number(e.target.value)})} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white font-semibold" /></div>
            <div><label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Enfermería (HCNHAPLMED)</label><input type="number" value={config.enf_haplmed_default} onChange={(e)=>setConfig({...config, enf_haplmed_default:Number(e.target.value)})} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white font-semibold" /></div>
          </div>
          <div className="pt-5 mt-4 border-t border-slate-100 space-y-2">
            <button onClick={handleSaveDefaults} disabled={savingDefaults} className="w-full py-2.5 px-4 rounded-xl bg-[#0778ac] text-white text-xs font-bold disabled:opacity-50">{savingDefaults?"Guardando...":"Guardar Valores por Defecto"}</button>
            <button onClick={handleResetNow} disabled={resetting} className="w-full py-2.5 px-4 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"><RotateCcw size={13}/> {resetting?"Restableciendo...":"Restablecer Ahora"}</button>
          </div>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3"><div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl font-bold">⏰</div><div><h3 className="font-bold text-slate-800 text-sm">Restablecimiento Automático</h3><p className="text-xs text-slate-400">Programación diaria</p></div></div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200"><span className="text-xs font-semibold text-slate-700">Activar tarea automática</span><input type="checkbox" checked={config.auto_restablecer} onChange={(e)=>setConfig({...config, auto_restablecer:e.target.checked})} className="w-5 h-5 accent-[#0778ac]" /></div>
            <div><label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Hora Restablecimiento (24h)</label><input type="time" value={config.hora_restablecimiento} onChange={(e)=>setConfig({...config, hora_restablecimiento:e.target.value})} disabled={!config.auto_restablecer} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white font-semibold disabled:bg-slate-100" /></div>
            <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-2xl text-xs text-blue-800">Todos los días a las <strong>{config.hora_restablecimiento}</strong> se restablecerán los parámetros abiertos.</div>
          </div>
          <div className="pt-5 mt-4 border-t border-slate-100"><button onClick={handleSaveHora} disabled={savingHora} className="w-full py-2.5 px-4 rounded-xl bg-[#0778ac] text-white text-xs font-bold disabled:opacity-50">{savingHora?"Guardando...":"Guardar Horario"}</button></div>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3"><div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl font-bold">📋</div><div><h3 className="font-bold text-slate-800 text-sm">Tipos de Parámetros</h3><p className="text-xs text-slate-400">Activar/desactivar módulos</p></div></div>
            <div className="space-y-3">{allAvailableTypes.map((tipo)=>{const isEnabled=config.tipos_habilitados.includes(tipo.key); return (<div key={tipo.key} className={`p-3.5 rounded-2xl border ${isEnabled?"bg-emerald-50/50 border-emerald-200":"bg-slate-50 border-slate-200 opacity-60"}`}><div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-800">{tipo.label}</span><button onClick={()=>handleToggleTipo(tipo.key)} disabled={savingTipos} className={`px-3 py-1 rounded-full text-xs font-bold ${isEnabled?"bg-emerald-600 text-white":"bg-slate-300 text-slate-700"}`}>{isEnabled?"Habilitado":"Deshabilitado"}</button></div><p className="text-[11px] text-slate-500 mt-1">{tipo.desc}</p></div>);})}</div>
          </div>
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] text-slate-500 text-center mt-4">Solo tipos habilitados aparecen en solicitudes.</div>
        </div>
      </div>
    </div>
  );
}

export default ValoresParametrosSection;
