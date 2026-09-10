import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { Btn, FormInput, Modal, SectionHeader } from "@/components/ui/custom";
import type { Platform } from "@/types/acceso";

export function AccessPlatformsConfig({ onError: _onError }: { onError: (message: string) => void }) {
  const [items, setItems] = useState<Platform[]>([]);
  const [form, setForm] = useState({ nombre: "", modulos: ["creacion_usuario"] });
  const [formErrors, setFormErrors] = useState<{ nombre?: string; modulos?: string; general?: string }>({});

  // Modal para editar plataforma
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<{ originalName: string; nombre: string; modulos: string[]; rows: Platform[] } | null>(null);
  const [editErrors, setEditErrors] = useState<{ nombre?: string; modulos?: string; general?: string }>({});

  // Evita que una validación local active la pantalla de error global de App.
  const messageOf = (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? error.message : fallback;

  const load = () => {
    api<Platform[]>("/solicitudes-accesos/plataformas")
      .then(setItems)
      .catch((error) => setFormErrors({ general: messageOf(error, "No fue posible cargar las plataformas.") }));
  };

  useEffect(() => {
    load();
  }, []);

  const add = () => {
    if (!form.nombre.trim()) {
      setFormErrors({ nombre: "Indique el nombre de la plataforma." });
      return;
    }
    if (form.modulos.length === 0) {
      setFormErrors({ modulos: "Seleccione al menos un módulo para la plataforma." });
      return;
    }
    setFormErrors({});
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
        setFormErrors({});
        load();
        toast.success("Plataforma agregada correctamente.");
      })
      .catch((error) => setFormErrors({ general: messageOf(error, "No fue posible agregar la plataforma.") }));
  };

  const toggle = (item: Platform) =>
    api<Platform>("/solicitudes-accesos/plataformas/" + item.oid, { method: "PUT", body: JSON.stringify({ ...item, activa: !item.activa }) })
      .then(load)
      .catch((error) => setFormErrors({ general: messageOf(error, "No fue posible actualizar la plataforma.") }));

  const openEdit = (groupName: string, rows: Platform[]) => {
    setEditingPlatform({
      originalName: groupName,
      nombre: groupName,
      modulos: rows.map((r) => r.modulo),
      rows,
    });
    setEditErrors({});
    setEditModalOpen(true);
  };

  const saveEditPlatform = () => {
    if (!editingPlatform) return;
    if (!editingPlatform.nombre.trim()) {
      setEditErrors({ nombre: "Indique el nombre de la plataforma." });
      return;
    }
    if (editingPlatform.modulos.length === 0) {
      setEditErrors({ modulos: "Debe seleccionar al menos un módulo." });
      return;
    }
    setEditErrors({});

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
        setEditErrors({});
        load();
        toast.success("Plataforma actualizada.");
      })
      .catch((error) => setEditErrors({ general: messageOf(error, "No fue posible guardar los cambios.") }));
  };

  const deleteGroup = (rows: Platform[]) => {
    if (!confirm("¿Está seguro de eliminar esta plataforma?")) return;
    Promise.all(rows.map((row) => api("/solicitudes-accesos/plataformas/" + row.oid, { method: "DELETE" })))
      .then(() => {
        load();
        toast.success("Plataforma eliminada correctamente.");
      })
      .catch((error) => setFormErrors({ general: messageOf(error, "No fue posible eliminar la plataforma.") }));
  };

  const grouped = Object.values(
    items.reduce<Record<string, { nombre: string; rows: Platform[] }>>((result, item) => {
      (result[item.nombre] ||= { nombre: item.nombre, rows: [] }).rows.push(item);
      return result;
    }, {})
  );

  return (
    <div className="space-y-6">
      <SectionHeader title="Plataformas de Solicitudes" subtitle="Registre un nombre de plataforma y asígnelo a uno o ambos módulos." />

      {/* Agregar Nueva Plataforma */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Nueva Plataforma</h3>
        {formErrors.general && (
          <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formErrors.general}</div>
        )}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
          <div className="flex-1 w-full">
            <FormInput label="Nombre de plataforma" value={form.nombre} onChange={(event) => { setForm((current) => ({ ...current, nombre: event.target.value })); setFormErrors((current) => ({ ...current, nombre: undefined, general: undefined })); }} placeholder="Ej. Almera, Dinamica, Enterprise..." className={formErrors.nombre ? "border-red-500 focus:border-red-500 focus:ring-red-200" : ""} />
            {formErrors.nombre && <p className="mt-1 text-xs text-red-600">{formErrors.nombre}</p>}
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
                    { setForm((current) => ({
                        ...current,
                        modulos: event.target.checked ? [...current.modulos, value] : current.modulos.filter((module) => module !== value),
                      })); setFormErrors((current) => ({ ...current, modulos: undefined, general: undefined })); }
                  }
                  className="rounded border-slate-300 text-[#0778ac] focus:ring-[#0778ac]"
                />
                {label}
              </label>
            ))}
          </div>
          {formErrors.modulos && <p className="text-xs text-red-600">{formErrors.modulos}</p>}
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

      {/* Modal Editar Plataforma */}
      <Modal open={editModalOpen} onClose={() => { setEditModalOpen(false); setEditErrors({}); }} title="Editar Plataforma">
        {editingPlatform && (
          <div className="space-y-4">
            <FormInput
              label="Nombre de la Plataforma"
              value={editingPlatform.nombre}
              onChange={(e) => { setEditingPlatform({ ...editingPlatform, nombre: e.target.value }); setEditErrors((current) => ({ ...current, nombre: undefined, general: undefined })); }}
              className={editErrors.nombre ? "border-red-500 focus:border-red-500 focus:ring-red-200" : ""}
            />
            {editErrors.nombre && <p className="-mt-3 text-xs text-red-600">{editErrors.nombre}</p>}
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
                        setEditErrors((current) => ({ ...current, modulos: undefined, general: undefined }));
                      }}
                      className="rounded border-slate-300 text-[#0778ac] focus:ring-[#0778ac]"
                    />
                    {label}
                  </label>
                ))}
              </div>
              {editErrors.modulos && <p className="mt-1 text-xs text-red-600">{editErrors.modulos}</p>}
            </div>
            {editErrors.general && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{editErrors.general}</div>}
            <div className="flex justify-end gap-2 pt-4">
              <Btn v="secondary" onClick={() => { setEditModalOpen(false); setEditErrors({}); }}>
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
