import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Fase 2 — utils centralizado (Decisión 1: mantener custom, decisión 4: mantener src/*)
 * Migrado desde src/app/components/ui/utils.ts:1 (shadcn helper).
 * Re-exportado también en src/components/ui/utils.ts para compatibilidad.
 * Único source of truth para `cn` (clsx + tailwind-merge).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
