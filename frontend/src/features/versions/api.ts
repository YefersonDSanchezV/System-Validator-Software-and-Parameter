import { api } from "@/lib/api/client";
import { ApiVersion } from "@/types/version";
export const versionsApi = {
  list: () => api<ApiVersion[]>("/versions/"),
  create: (data: { titulo: string; descripcion: string; enlace: string }) =>
    api<ApiVersion>("/versions/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<{ titulo: string; descripcion: string; enlace: string; estado: boolean }>) =>
    api<ApiVersion>(`/versions/${id}`, { method: "PUT", body: JSON.stringify(data) }),
};
