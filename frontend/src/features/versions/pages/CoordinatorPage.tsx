import { useState, useEffect } from "react";
import { api } from "@/lib/api/client";
import { sortVersionsByCompilationDateDesc } from "@/lib/versionHelpers";
import { toVersion, type ApiVersion } from "@/types/version";
import type { Observacion } from "@/types/observacion";
import { CoordinatorModule } from "@/features/versions/components/CoordinatorModule";
import { toast } from "sonner";

export function CoordinatorPage() {
  const [versions, setVersions] = useState<import("@/types/version").Version[]>([]);
  const [observaciones, setObservaciones] = useState<Observacion[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [coordinatorSection, setCoordinatorSection] = useState("registro" as any);
  const [loggedUser] = useState("sistemas");

  useEffect(() => {
    let active = true;
    Promise.all([api<ApiVersion[]>("/versions/"), api<Observacion[]>("/observaciones/")])
      .then(([apiVersions, apiObservaciones]) => {
        if (!active) return;
        setVersions(sortVersionsByCompilationDateDesc(apiVersions.map(toVersion)));
        setObservaciones(apiObservaciones);
      })
      .catch((e) => active && setError(e instanceof Error ? e.message : "Error cargando datos"))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  if (loading) return <div className="p-6 text-sm text-slate-500">Cargando información...</div>;
  if (error) return <div className="m-6 rounded-lg border border-[#d43a39]/20 bg-[#d43a39]/10 p-3 text-sm text-[#d43a39]">{error}<button onClick={()=>toast.success("Reintentando")} className="ml-2 px-2 py-1 bg-[#0778ac] text-white rounded text-xs">Reintentar</button></div>;

  return (
    <CoordinatorModule
      versions={versions}
      setVersions={setVersions}
      observaciones={observaciones}
      setObservaciones={setObservaciones}
      onError={setError}
      selectedSection={coordinatorSection}
      onSelectSection={setCoordinatorSection}
      loggedUser={loggedUser}
      onReturnHome={() => window.location.href = "/"}
    />
  );
}
