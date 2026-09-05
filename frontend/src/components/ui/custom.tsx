import { X } from "lucide-react";

export function Modal({
  open, onClose, title, children, size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  if (!open) return null;
  const w = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl", xl: "max-w-6xl" }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${w} max-h-[90vh] flex flex-col border border-slate-200`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-2xl shrink-0">
          <h2 className="font-semibold text-slate-800 text-sm">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors text-slate-500">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">{children}</div>
      </div>
    </div>
  );
}

export function StatusBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    activo: "bg-emerald-100 text-emerald-700 ring-emerald-200/60",
    inactivo: "bg-slate-100 text-slate-500 ring-slate-200",
    aprobacion: "bg-[#0778ac]/15 text-[#0778ac] ring-[#0778ac]/30",
    rechazo: "bg-[#d43a39]/15 text-[#d43a39] ring-[#d43a39]/30",
    Pendiente: "bg-amber-100 text-amber-800 ring-amber-300",
    Habilitado: "bg-emerald-100 text-emerald-800 ring-emerald-300",
    Aprobado: "bg-emerald-100 text-emerald-800 ring-emerald-300",
    Rechazado: "bg-red-100 text-red-800 ring-red-300",
    "Autorizado Solicitud Previa": "bg-indigo-100 text-indigo-800 ring-indigo-300",
    "Habilitado por extensión": "bg-indigo-100 text-indigo-800 ring-indigo-300",
  };
  const labels: Record<string, string> = {
    activo: "Activo", inactivo: "Inactivo",
    aprobacion: "Aprobación", rechazo: "Rechazo",
    Pendiente: "Pendiente",
    Habilitado: "Habilitado",
    Aprobado: "Habilitado",
    Rechazado: "Rechazado",
    "Autorizado Solicitud Previa": "Autorizado Solicitud Previa",
    "Habilitado por extensión": "Autorizado Solicitud Previa",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ${map[estado] ?? "bg-slate-100 text-slate-600 ring-slate-200"}`}>
      {labels[estado] ?? estado}
    </span>
  );
}

export type BtnVariant = "primary" | "secondary" | "success" | "danger" | "ghost" | "warning" | "info";

export function Btn({
  children, v = "primary", sm = false, onClick, disabled, type = "button", className = "",
}: {
  children: React.ReactNode;
  v?: BtnVariant;
  sm?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const styles: Record<BtnVariant, string> = {
    primary: "bg-[#0778ac] text-white hover:bg-[#056b95] border-[#0778ac]",
    secondary: "bg-white text-slate-700 hover:bg-slate-50 border-slate-300",
    success: "bg-[#0778ac] text-white hover:bg-[#056b95] border-[#0778ac]",
    danger: "bg-[#d43a39] text-white hover:bg-[#b13333] border-[#d43a39]",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 border-transparent",
    warning: "bg-[#d43a39] text-white hover:bg-[#b13333] border-[#d43a39]",
    info: "bg-[#0778ac] text-white hover:bg-[#056b95] border-[#0778ac]",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 border rounded-lg font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm ${
        sm ? "px-2.5 py-1 text-xs" : "px-4 py-2 text-sm"
      } ${styles[v]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
      <span className="text-sm text-slate-800">{value}</span>
    </div>
  );
}

export function FormInput({
  label, required: req, className = "", ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; required?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
        {label}
        {req && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        {...props}
        className={`px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0778ac] focus:border-[#0778ac] transition-all placeholder:text-slate-400 ${
          props.readOnly || props.disabled ? "bg-slate-100 text-slate-600 cursor-not-allowed border-slate-200 select-none focus:ring-0 focus:border-slate-200 shadow-none" : ""
        } ${className}`}
      />
    </div>
  );
}

export function FormTextarea({
  label, required: req, ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; required?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
        {label}
        {req && <span className="text-red-500 ml-1">*</span>}
      </label>
      <textarea
        {...props}
        className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0778ac] focus:border-[#0778ac] transition-all resize-none placeholder:text-slate-400"
      />
    </div>
  );
}

export function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
      {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <div className="text-center py-12 text-slate-400 text-sm">{message}</div>;
}
