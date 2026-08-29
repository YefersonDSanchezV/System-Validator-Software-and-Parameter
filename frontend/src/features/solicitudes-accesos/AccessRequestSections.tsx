import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Mail, Info, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { api } from "@/lib/api/client";
import { Btn, EmptyState, FormInput, FormTextarea, Modal, SectionHeader, StatusBadge } from "@/components/ui/custom";

type UserRequest = {
  oid: number;
  consecutivo: string;
  tipo?: string;
  tipos?: string[];
  solicitante: string;
  area: string;
  nombre_usuario: string;
  estado: string;
  fecha_registro: string;
  primer_nombre?: string;
  segundo_nombre?: string;
  primer_apellido?: string;
  segundo_apellido?: string;
  cedula?: string;
  telefono?: string;
  correo?: string;
  direccion?: string;
  cargo?: string;
};

type PasswordRequest = {
  oid: number;
  consecutivo: string;
  plataforma: string;
  solicitante: string;
  area: string;
  usuario: string;
  correo_jefe?: string;
  observacion?: string;
  estado: string;
  fecha_registro: string;
};

type Platform = {
  oid: number;
  nombre: string;
  modulo: string;
  activa: boolean;
};

const userInitial = {
  tipo: "Usuario Dinamica",
  solicitante: "",
  area: "",
  primer_nombre: "",
  segundo_nombre: "",
  primer_apellido: "",
  segundo_apellido: "",
  cedula: "",
  telefono: "",
  correo: "",
  direccion: "",
  cargo: "",
};

const passwordInitial = {
  plataforma: "",
  solicitante: "",
  area: "",
  usuario: "",
  observacion: "",
  correo_jefe: "",
};

const CHART_COLORS = ["#0778ac", "#10b981", "#f59e0b", "#6366f1", "#ec4899", "#8b5cf6", "#14b8a6", "#f97316"];

