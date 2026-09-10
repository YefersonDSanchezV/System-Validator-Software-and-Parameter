import { useState, useEffect } from "react";
import { Plus, Power, Pencil, Eye, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { Modal, Btn, SectionHeader } from "@/components/ui/custom";
import { useTablePagination } from "@/hooks/useTablePagination";
import { TablePaginationControls } from "@/components/ui/TablePagination";

// ─── Usuarios Solicitud Section (Generales > Usuarios) ───────────────────────
// Extraído desde src/app/App.tsx:599-740 (function UsuariosSolicitudSection).
// Esta copia mantiene TODO el contenido original sin modificar App.tsx.

export type UsuarioSolicitudItem = {
  id: number; nombre_completo: string; nombre_usuario: string; correo_institucional: string; cargo: string; estado: string; firma_url: string; created_at: string; plataformas: number[];
};

export function UsuariosSolicitudSection({ onError }: { onError: (msg: string) => void }) {
  const [items, setItems] = useState<UsuarioSolicitudItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<UsuarioSolicitudItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [resetItem, setResetItem] = useState<UsuarioSolicitudItem | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [editItem, setEditItem] = useState<UsuarioSolicitudItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ nombre_completo: "", correo_institucional: "", cargo: "", nombre_usuario: "" });
  const [editFirma, setEditFirma] = useState<File | null>(null);
  const [form, setForm] = useState({ nombre_completo: "", correo_institucional: "", cargo: "", nombre_usuario: "", password: "" });
  const [firma, setFirma] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fetchItems = () => {
    setLoading(true);
    api<UsuarioSolicitudItem[]>("/usuarios-solicitud").then(setItems).catch((e)=>onError(e instanceof Error?e.message:"Error cargando usuarios")).finally(()=>setLoading(false));
  };
  useEffect(()=>{ fetchItems(); }, []);
  const handleCreate = () => {
    if(!form.nombre_completo.trim() || !form.correo_institucional.trim() || !form.cargo.trim() || !form.password.trim() || !firma) { toast.error("Complete todos los campos y firma JPG/PNG obligatoria"); return; }
    if(form.password.length < 8){ toast.error("Contraseña mínima 8 caracteres"); return; }
    setSaving(true);
    const fd = new FormData();
    fd.append("nombre_completo", form.nombre_completo.trim());
    fd.append("correo_institucional", form.correo_institucional.trim());
    fd.append("cargo", form.cargo.trim());
    if(form.nombre_usuario.trim()) fd.append("nombre_usuario", form.nombre_usuario.trim());
    fd.append("password", form.password);
    fd.append("firma", firma);
    api<UsuarioSolicitudItem>("/usuarios-solicitud",{method:"POST", body: fd}).then((created)=>{ setItems((prev)=>[created, ...prev]); setOpen(false); setForm({nombre_completo:"",correo_institucional:"",cargo:"",nombre_usuario:"",password:""}); setFirma(null); toast.success("Usuario creado"); }).catch((e)=>toast.error(e instanceof Error?e.message:"Error creando usuario")).finally(()=>setSaving(false));
  };
  const handleToggleEstado = (u: UsuarioSolicitudItem) => {
    if(!window.confirm(`¿${u.estado==="Activo"?"Inactivar":"Activar"} a ${u.nombre_completo}?`)) return;
    api<UsuarioSolicitudItem>(`/usuarios-solicitud/${u.id}/estado`,{method:"PATCH"}).then((updated)=> setItems((prev)=>prev.map((x)=>x.id===updated.id?updated:x))).catch((e)=>toast.error(e instanceof Error?e.message:"Error"));
  };
  const handleReset = () => {
    if(!resetItem || resetPassword.length < 8){ toast.error("Contraseña mínima 8"); return; }
    api(`/usuarios-solicitud/${resetItem.id}/reset-password`,{method:"POST", body: JSON.stringify({password: resetPassword})}).then(()=>{ toast.success("Contraseña restablecida"); setResetOpen(false); setResetItem(null); setResetPassword(""); }).catch((e)=>toast.error(e instanceof Error?e.message:"Error"));
  };
  const handleEdit = () => {
    if(!editItem) return;
    if(!editForm.nombre_completo.trim() || !editForm.correo_institucional.trim() || !editForm.cargo.trim()){ toast.error("Campos obligatorios"); return; }
    const fd = new FormData();
    fd.append("nombre_completo", editForm.nombre_completo);
    fd.append("correo_institucional", editForm.correo_institucional);
    fd.append("cargo", editForm.cargo);
    fd.append("nombre_usuario", editForm.nombre_usuario);
    // firma opcional en edición
    const hasFirma = !!editFirma;
    // usar fetch con FormData via api wrapper: need to handle FormData without JSON header
    // api helper detects FormData and omits Content-Type
    if(hasFirma && editFirma) fd.append("firma", editFirma);
    api<UsuarioSolicitudItem>(`/usuarios-solicitud/${editItem.id}`,{method:"PUT", body: fd}).then((updated)=>{ setItems((prev)=>prev.map((x)=>x.id===updated.id?updated:x)); setEditOpen(false); setEditItem(null); setEditFirma(null); toast.success("Usuario actualizado"); }).catch((e)=>toast.error(e instanceof Error?e.message:"Error"));
  };
  const pagination = useTablePagination(items);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionHeader title="Usuarios de Solicitudes de Usuarios" subtitle="Gestión de usuarios para Solicitud de creación de Usuarios (nombre, correo, cargo, firma JPG/PNG)." />
        <Btn v="primary" onClick={()=>setOpen(true)}><Plus size={14}/> Crear Usuario</Btn>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10"><tr>{["Nombre completo","Nombre de Usuario","Correo Institucional","Cargo","Estado","Fecha de Creación","Acción"].map((h)=><th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Cargando...</td></tr> : pagination.rows.length===0 ? <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No hay usuarios.</td></tr> : pagination.rows.map((u)=>(
                <tr key={u.id} className="hover:bg-slate-50/70">
                  <td className="px-3 py-2.5 font-semibold text-slate-800">{u.nombre_completo}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-[#0778ac]">{u.nombre_usuario}</td>
                  <td className="px-3 py-2.5 text-slate-600 text-xs">{u.correo_institucional}</td>
                  <td className="px-3 py-2.5 text-slate-700 text-xs">{u.cargo}</td>
                  <td className="px-3 py-2.5"><span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${u.estado==="Activo"?"bg-emerald-100 text-emerald-800 border-emerald-200":"bg-slate-100 text-slate-600 border-slate-200"}`}>{u.estado}</span></td>
                  <td className="px-3 py-2.5 text-xs font-mono text-slate-500">{new Date(u.created_at).toLocaleString("es-CO")}</td>
                  <td className="px-3 py-2.5"><div className="flex flex-wrap gap-1">
                    <Btn v="secondary" sm onClick={()=>handleToggleEstado(u)}><Power size={12}/>{u.estado==="Activo"?"Inactivar":"Activar"}</Btn>
                    <Btn v="secondary" sm onClick={()=>{ setEditForm({nombre_completo:u.nombre_completo, correo_institucional:u.correo_institucional, cargo:u.cargo, nombre_usuario:u.nombre_usuario}); setEditItem(u); setEditOpen(true); }}><Pencil size={12}/>Editar</Btn>
                    <Btn v="ghost" sm onClick={()=>{ setDetailItem(u); setDetailOpen(true); }}><Eye size={12}/>Consultar</Btn>
                    <Btn v="secondary" sm onClick={()=>{ setResetItem(u); setResetOpen(true); }}><KeyRound size={12}/>Reset Pass</Btn>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TablePaginationControls pagination={pagination} itemLabel="usuarios" />
      </div>

      <Modal open={open} onClose={()=>setOpen(false)} title="Crear Usuario" size="md">
        <div className="space-y-4">
          <div><label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nombre completo del Funcionario *</label><input value={form.nombre_completo} onChange={(e)=>setForm({...form, nombre_completo:e.target.value})} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white" /></div>
          <div><label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Correo Institucional *</label><input type="email" value={form.correo_institucional} onChange={(e)=>setForm({...form, correo_institucional:e.target.value})} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white" /></div>
          <div><label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Cargo *</label><input value={form.cargo} onChange={(e)=>setForm({...form, cargo:e.target.value})} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white" /></div>
          <div><label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nombre de Usuario (opcional, auto si vacío)</label><input value={form.nombre_usuario} onChange={(e)=>setForm({...form, nombre_usuario:e.target.value})} placeholder="ej: yeison.perez" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white" /></div>
          <div><label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Contraseña * (mín 8, bcrypt)</label><input type="password" value={form.password} onChange={(e)=>setForm({...form, password:e.target.value})} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white" /></div>
          <div><label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Firma JPG/PNG *</label><input type="file" accept=".jpg,.jpeg,.png" onChange={(e)=>setFirma(e.target.files?.[0]||null)} className="w-full text-sm" />{firma && <p className="text-xs text-emerald-600 mt-1">Seleccionado: {firma.name}</p>}</div>
          <div className="flex gap-2 pt-2 border-t border-slate-100"><Btn v="primary" onClick={handleCreate} disabled={saving}>Crear</Btn><Btn v="secondary" onClick={()=>setOpen(false)}>Cancelar</Btn></div>
        </div>
      </Modal>

      <Modal open={detailOpen} onClose={()=>{setDetailOpen(false); setDetailItem(null);}} title={`Detalle: ${detailItem?.nombre_completo||""}`} size="md">
        {!detailItem ? null : (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 p-3"><p className="text-[11px] uppercase text-slate-400">Nombre completo</p><p className="font-semibold">{detailItem.nombre_completo}</p></div>
              <div className="rounded-xl border border-slate-200 p-3"><p className="text-[11px] uppercase text-slate-400">Usuario</p><p className="font-mono font-semibold text-[#0778ac]">{detailItem.nombre_usuario}</p></div>
              <div className="rounded-xl border border-slate-200 p-3"><p className="text-[11px] uppercase text-slate-400">Correo</p><p className="font-semibold">{detailItem.correo_institucional}</p></div>
              <div className="rounded-xl border border-slate-200 p-3"><p className="text-[11px] uppercase text-slate-400">Cargo</p><p className="font-semibold">{detailItem.cargo}</p></div>
              <div className="rounded-xl border border-slate-200 p-3"><p className="text-[11px] uppercase text-slate-400">Estado</p><p className="font-semibold">{detailItem.estado}</p></div>
              <div className="rounded-xl border border-slate-200 p-3"><p className="text-[11px] uppercase text-slate-400">Creado</p><p className="font-semibold">{new Date(detailItem.created_at).toLocaleString("es-CO")}</p></div>
            </div>
            {detailItem.firma_url && <div className="rounded-xl border border-slate-200 p-3"><p className="text-[11px] uppercase text-slate-400 mb-2">Firma</p><img src={detailItem.firma_url} alt="firma" className="max-h-28 border border-slate-200 rounded-lg" /></div>}
            <div className="flex justify-end pt-2 border-t border-slate-100"><Btn v="secondary" onClick={()=>{setDetailOpen(false); setDetailItem(null);}}>Cerrar</Btn></div>
          </div>
        )}
      </Modal>

      <Modal open={editOpen} onClose={()=>{setEditOpen(false); setEditItem(null); setEditFirma(null);}} title={`Editar: ${editItem?.nombre_completo||""}`} size="md">
        <div className="space-y-4">
          <div><label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nombre completo *</label><input value={editForm.nombre_completo} onChange={(e)=>setEditForm({...editForm, nombre_completo:e.target.value})} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white" /></div>
          <div><label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Correo *</label><input value={editForm.correo_institucional} onChange={(e)=>setEditForm({...editForm, correo_institucional:e.target.value})} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white" /></div>
          <div><label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Cargo *</label><input value={editForm.cargo} onChange={(e)=>setEditForm({...editForm, cargo:e.target.value})} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white" /></div>
          <div><label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nombre usuario</label><input value={editForm.nombre_usuario} onChange={(e)=>setEditForm({...editForm, nombre_usuario:e.target.value})} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white" /></div>
          <div><label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Firma nueva (opcional JPG/PNG)</label><input type="file" accept=".jpg,.jpeg,.png" onChange={(e)=>setEditFirma(e.target.files?.[0]||null)} className="w-full text-sm" /></div>
          <div className="flex gap-2 pt-2 border-t border-slate-100"><Btn v="primary" onClick={handleEdit}>Guardar</Btn><Btn v="secondary" onClick={()=>{setEditOpen(false); setEditItem(null); setEditFirma(null);}}>Cancelar</Btn></div>
        </div>
      </Modal>

      <Modal open={resetOpen} onClose={()=>{setResetOpen(false); setResetItem(null); setResetPassword("");}} title={`Restablecer Contraseña: ${resetItem?.nombre_completo||""}`} size="md">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Ingrese nueva contraseña (mín 8 caracteres, bcrypt).</p>
          <input type="password" value={resetPassword} onChange={(e)=>setResetPassword(e.target.value)} placeholder="Nueva contraseña" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white" />
          <div className="flex gap-2 pt-2 border-t border-slate-100"><Btn v="primary" onClick={handleReset}>Restablecer</Btn><Btn v="secondary" onClick={()=>{setResetOpen(false); setResetItem(null); setResetPassword("");}}>Cancelar</Btn></div>
        </div>
      </Modal>
    </div>
  );
}

export default UsuariosSolicitudSection;
