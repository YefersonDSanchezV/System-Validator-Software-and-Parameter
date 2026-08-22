import { api } from "@/lib/api/client";
import { ParametrosEstado } from "@/types/parametros";
export const parametrosClinicosApi = {
  estado: () => api<ParametrosEstado>("/parametros-clinicos/estado"),
  habilitar: (data: { tipo: string; hcpdiaaut?: number; hcnmhcrenf?: number; hcnhaplmed?: number; observacion: string }) =>
    api<ParametrosEstado>("/parametros-clinicos/habilitar", { method: "POST", body: JSON.stringify(data) }),
};
