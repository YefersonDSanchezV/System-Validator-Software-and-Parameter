import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { Btn, FormTextarea, SectionHeader } from "@/components/ui/custom";

export function SolicitudesEmailNotificationsConfig({ onError }: { onError: (message: string) => void }) {
  const [emails, setEmails] = useState({ correos_creacion: "", correos_restablecimiento: "" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    api<typeof emails>("/solicitudes-accesos/configuracion")
      .then(setEmails)
      .catch((error) => onError(error.message));
  };

  useEffect(() => {
    load();
  }, []);

  const saveEmails = () => {
    setSaving(true);
    api("/solicitudes-accesos/configuracion", { method: "PUT", body: JSON.stringify(emails) })
      .then(() => toast.success("Correos de notificación guardados correctamente."))
      .catch((error) => onError(error.message))
      .finally(() => setSaving(false));
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Parámetros de Correos de Notificación"
        subtitle="Configure los destinatarios para las notificaciones de solicitudes de creación de usuario y restablecimiento de contraseña."
      />

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl border border-purple-100">
            <Mail size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-base">Correos Electrónicos de Notificación de Solicitudes</h3>
            <p className="text-xs text-slate-500">Ingrese las direcciones de correo separadas por coma o punto y coma para cada tipo de solicitud.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <FormTextarea
              label="CORREOS - CREACIÓN DE USUARIO"
              rows={3}
              value={emails.correos_creacion}
              onChange={(event) => setEmails((current) => ({ ...current, correos_creacion: event.target.value }))}
              placeholder="asistente.ingenieria@icvc.co, soporte@icvc.co"
            />
          </div>
          <div className="space-y-1.5">
            <FormTextarea
              label="CORREOS - RESTABLECIMIENTO DE CONTRASEÑA"
              rows={3}
              value={emails.correos_restablecimiento}
              onChange={(event) => setEmails((current) => ({ ...current, correos_restablecimiento: event.target.value }))}
              placeholder="asistente.ingenieria@icvc.co, soporte@icvc.co"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Btn onClick={saveEmails} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 py-2.5 shadow-sm">
            {saving ? "Guardando..." : "Guardar Correos de Notificación"}
          </Btn>
        </div>
      </div>
    </div>
  );
}
