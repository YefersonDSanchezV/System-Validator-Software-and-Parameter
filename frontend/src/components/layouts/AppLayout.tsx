import { Link, Outlet, useNavigate } from "react-router";
import { Home, Monitor } from "lucide-react";

export function AppLayout() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-[#0778ac] text-white px-6 py-3 flex items-center justify-between shadow">
        <div className="flex items-center gap-2 font-semibold">
          <Monitor size={20} /> Boletines SYAC
        </div>
        <button onClick={() => navigate("/")} className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg text-sm transition-colors">
          <Home size={16} /> Inicio
        </button>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="text-center text-xs text-slate-400 py-3 border-t">Software Validation System</footer>
    </div>
  );
}

export function CoordinatorLayout() {
  return <Outlet />;
}
