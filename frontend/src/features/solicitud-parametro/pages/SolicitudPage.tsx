import { useEffect, useState } from "react";
import { toast } from "sonner";
import { solicitudParametroApi } from "@/features/solicitud-parametro/api";
import { parametrosClinicosApi } from "@/features/parametros-clinicos/api";
import { ApiSolicitudParametro, toSolicitudParametro, SolicitudParametro } from "@/types/solicitud-parametro";
import { ParametrosEstado } from "@/types/parametros";
import { SolicitudParametroSection } from "@/features/solicitud-parametro/components/SolicitudParametroSection";

export function SolicitudPage() {
  const [items, setItems] = useState<SolicitudParametro[]>([]);
  const [estado, setEstado] = useState<ParametrosEstado | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    solicitudParametroApi.list().then(d => setItems(d.map(toSolicitudParametro))).catch(e => { toast.error(e.message); setError(e.message); });
    parametrosClinicosApi.estado().then(setEstado).catch(()=>{});
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-4">
      {error && <div className="rounded-lg border border-[#d43a39]/20 bg-[#d43a39]/10 p-3 text-sm text-[#d43a39]">{error}</div>}
      <SolicitudParametroSection solicitudes={items} setSolicitudes={setItems} onError={setError} canApprove={false} canHabilitarParametro={false} />
    </div>
  );
}
