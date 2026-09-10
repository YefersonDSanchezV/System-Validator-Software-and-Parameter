import { useState } from "react";
import { FileText, BookOpen } from "lucide-react";
import { Boletines } from "@/features/boletines/components/Boletines";
import { ManualesUsuarios } from "@/features/manuales/components/Manuales";

export function DocumentModule({ onError }: { onError: (message: string) => void }) {
  const [tab, setTab] = useState<"boletines" | "manuales">("boletines");

  return (
    <div className="flex flex-col h-full">
      <nav className="bg-slate-950 text-white px-4 flex items-center gap-0.5 h-11 shrink-0">
        <span className="text-[10px] font-bold tracking-widest uppercase text-slate-300/80 mr-4 shrink-0">
          DOCUMENTOS
        </span>
        <button
          onClick={() => setTab("boletines")}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium transition-all border-b-2 whitespace-nowrap ${
            tab === "boletines"
              ? "border-slate-300 text-white bg-white/5"
              : "border-transparent text-slate-300 hover:text-white hover:border-slate-400/50"
          }`}
        >
          <FileText size={14} /> Boletines
        </button>
        <button
          onClick={() => setTab("manuales")}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium transition-all border-b-2 whitespace-nowrap ${
            tab === "manuales"
              ? "border-slate-300 text-white bg-white/5"
              : "border-transparent text-slate-300 hover:text-white hover:border-slate-400/50"
          }`}
        >
          <BookOpen size={14} /> Manuales de Usuarios
        </button>
      </nav>

      <div className="flex-1 overflow-auto bg-slate-50 p-6">
        {tab === "boletines" && <Boletines />}
        {tab === "manuales" && <ManualesUsuarios />}
      </div>
    </div>
  );
}
