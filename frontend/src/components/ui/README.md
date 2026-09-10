# Design System — Fase 2 (Decisión 1: mantener custom)

**Fuente única:** `src/components/ui/custom.tsx` (152 líneas) — **NO usar `src/app/components/ui/*`**

## Componentes vivos (usados en 100% del código)

| Componente | Archivo | Uso |
|---|---|---|
| `Modal` | `custom.tsx:3` | Dialogs en `App.tsx` y `features/*` |
| `StatusBadge` | `custom.tsx:30` | Estados `activo/inactivo/Pendiente/Habilitado/Rechazado` |
| `Btn` | `custom.tsx:62` | Variantes `primary/secondary/danger/ghost` — hardcode `#0778ac`, `#d43a39` |
| `Field` | `custom.tsx:96` | Label + value |
| `FormInput` | `custom.tsx:105` | Input con label |
| `FormTextarea` | `custom.tsx:124` | Textarea con label |
| `SectionHeader` | `custom.tsx:141` | Título + subtítulo |
| `EmptyState` | `custom.tsx:150` | Mensaje vacío |
| `TablePaginationControls` | `TablePagination.tsx:1` | Extraído Fase 2 desde `App.tsx:101` |
| `cn` | `lib/utils.ts:1` / `components/ui/utils.ts:1` | `clsx + tailwind-merge` (ex-`app/components/ui/utils.ts`) |
| `useTablePagination` | `hooks/useTablePagination.ts:1` | Hook paginación 10/20/30 (ex-`App.tsx:72`) |

## Componentes deprecated (NO usar)

- `src/app/components/ui/*` — 50 archivos shadcn (~4.500 líneas), 0 imports, ver `src/app/components/ui/DEPRECATED.md`
- Se eliminan en Fase 6 junto con `src/app/App.legacy.tsx`

## Reglas

1. Nuevos componentes UI → `src/components/ui/`
2. Helpers `cn` → `src/lib/utils.ts` (re-export en `components/ui/utils.ts`)
3. Paginación → `useTablePagination` + `TablePaginationControls`
4. Colores: `primary #0778ac`, `danger #d43a39` (ver `src/config/theme.ts` y `src/styles/theme.css`)
5. No importar de `src/app/components/ui/*`

## Verificación

```bash
grep -r "from.*app/components" src  # debe dar 0 (salvo DEPRECATED.md)
```
