import { api } from "@/lib/api/client";
export const observacionesApi = {
  list: () => api<any[]>("/observaciones/"),
  create: (form: FormData) => api<any>("/observaciones/", { method: "POST", body: form }),
};
