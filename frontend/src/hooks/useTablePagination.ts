import { useState, useEffect } from "react";

const PAGE_SIZE_OPTIONS = [10, 20, 30] as const;

export type TablePaginationResult<T> = {
  rows: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  rangeStart: number;
  rangeEnd: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  setPageSize: (size: number) => void;
};

/**
 * Fase 2 — extraído desde src/app/App.tsx:72 (useTablePagination)
 * Hook reutilizable para paginación de tablas (10/20/30).
 * Mantiene API idéntica para no romper App.tsx (re-export).
 */
export function useTablePagination<T>(rows: T[]): TablePaginationResult<T> {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState<number>(PAGE_SIZE_OPTIONS[0]);
  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const rangeStart = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = totalItems === 0 ? 0 : Math.min(totalItems, page * pageSize);

  return {
    rows: rows.slice((page - 1) * pageSize, page * pageSize),
    page,
    pageSize,
    totalItems,
    totalPages,
    rangeStart,
    rangeEnd,
    setPage,
    setPageSize: (size: number) => {
      setPageSizeState(size);
      setPage(1);
    },
  };
}

export const TABLE_PAGE_SIZE_OPTIONS = PAGE_SIZE_OPTIONS;
