import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";
import { Modal, Btn } from "@/components/ui/custom";
import { type SolicitudParametro, type ApiSolicitudParametro, toSolicitudParametro } from "@/types/solicitud-parametro";

export function AutorizadoPreviaSolicitudModal({
  solicitud,
  solicitudes,
  open,
  onClose,
  onSuccess,
  onError,
}: {
  solicitud: SolicitudParametro | null;
  solicitudes: SolicitudParametro[];
  open: boolean;
  onClose: () => void;
  onSuccess: (updated: SolicitudParametro) => void;
  onError: (msg: string) => void;
}) {
  if (!solicitud) return null;
  const [solicitudExtension, setSolicitudExtension] = useState("");
  const [observacion, setObservacion] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSolicitudExtension("");
    setObservacion("");
  }, [solicitud]);

  const otrasSolicitudes = solicitudes.filter(s => s.id !== solicitud.id);

  const handleSubmit = () => {
    if (!solicitudExtension.trim()) return;
    setSaving(true);
    api<ApiSolicitudParametro>(`/solicitud-parametro/${solicitud.id}/habilitar-extension`, {
      method: "PUT",
      body: JSON.stringify({
        solicitud_extension: solicitudExtension.trim(),
        observacion: observacion.trim(),
      }),
    })
      .then((res) => {
        onSuccess(toSolicitudParametro(res));
        onClose();
      })
      .catch((e) => {
        onError(e instanceof Error ? e.message : "Error al registrar autorización previa");
      })
      .finally(() => {
        setSaving(false);
      });
  };

  return (
    <Modal open={open} onClose={onClose} title={`Autorizar Solicitud Previa - Solicitud ${solicitud.consecutivo}`} size="md">
      <div className="space-y-4">
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 text-xs text-indigo-900 grid grid-cols-2 gap-2">
          <div><span className="text-indigo-500 font-semibold uppercase">Tipo:</span> <span className="font-bold">{solicitud.tipoParametro}</span></div>
          <div><span className="text-indigo-500 font-semibold uppercase">Solicitante:</span> <span className="font-semibold">{solicitud.solicitante}</span></div>
          <div><span className="text-indigo-500 font-semibold uppercase">Área:</span> <span className="font-semibold">{solicitud.area || "—"}</span></div>
          <div><span className="text-indigo-500 font-semibold uppercase">Total:</span> <span className="font-bold">{solicitud.totalValor ? `${solicitud.totalValor} ${solicitud.totalUnidad}` : "—"}</span></div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">
            Bajo qué otra solicitud se autoriza este parámetro *
          </label>
          <input
            list="solicitudes-extension-list"
            value={solicitudExtension}
            onChange={(e) => setSolicitudExtension(e.target.value)}
            placeholder="Seleccione o digite el consecutivo (ej. 2026-08-001)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
          />
          <datalist id="solicitudes-extension-list">
            {otrasSolicitudes.map(s => (
              <option key={s.id} value={s.consecutivo}>{s.consecutivo} - {s.tipoParametro} ({s.solicitante})</option>
            ))}
          </datalist>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">
            Observación / Justificación (Opcional)
          </label>
          <textarea
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            placeholder="Detalles sobre la autorización previa..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white min-h-[80px]"
          />
        </div>

        <div className="flex gap-2 pt-4 border-t border-slate-100 justify-end">
          <Btn v="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn v="primary" onClick={handleSubmit} disabled={!solicitudExtension.trim() || saving}>
            Confirmar Autorización Previa
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
