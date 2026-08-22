import { api } from "@/lib/api/client";
import { ApiBoletin, ApiBoletinPeriodo } from "@/types/boletin";
export const boletinesApi = {
  periodos: () => api<ApiBoletinPeriodo[]>("/boletines/periodos"),
  list: (mes: number, anio: number) => api<ApiBoletin[]>(`/boletines/?mes=${mes}&anio=${anio}`),
  create: (form: FormData) => api<any>("/boletines/", { method: "POST", body: form }),
};
