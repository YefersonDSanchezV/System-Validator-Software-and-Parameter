import { useState } from "react";
import { toast } from "sonner";
export function CoordinatorPage() {
  const [tab, setTab] = useState("registro");
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex gap-2 mb-6">
        {["registro","consulta","detalles","solicitudParametro","reporteFirmas","reporteDetalles"].map(t=> (
          <button key={t} onClick={()=>setTab(t)} className={`px-3 py-1.5 rounded-lg text-sm border ${tab===t?"bg-[#0778ac] text-white border-[#0778ac]":"bg-white text-slate-600"}`}>{t}</button>
        ))}
      </div>
      <div className="bg-white rounded-xl border p-6">
        <p className="text-sm">CoordinatorModule migrando desde App.tsx:966 (175 líneas) + VersionRegistration:1145 + VersionQuery:1223 + ValidationDetails:1398 + Reports</p>
        <p className="text-xs text-slate-400 mt-2">Tab activo: {tab}. Toast integrado con sonner. Próximo paso: mover cada sub-componente a features/versions/components/ , features/reports/.</p>
        <button onClick={()=>toast.success("Sonner activo en Coordinator")} className="mt-3 px-3 py-1 bg-[#0778ac] text-white rounded-lg text-sm">Probar toast</button>
      </div>
    </div>
  );
}
