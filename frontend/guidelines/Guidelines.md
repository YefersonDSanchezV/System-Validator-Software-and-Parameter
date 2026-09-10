# Guidelines — System Validator Frontend

> Actualizado: Fase 6 (2026-09-05) — Arquitectura modular post-reordenamiento

## 1. Arquitectura (Decisión 4: mantener src/*)

```
src/
  app/                 # Orquestación: router.tsx, providers.tsx, App.tsx (monolito legacy 7190→<500 gradual)
  components/
    ui/                # Design system VIVO: custom.tsx, TablePagination.tsx, utils.ts (cn)
    layouts/           # AppLayout.tsx
  lib/
    api/               # client.ts (único fetch), auth.ts (Bearer JWT)
    utils.ts           # cn (clsx+twMerge)
    print.ts
  config/              # constants.ts (API_BASE_URL, MODULOS, AREAS_RESTABLECIMIENTO, CHART_COLORS), theme.ts
  hooks/               # useTablePagination.ts, useParamEstado.ts, useFileUpload.ts
  types/               # version.ts, observacion.ts, boletin.ts, manual.ts, solicitud-parametro.ts, acceso.ts, etc. — barrel index.ts
  features/
    solicitud-parametro/  # api.ts + components/* (6) + pages/SolicitudPage.tsx
    solicitudes-accesos/  # api.ts + components/* (5) + index.ts barrel
    versions/             # api.ts + components/VersionRegistration,VersionQuery + pages/CoordinatorPage
    observaciones/        # api.ts + pages/ValidatorPage
    auth/                 # UsuariosSolicitudLogin.tsx
    boletines/, manuales/, parametros-clinicos/, home/
  assets/              # logo.png, firmas.png (ex-image/)
  styles/              # index.css -> fonts.css, tailwind.css, theme.css
```

**Reglas:**
- `features/*` solo importa de `lib/*`, `types/*`, `components/ui/*`, `config/*` — nunca de `app/*` ni otro `feature`.
- `app/router.tsx` es único punto de rutas — no crear routers en features.
- Alias `@` → `src` (vite.config.ts:29).

## 2. Design System (Decisión 1: mantener custom)

**VIVO:** `src/components/ui/custom.tsx` — `Modal`, `StatusBadge`, `Btn` (variantes primary/secondary/danger, colores `#0778ac`/`#d43a39`), `Field`, `FormInput`, `FormTextarea`, `SectionHeader`, `EmptyState`
- `TablePagination.tsx` — extraído Fase 2 desde App.tsx:101
- `lib/utils.ts` / `components/ui/utils.ts` — `cn` (clsx+twMerge)

**DEPRECATED/ELIMINADO Fase 6:** `src/app/components/ui/*` (50 archivos shadcn), `src/app/App.legacy.tsx` (3651 líneas), `src/image/`, `default_shadcn_theme.css`, `src/app/components/figma/` (si queda)

**Nuevos componentes → `src/components/ui/`**, helpers `cn` → `src/lib/utils.ts`.

## 3. API y Auth (Decisión 5: Bearer JWT)

- **Único cliente:** `src/lib/api/client.ts` — `api<T>(path, options)` con `API_BASE_URL` de `src/config/constants.ts`, inyecta `Authorization: Bearer <token>` vía `src/lib/api/auth.ts` y `X-Client-Private-IP`.
- **Nunca usar `fetch` crudo** con `VITE_API_BASE_URL || "/api/v1"` — usar `api()`.
- **Auth:** `src/lib/api/auth.ts` — `getBearerToken`, `setBearerToken`, `clearBearerAuth`, `withAuthHeaders` — `localStorage usuarios_solicitud_token` + `usuarios_solicitud_user`. `clearAuthenticatedApiUser` limpia ambos storages.
- **Proxy dev:** `vite.config.ts:35` `/api → http://localhost:8000`, `constants.ts:2` `VITE_API_BASE_URL ?? "/api/v1"`.

## 4. Types

- Source: `src/types/*` + `src/types/acceso.ts` (UserRequest, PasswordRequest, Platform) — barrel `src/types/index.ts`.
- `ConfiguracionParametrosDTO` incluye `correos_historia_clinica?`, `correos_enfermeria?`, `correos_otros?` (alineado con backend `parametros_clinicos.py:41`).
- `ApiManual` usa `fecha_registro` (no `fecha`).
- No duplicar tipos inline en `App.tsx` — importar de `@/types`.

## 5. Router (Decisión 6: /admin alias de /)

```

/                 -> App (monolito)
/admin            -> App (alias)
/solicitud-usuario/login -> UsuariosSolicitudLogin
/solicitud-usuario       -> UsuariosSolicitudPortal
/coordinator      -> AppLayout + CoordinatorPage (nuevo)
/validator        -> AppLayout + ValidatorPage (nuevo)
/solicitud-parametro -> AppLayout + SolicitudPage (nuevo)
/home             -> AppLayout + HomePage
/legacy/*         -> AppLayout + HomePage/solicitud/coordinator/validator (compatibilidad)
```

- `HomePage navigate("/solicitud")` corregido a `/solicitud-parametro` (Fase 5).
- `main.tsx` envuelto en `<Providers>` (Toaster global).

## 6. Tooling (Decisión 7: desde Fase 0)

- `tsconfig.json` + `tsconfig.node.json` — alias `@`, `strict:false` baseline, `tsc --noEmit` debe ser 0.
- `vite build` debe pasar siempre (gate).
- `eslint` baseline warn (`.eslintrc.cjs`), `prettier` (`.prettierrc`).
- Scripts: `build`, `dev`, `typecheck`, `lint`, `format`.

## 7. Convenciones de Features

```
features/<dominio>/
  api.ts          # wrappers api<T>
  components/     # UI del dominio (1 archivo por componente, <400 líneas)
  hooks/          # (opcional)
  pages/          # wrapper delgado para router
  index.ts        # barrel export *
```

- Extracciones Fase 4: `solicitudes-accesos` (6 archivos, 1322 líneas), `solicitud-parametro` (6 archivos, 1154 líneas), `versions` (2 archivos, 830 líneas) — duplicación temporal hasta deduplicación en `App.tsx`.
- Nuevas features: crear `api.ts` primero, luego `components/`.

## 8. Limpieza Fase 6

- Eliminados: `App.legacy.tsx` (3651), `src/image/`, `src/app/components/ui/` (50), `default_shadcn_theme.css`.
- Mantener: `src/app/components/figma/ImageWithFallback.tsx` solo si se usa (verificar `grep -r ImageWithFallback`).
- Deps no usados candidatos a borrar: `@mui/material`, `@emotion/*`, `react-slick`, `react-dnd`, `embla-carousel-react`, `cmdk`, `vaul`, `input-otp` — verificar `grep -r "from.*@mui"` = 0 antes de `npm uninstall`.
- `App.tsx` (7190 líneas) reducción a <500 es gradual — extraer `ValidationDetails`, `Boletines`, `Manuales` a `features/*` con re-export, no delete inmediato.

## 9. Checklist PR

- [ ] `npm run typecheck` 0 errores
- [ ] `npm run build` PASS
- [ ] `grep -r "from.*app/components" src` = 0
- [ ] `grep -r "fetch(" src` solo en `lib/api/client.ts`
- [ ] `grep -r "VITE_API_BASE_URL.*||"` = 0 (solo constants.ts canónico)
- [ ] Nuevos components <400 líneas, con barrel `index.ts`
