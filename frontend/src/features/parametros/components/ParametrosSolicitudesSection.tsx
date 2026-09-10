import { useState, useEffect } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { SectionHeader } from "@/components/ui/custom";
import { type ConfiguracionParametrosDTO } from "@/types/solicitud-parametro";

export function ParametrosSolicitudesSection({ onError }: { onError: (msg: string) => void }) {
  const [config, setConfig] = useState<ConfiguracionParametrosDTO>({
    hc_default: 30, enf_hcrenf_default: 48, enf_haplmed_default: 48,
    hora_restablecimiento: "20:05", auto_restablecer: true,
    tipos_habilitados: ["Historia Clinica", "Enfermeria", "Otros"],
    correos_historia_clinica: "", correos_enfermeria: "", correos_otros: "",
  });
  const [loading, setLoading] = useState(true);
  const [savingCorreos, setSavingCorreos] = useState(false);
  useEffect(()=>{ api<ConfiguracionParametrosDTO>("/parametros-clinicos/config").then(setConfig).catch((e)=>onError(e instanceof Error?e.message:"Error")).finally(()=>setLoading(false)); }, []);
  const handleSaveCorreos = () => { setSavingCorreos(true); api<ConfiguracionParametrosDTO>("/parametros-clinicos/config",{method:"PUT",body:JSON.stringify(config)}).then((data)=>{setConfig(data); toast.success("Correos guardados.");}).catch((e)=>onError(e instanceof Error?e.message:"Error")).finally(()=>setSavingCorreos(false)); };
  if(loading) return <div className="p-8 text-center text-slate-500">Cargando...</div>;
  return (
    <div className="space-y-6">
      <SectionHeader title="Parámetros Solicitudes" subtitle="Parametrización de envíos de correos electrónicos por tipo de parámetro." />
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4"><div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-xl font-bold">✉</div><div><h3 className="font-bold text-slate-800 text-sm">Correos Electrónicos por Tipo</h3><p className="text-xs text-slate-400">Separe correos por comas para cada tipo.</p></div></div>
        <div className="grid gap-4 md:grid-cols-3">
          <div><label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Correos - Historia Clínica</label><textarea value={config.correos_historia_clinica||""} onChange={(e)=>setConfig({...config, correos_historia_clinica:e.target.value})} placeholder="ejemplo@empresa.com" rows={3} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white font-mono" /></div>
          <div><label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Correos - Enfermería</label><textarea value={config.correos_enfermeria||""} onChange={(e)=>setConfig({...config, correos_enfermeria:e.target.value})} placeholder="ejemplo@empresa.com" rows={3} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white font-mono" /></div>
          <div><label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Correos - Otros</label><textarea value={config.correos_otros||""} onChange={(e)=>setConfig({...config, correos_otros:e.target.value})} placeholder="ejemplo@empresa.com" rows={3} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white font-mono" /></div>
        </div>
        <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end"><button onClick={handleSaveCorreos} disabled={savingCorreos} className="py-2.5 px-6 rounded-xl bg-indigo-600 text-white text-xs font-bold disabled:opacity-50">{savingCorreos?"Guardando...":"Guardar Correos"}</button></div>
      </div>
    </div>
  );
}

export default ParametrosSolicitudesSection;
