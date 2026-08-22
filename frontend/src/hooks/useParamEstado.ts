import { useEffect, useState } from "react";
import { parametrosClinicosApi } from "@/features/parametros-clinicos/api";
import { ParametrosEstado } from "@/types/parametros";
export function useParamEstado() {
  const [estado, setEstado] = useState<ParametrosEstado | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { parametrosClinicosApi.estado().then(setEstado).catch(()=>{}).finally(()=>setLoading(false)); }, []);
  return { estado, loading, setEstado, refresh: () => parametrosClinicosApi.estado().then(setEstado) };
}
