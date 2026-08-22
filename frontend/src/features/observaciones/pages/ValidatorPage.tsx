import { useState } from "react";
import { toast } from "sonner";
export function ValidatorPage() {
  const [tab, setTab] = useState("registro");
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex gap-2 mb-6">
        {["registro","boletines","manuales"].map(t=> (
          <button key={t} onClick={()=>setTab(t)} className={`px-3 py-1.5 rounded-lg text-sm border ${tab===t?"bg-[#0778ac] text-white border-[#0778ac]":"bg-white text-slate-600"}`}>{t}</button>
        ))}
      </div>
      <div className="bg-white rounded-xl border p-6">
        <p className="text-sm">ValidatorModule desde App.tsx:2043 + ValidationRegistration:2137 (576 líneas) + Boletines:2717 + Manuales:3205</p>
        <p className="text-xs text-slate-400 mt-2">Tab: {tab}</p>
        <button onClick={()=>toast.info("Sonner activo en Validator")} className="mt-3 px-3 py-1 bg-[#0778ac] text-white rounded-lg text-sm">Probar toast</button>
      </div>
    </div>
  );
}
