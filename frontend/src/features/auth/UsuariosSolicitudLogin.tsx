import { useState } from "react";
import { api } from "@/lib/api/client";
import { Btn, SectionHeader } from "@/components/ui/custom";
import { toast } from "sonner";

export function UsuariosSolicitudLogin({ onLogin }: { onLogin?: () => void }) {
  const [identificador, setIdentificador] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    if (!identificador.trim() || !password.trim()) {
      toast.error("Ingrese usuario/correo y contraseña");
      return;
    }
    setLoading(true);
    api<{ access_token: string; usuario: any }>("/auth/usuarios-solicitud/login", {
      method: "POST",
      body: JSON.stringify({ identificador: identificador.trim(), password }),
    })
      .then((res) => {
        localStorage.setItem("usuarios_solicitud_token", res.access_token);
        localStorage.setItem("usuarios_solicitud_user", JSON.stringify(res.usuario));
        toast.success(`Bienvenido ${res.usuario.nombre_completo}`);
        if (onLogin) onLogin();
        else window.location.href = "/solicitud-usuario";
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Error de login"))
      .finally(() => setLoading(false));
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-lg p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-[#0778ac] flex items-center justify-center text-white font-bold text-lg">U</div>
          <h1 className="text-xl font-bold text-slate-900">Solicitudes de Creación de Usuario</h1>
          <p className="text-sm text-slate-500">Ingrese con el usuario creado en Generales &gt; Usuarios</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Usuario o Correo Institucional</label>
            <input value={identificador} onChange={(e) => setIdentificador(e.target.value)} placeholder="correo@empresa.com o nombre.usuario" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0778ac]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Contraseña</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0778ac]" />
          </div>
          <Btn v="primary" onClick={handleLogin} disabled={loading} className="w-full justify-center py-2.5">
            {loading ? "Ingresando..." : "Ingresar"}
          </Btn>
        </div>
        <p className="text-center text-xs text-slate-400">¿Es administrador? <a href="/" className="text-[#0778ac] hover:underline">Ir a Administrador de Sistemas</a></p>
      </div>
    </div>
  );
}

export function UsuariosSolicitudPortal() {
  const token = typeof window !== "undefined" ? localStorage.getItem("usuarios_solicitud_token") : null;
  if (!token) return <UsuariosSolicitudLogin />;
  return <UsuariosSolicitudApp />;
}

function UsuariosSolicitudApp() {
  const user = (() => {
    try { return JSON.parse(localStorage.getItem("usuarios_solicitud_user") || "{}"); } catch { return {}; }
  })();
  const handleLogout = () => {
    localStorage.removeItem("usuarios_solicitud_token");
    localStorage.removeItem("usuarios_solicitud_user");
    window.location.href = "/solicitud-usuario/login";
  };
  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <header className="bg-[#0778ac] text-white px-6 py-3 flex items-center justify-between">
        <div>
          <p className="font-bold text-sm">Portal Solicitudes de Creación</p>
          <p className="text-xs opacity-80">{user.nombre_completo || user.nombre_usuario} — {user.correo_institucional}</p>
        </div>
        <button onClick={handleLogout} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold">Cerrar sesión</button>
      </header>
      <main className="p-6 max-w-6xl mx-auto">
        {/* Reuse creation component with permission filtering */}
        <div className="space-y-4">
          <SectionHeader title="Crear Solicitud de Usuario" subtitle="Solo plataformas permitidas según tus permisos." />
          {/* Lazy import to avoid circular deps */}
          <LazyCreation />
        </div>
      </main>
    </div>
  );
}

import { UserCreationRequests } from "@/features/solicitudes-accesos/AccessRequestSections";
function LazyCreation(){
  const onError = (msg:string)=> toast.error(msg);
  return <UserCreationRequests onError={onError} />
}