function RequestTable({ headings, children, empty }: { headings: string[]; children: React.ReactNode; empty: boolean }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {headings.map((heading) => (
              <th key={heading} className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
      {empty && <EmptyState message="No hay solicitudes registradas." />}
    </div>
  );
}

// ----------------------------------------------------------------------
// 1. MODULO CREACION DE USUARIOS
// ----------------------------------------------------------------------
export function UserCreationRequests({ onError, admin = false }: { onError: (message: string) => void; admin?: boolean }) {
  const [items, setItems] = useState<UserRequest[]>([]);
  const [form, setForm] = useState(userInitial);
  const [firma, setFirma] = useState<File | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [firmaPreview, setFirmaPreview] = useState("");

  const firstName = form.primer_nombre.trim().split(/\s+/)[0] || "";
  const firstSurname = form.primer_apellido.trim().split(/\s+/)[0] || "";
  const nombreUsuario = firstName && firstSurname ? firstName + "." + firstSurname : "";
  const set = (key: keyof typeof userInitial, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const loadData = () => {
    api<UserRequest[]>("/solicitudes-accesos/creacion-usuarios").then(setItems).catch(() => {});
    api<Platform[]>("/solicitudes-accesos/plataformas?modulo=creacion_usuario&solo_activas=true")
      .then((rows) => setPlatforms(rows.map((row) => row.nombre)))
      .catch(() => setPlatforms([]));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFirmaChange = (file: File | null) => {
    setFirma(file);
    if (firmaPreview) URL.revokeObjectURL(firmaPreview);
    setFirmaPreview(file ? URL.createObjectURL(file) : "");
  };

  const save = () => {
    if (Object.entries(form).some(([key, value]) => key !== "segundo_nombre" && !value.trim()) || !firma || selectedTypes.length === 0) {
      onError("Complete todos los campos obligatorios y adjunte la firma.");
      return;
    }
    if (!["image/jpeg", "image/png"].includes(firma.type)) {
      onError("La firma debe estar en formato JPG o PNG.");
      return;
    }
    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.append(key, value.trim()));
    data.append("tipos", JSON.stringify(platforms.filter((name) => selectedTypes.includes(name))));
    data.append("nombre_usuario", nombreUsuario);
    data.append("firma", firma);
    setSaving(true);
    api<UserRequest>("/solicitudes-accesos/creacion-usuarios", { method: "POST", body: data })
      .then((created) => {
        setItems((current) => [created, ...current]);
        setForm(userInitial);
        setSelectedTypes([]);
        setFirma(null);
        if (firmaPreview) URL.revokeObjectURL(firmaPreview);
        setFirmaPreview("");
        setOpen(false);
        toast.success("Solicitud de creación registrada.");
      })
      .catch((error) => onError(error instanceof Error ? error.message : "No fue posible registrar la solicitud."))
      .finally(() => setSaving(false));
  };

  // Indicators calculations
  const totalCount = items.length;
  const pendingCount = items.filter((i) => i.estado === "Pendiente").length;
  const createdCount = items.filter((i) => i.estado === "Usuario creado").length;

  const platformCounts = platforms.map((plat) => {
    const count = items.filter((item) => {
      const types = item.tipos?.length ? item.tipos : item.tipo ? [item.tipo] : [];
      return types.includes(plat);
    }).length;
    return { name: plat, count };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SectionHeader title="Solicitudes de Creación de Usuario" subtitle="Registre y consulte las solicitudes de nuevas cuentas." />
        <Btn onClick={() => setOpen(true)}>
          <Plus size={14} /> Solicitud de Creación
        </Btn>
      </div>

      {/* Indicadores de Creación de Usuario */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
        <div className="rounded-3xl border border-[#0778ac]/15 bg-[#0778ac]/5 p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-[#0778ac]/70 font-semibold">Total Solicitudes</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{totalCount}</p>
          <p className="mt-2 text-xs text-slate-500">Creaciones registradas</p>
        </div>
        <div className="rounded-3xl border border-amber-200 bg-amber-50/50 p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-amber-700 font-semibold">Pendientes</p>
          <p className="mt-3 text-3xl font-semibold text-amber-900">{pendingCount}</p>
          <p className="mt-2 text-xs text-amber-700/80">En espera de creación</p>
        </div>
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-emerald-700 font-semibold">Usuarios Creados</p>
          <p className="mt-3 text-3xl font-semibold text-emerald-900">{createdCount}</p>
          <p className="mt-2 text-xs text-emerald-700/80">Cuentas habilitadas</p>
        </div>
        {platformCounts.map((p) => (
          <div key={p.name} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500 font-semibold truncate" title={p.name}>
              {p.name}
            </p>
            <p className="mt-3 text-3xl font-semibold text-slate-800">{p.count}</p>
            <p className="mt-2 text-xs text-slate-400">Solicitudes plataforma</p>
          </div>
        ))}
      </div>

      <RequestTable
        headings={[...["Consecutivo", "Tipo", "Solicitante", "Área", "Nombre de usuario", "Fecha", "Estado"], ...(admin ? ["Acciones"] : [])]}
        empty={items.length === 0}
      >
        {items.map((item) => (
          <tr key={item.oid}>
            <td className="px-4 py-3 font-mono text-xs font-bold text-[#0778ac]">{item.consecutivo}</td>
            <td className="px-4 py-3">{(item.tipos?.length ? item.tipos : [item.tipo]).filter(Boolean).join(", ")}</td>
            <td className="px-4 py-3">{item.solicitante}</td>
            <td className="px-4 py-3">{item.area}</td>
            <td className="px-4 py-3 font-mono">{item.nombre_usuario}</td>
            <td className="px-4 py-3 text-xs">{item.fecha_registro?.slice(0, 16).replace("T", " ")}</td>
            <td className="px-4 py-3">
              <StatusBadge estado={item.estado} />
            </td>
            {admin && (
              <td className="px-4 py-3">
                <AdminUserActions item={item} refresh={loadData} onError={onError} />
              </td>
            )}
          </tr>
        ))}
      </RequestTable>

      <Modal open={open} onClose={() => setOpen(false)} title="Nueva Solicitud de Creación de Usuario" size="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">¿En qué módulo(s) van a crear al empleado? *</label>
            <div className="flex flex-wrap gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              {platforms.length > 0 ? (
                platforms.map((name) => (
                  <label key={name} className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(name)}
                      onChange={(event) =>
                        setSelectedTypes((current) => (event.target.checked ? [...current, name] : current.filter((item) => item !== name)))
                      }
                      className="rounded border-slate-300 text-[#0778ac] focus:ring-[#0778ac]"
                    />
                    {name}
                  </label>
                ))
              ) : (
                <p className="text-xs text-slate-500 py-1">No hay plataformas activas configuradas. Registre plataformas en Administrador &gt; Plataformas.</p>
              )}
            </div>
            {selectedTypes.includes("Todos") && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-xs font-medium animate-fadeIn">
                <Info size={16} className="shrink-0 text-blue-600" />
                <span>Al seleccionar la opción <strong>"Todos"</strong>, se informa que se deberá crear la cuenta del empleado para <strong>todos los módulos informados y disponibles</strong>.</span>
              </div>
            )}
          </div>

          <FormInput label="Solicitante" required value={form.solicitante} onChange={(event) => set("solicitante", event.target.value)} />
          <FormInput label="Área" required value={form.area} onChange={(event) => set("area", event.target.value)} />
          <FormInput label="Primer nombre" required value={form.primer_nombre} onChange={(event) => set("primer_nombre", event.target.value)} />
          <FormInput label="Segundo nombre" value={form.segundo_nombre} onChange={(event) => set("segundo_nombre", event.target.value)} />
          <FormInput label="Primer apellido" required value={form.primer_apellido} onChange={(event) => set("primer_apellido", event.target.value)} />
          <FormInput label="Segundo apellido" required value={form.segundo_apellido} onChange={(event) => set("segundo_apellido", event.target.value)} />
          <FormInput label="Cédula de ciudadanía" required inputMode="numeric" value={form.cedula} onChange={(event) => set("cedula", event.target.value)} />
          <FormInput label="Teléfono de contacto" required type="tel" value={form.telefono} onChange={(event) => set("telefono", event.target.value)} />
          <FormInput label="Correo electrónico" required type="email" value={form.correo} onChange={(event) => set("correo", event.target.value)} />
          <FormInput label="Dirección de residencia" required value={form.direccion} onChange={(event) => set("direccion", event.target.value)} />
          <FormInput label="Cargo laboral" required value={form.cargo} onChange={(event) => set("cargo", event.target.value)} />
          <FormInput label="Nombre de usuario" required value={nombreUsuario} readOnly />

          {/* Campo de Firma con previa visualización */}
          <div className="md:col-span-2 flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Firma (Imagen .JPG / .PNG) *</label>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center bg-slate-50 min-h-[120px] transition-all hover:bg-slate-100/80">
              {firmaPreview ? (
                <div className="flex flex-col items-center gap-2 w-full">
                  <img src={firmaPreview} alt="Vista previa de la firma" className="max-h-28 max-w-full object-contain rounded border border-slate-200 shadow-sm bg-white p-1" />
                  <label className="text-xs font-semibold text-[#0778ac] hover:underline cursor-pointer">
                    Cambiar firma
                    <input
                      type="file"
                      accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                      onChange={(e) => handleFirmaChange(e.target.files?.[0] ?? null)}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center gap-2 text-slate-500 hover:text-slate-700 w-full py-4">
                  <span className="text-xs font-medium text-slate-600">Haga clic aquí para seleccionar la imagen de la firma (.jpg, .png)</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                    onChange={(e) => handleFirmaChange(e.target.files?.[0] ?? null)}
                    className="hidden"
                  />
                </label>
              )}
            </div>
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
// ADMIN ACTIONS PARA CREACION DE USUARIO
// ----------------------------------------------------------------------
function AdminUserActions({ item, refresh, onError }: { item: UserRequest; refresh: () => void; onError: (message: string) => void }) {
  const [view, setView] = useState(false);
  const [edit, setEdit] = useState(false);
  const [notify, setNotify] = useState(false);
  const [username, setUsername] = useState(item.nombre_usuario);
  const [emails, setEmails] = useState(item.correo || "");
  const [observation, setObservation] = useState("");
  const types = item.tipos?.length ? item.tipos : item.tipo ? [item.tipo] : [];
  const [accesses, setAccesses] = useState(types.map((type) => ({ tipo: type, nombre_usuario: item.nombre_usuario || "", password: "" })));
  const [firma, setFirma] = useState<File | null>(null);
  const [firmaPreview, setFirmaPreview] = useState("");

  const handleFirmaChange = (file: File | null) => {
    setFirma(file);
    if (firmaPreview) URL.revokeObjectURL(firmaPreview);
    setFirmaPreview(file ? URL.createObjectURL(file) : "");
  };

  const updateName = () =>
    api("/solicitudes-accesos/creacion-usuarios/" + item.oid + "/nombre-usuario", {
      method: "PUT",
      body: JSON.stringify({ nombre_usuario: username }),
    })
      .then(() => {
        setEdit(false);
        refresh();
        toast.success("Nombre de usuario actualizado.");
      })
      .catch((error) => onError(error.message));

  const send = () => {
    if (!firma || !emails.trim() || !observation.trim() || accesses.some((access) => !access.nombre_usuario || !access.password)) {
      return onError("Complete destinatarios, observación, firma y todos los accesos.");
    }
    const data = new FormData();
    data.append("firma", firma);
    data.append("payload", JSON.stringify({ destinatarios: emails, observacion: observation, accesos: accesses }));
    api("/solicitudes-accesos/creacion-usuarios/" + item.oid + "/usuario-creado", { method: "POST", body: data })
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
        <Btn sm v="secondary" onClick={() => setEdit(true)}>
          Editar
        </Btn>
        <Btn sm onClick={() => setNotify(true)}>
          Usuario creado
        </Btn>
      </div>

      <Modal open={view} onClose={() => setView(false)} title="Detalle de solicitud de creación">
        <div className="grid grid-cols-2 gap-4 text-sm">
          {[
            ["Tipos", types.join(", ")],
            ["Solicitante", item.solicitante],
            ["Área", item.area],
            ["Funcionario", [item.primer_nombre, item.segundo_nombre, item.primer_apellido, item.segundo_apellido].filter(Boolean).join(" ")],
            ["Cédula", item.cedula || ""],
            ["Teléfono", item.telefono || ""],
            ["Correo", item.correo || ""],
            ["Dirección", item.direccion || ""],
            ["Cargo", item.cargo || ""],
            ["Usuario", item.nombre_usuario],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-slate-400 uppercase">{label}</p>
              <p className="font-medium">{value}</p>
            </div>
          ))}
        </div>
      </Modal>

      <Modal open={edit} onClose={() => setEdit(false)} title="Editar nombre de usuario">
        <FormInput label="Nombre de usuario" value={username} onChange={(event) => setUsername(event.target.value)} />
        <div className="mt-5 flex justify-end gap-2">
          <Btn v="secondary" onClick={() => setEdit(false)}>
            Cancelar
          </Btn>
          <Btn onClick={updateName}>Guardar</Btn>
        </div>
      </Modal>

      <Modal open={notify} onClose={() => setNotify(false)} title="Notificar usuarios creados" size="lg">
        <div className="space-y-4">
          <FormInput label="Correos a informar" value={emails} onChange={(event) => setEmails(event.target.value)} placeholder="correo@icvc.co, otro@icvc.co" />
          <FormTextarea label="Observación" rows={3} value={observation} onChange={(event) => setObservation(event.target.value)} />
          {accesses.map((access, index) => (
            <div key={access.tipo} className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3">
              <p className="col-span-2 text-sm font-semibold">{access.tipo}</p>
              <FormInput
                label="Nombre de usuario"
                value={access.nombre_usuario}
                onChange={(event) =>
                  setAccesses((rows) => rows.map((row, i) => (i === index ? { ...row, nombre_usuario: event.target.value } : row)))
                }
              />
              <FormInput
                label="Contraseña"
                type="text"
                value={access.password}
                onChange={(event) =>
                  setAccesses((rows) => rows.map((row, i) => (i === index ? { ...row, password: event.target.value } : row)))
                }
              />
            </div>
          ))}


          {/* Vista previa de la firma en el modal de Usuario Creado */}
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

// ----------------------------------------------------------------------
// 2. MODULO RESTABLECIMIENTO DE CONTRASEÑA
// ----------------------------------------------------------------------
export function PasswordResetRequests({ onError, admin = false }: { onError: (message: string) => void; admin?: boolean }) {
  const [items, setItems] = useState<PasswordRequest[]>([]);
  const [form, setForm] = useState(passwordInitial);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const set = (key: keyof typeof passwordInitial, value: string) => setForm((current) => ({ ...current, [key]: value }));

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
    if (Object.values(form).some((value) => !value.trim())) {
      onError("Complete todos los campos obligatorios.");
      return;
    }
    setSaving(true);
    api<PasswordRequest>("/solicitudes-accesos/restablecimientos-password", { method: "POST", body: JSON.stringify(form) })
      .then((created) => {
        setItems((current) => [created, ...current]);
        setForm(passwordInitial);
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

      {/* Gráfico Donut y Tabla por Área */}
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
          <FormInput label="Área" required value={form.area} onChange={(event) => set("area", event.target.value)} />
          <FormInput label="Usuario a restablecer" required value={form.usuario} onChange={(event) => set("usuario", event.target.value)} />
          <FormInput label="Correo del jefe directo" required type="email" value={form.correo_jefe} onChange={(event) => set("correo_jefe", event.target.value)} />
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

// ----------------------------------------------------------------------
// 3. CONFIGURACION DE PLATAFORMAS Y NOTIFICACIONES
// ----------------------------------------------------------------------
export function AccessPlatformsConfig({ onError }: { onError: (message: string) => void }) {
  const [items, setItems] = useState<Platform[]>([]);
  const [form, setForm] = useState({ nombre: "", modulos: ["creacion_usuario"] });
  const [emails, setEmails] = useState({ correos_creacion: "", correos_restablecimiento: "" });

  // Modal para editar plataforma
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<{ originalName: string; nombre: string; modulos: string[]; rows: Platform[] } | null>(null);

  const load = () => {
    api<Platform[]>("/solicitudes-accesos/plataformas").then(setItems).catch((error) => onError(error.message));
    api<typeof emails>("/solicitudes-accesos/configuracion").then(setEmails).catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const add = () => {
    if (!form.nombre.trim()) return onError("Indique el nombre de la plataforma.");
    if (form.modulos.length === 0) return onError("Seleccione al menos un módulo para la plataforma.");
    Promise.all(
      form.modulos.map((modulo) =>
        api<Platform>("/solicitudes-accesos/plataformas", {
          method: "POST",
          body: JSON.stringify({ nombre: form.nombre.trim(), modulo, activa: true }),
        })
      )
    )
      .then(() => {
        setForm({ nombre: "", modulos: ["creacion_usuario"] });
        load();
        toast.success("Plataforma agregada correctamente.");
      })
      .catch((error) => onError(error.message));
  };

  const toggle = (item: Platform) =>
    api<Platform>("/solicitudes-accesos/plataformas/" + item.oid, { method: "PUT", body: JSON.stringify({ ...item, activa: !item.activa }) })
      .then(load)
      .catch((error) => onError(error.message));

  const openEdit = (groupName: string, rows: Platform[]) => {
    setEditingPlatform({
      originalName: groupName,
      nombre: groupName,
      modulos: rows.map((r) => r.modulo),
      rows,
    });
    setEditModalOpen(true);
  };

  const saveEditPlatform = () => {
    if (!editingPlatform || !editingPlatform.nombre.trim()) return onError("Indique el nombre de la plataforma.");
    if (editingPlatform.modulos.length === 0) return onError("Debe seleccionar al menos un módulo.");

    const newName = editingPlatform.nombre.trim();
    const newModules = editingPlatform.modulos;
    const existingRows = editingPlatform.rows;

    const promises: Promise<unknown>[] = [];

    // Actualizar o eliminar filas existentes
    existingRows.forEach((row) => {
      if (newModules.includes(row.modulo)) {
        // Actualizar nombre
        promises.push(
          api<Platform>("/solicitudes-accesos/plataformas/" + row.oid, {
            method: "PUT",
            body: JSON.stringify({ ...row, nombre: newName }),
          })
        );
      } else {
        // Eliminar fila si el módulo fue desmarcado
        promises.push(
          api("/solicitudes-accesos/plataformas/" + row.oid, {
            method: "DELETE",
          })
        );
      }
    });

    // Si hay un módulo nuevo que no existía antes en esta plataforma, crearlo
    const existingModules = existingRows.map((r) => r.modulo);
    newModules.forEach((mod) => {
      if (!existingModules.includes(mod)) {
        promises.push(
          api<Platform>("/solicitudes-accesos/plataformas", {
            method: "POST",
            body: JSON.stringify({ nombre: newName, modulo: mod, activa: true }),
          })
        );
      }
    });

    Promise.all(promises)
      .then(() => {
        setEditModalOpen(false);
        setEditingPlatform(null);
        load();
        toast.success("Plataforma actualizada.");
      })
      .catch((error) => onError(error.message));
  };

  const deleteGroup = (rows: Platform[]) => {
    if (!confirm("¿Está seguro de eliminar esta plataforma?")) return;
    Promise.all(rows.map((row) => api("/solicitudes-accesos/plataformas/" + row.oid, { method: "DELETE" })))
      .then(() => {
        load();
        toast.success("Plataforma eliminada correctamente.");
      })
      .catch((error) => onError(error.message));
  };

  const saveEmails = () =>
    api("/solicitudes-accesos/configuracion", { method: "PUT", body: JSON.stringify(emails) })
      .then(() => toast.success("Correos de notificación guardados."))
      .catch((error) => onError(error.message));

  const grouped = Object.values(
    items.reduce<Record<string, { nombre: string; rows: Platform[] }>>((result, item) => {
      (result[item.nombre] ||= { nombre: item.nombre, rows: [] }).rows.push(item);
      return result;
    }, {})
  );

  return (
    <div className="space-y-6 mt-8">
      <SectionHeader title="Plataformas y notificaciones de solicitudes" subtitle="Registre un nombre de plataforma y asígnelo a uno o ambos módulos." />

      {/* Agregar Nueva Plataforma */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Nueva Plataforma</h3>
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
          <div className="flex-1 w-full">
            <FormInput label="Nombre de plataforma" value={form.nombre} onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))} placeholder="Ej. Almera, Dinamica, Enterprise..." />
          </div>
          <div className="flex gap-4 items-center text-sm font-medium text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            {[
              ["creacion_usuario", "Creación de usuario"],
              ["restablecimiento_password", "Restablecimiento"],
            ].map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.modulos.includes(value)}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      modulos: event.target.checked ? [...current.modulos, value] : current.modulos.filter((module) => module !== value),
                    }))
                  }
                  className="rounded border-slate-300 text-[#0778ac] focus:ring-[#0778ac]"
                />
                {label}
              </label>
            ))}
          </div>
          <Btn onClick={add} className="w-full md:w-auto">
            <Plus size={14} /> Agregar
          </Btn>
        </div>

        {/* Lista de Plataformas */}
        <div className="mt-6 divide-y divide-slate-100 border-t border-slate-100 pt-2">
          {grouped.map((group) => {
            const hasCreacion = group.rows.some((r) => r.modulo === "creacion_usuario");
            const hasRestab = group.rows.some((r) => r.modulo === "restablecimiento_password");

            return (
              <div key={group.nombre} className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 text-sm gap-2 hover:bg-slate-50/60 px-2 rounded-xl transition-colors">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">{group.nombre}</span>
                  <span className="text-slate-400 text-xs">— {[hasCreacion && "Creación de usuario", hasRestab && "Restablecimiento"].filter(Boolean).join(", ")}</span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Botón Editar Plataforma */}
                  <Btn sm v="secondary" onClick={() => openEdit(group.nombre, group.rows)}>
                    <Pencil size={12} /> Editar
                  </Btn>

                  {/* Botón Eliminar Plataforma */}
                  <Btn sm v="danger" onClick={() => deleteGroup(group.rows)}>
                    <Trash2 size={12} /> Eliminar
                  </Btn>

                  {/* Botones Activar/Inactivar por módulo */}
                  {group.rows.map((row) => (
                    <Btn key={row.oid} sm v={row.activa ? "success" : "secondary"} onClick={() => toggle(row)}>
                      {row.modulo === "creacion_usuario" ? "Creación: " : "Restab: "}
                      {row.activa ? "Activa" : "Inactiva"}
                    </Btn>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rediseño: Correos de aviso al registrar solicitudes (Estilo como Correos por Tipo de Parámetro) */}
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
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">CORREOS - CREACIÓN DE USUARIO</label>
            <FormTextarea
              rows={3}
              value={emails.correos_creacion}
              onChange={(event) => setEmails((current) => ({ ...current, correos_creacion: event.target.value }))}
              placeholder="asistente.ingenieria@icvc.co, soporte@icvc.co"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">CORREOS - RESTABLECIMIENTO DE CONTRASEÑA</label>
            <FormTextarea
              rows={3}
              value={emails.correos_restablecimiento}
              onChange={(event) => setEmails((current) => ({ ...current, correos_restablecimiento: event.target.value }))}
              placeholder="asistente.ingenieria@icvc.co, soporte@icvc.co"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Btn onClick={saveEmails} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 py-2.5 shadow-sm">
            Guardar Correos de Notificación
          </Btn>
        </div>
      </div>

      {/* Modal Editar Plataforma */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Editar Plataforma">
        {editingPlatform && (
          <div className="space-y-4">
            <FormInput
              label="Nombre de la Plataforma"
              value={editingPlatform.nombre}
              onChange={(e) => setEditingPlatform({ ...editingPlatform, nombre: e.target.value })}
            />
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-2">Módulos en los que estará disponible</label>
              <div className="flex gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-medium">
                {[
                  ["creacion_usuario", "Creación de usuario"],
                  ["restablecimiento_password", "Restablecimiento"],
                ].map(([val, label]) => (
                  <label key={val} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editingPlatform.modulos.includes(val)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setEditingPlatform({
                          ...editingPlatform,
                          modulos: checked ? [...editingPlatform.modulos, val] : editingPlatform.modulos.filter((m) => m !== val),
                        });
                      }}
                      className="rounded border-slate-300 text-[#0778ac] focus:ring-[#0778ac]"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Btn v="secondary" onClick={() => setEditModalOpen(false)}>
                Cancelar
              </Btn>
              <Btn onClick={saveEditPlatform}>Guardar Cambios</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
