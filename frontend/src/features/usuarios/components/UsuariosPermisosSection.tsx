import { useState, useEffect } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { Btn, SectionHeader } from "@/components/ui/custom";

// ─── Usuarios Permisos Section (Generales > Usuarios Permisos) ──────────────
// Extraído desde src/app/App.tsx:741-870 (function UsuariosPermisosSection).
// Esta copia mantiene TODO el contenido original sin modificar App.tsx.

export type UsuarioSolicitudItem = {
  id: number; nombre_completo: string; nombre_usuario: string; correo_institucional: string; cargo: string; estado: string; firma_url: string; created_at: string; plataformas: number[];
};

export function UsuariosPermisosSection({ onError }: { onError: (msg: string) => void }) {
  const [usuarios, setUsuarios] = useState<UsuarioSolicitudItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [plataformas, setPlataformas] = useState<{oid:number; nombre:string; activa:boolean; asignada:boolean}[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fetchUsuarios = () => api<UsuarioSolicitudItem[]>("/usuarios-solicitud").then((data)=>{ setUsuarios(data); if(data.length && selectedId===null) setSelectedId(data[0].id); }).catch((e)=>onError(e instanceof Error?e.message:"Error")).finally(()=>setLoading(false));
  const fetchPermisos = (uid:number) => api<{plataformas:{oid:number; nombre:string; activa:boolean; asignada:boolean}[]; asignadas:number[]}>(`/usuarios-solicitud/${uid}/permisos-plataformas`).then((res)=> setPlataformas(res.plataformas)).catch((e)=>onError(e instanceof Error?e.message:"Error"));
  useEffect(()=>{ fetchUsuarios(); }, []);
  useEffect(()=>{ if(selectedId) fetchPermisos(selectedId); }, [selectedId]);
  const toggle = (oid:number) => setPlataformas((prev)=> prev.map((p)=> p.oid===oid ? {...p, asignada: !p.asignada} : p));
  const handleSave = () => {
    if(!selectedId) return;
    const ids = plataformas.filter((p)=>p.asignada).map((p)=>p.oid);
    setSaving(true);
    api(`/usuarios-solicitud/${selectedId}/permisos-plataformas`,{method:"PUT", body: JSON.stringify({plataforma_ids: ids})}).then(()=>{ toast.success("Permisos actualizados"); }).catch((e)=>toast.error(e instanceof Error?e.message:"Error")).finally(()=>setSaving(false));
  };
  if(loading) return <div className="p-8 text-center text-slate-500">Cargando...</div>;
  return (
    <div className="space-y-6">
      <SectionHeader title="Permisos de Usuarios" subtitle="Autoriza a qué plataformas puede solicitar creación cada usuario (Almera, Dinámica, Enterprise, etc.)." />
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div>
          <p className="block text-xs font-semibold text-slate-600 uppercase mb-2">Seleccione un usuario</p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr><th className="px-3 py-2">Usuario</th><th className="px-3 py-2">Nombre</th><th className="px-3 py-2">Correo</th><th className="px-3 py-2">Cargo</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usuarios.map((u) => (
                  <tr key={u.id} onClick={() => setSelectedId(u.id)} className={`cursor-pointer transition-colors ${selectedId === u.id ? "bg-[#0778ac]/10 text-slate-900" : "hover:bg-slate-50"}`}>
                    <td className="px-3 py-2.5 font-semibold">{u.nombre_usuario}</td>
                    <td className="px-3 py-2.5">{u.nombre_completo}</td>
                    <td className="px-3 py-2.5">{u.correo_institucional}</td>
                    <td className="px-3 py-2.5">{u.cargo || "—"}</td>
                  </tr>
                ))}
                {usuarios.length===0 && <tr><td colSpan={4} className="px-3 py-4 text-center text-xs text-slate-400">No hay usuarios creados. Cree primero un usuario de solicitud.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        {selectedId && (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              {plataformas.map((p)=>(
                <label key={p.oid} className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer ${p.asignada?"bg-emerald-50 border-emerald-200":"bg-slate-50 border-slate-200 opacity-70"}`}>
                  <input type="checkbox" checked={p.asignada} onChange={()=>toggle(p.oid)} className="w-4 h-4 accent-emerald-600" disabled={!p.activa} />
                  <div><p className="text-xs font-bold text-slate-800">{p.nombre}</p><p className="text-[11px] text-slate-500">{p.activa?"Activa":"Inactiva"} {p.asignada?"• Asignada":""}</p></div>
                </label>
              ))}
            </div>
            <div className="flex justify-end pt-4 border-t border-slate-100"><Btn v="primary" onClick={handleSave} disabled={saving}>{saving?"Guardando...":"Guardar Permisos"}</Btn></div>
          </>
        )}
      </div>
    </div>
  );
}

export default UsuariosPermisosSection;
