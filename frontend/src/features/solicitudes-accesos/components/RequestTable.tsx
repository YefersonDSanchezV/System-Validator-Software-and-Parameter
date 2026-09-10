import { EmptyState } from "@/components/ui/custom";

export function RequestTable({ headings, children, empty }: { headings: string[]; children: React.ReactNode; empty: boolean }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {headings.map((heading) => (
              <th key={heading} className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
      {empty && <EmptyState message="No hay solicitudes registradas." />}
    </div>
  );
}
