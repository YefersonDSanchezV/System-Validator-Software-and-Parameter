import { useState, useEffect } from "react";
import { Download, FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { Modal, Btn } from "@/components/ui/custom";
import { MODULO_LABELS } from "@/config/constants";
import type { ApiManual } from "@/types/manual";

export function ManualRow({ m }: { m: ApiManual }) {
  const [downloadStatus, setDownloadStatus] = useState<{ activo: boolean; minutos_restantes: number }>({ activo: false, minutos_restantes: 0 });
  const [solicitudOpen, setSolicitudOpen] = useState(false);
  const [solForm, setSolForm] = useState({ nombre_solicitante: "", area: "", descripcion: "" });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const checkStatus = () => {
    api<{ activo: boolean; minutos_restantes: number }>(`/manuales/solicitudes/estado-descarga/${m.oid}`)
      .then(setDownloadStatus)
      .catch(() => setDownloadStatus({ activo: false, minutos_restantes: 0 }));
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [m.oid]);

  const handleSendSolicitud = () => {
    if (!solForm.nombre_solicitante.trim() || !solForm.area.trim() || !solForm.descripcion.trim()) {
      setErrorMsg("Todos los campos (Nombre, Área y Descripción) son obligatorios.");
      return;
    }
    setSubmitting(true);
    setErrorMsg("");
    api("/manuales/solicitudes", {
      method: "POST",
      body: JSON.stringify({
        manual_oid: m.oid,
        nombre_solicitante: solForm.nombre_solicitante.trim(),
        area: solForm.area.trim(),
        descripcion: solForm.descripcion.trim(),
      }),
    })
      .then(() => {
        toast.success("Solicitud enviada a Coordinador de Sistemas para su aprobación.");
        setSolicitudOpen(false);
        setSolForm({ nombre_solicitante: "", area: "", descripcion: "" });
      })
      .catch((e) => setErrorMsg(e instanceof Error ? e.message : "Error al enviar la solicitud"))
      .finally(() => setSubmitting(false));
  };

  return (
    <tr className="hover:bg-slate-50/80 transition-colors">
      <td className="px-4 py-3 text-xs font-bold text-[#0778ac]">{MODULO_LABELS[m.modulo] ?? m.modulo}</td>
      <td className="px-4 py-3 font-medium text-slate-900">{m.titulo}</td>
      <td className="px-4 py-3 text-slate-500 text-xs font-mono">v{m.version || "1.0"}</td>
      <td className="px-4 py-3 text-slate-500 text-xs font-mono">{m.fecha_registro.slice(0, 10)}</td>
      <td className="px-4 py-3 text-slate-500 text-xs font-mono">—</td>
      <td className="px-4 py-3">
        {m.archivo ? (
          downloadStatus.activo ? (
            <a href={m.archivo} target="_blank" rel="noreferrer">
              <Btn v="success" sm>
                <Download size={13} /> Descargar PDF ({downloadStatus.minutos_restantes} min)
              </Btn>
            </a>
          ) : (
            <Btn v="secondary" sm onClick={() => setSolicitudOpen(true)}>
              <FileText size={13} /> Solicitar descarga
            </Btn>
          )
        ) : (
          <span className="text-xs text-slate-400">Sin archivo</span>
        )}

        <Modal open={solicitudOpen} onClose={() => setSolicitudOpen(false)} title={`Solicitar Descarga: ${m.titulo}`} size="md">
          <div className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={15} className="text-amber-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Nombre de quien solicita *</label>
              <input type="text" value={solForm.nombre_solicitante} onChange={(e) => setSolForm({ ...solForm, nombre_solicitante: e.target.value })} placeholder="Ingrese su nombre completo" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Área *</label>
              <input type="text" value={solForm.area} onChange={(e) => setSolForm({ ...solForm, area: e.target.value })} placeholder="Ingrese el área solicitante" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Descripción *</label>
              <textarea value={solForm.descripcion} onChange={(e) => setSolForm({ ...solForm, descripcion: e.target.value })} placeholder="Justifique el motivo de la solicitud..." className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white min-h-[90px]" />
            </div>
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <Btn v="primary" onClick={handleSendSolicitud} disabled={submitting}>Enviar Solicitud</Btn>
              <Btn v="secondary" onClick={() => setSolicitudOpen(false)}>Cancelar</Btn>
            </div>
          </div>
        </Modal>
      </td>
    </tr>
  );
}
