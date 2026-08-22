import { useNavigate } from "react-router";
import { Monitor, ShieldCheck, ClipboardList } from "lucide-react";

export function HomePage() {
  const navigate = useNavigate();
  const Card = ({ title, subtitle, icon: Icon, onClick }: any) => (
    <button onClick={onClick} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all text-left w-full">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2.5 rounded-xl bg-[#0778ac]/10 text-[#0778ac]"><Icon size={20} /></div>
        <h3 className="font-semibold text-slate-900">{title}</h3>
      </div>
      <p className="text-sm text-slate-500">{subtitle}</p>
    </button>
  );
  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Software Validation System</h1>
        <p className="text-slate-500">Seleccione el módulo para continuar</p>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        <Card title="Coordinador" subtitle="Gestión de versiones y reportes" icon={Monitor} onClick={() => navigate("/coordinator")} />
        <Card title="Validación" subtitle="Registro de observaciones" icon={ShieldCheck} onClick={() => navigate("/validator")} />
        <Card title="Solicitud Parámetro" subtitle="Solicitud clínica" icon={ClipboardList} onClick={() => navigate("/solicitud")} />
      </div>
    </div>
  );
}
