import { useEffect, useState } from "react";
import { Plus, Info } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { getBearerToken } from "@/lib/api/auth";
import { Btn, FormInput, FormTextarea, Modal, SectionHeader, StatusBadge } from "@/components/ui/custom";
import type { UserRequest, Platform } from "@/types/acceso";
import { RequestTable } from "./RequestTable";

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

export function UserCreationRequests({ onError, admin = false }: { onError: (message: string) => void; admin?: boolean }) {
  const [items, setItems] = useState<UserRequest[]>([]);
  const [form, setForm] = useState(userInitial);
  const [firma, setFirma] = useState<File | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [otrosNombre, setOtrosNombre] = useState("");
  const [allowedPlatforms, setAllowedPlatforms] = useState<string[] | null>(null);
  const [firmaPreview, setFirmaPreview] = useState("");
  const [currentUser, setCurrentUser] = useState<{
    id: number;
    nombre_completo: string;
    nombre_usuario: string;
    correo_institucional: string;
    cargo: string;
    firma_url: string;
  } | null>(null);

  const firstName = form.primer_nombre.trim().split(/\s+/)[0] || "";
  const firstSurname = form.primer_apellido.trim().split(/\s+/)[0] || "";
  const nombreUsuario = firstName && firstSurname ? firstName + "." + firstSurname : "";
  const set = (key: keyof typeof userInitial, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const getUsuarioSolicitudToken = () => getBearerToken();

  const applyUserData = (userData: any) => {
    setCurrentUser(userData);
    setForm((prev) => ({
      ...prev,
      solicitante: userData.nombre_completo || userData.nombre_usuario || prev.solicitante,
      area: userData.cargo || prev.area,
    }));
    if (userData.firma_url) {
      const cleanUrl = userData.firma_url.startsWith("/") ? userData.firma_url : `/${userData.firma_url}`;
      setFirmaPreview(cleanUrl);
    }
  };

  const loadData = () => {
    api<UserRequest[]>("/solicitudes-accesos/creacion-usuarios").then(setItems).catch(() => {});
    api<Platform[]>("/solicitudes-accesos/plataformas?modulo=creacion_usuario&solo_activas=true")
      .then((rows) => setPlatforms(rows.map((row) => row.nombre)))
      .catch(() => setPlatforms([]));
    const token = getUsuarioSolicitudToken();
    if (token) {
      api<any>("/auth/usuarios-solicitud/me")
        .then((userData) => {
          if (userData) applyUserData(userData);
        })
        .catch(() => {});

      api<any>("/auth/usuarios-solicitud/me/permisos")
        .then((data) => {
          if (data?.plataformas) setAllowedPlatforms(data.plataformas);
        })
        .catch(() => {});
    } else {
      setAllowedPlatforms(null);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = () => {
    setForm({
      ...userInitial,
      solicitante: currentUser?.nombre_completo || currentUser?.nombre_usuario || "",
      area: currentUser?.cargo || "",
    });
    setSelectedTypes([]);
    setOtrosNombre("");
    setFirma(null);
    if (currentUser?.firma_url) {
      const cleanUrl = currentUser.firma_url.startsWith("/") ? currentUser.firma_url : `/${currentUser.firma_url}`;
      setFirmaPreview(cleanUrl);
    } else {
      setFirmaPreview("");
    }
    setOpen(true);
  };

  const handleFirmaChange = (file: File | null) => {
    setFirma(file);
    if (firmaPreview && !currentUser?.firma_url) URL.revokeObjectURL(firmaPreview);
    setFirmaPreview(file ? URL.createObjectURL(file) : "");
  };

  const visiblePlatforms = allowedPlatforms ? platforms.filter((p) => allowedPlatforms.includes(p)) : platforms;
  const displayPlatforms = [...visiblePlatforms, "Otros"];

  const save = () => {
    const hasSignature = Boolean(firma) || Boolean(currentUser?.firma_url) || Boolean(firmaPreview);
    if (
      Object.entries(form).some(([key, value]) => key !== "segundo_nombre" && !value.trim()) ||
      !hasSignature ||
      selectedTypes.length === 0
    ) {
      onError("Complete todos los campos obligatorios y verifique la firma.");
      return;
    }
    if (selectedTypes.includes("Otros") && !otrosNombre.trim()) {
      onError("Debe indicar el nombre de la plataforma para 'Otros'.");
      return;
    }
    if (firma && !["image/jpeg", "image/png"].includes(firma.type)) {
      onError("La firma debe estar en formato JPG o PNG.");
      return;
    }
    const finalTipos = selectedTypes;
    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.append(key, value.trim()));
    data.append("tipos", JSON.stringify(finalTipos));
    data.append("nombre_usuario", nombreUsuario);
    if (firma) {
      data.append("firma", firma);
    }
    if (finalTipos.includes("Otros")) data.append("plataforma_otros_nombre", otrosNombre.trim());
    setSaving(true);
    api<UserRequest>("/solicitudes-accesos/creacion-usuarios", { method: "POST", body: data } as any)
      .then((created) => {
        setItems((current) => [created, ...current]);
        setForm({
          ...userInitial,
          solicitante: currentUser?.nombre_completo || currentUser?.nombre_usuario || "",
          area: currentUser?.cargo || "",
        });
        setSelectedTypes([]);
        setOtrosNombre("");
        setFirma(null);
        if (currentUser?.firma_url) {
          const cleanUrl = currentUser.firma_url.startsWith("/") ? currentUser.firma_url : `/${currentUser.firma_url}`;
          setFirmaPreview(cleanUrl);
        } else {
          setFirmaPreview("");
        }
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
        <Btn onClick={handleOpenModal}>
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
        headings={[...["Consecutivo", "Tipo", "Solicitante", "Cargo", "Nombre de usuario", "Fecha", "Estado"], ...(admin ? ["Acciones"] : [])]}
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
            {allowedPlatforms !== null && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                Mostrando solo plataformas permitidas para tu usuario. Para más accesos contacta al Administrador en Generales &gt; Usuarios &gt; Permisos.
              </p>
            )}
            <div className="flex flex-wrap gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              {displayPlatforms.length > 0 ? (
                displayPlatforms.map((name) => (
                  <label key={name} className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(name)}
                      onChange={(event) =>
                        setSelectedTypes((current) => (event.target.checked ? [...current, name] : current.filter((item) => item !== name)))
                      }
                      className="rounded border-slate-300 text-[#0778ac] focus:ring-[#0778ac]"
                    />
                    {name} {name === "Otros" && <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded">Otro</span>}
                  </label>
                ))
              ) : (
                <p className="text-xs text-slate-500 py-1">No hay plataformas activas configuradas. Registre plataformas en Administrador &gt; Plataformas.</p>
              )}
            </div>
            {selectedTypes.includes("Otros") && (
              <div className="mt-2">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Nombre de la plataforma para &quot;Otros&quot; *</label>
                <input
                  value={otrosNombre}
                  onChange={(e) => setOtrosNombre(e.target.value)}
                  placeholder="Ingrese el nombre de la plataforma"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0778ac]"
                />
              </div>
            )}
            {selectedTypes.includes("Todos") && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-xs font-medium animate-fadeIn">
                <Info size={16} className="shrink-0 text-blue-600" />
                <span>
                  Al seleccionar la opción <strong>&quot;Todos&quot;</strong>, se informa que se deberá crear la cuenta del empleado para <strong>todos los módulos informados y disponibles</strong>.
                </span>
              </div>
            )}
          </div>

          <FormInput
            label="Solicitante"
            required
            value={form.solicitante}
            readOnly
            title="Dato tomado automáticamente del perfil del usuario (Inmodificable)"
          />
          <FormInput
            label="Cargo"
            required
            value={form.area}
            readOnly
            title="Dato tomado automáticamente del perfil del usuario (Inmodificable)"
          />
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

          {/* Campo de Firma */}
          <div className="md:col-span-2 flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Firma del Solicitante {currentUser?.firma_url ? "(Registrada en el perfil - Inmodificable)" : "*"}
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center bg-slate-50 min-h-[120px] transition-all">
              {firmaPreview ? (
                <div className="flex flex-col items-center gap-2 w-full">
                  <img
                    src={firmaPreview}
                    alt="Firma del solicitante"
                    className="max-h-28 max-w-full object-contain rounded border border-slate-200 shadow-sm bg-white p-1"
                  />
                  {currentUser?.firma_url ? (
                    <span className="text-[11px] font-medium text-slate-500 bg-slate-200/80 px-3 py-1 rounded-full">
                      Firma inmodificable vinculada al usuario
                    </span>
                  ) : (
                    <label className="text-xs font-semibold text-[#0778ac] hover:underline cursor-pointer">
                      Cambiar firma
                      <input
                        type="file"
                        accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                        onChange={(e) => handleFirmaChange(e.target.files?.[0] ?? null)}
                        className="hidden"
                      />
                    </label>
                  )}
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
