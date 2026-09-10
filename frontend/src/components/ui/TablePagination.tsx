import { Btn } from "@/components/ui/custom";
import type { TablePaginationResult } from "@/hooks/useTablePagination";
import { TABLE_PAGE_SIZE_OPTIONS } from "@/hooks/useTablePagination";

/**
 * Fase 2 — extraído desde src/app/App.tsx:101 (TablePaginationControls)
 * Componente paginación reutilizable. Sin cambios visuales.
 * Usa Btn de custom.tsx (Decisión 1: mantener custom).
 */
export function TablePaginationControls({
  pagination,
  itemLabel = "resultados",
}: {
  pagination: TablePaginationResult<unknown>;
  itemLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between bg-white">
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <span>Mostrar</span>
        <select
          value={pagination.pageSize}
          onChange={(e) => pagination.setPageSize(Number(e.target.value))}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
        >
          {TABLE_PAGE_SIZE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <span>{itemLabel}</span>
      </div>

      <div className="flex flex-col gap-2 text-sm text-slate-500 sm:items-end">
        <span>
          Mostrando {pagination.rangeStart}-{pagination.rangeEnd} de {pagination.totalItems} {itemLabel}
        </span>
        <div className="flex items-center gap-2">
          <Btn
            v="secondary"
            sm
            onClick={() => pagination.setPage((prev) => Math.max(1, prev - 1))}
            disabled={pagination.page <= 1}
          >
            Anterior
          </Btn>
          <span className="min-w-24 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
            Pagina {pagination.page} de {pagination.totalPages}
          </span>
          <Btn
            v="secondary"
            sm
            onClick={() => pagination.setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
            disabled={pagination.page >= pagination.totalPages}
          >
            Siguiente
          </Btn>
        </div>
      </div>
    </div>
  );
}
