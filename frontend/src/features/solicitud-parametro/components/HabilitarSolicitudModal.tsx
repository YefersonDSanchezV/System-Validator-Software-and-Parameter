import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";
import { Modal, Btn } from "@/components/ui/custom";
import { type SolicitudParametro, type ApiSolicitudParametro, toSolicitudParametro } from "@/types/solicitud-parametro";

export function HabilitarSolicitudModal({
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

  const tipo = solicitud.tipoParametro;
  const defaultValue = solicitud.totalValor ?? (tipo === "Historia Clinica" ? 30 : 48);

  const [hcpdiaaut, setHcpdiaaut] = useState(defaultValue);
  const [hcnmhcrenf, setHcnmhcrenf] = useState(defaultValue);
  const [hcnhaplmed, setHcnhaplmed] = useState(defaultValue);
  const [observacion, setObservacion] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (solicitud) {
      const val = solicitud.totalValor ?? (solicitud.tipoParametro === "Historia Clinica" ? 30 : 48);
      setHcpdiaaut(val);
      setHcnmhcrenf(val);
      setHcnhaplmed(val);
      setObservacion(`Habilitado según solicitud ${solicitud.consecutivo} para ${solicitud.solicitante}`);
    }
  }, [solicitud]);

  const handleSubmit = () => {
    setSaving(true);
    api<ApiSolicitudParametro>(`/solicitud-parametro/${solicitud.id}/habilitar`, {
      method: "PUT",
      body: JSON.stringify({
        hcpdiaaut: tipo === "Historia Clinica" ? hcpdiaaut : null,
        hcnmhcrenf: tipo === "Enfermeria" ? hcnmhcrenf : null,
        hcnhaplmed: tipo === "Enfermeria" ? hcnhaplmed : null,
        observacion: observacion.trim(),
      }),
    })
      .then((res) => {
        onSuccess(toSolicitudParametro(res));
        onClose();
      })
      .catch((e) => {
        onError(e instanceof Error ? e.message : "Error al habilitar el parámetro");
      })
      .finally(() => {
        setSaving(false);
      });
  };

  return (
    <Modal open={open} onClose={onClose} title={`Habilitar Parámetro - Solicitud ${solicitud.consecutivo}`} size="md">
      <div className="space-y-4">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 grid grid-cols-2 gap-2">
          <div><span className="text-slate-400 font-semibold uppercase">Tipo:</span> <span className="font-bold text-[#0778ac]">{solicitud.tipoParametro}</span></div>
          <div><span className="text-slate-400 font-semibold uppercase">Solicitante:</span> <span className="font-semibold">{solicitud.solicitante}</span></div>
          <div><span className="text-slate-400 font-semibold uppercase">Área:</span> <span className="font-semibold">{solicitud.area || "—"}</span></div>
          <div><span className="text-slate-400 font-semibold uppercase">Total Solicitado:</span> <span className="font-bold text-slate-900">{solicitud.totalValor ? `${solicitud.totalValor} ${solicitud.totalUnidad}` : "—"}</span></div>
        </div>

        {tipo === "Historia Clinica" && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Valor (HCPDIAAUT)</label>
            <input
              type="number"
              value={hcpdiaaut}
              onChange={(e) => setHcpdiaaut(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white font-semibold"
            />
          </div>
        )}

        {tipo === "Enfermeria" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Valor (HCNMHRCRENF)</label>
              <input
                type="number"
                value={hcnmhcrenf}
                onChange={(e) => setHcnmhcrenf(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Valor (HCNHAPLMED)</label>
              <input
                type="number"
                value={hcnhaplmed}
                onChange={(e) => setHcnhaplmed(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white font-semibold"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">
            Observación {tipo === "Otros" && <span className="normal-case text-slate-400">(Describa qué parámetro se está habilitando)</span>}
          </label>
          <textarea
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            placeholder="Observación o justificación..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white min-h-[80px]"
          />
        </div>

        <div className="flex gap-2 pt-4 border-t border-slate-100 justify-end">
          <Btn v="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn v="primary" onClick={handleSubmit} disabled={saving}>
            Confirmar Habilitación
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
