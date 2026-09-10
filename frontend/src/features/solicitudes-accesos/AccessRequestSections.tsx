/**
 * @deprecated — Fase 4.2: Este archivo es wrapper por compatibilidad.
 * Source of truth migrado a:
 *   - ./components/RequestTable.tsx
 *   - ./components/UserCreationRequests.tsx
 *   - ./components/PasswordResetRequests.tsx
 *   - ./components/AccessPlatformsConfig.tsx
 *   - ./components/SolicitudesEmailNotificationsConfig.tsx
 *   - ./api.ts
 *   - @/types/acceso.ts (UserRequest, PasswordRequest, Platform)
 *
 * Mantener este re-export hasta Fase 6 (borrado). App.tsx:22 y otros
 * deben migrar a `import { X } from "@/features/solicitudes-accesos"`.
 */

// Re-export de componentes extraídos (Fase 4.1)
export * from "./components/RequestTable";
export * from "./components/UserCreationRequests";
export * from "./components/PasswordResetRequests";
export * from "./components/AccessPlatformsConfig";
export * from "./components/SolicitudesEmailNotificationsConfig";
export * from "./api";

// Re-export de tipos centralizados (Fase 3)
export type { UserRequest, PasswordRequest, Platform } from "@/types/acceso";
