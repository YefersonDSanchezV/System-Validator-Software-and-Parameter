import { api } from "@/lib/api/client";
import { ApiManual } from "@/types/manual";
export const manualesApi = {
  list: () => api<ApiManual[]>("/manuales/"),
  create: (form: FormData) => api<ApiManual>("/manuales/", { method: "POST", body: form }),
};
