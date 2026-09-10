import { useState } from "react";
import type React from "react";
import { ClipboardList, FileText, BookOpen, Database } from "lucide-react";
import { Boletines } from "@/features/boletines/components/Boletines";
import { ManualesUsuarios } from "@/features/manuales/components/Manuales";
import { ConsultarRestauracionDBSection } from "@/features/versions/components/ConsultarRestauracionDBSection";
import { ValidationRegistration } from "./ValidationRegistration";
import type { Version } from "@/types/version";
import type { Observacion } from "@/types/observacion";

type ValidatorTab = "registro" | "boletines" | "manuales" | "restauraciones";

export function ValidatorModule({
  versions, observaciones, setObservaciones, onError,
}: {
  versions: Version[];
  observaciones: Observacion[];
  setObservaciones: React.Dispatch<React.SetStateAction<Observacion[]>>;
  onError: (message: string) => void;
}) {
  const [tab, setTab] = useState<ValidatorTab>("registro");

  const navItems: { key: ValidatorTab; label: string; icon: React.ReactNode }[] = [
    { key: "registro", label: "Registro de Validación", icon: <ClipboardList size={14} /> },
    { key: "boletines", label: "Boletines técnicos", icon: <FileText size={14} /> },
    { key: "manuales", label: "Manuales de Usuarios", icon: <BookOpen size={14} /> },
    { key: "restauraciones", label: "Consulta de Restauración de Base de Datos", icon: <Database size={14} /> },
  ];

  return (
    <div className="flex flex-col h-full">
      <nav className="bg-[#0778ac] text-white px-4 flex items-center gap-1 h-13 shrink-0">
        <span className="text-xs font-bold tracking-widest uppercase text-white/90 mr-4 shrink-0">
          VALIDADOR
        </span>
        {navItems.map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            className={`flex items-center gap-1.5 px-3.5 py-3 text-sm font-semibold transition-all border-b-2 whitespace-nowrap ${
              tab === item.key
                ? "border-white text-white bg-white/10"
                : "border-transparent text-white/85 hover:text-white hover:border-white/60"
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
      <div className="flex-1 overflow-auto bg-slate-50 p-6">
        {tab === "registro" && (
          <ValidationRegistration
            versions={versions}
            observaciones={observaciones}
            setObservaciones={setObservaciones}
            onError={onError}
          />
        )}
        {tab === "boletines" && <Boletines canUpload={false} />}
        {tab === "manuales" && <ManualesUsuarios canUpload={false} />}
        {tab === "restauraciones" && <ConsultarRestauracionDBSection versions={versions} onError={onError} canDelete={false} />}
      </div>
    </div>
  );
}
