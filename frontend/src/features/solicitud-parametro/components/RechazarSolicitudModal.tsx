import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";
import { Modal, Btn } from "@/components/ui/custom";
import { type SolicitudParametro, type ApiSolicitudParametro, toSolicitudParametro } from "@/types/solicitud-parametro";

export function RechazarSolicitudModal({
  solicitud,
  open,
  onClose,
  onSuccess,
  onError,
}: {
  solicitud: SolicitudParametro | null;
  open: boolean;
  onClose: () => void;
  onSuccess: (updated: SolicitudParametro) => void;
  onError: (msg: string) => void;
}) {
  if (!solicitud) return null;
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMotivo("");
  }, [solicitud]);

  const handleSubmit = () => {
    if (!motivo.trim()) return;
    setSaving(true);
    api<ApiSolicitudParametro>(`/solicitud-parametro/${solicitud.id}/rechazar`, {
      method: "PUT",
      body: JSON.stringify({ motivo: motivo.trim() }),
    })
      .then((res) => {
        onSuccess(toSolicitudParametro(res));
        onClose();
      })
      .catch((e) => {
        onError(e instanceof Error ? e.message : "Error al rechazar la solicitud");
      })
      .finally(() => {
        setSaving(false);
      });
  };

  return (
    <Modal open={open} onClose={onClose} title={`Rechazar Parámetro - Solicitud ${solicitud.consecutivo}`} size="md">
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-900 grid grid-cols-2 gap-2">
          <div><span className="text-red-500 font-semibold uppercase">Tipo:</span> <span className="font-bold">{solicitud.tipoParametro}</span></div>
          <div><span className="text-red-500 font-semibold uppercase">Solicitante:</span> <span className="font-semibold">{solicitud.solicitante}</span></div>
          <div><span className="text-red-500 font-semibold uppercase">Área:</span> <span className="font-semibold">{solicitud.area || "—"}</span></div>
          <div><span className="text-red-500 font-semibold uppercase">Total:</span> <span className="font-bold">{solicitud.totalValor ? `${solicitud.totalValor} ${solicitud.totalUnidad}` : "—"}</span></div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">
            Motivo de Rechazo *
          </label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Indique claramente por qué se rechaza la habilitación de este parámetro..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white min-h-[100px]"
          />
        </div>

        <div className="flex gap-2 pt-4 border-t border-slate-100 justify-end">
          <Btn v="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn v="danger" onClick={handleSubmit} disabled={!motivo.trim() || saving}>
            Confirmar Rechazo
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
