import { useState } from "react";
import type React from "react";
import { Plus, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import {
  Modal,
  Btn,
  SectionHeader,
  Field,
  FormInput,
  FormTextarea,
  EmptyState,
} from "@/components/ui/custom";
import { type Version, type ApiVersion, toVersion } from "@/types/version";

import { DEFAULT_DB_CONTAINERS, normalizeContainerName, sortVersionsByCompilationDateDesc, getContainerOptions } from "@/lib/versionHelpers";
import { ContainerAutocompleteField } from "@/components/ui/ContainerAutocompleteField";
import { VersionQuery } from "./VersionQuery";

// ─── 1. Version Registration (App.tsx:3085-3234) ───────────────────────────

export function VersionRegistration({
  versions,
  setVersions,
  onError,
  loggedUser = "coordinador_sistemas",
}: {
  versions: Version[];
  setVersions: React.Dispatch<React.SetStateAction<Version[]>>;
  onError: (message: string) => void;
  loggedUser?: string;
}) {
  const containerOptions = getContainerOptions(versions);
  const [form, setForm] = useState<{
    titulo: string;
    descripcion: string;
    enlace: string;
    contenedor_bd: string;
    num_compilacion: string;
    fecha_compilacion: string;
  }>({
    titulo: "",
    descripcion: "",
    enlace: "",
    contenedor_bd: DEFAULT_DB_CONTAINERS[0],
    num_compilacion: "",
    fecha_compilacion: "",
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.titulo.trim() || !form.descripcion.trim() || !form.enlace.trim()) {
      onError("Título, descripción y enlace son obligatorios para registrar la versión.");
      return;
    }

    setSaving(true);
    try {
      const created = await api<ApiVersion>("/versions/", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          titulo: form.titulo.trim(),
          descripcion: form.descripcion.trim(),
          enlace: form.enlace.trim(),
          contenedor_bd: normalizeContainerName(form.contenedor_bd) || null,
          fecha_compilacion: form.fecha_compilacion ? form.fecha_compilacion : null,
          usuario: "Coordinador de Sistemas",
        }),
      });
      setVersions((prev) => sortVersionsByCompilationDateDesc([toVersion(created), ...prev]));
      setForm({
        titulo: "",
        descripcion: "",
        enlace: "",
        contenedor_bd: DEFAULT_DB_CONTAINERS[0],
        num_compilacion: "",
        fecha_compilacion: "",
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      onError(error instanceof Error ? error.message : "No fue posible guardar la versión.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Registro de Versión del Sistema"
        subtitle="Complete los datos para registrar una nueva versión del sistema."
      />

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Nuevo Registro de Versión</h3>

        <div className="grid gap-4 md:grid-cols-2">
          <FormInput
            label="Título (Versión del Sistema)"
            required
            placeholder="Ej: Versión 2.4.1"
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
          />
          <ContainerAutocompleteField
            label="Contenedor de Base de Datos"
            listId="version-registration-container-options"
            value={form.contenedor_bd}
            onChange={(value) => setForm({ ...form, contenedor_bd: value })}
            options={containerOptions}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormInput
            label="Número de compilación"
            placeholder="Ej: BUILD-2026-08-22"
            value={form.num_compilacion}
            onChange={(e) => setForm({ ...form, num_compilacion: e.target.value })}
          />
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Fecha de compilación</label>
            <input
              type="datetime-local"
              value={form.fecha_compilacion}
              onChange={(e) => setForm({ ...form, fecha_compilacion: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0778ac]"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormTextarea
            label="Descripción (Detalles de mejoras en la actualización)"
            required
            rows={3}
            placeholder="Describa los cambios principales..."
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          />
          <FormInput
            label="Enlace (URL de la versión)"
            required
            type="url"
            placeholder="http://..."
            value={form.enlace}
            onChange={(e) => setForm({ ...form, enlace: e.target.value })}
          />
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
          <Btn v="primary" onClick={handleSave} disabled={saving}>
            <Plus size={15} /> Guardar Versión
          </Btn>
          {saved && (
            <span className="text-sm text-emerald-600 flex items-center gap-1.5 font-medium">
              <CheckCircle size={15} /> Versión registrada exitosamente
            </span>
          )}
        </div>
      </div>

      <div className="border-t border-slate-200 pt-6">
        <VersionQuery versions={versions} setVersions={setVersions} onError={onError} loggedUser={loggedUser} />
      </div>
    </div>
  );
}

export default VersionRegistration;
