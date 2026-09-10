/**
 * PR10 — extraído desde src/app/App.tsx:219 renderImpactoBadge
 */
export function renderImpactoBadge(impacto?: string | null) {
  const imp = (impacto || "").toLowerCase().trim();
  if (imp === "alto") {
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200 uppercase">Alto</span>;
  }
  if (imp === "medio") {
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 uppercase">Medio</span>;
  }
  if (imp === "bajo") {
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase">Bajo</span>;
  }
  return <span className="text-slate-600 text-xs">{impacto || "—"}</span>;
}
