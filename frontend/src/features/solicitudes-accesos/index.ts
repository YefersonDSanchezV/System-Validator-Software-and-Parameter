/**
 * Fase 4.1 — Barrel para solicitudes-accesos (Decisión 4: mantener src/features)
 * Permite `import { X } from "@/features/solicitudes-accesos"` con componentes ya extraídos.
 * Nota: `AccessRequestSections.tsx` se mantiene por compatibilidad con `App.tsx:22`
 * y se convertirá en re-export en el siguiente paso (para no duplicar símbolos).
 */
export * from "./api";
export * from "./components/RequestTable";
export * from "./components/UserCreationRequests";
export * from "./components/PasswordResetRequests";
export * from "./components/AccessPlatformsConfig";
export * from "./components/SolicitudesEmailNotificationsConfig";
