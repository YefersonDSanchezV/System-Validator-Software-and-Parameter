import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { api } from "@/lib/api/client";
import { AREAS_RESTABLECIMIENTO, CHART_COLORS } from "@/config/constants";
import { Btn, FormInput, FormTextarea, Modal, SectionHeader, StatusBadge } from "@/components/ui/custom";
import type { PasswordRequest, Platform } from "@/types/acceso";
import { RequestTable } from "./RequestTable";

const passwordInitial = {
  plataforma: "",
  solicitante: "",
  area: "",
  usuario: "",
  observacion: "",
  correo_jefe: "",
};

export function PasswordResetRequests({ onError, admin = false }: { onError: (message: string) => void; admin?: boolean }) {
  const [items, setItems] = useState<PasswordRequest[]>([]);
  const [form, setForm] = useState(passwordInitial);
  const [areaOtro, setAreaOtro] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const set = (key: keyof typeof passwordInitial, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const handleAreaChange = (value: string) => {
    const upper = value.toUpperCase();
    set("area", upper);
    if (upper !== "OTROS") {
      setAreaOtro("");
    }
  };

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const loadData = () => {
    api<PasswordRequest[]>("/solicitudes-accesos/restablecimientos-password").then(setItems).catch(() => {});
    api<Platform[]>("/solicitudes-accesos/plataformas?modulo=restablecimiento_password&solo_activas=true")
      .then((rows) => {
        const names = rows.map((row) => row.nombre);
        setPlatforms(names);
        if (names.length) {
          setForm((current) => ({ ...current, plataforma: names.includes(current.plataforma) ? current.plataforma : names[0] }));
        } else {
          setForm((current) => ({ ...current, plataforma: "" }));
        }
      })
      .catch(() => setPlatforms([]));
  };

  useEffect(() => {
    loadData();
  }, []);

  const save = () => {
    const areaToSend = form.area === "OTROS" ? areaOtro.trim() : form.area.trim();
    // Validación de áreas
    if (!form.plataforma.trim() || !form.solicitante.trim() || !form.area.trim() || !form.usuario.trim() || !form.observacion.trim() || !form.correo_jefe.trim()) {
      onError("Complete todos los campos obligatorios.");
      return;
    }
    if (form.area === "OTROS" && !areaOtro.trim()) {
      onError("Especifique el nombre del área cuando seleccione OTROS.");
      return;
    }
    if (form.area !== "OTROS" && !(AREAS_RESTABLECIMIENTO as readonly string[]).includes(form.area)) {
      onError("Seleccione un área válida de la lista.");
      return;
    }
    if (!isValidEmail(form.correo_jefe)) {
      onError("Ingrese un correo válido para el jefe directo.");
      return;
    }
    const payload = { ...form, area: areaToSend };
    setSaving(true);
    api<PasswordRequest>("/solicitudes-accesos/restablecimientos-password", { method: "POST", body: JSON.stringify(payload) })
      .then((created) => {
        setItems((current) => [created, ...current]);
        setForm(passwordInitial);
        setAreaOtro("");
        setOpen(false);
        toast.success("Solicitud de restablecimiento registrada.");
      })
      .catch((error) => onError(error instanceof Error ? error.message : "No fue posible registrar la solicitud."))
      .finally(() => setSaving(false));
  };

  // Indicators calculations
  const totalCount = items.length;
  const pendingCount = items.filter((i) => i.estado === "Pendiente").length;
  const resetCount = items.filter((i) => i.estado === "Restablecido").length;

  // Donut chart data & table by area (sorted from highest to lowest)
  const areaCounts = items.reduce<Record<string, number>>((acc, item) => {
    const key = item.area?.trim() || "Sin Área";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const areaData = Object.entries(areaCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SectionHeader title="Solicitudes de Restablecimiento de Contraseña" subtitle="Registre y consulte solicitudes de restablecimiento." />
        <Btn onClick={() => setOpen(true)}>
          <Plus size={14} /> Solicitud de Restablecimiento
        </Btn>
      </div>

      {/* Indicadores de Restablecimiento */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <div className="rounded-3xl border border-[#0778ac]/15 bg-[#0778ac]/5 p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-[#0778ac]/70 font-semibold">Total Solicitudes</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{totalCount}</p>
          <p className="mt-2 text-xs text-slate-500">Restablecimientos registrados</p>
        </div>
        <div className="rounded-3xl border border-amber-200 bg-amber-50/50 p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-amber-700 font-semibold">Pendientes</p>
          <p className="mt-3 text-3xl font-semibold text-amber-900">{pendingCount}</p>
          <p className="mt-2 text-xs text-amber-700/80">Pendientes de atención</p>
        </div>
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-emerald-700 font-semibold">Restablecidas</p>
          <p className="mt-3 text-3xl font-semibold text-emerald-900">{resetCount}</p>
          <p className="mt-2 text-xs text-emerald-700/80">Contraseñas restablecidas</p>
        </div>
      </div>

      {/* Gráfico Donut y Tabla por Área (Solo visible en Coordinador de Sistemas) */}
      {admin && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <div className="lg:col-span-6 flex flex-col justify-center items-center border-b lg:border-b-0 lg:border-r border-slate-100 pb-6 lg:pb-0 lg:pr-6">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4 text-center">
              Distribución por Área Solicitante
            </h3>
            {areaData.length > 0 ? (
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={areaData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={4}
                    >
                      {areaData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`${value} solicitudes`, "Cantidad"]} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-slate-400 my-auto">Sin datos de áreas aún.</p>
            )}
          </div>

          <div className="lg:col-span-6 flex flex-col">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
              Áreas que más solicitan (Mayor a Menor)
            </h3>
            <div className="overflow-y-auto max-h-64 rounded-2xl border border-slate-100">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 text-xs">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">#</th>
                    <th className="px-4 py-2 text-left font-semibold">Área</th>
                    <th className="px-4 py-2 text-right font-semibold">Solicitudes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {areaData.map((row, idx) => (
                    <tr key={row.name} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 font-semibold text-slate-400 text-xs">{idx + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-800">{row.name}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-[#0778ac]">{row.count}</td>
                    </tr>
                  ))}
                  {areaData.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-4 text-center text-xs text-slate-400">
                        No hay áreas registradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <RequestTable
        headings={[...["Consecutivo", "Plataforma", "Solicitante", "Área", "Usuario", "Fecha", "Estado"], ...(admin ? ["Acciones"] : [])]}
        empty={items.length === 0}
      >
        {items.map((item) => (
          <tr key={item.oid}>
            <td className="px-4 py-3 font-mono text-xs font-bold text-[#0778ac]">{item.consecutivo}</td>
            <td className="px-4 py-3">{item.plataforma}</td>
            <td className="px-4 py-3">{item.solicitante}</td>
            <td className="px-4 py-3">{item.area}</td>
            <td className="px-4 py-3 font-mono">{item.usuario}</td>
            <td className="px-4 py-3 text-xs">{item.fecha_registro?.slice(0, 16).replace("T", " ")}</td>
            <td className="px-4 py-3">
              <StatusBadge estado={item.estado} />
            </td>
            {admin && (
              <td className="px-4 py-3">
                <AdminPasswordActions item={item} refresh={loadData} onError={onError} />
              </td>
            )}
          </tr>
        ))}
      </RequestTable>

      <Modal open={open} onClose={() => setOpen(false)} title="Nueva Solicitud de Restablecimiento" size="md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Plataforma *</label>
            {platforms.length > 0 ? (
              <select
                value={form.plataforma}
                onChange={(event) => set("plataforma", event.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0778ac]"
              >
                {platforms.map((platform) => (
                  <option key={platform}>{platform}</option>
                ))}
              </select>
            ) : (
              <div className="px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-xs font-medium">
                No hay plataformas activas configuradas. Registre plataformas en Administrador &gt; Plataformas.
              </div>
            )}
          </div>
          <FormInput label="Solicitante" required value={form.solicitante} onChange={(event) => set("solicitante", event.target.value)} />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Área<span className="text-red-500 ml-1">*</span>
            </label>
            <input
              list="areas-restablecimiento-list"
              value={form.area}
              onChange={(event) => handleAreaChange(event.target.value)}
              placeholder="Seleccione o escriba el área..."
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0778ac] focus:border-[#0778ac] transition-all placeholder:text-slate-400"
            />
            <datalist id="areas-restablecimiento-list">
              {AREAS_RESTABLECIMIENTO.map((area) => (
                <option key={area} value={area} />
              ))}
            </datalist>
            <p className="text-[11px] text-slate-400">Escriba para filtrar las áreas disponibles.</p>
          </div>
          {form.area === "OTROS" && (
            <div className="md:col-span-2">
              <FormInput
                label="Especifique el nombre del área"
                required
                value={areaOtro}
                onChange={(event) => setAreaOtro(event.target.value)}
                placeholder="Ingrese el nombre del área"
              />
            </div>
          )}
          <FormInput label="Usuario a restablecer" required value={form.usuario} onChange={(event) => set("usuario", event.target.value)} />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Correo del jefe directo<span className="text-red-500 ml-1">*</span>
            </label>
            <input
              type="email"
              value={form.correo_jefe}
              onChange={(event) => set("correo_jefe", event.target.value)}
              placeholder="jefe.directo@icvc.co"
              className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0778ac] focus:border-[#0778ac] transition-all placeholder:text-slate-400"
            />
            <p className="text-[11px] text-slate-400">Similar al campo de correo al notificar creación de usuarios.</p>
          </div>
          <div className="md:col-span-2">
            <FormTextarea label="Observación del restablecimiento" required rows={4} value={form.observacion} onChange={(event) => set("observacion", event.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Btn v="secondary" onClick={() => setOpen(false)}>
            Cancelar
          </Btn>
          <Btn onClick={save} disabled={saving}>
            {saving ? "Guardando..." : "Registrar solicitud"}
          </Btn>
        </div>
      </Modal>
    </div>
  );
}

// ----------------------------------------------------------------------
// ADMIN ACTIONS PARA RESTABLECIMIENTO DE CONTRASEÑA
// ----------------------------------------------------------------------
function AdminPasswordActions({ item, refresh, onError }: { item: PasswordRequest; refresh: () => void; onError: (message: string) => void }) {
  const [view, setView] = useState(false);
  const [notify, setNotify] = useState(false);
  const [emails, setEmails] = useState(item.correo_jefe || "");
  const [observation, setObservation] = useState("");
  const [firma, setFirma] = useState<File | null>(null);
  const [firmaPreview, setFirmaPreview] = useState("");

  const handleFirmaChange = (file: File | null) => {
    setFirma(file);
    if (firmaPreview) URL.revokeObjectURL(firmaPreview);
    setFirmaPreview(file ? URL.createObjectURL(file) : "");
  };

  const send = () => {
    if (!firma || !emails.trim() || !observation.trim()) return onError("Complete destinatarios, observación y firma.");
    const data = new FormData();
    data.append("firma", firma);
    data.append("payload", JSON.stringify({ destinatarios: emails, observacion: observation }));
    api("/solicitudes-accesos/restablecimientos-password/" + item.oid + "/notificar", { method: "POST", body: data })
      .then(() => {
        setNotify(false);
        refresh();
        toast.success("Correo enviado correctamente.");
      })
      .catch((error) => onError(error.message));
  };

  return (
    <>
      <div className="flex flex-wrap gap-1">
        <Btn sm v="secondary" onClick={() => setView(true)}>
          Consultar
        </Btn>
        <Btn sm onClick={() => setNotify(true)}>
          Notificar
        </Btn>
      </div>

      <Modal open={view} onClose={() => setView(false)} title="Detalle de restablecimiento">
        <div className="grid grid-cols-2 gap-4 text-sm">
          {[
            ["Plataforma", item.plataforma],
            ["Solicitante", item.solicitante],
            ["Área", item.area],
            ["Usuario", item.usuario],
            ["Fecha", item.fecha_registro],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-slate-400 uppercase">{label}</p>
              <p className="font-medium">{value}</p>
            </div>
          ))}
        </div>
      </Modal>

      <Modal open={notify} onClose={() => setNotify(false)} title="Notificar restablecimiento">
        <div className="space-y-4">
          <FormInput
            label="Correo a informar"
            required
            value={emails}
            onChange={(event) => setEmails(event.target.value)}
            placeholder="correo@icvc.co, otro@icvc.co"
          />
          <FormTextarea label="Observación" rows={3} value={observation} onChange={(event) => setObservation(event.target.value)} />

          {/* Vista previa de firma */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Firma de quien notifica (Imagen .JPG / .PNG) *</label>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center bg-slate-50 min-h-[100px]">
              {firmaPreview ? (
                <div className="flex flex-col items-center gap-2 w-full">
                  <img src={firmaPreview} alt="Vista previa de la firma" className="max-h-24 object-contain rounded border border-slate-200 bg-white p-1" />
                  <label className="text-xs font-semibold text-[#0778ac] hover:underline cursor-pointer">
                    Cambiar firma
                    <input type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" onChange={(e) => handleFirmaChange(e.target.files?.[0] ?? null)} className="hidden" />
                  </label>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center gap-1 text-slate-500 py-2">
                  <span className="text-xs font-medium text-slate-600">Seleccionar imagen de firma (.jpg, .png)</span>
                  <input type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" onChange={(e) => handleFirmaChange(e.target.files?.[0] ?? null)} className="hidden" />
                </label>
              )}
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Btn v="secondary" onClick={() => setNotify(false)}>
            Cancelar
          </Btn>
          <Btn onClick={send}>Enviar correo</Btn>
        </div>
      </Modal>
    </>
  );
}
