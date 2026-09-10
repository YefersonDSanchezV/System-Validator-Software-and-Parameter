import { useState } from "react";
import { api } from "@/lib/api/client";
import { Modal, Btn } from "@/components/ui/custom";

export function HabilitarParametroModal({
  open, onClose, onRefresh, onError
}: {
  open: boolean; onClose: () => void; onRefresh: () => void; onError: (msg: string) => void;
}) {
  const [tipo, setTipo] = useState<"Enfermeria" | "Historia Clinica" | "Otros">("Enfermeria");
  const [hcpdiaaut, setHcpdiaaut] = useState(30);
  const [hcnmhcrenf, setHcnmhcrenf] = useState(48);
  const [hcnhaplmed, setHcnhaplmed] = useState(48);
  const [observacion, setObservacion] = useState("");
  const [saving, setSaving] = useState(false);

  const canSubmit = observacion.trim().length >= 5;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setSaving(true);
    api("/parametros-clinicos/habilitar", {
      method: "POST",
      body: JSON.stringify({
        tipo,
        hcpdiaaut: tipo === "Historia Clinica" ? hcpdiaaut : null,
        hcnmhcrenf: tipo === "Enfermeria" ? hcnmhcrenf : null,
        hcnhaplmed: tipo === "Enfermeria" ? hcnhaplmed : null,
        observacion: observacion.trim()
      })
    }).then(() => {
      onRefresh();
      onClose();
      setObservacion("");
    }).catch((e) => {
      onError(e instanceof Error ? e.message : "Error al actualizar parametro");
    }).finally(() => {
      setSaving(false);
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Habilitar/Cerrar Parámetro General">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Tipo de Parámetro</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as any)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
          >
            <option value="Enfermeria">Enfermería</option>
            <option value="Historia Clinica">Historia Clínica</option>
            <option value="Otros">Otros</option>
          </select>
        </div>
        {tipo === "Historia Clinica" && (
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Valor (HCPDIAAUT)</label>
            <input
              type="number"
              value={hcpdiaaut}
              onChange={(e) => setHcpdiaaut(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
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
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Valor (HCNHAPLMED)</label>
              <input
                type="number"
                value={hcnhaplmed}
                onChange={(e) => setHcnhaplmed(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              />
            </div>
          </div>
        )}
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-2">Observación {tipo === "Otros" && <span className="normal-case text-slate-400">(Describa qué parámetro se está habilitando)</span>}</label>
          <textarea
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            placeholder={tipo === "Otros" ? "Describa qué parámetro se está habilitando..." : "¿Para quién y qué se solicitó?"}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white min-h-[80px]"
          />
        </div>
        <div className="flex gap-2 pt-4 border-t border-slate-100">
          <Btn v="primary" onClick={handleSubmit} disabled={!canSubmit || saving}>
            Confirmar
          </Btn>
          <Btn v="secondary" onClick={onClose}>Cancelar</Btn>
        </div>
      </div>
    </Modal>
  );
}
