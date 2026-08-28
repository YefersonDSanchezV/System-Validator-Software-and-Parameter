import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { Btn, EmptyState, FormInput, FormTextarea, Modal, SectionHeader, StatusBadge } from "@/components/ui/custom";

type UserRequest = { oid: number; consecutivo: string; tipo?: string; tipos?: string[]; solicitante: string; area: string; nombre_usuario: string; estado: string; fecha_registro: string; primer_nombre?: string; segundo_nombre?: string; primer_apellido?: string; segundo_apellido?: string; cedula?: string; telefono?: string; correo?: string; direccion?: string; cargo?: string };
type PasswordRequest = { oid: number; consecutivo: string; plataforma: string; solicitante: string; area: string; usuario: string; estado: string; fecha_registro: string };
type Platform = { oid: number; nombre: string; modulo: string; activa: boolean };

const userInitial = { tipo: "Usuario Dinamica", solicitante: "", area: "", primer_nombre: "", segundo_nombre: "", primer_apellido: "", segundo_apellido: "", cedula: "", telefono: "", correo: "", direccion: "", cargo: "" };
const passwordInitial = { plataforma: "Dinamica", solicitante: "", area: "", usuario: "", observacion: "", correo_jefe: "" };

function RequestTable({ headings, children, empty }: { headings: string[]; children: React.ReactNode; empty: boolean }) {
  return <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-x-auto">
    <table className="w-full text-sm"><thead className="bg-slate-50 border-b border-slate-200"><tr>{headings.map((heading) => <th key={heading} className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{children}</tbody></table>
    {empty && <EmptyState message="No hay solicitudes registradas." />}
  </div>;
}

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

  useEffect(() => {
    api<UserRequest[]>("/solicitudes-accesos/creacion-usuarios").then(setItems).catch(() => {});
    api<Platform[]>("/solicitudes-accesos/plataformas?modulo=creacion_usuario&solo_activas=true").then((rows) => setPlatforms(rows.map((row) => row.nombre))).catch(() => setPlatforms(["Usuario Dinamica", "Usuario", "Almera", "Usuario Enterprise", "Todos"]));
  }, []);

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

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <SectionHeader title="Solicitudes de Creación de Usuario" subtitle="Registre y consulte las solicitudes de nuevas cuentas." />
      <Btn onClick={() => setOpen(true)}><Plus size={14} /> Solicitud de Creación</Btn>
    </div>
    <RequestTable headings={[...["Consecutivo", "Tipo", "Solicitante", "Área", "Nombre de usuario", "Fecha", "Estado"], ...(admin ? ["Acciones"] : [])]} empty={items.length === 0}>
      {items.map((item) => <tr key={item.oid}><td className="px-4 py-3 font-mono text-xs font-bold text-[#0778ac]">{item.consecutivo}</td><td className="px-4 py-3">{(item.tipos?.length ? item.tipos : [item.tipo]).filter(Boolean).join(", ")}</td><td className="px-4 py-3">{item.solicitante}</td><td className="px-4 py-3">{item.area}</td><td className="px-4 py-3 font-mono">{item.nombre_usuario}</td><td className="px-4 py-3 text-xs">{item.fecha_registro?.slice(0, 16).replace("T", " ")}</td><td className="px-4 py-3"><StatusBadge estado={item.estado} /></td>{admin && <td className="px-4 py-3"><AdminUserActions item={item} refresh={() => api<UserRequest[]>("/solicitudes-accesos/creacion-usuarios").then(setItems)} onError={onError} /></td>}</tr>)}
    </RequestTable>
    <Modal open={open} onClose={() => setOpen(false)} title="Nueva Solicitud de Creación de Usuario" size="lg">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2"><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Tipos de usuario *</label><div className="mt-2 flex flex-wrap gap-3">{platforms.map((name) => <label key={name} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selectedTypes.includes(name)} onChange={(event) => setSelectedTypes((current) => event.target.checked ? [...current, name] : current.filter((item) => item !== name))} /> {name}</label>)}</div></div>
        <FormInput label="Solicitante" required value={form.solicitante} onChange={(event) => set("solicitante", event.target.value)} /><FormInput label="Área" required value={form.area} onChange={(event) => set("area", event.target.value)} />
        <FormInput label="Primer nombre" required value={form.primer_nombre} onChange={(event) => set("primer_nombre", event.target.value)} /><FormInput label="Segundo nombre" value={form.segundo_nombre} onChange={(event) => set("segundo_nombre", event.target.value)} />
        <FormInput label="Primer apellido" required value={form.primer_apellido} onChange={(event) => set("primer_apellido", event.target.value)} /><FormInput label="Segundo apellido" required value={form.segundo_apellido} onChange={(event) => set("segundo_apellido", event.target.value)} />
        <FormInput label="Cédula de ciudadanía" required inputMode="numeric" value={form.cedula} onChange={(event) => set("cedula", event.target.value)} /><FormInput label="Teléfono de contacto" required type="tel" value={form.telefono} onChange={(event) => set("telefono", event.target.value)} />
        <FormInput label="Correo electrónico" required type="email" value={form.correo} onChange={(event) => set("correo", event.target.value)} /><FormInput label="Dirección de residencia" required value={form.direccion} onChange={(event) => set("direccion", event.target.value)} />
        <FormInput label="Cargo laboral" required value={form.cargo} onChange={(event) => set("cargo", event.target.value)} /><FormInput label="Nombre de usuario" required value={nombreUsuario} readOnly />
        <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Firma del solicitante (JPG o PNG) *</label><input type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" onChange={(event) => { const file = event.target.files?.[0] ?? null; setFirma(file); if (firmaPreview) URL.revokeObjectURL(firmaPreview); setFirmaPreview(file ? URL.createObjectURL(file) : ""); }} className="text-sm" />{firmaPreview && <img src={firmaPreview} alt="Vista previa de la firma" className="mt-2 h-24 w-full rounded-lg border border-slate-200 object-contain bg-slate-50" />}</div>
      </div>
      <div className="flex justify-end gap-3 mt-6"><Btn v="secondary" onClick={() => setOpen(false)}>Cancelar</Btn><Btn onClick={save} disabled={saving}>{saving ? "Guardando..." : "Registrar solicitud"}</Btn></div>
    </Modal>
  </div>;
}

function AdminUserActions({ item, refresh, onError }: { item: UserRequest; refresh: () => void; onError: (message: string) => void }) {
  const [view, setView] = useState(false); const [edit, setEdit] = useState(false); const [notify, setNotify] = useState(false);
  const [username, setUsername] = useState(item.nombre_usuario); const [emails, setEmails] = useState(""); const [observation, setObservation] = useState("");
  const types = item.tipos?.length ? item.tipos : item.tipo ? [item.tipo] : [];
  const [accesses, setAccesses] = useState(types.map((type) => ({ tipo: type, nombre_usuario: "", password: "" }))); const [firma, setFirma] = useState<File | null>(null);
  const updateName = () => api("/solicitudes-accesos/creacion-usuarios/" + item.oid + "/nombre-usuario", { method: "PUT", body: JSON.stringify({ nombre_usuario: username }) }).then(() => { setEdit(false); refresh(); toast.success("Nombre de usuario actualizado."); }).catch((error) => onError(error.message));
  const send = () => { if (!firma || !emails.trim() || !observation.trim() || accesses.some((access) => !access.nombre_usuario || !access.password)) return onError("Complete destinatarios, observación, firma y todos los accesos."); const data = new FormData(); data.append("firma", firma); data.append("payload", JSON.stringify({ destinatarios: emails, observacion: observation, accesos: accesses })); api("/solicitudes-accesos/creacion-usuarios/" + item.oid + "/usuario-creado", { method: "POST", body: data }).then(() => { setNotify(false); refresh(); toast.success("Correo enviado correctamente."); }).catch((error) => onError(error.message)); };
  return <><div className="flex flex-wrap gap-1"><Btn sm v="secondary" onClick={() => setView(true)}>Consultar</Btn><Btn sm v="secondary" onClick={() => setEdit(true)}>Editar</Btn><Btn sm onClick={() => setNotify(true)}>Usuario creado</Btn></div>
    <Modal open={view} onClose={() => setView(false)} title="Detalle de solicitud de creación"><div className="grid grid-cols-2 gap-4 text-sm">{[["Tipos", types.join(", ")],["Solicitante",item.solicitante],["Área",item.area],["Funcionario",[item.primer_nombre,item.segundo_nombre,item.primer_apellido,item.segundo_apellido].filter(Boolean).join(" ")],["Cédula",item.cedula || ""],["Teléfono",item.telefono || ""],["Correo",item.correo || ""],["Dirección",item.direccion || ""],["Cargo",item.cargo || ""],["Usuario",item.nombre_usuario]].map(([label,value]) => <div key={label}><p className="text-xs text-slate-400 uppercase">{label}</p><p>{value}</p></div>)}</div></Modal>
    <Modal open={edit} onClose={() => setEdit(false)} title="Editar nombre de usuario"><FormInput label="Nombre de usuario" value={username} onChange={(event) => setUsername(event.target.value)} /><div className="mt-5 flex justify-end gap-2"><Btn v="secondary" onClick={() => setEdit(false)}>Cancelar</Btn><Btn onClick={updateName}>Guardar</Btn></div></Modal>
    <Modal open={notify} onClose={() => setNotify(false)} title="Notificar usuarios creados" size="lg"><div className="space-y-4"><FormInput label="Correos a informar" value={emails} onChange={(event) => setEmails(event.target.value)} placeholder="correo@icvc.co, otro@icvc.co" /><FormTextarea label="Observación" rows={3} value={observation} onChange={(event) => setObservation(event.target.value)} />{accesses.map((access, index) => <div key={access.tipo} className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3"><p className="col-span-2 text-sm font-semibold">{access.tipo}</p><FormInput label="Nombre de usuario" value={access.nombre_usuario} onChange={(event) => setAccesses((rows) => rows.map((row,i) => i === index ? { ...row, nombre_usuario: event.target.value } : row))} /><FormInput label="Contraseña" type="password" value={access.password} onChange={(event) => setAccesses((rows) => rows.map((row,i) => i === index ? { ...row, password: event.target.value } : row))} /></div>)}<div><label className="text-xs font-semibold uppercase">Firma (JPG o PNG)</label><input className="block mt-2 text-sm" type="file" accept="image/jpeg,image/png" onChange={(event) => setFirma(event.target.files?.[0] ?? null)} /></div></div><div className="mt-5 flex justify-end gap-2"><Btn v="secondary" onClick={() => setNotify(false)}>Cancelar</Btn><Btn onClick={send}>Enviar correo</Btn></div></Modal></>;
}

export function PasswordResetRequests({ onError, admin = false }: { onError: (message: string) => void; admin?: boolean }) {
  const [items, setItems] = useState<PasswordRequest[]>([]);
  const [form, setForm] = useState(passwordInitial);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [platforms, setPlatforms] = useState<string[]>(["Dinamica", "Enterprise", "Almera", "Otros"]);
  const set = (key: keyof typeof passwordInitial, value: string) => setForm((current) => ({ ...current, [key]: value }));
  useEffect(() => { api<PasswordRequest[]>("/solicitudes-accesos/restablecimientos-password").then(setItems).catch(() => {}); api<Platform[]>("/solicitudes-accesos/plataformas?modulo=restablecimiento_password&solo_activas=true").then((rows) => { const names = rows.map((row) => row.nombre); if (names.length) { setPlatforms(names); setForm((current) => ({ ...current, plataforma: names.includes(current.plataforma) ? current.plataforma : names[0] })); } }).catch(() => {}); }, []);
  const save = () => {
    if (Object.values(form).some((value) => !value.trim())) { onError("Complete todos los campos obligatorios."); return; }
    setSaving(true);
    api<PasswordRequest>("/solicitudes-accesos/restablecimientos-password", { method: "POST", body: JSON.stringify(form) })
      .then((created) => { setItems((current) => [created, ...current]); setForm(passwordInitial); setOpen(false); toast.success("Solicitud de restablecimiento registrada."); })
      .catch((error) => onError(error instanceof Error ? error.message : "No fue posible registrar la solicitud."))
      .finally(() => setSaving(false));
  };
  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><SectionHeader title="Solicitudes de Restablecimiento de Contraseña" subtitle="Registre y consulte solicitudes de restablecimiento." /><Btn onClick={() => setOpen(true)}><Plus size={14} /> Solicitud de Restablecimiento</Btn></div>
    <RequestTable headings={[...["Consecutivo", "Plataforma", "Solicitante", "Área", "Usuario", "Fecha", "Estado"], ...(admin ? ["Acciones"] : [])]} empty={items.length === 0}>
      {items.map((item) => <tr key={item.oid}><td className="px-4 py-3 font-mono text-xs font-bold text-[#0778ac]">{item.consecutivo}</td><td className="px-4 py-3">{item.plataforma}</td><td className="px-4 py-3">{item.solicitante}</td><td className="px-4 py-3">{item.area}</td><td className="px-4 py-3 font-mono">{item.usuario}</td><td className="px-4 py-3 text-xs">{item.fecha_registro?.slice(0, 16).replace("T", " ")}</td><td className="px-4 py-3"><StatusBadge estado={item.estado} /></td>{admin && <td className="px-4 py-3"><AdminPasswordActions item={item} refresh={() => api<PasswordRequest[]>("/solicitudes-accesos/restablecimientos-password").then(setItems)} onError={onError} /></td>}</tr>)}
    </RequestTable>
    <Modal open={open} onClose={() => setOpen(false)} title="Nueva Solicitud de Restablecimiento" size="md">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5"><label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Plataforma *</label><select value={form.plataforma} onChange={(event) => set("plataforma", event.target.value)} className="px-3 py-2 rounded-lg border border-slate-300 text-sm">{platforms.map((platform) => <option key={platform}>{platform}</option>)}</select></div>
        <FormInput label="Solicitante" required value={form.solicitante} onChange={(event) => set("solicitante", event.target.value)} /><FormInput label="Área" required value={form.area} onChange={(event) => set("area", event.target.value)} />
        <FormInput label="Usuario a restablecer" required value={form.usuario} onChange={(event) => set("usuario", event.target.value)} /><FormInput label="Correo del jefe directo" required type="email" value={form.correo_jefe} onChange={(event) => set("correo_jefe", event.target.value)} />
        <div className="md:col-span-2"><FormTextarea label="Observación del restablecimiento" required rows={4} value={form.observacion} onChange={(event) => set("observacion", event.target.value)} /></div>
      </div>
      <div className="flex justify-end gap-3 mt-6"><Btn v="secondary" onClick={() => setOpen(false)}>Cancelar</Btn><Btn onClick={save} disabled={saving}>{saving ? "Guardando..." : "Registrar solicitud"}</Btn></div>
    </Modal>
  </div>;
}

function AdminPasswordActions({ item, refresh, onError }: { item: PasswordRequest; refresh: () => void; onError: (message: string) => void }) {
  const [view, setView] = useState(false); const [notify, setNotify] = useState(false); const [emails, setEmails] = useState(""); const [observation, setObservation] = useState(""); const [firma, setFirma] = useState<File | null>(null);
  const send = () => { if (!firma || !emails.trim() || !observation.trim()) return onError("Complete destinatarios, observación y firma."); const data = new FormData(); data.append("firma", firma); data.append("payload", JSON.stringify({ destinatarios: emails, observacion: observation })); api("/solicitudes-accesos/restablecimientos-password/" + item.oid + "/notificar", { method: "POST", body: data }).then(() => { setNotify(false); refresh(); toast.success("Correo enviado correctamente."); }).catch((error) => onError(error.message)); };
  return <><div className="flex flex-wrap gap-1"><Btn sm v="secondary" onClick={() => setView(true)}>Consultar</Btn><Btn sm onClick={() => setNotify(true)}>Notificar</Btn></div><Modal open={view} onClose={() => setView(false)} title="Detalle de restablecimiento"><div className="grid grid-cols-2 gap-4 text-sm">{[["Plataforma",item.plataforma],["Solicitante",item.solicitante],["Área",item.area],["Usuario",item.usuario],["Fecha",item.fecha_registro]].map(([label,value]) => <div key={label}><p className="text-xs text-slate-400 uppercase">{label}</p><p>{value}</p></div>)}</div></Modal><Modal open={notify} onClose={() => setNotify(false)} title="Notificar restablecimiento"><div className="space-y-4"><FormInput label="Correos a informar" value={emails} onChange={(event) => setEmails(event.target.value)} /><FormTextarea label="Observación" rows={3} value={observation} onChange={(event) => setObservation(event.target.value)} /><div><label className="text-xs font-semibold uppercase">Firma (JPG o PNG)</label><input className="block mt-2 text-sm" type="file" accept="image/jpeg,image/png" onChange={(event) => setFirma(event.target.files?.[0] ?? null)} /></div></div><div className="mt-5 flex justify-end gap-2"><Btn v="secondary" onClick={() => setNotify(false)}>Cancelar</Btn><Btn onClick={send}>Enviar correo</Btn></div></Modal></>;
}

export function AccessPlatformsConfig({ onError }: { onError: (message: string) => void }) {
  const [items, setItems] = useState<Platform[]>([]);
  const [form, setForm] = useState({ nombre: "", modulos: ["creacion_usuario"] });
  const [emails, setEmails] = useState({ correos_creacion: "", correos_restablecimiento: "" });
  const load = () => {
    api<Platform[]>("/solicitudes-accesos/plataformas").then(setItems).catch((error) => onError(error.message));
    api<typeof emails>("/solicitudes-accesos/configuracion").then(setEmails).catch(() => {});
  };
  useEffect(() => { load(); }, []);
  const add = () => {
    if (!form.nombre.trim()) return onError("Indique el nombre de la plataforma.");
    Promise.all(form.modulos.map((modulo) => api<Platform>("/solicitudes-accesos/plataformas", { method: "POST", body: JSON.stringify({ nombre: form.nombre, modulo, activa: true }) }))).then(() => { setForm((current) => ({ ...current, nombre: "" })); load(); }).catch((error) => onError(error.message));
  };
  const toggle = (item: Platform) => api<Platform>("/solicitudes-accesos/plataformas/" + item.oid, { method: "PUT", body: JSON.stringify({ ...item, activa: !item.activa }) }).then(load).catch((error) => onError(error.message));
  const saveEmails = () => api("/solicitudes-accesos/configuracion", { method: "PUT", body: JSON.stringify(emails) }).then(() => toast.success("Correos de notificación guardados.")).catch((error) => onError(error.message));
  const grouped = Object.values(items.reduce<Record<string, { nombre: string; rows: Platform[] }>>((result, item) => { (result[item.nombre] ||= { nombre: item.nombre, rows: [] }).rows.push(item); return result; }, {}));
  return <div className="space-y-6 mt-8"><SectionHeader title="Plataformas y notificaciones de solicitudes" subtitle="Registre un nombre de plataforma y asígnelo a uno o ambos módulos." />
    <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-col md:flex-row gap-3"><FormInput label="Nueva plataforma" value={form.nombre} onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))} /><div className="self-end flex gap-3 text-sm">{[["creacion_usuario","Creación de usuario"],["restablecimiento_password","Restablecimiento"]].map(([value,label]) => <label key={value}><input type="checkbox" checked={form.modulos.includes(value)} onChange={(event) => setForm((current) => ({ ...current, modulos: event.target.checked ? [...current.modulos,value] : current.modulos.filter((module) => module !== value) }))} /> {label}</label>)}</div><Btn className="self-end" onClick={add}><Plus size={14} /> Agregar</Btn></div>
      <div className="mt-5 divide-y">{grouped.map((item) => <div key={item.nombre} className="flex items-center justify-between py-3 text-sm"><span>{item.nombre} <span className="text-slate-400">— {item.rows.map((row) => row.modulo === "creacion_usuario" ? "Creación de usuario" : "Restablecimiento").join(", ")}</span></span><div className="flex gap-1">{item.rows.map((row) => <Btn key={row.oid} sm v={row.activa ? "success" : "secondary"} onClick={() => toggle(row)}>{row.activa ? "Activa" : "Inactiva"}</Btn>)}</div></div>)}</div></div>
    <div className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-semibold text-slate-800 mb-1">Correos de aviso al registrar solicitudes</h3><p className="text-xs text-slate-500 mb-4">Separe varios correos con coma o punto y coma.</p><div className="grid md:grid-cols-2 gap-4"><FormInput label="Creación de usuario" value={emails.correos_creacion} onChange={(event) => setEmails((current) => ({ ...current, correos_creacion: event.target.value }))} /><FormInput label="Restablecimiento" value={emails.correos_restablecimiento} onChange={(event) => setEmails((current) => ({ ...current, correos_restablecimiento: event.target.value }))} /></div><div className="mt-4"><Btn onClick={saveEmails}>Guardar correos</Btn></div></div>
  </div>;
}
