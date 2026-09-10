# Versions components — Fase 4.4

Extraídos desde `src/app/App.tsx` — duplicación temporal intencional.

| Componente | Origen | Líneas |
|---|---|---|
| VersionRegistration | App.tsx:3085-3226 | 266 |
| VersionQuery | App.tsx:3516-4128 | 564 |

Helpers duplicados (`DEFAULT_DB_CONTAINERS`, `normalizeContainerName`, `toTimestamp`, `sortVersionsByCompilationDateDesc`, `getContainerOptions`, `ContainerAutocompleteField`) copiados a ambos archivos para no romper build. Centralizar en `src/features/versions/helpers.ts` en Fase 4.5.

Uso futuro:
```ts
import { VersionRegistration } from "@/features/versions";
import { VersionQuery } from "@/features/versions/components/VersionQuery";
```
App.tsx mantiene inline original hasta Fase 5 deduplicación.
