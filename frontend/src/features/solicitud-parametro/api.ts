import { api } from "@/lib/api/client";
import { ApiSolicitudParametro } from "@/types/solicitud-parametro";
export const solicitudParametroApi = {
  list: () => api<ApiSolicitudParametro[]>("/solicitud-parametro/"),
  create: (data: any) => api<ApiSolicitudParametro>("/solicitud-parametro/", { method: "POST", body: JSON.stringify(data) }),
  aprobar: (id: number) => api<ApiSolicitudParametro>(`/solicitud-parametro/${id}/aprobar`, { method: "PUT" }),
};
