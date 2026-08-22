// Re-export from monolith temporarily - will be extracted to feature component
// For layered architecture, this page will own SolicitudParametroSection
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { solicitudParametroApi } from "@/features/solicitud-parametro/api";
import { parametrosClinicosApi } from "@/features/parametros-clinicos/api";
import { ApiSolicitudParametro, toSolicitudParametro, SolicitudParametro } from "@/types/solicitud-parametro";
import { ParametrosEstado } from "@/types/parametros";

export function SolicitudPage() {
  const [items, setItems] = useState<SolicitudParametro[]>([]);
  const [estado, setEstado] = useState<ParametrosEstado | null>(null);
  useEffect(() => {
    solicitudParametroApi.list().then(d => setItems(d.map(toSolicitudParametro))).catch(e => toast.error(e.message));
    parametrosClinicosApi.estado().then(setEstado).catch(()=>{});
  }, []);
  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-lg font-semibold mb-4">Solicitud Parámetro</h1>
      <div className="bg-white rounded-xl border p-4">
        <p className="text-sm text-slate-500 mb-3">Estado: {estado ? JSON.stringify(estado) : "cargando..."}</p>
        <p className="text-sm">Solicitudes: {items.length}</p>
        <p className="text-xs text-slate-400 mt-2">Componente completo migrará desde App.tsx:471 SolicitudParametroSection (489 líneas). Estructura en capas ya preparada: types, api, hooks.</p>
      </div>
    </div>
  );
}
