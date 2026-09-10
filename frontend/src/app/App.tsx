import { useState, useRef, useEffect } from "react";
import {
  Monitor, ShieldCheck, X, Eye, Pencil, Power, CheckCircle,
  XCircle, Download, Plus, ExternalLink, FileText, BookOpen,
  BarChart3, ArrowLeft, Upload, Printer, AlertCircle,
  ChevronDown, ChevronRight, ChevronLeft, Settings, Home, ClipboardList,
  Link, RotateCcw, Mail, UserPlus, KeyRound, Trash2, Folder, Search, Menu,
  Lock, Save,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "sonner";
import { MODULOS, MODULO_LABELS, MODULOS_VALIDATOR } from "@/config/constants";
import { api, clearAuthenticatedApiUser, downloadApiFile, setAuthenticatedApiUser } from "@/lib/api/client";
import { getBearerToken, setBearerToken } from "@/lib/api/auth";
import { openPrintPreviewWindow } from "@/lib/print";
import { Modal, StatusBadge, Btn, Field, FormInput, FormTextarea, SectionHeader, EmptyState, type BtnVariant } from "@/components/ui/custom";
import { type EstadoVersion, type Version, type ApiVersion, type RestauracionDB, toVersion } from "@/types/version";
import { type EstadoObs, type Observacion } from "@/types/observacion";
import { type ApiBoletin, type ApiBoletinPeriodo, type ApiBoletinImportResult } from "@/types/boletin";
import { type ApiManual, type SolicitudManual } from "@/types/manual";
import { type ApiSolicitudParametro, type SolicitudParametro, type EstadoSolicitud, type ConfiguracionParametrosDTO, toSolicitudParametro } from "@/types/solicitud-parametro";
import { type ParametrosEstado } from "@/types/parametros";
import { AccessPlatformsConfig, PasswordResetRequests, SolicitudesEmailNotificationsConfig, UserCreationRequests } from "@/features/solicitudes-accesos";
import { useTablePagination, type TablePaginationResult } from "@/hooks/useTablePagination";
import { TablePaginationControls } from "@/components/ui/TablePagination";
import { ParametroBadge } from "@/features/solicitud-parametro/components/ParametroBadge";
import { HabilitarParametroModal } from "@/features/solicitud-parametro/components/HabilitarParametroModal";
import { HabilitarSolicitudModal } from "@/features/solicitud-parametro/components/HabilitarSolicitudModal";
import { RechazarSolicitudModal } from "@/features/solicitud-parametro/components/RechazarSolicitudModal";
import { AutorizadoPreviaSolicitudModal } from "@/features/solicitud-parametro/components/AutorizadoPreviaSolicitudModal";
import { SolicitudParametroSection } from "@/features/solicitud-parametro/components/SolicitudParametroSection";
import { ValidationDetails } from "@/features/observaciones/components/ValidationDetails";
import { Boletines } from "@/features/boletines/components/Boletines";
import { ManualesUsuarios } from "@/features/manuales/components/Manuales";
import { VersionRegistration } from "@/features/versions/components/VersionRegistration";
import { VersionQuery } from "@/features/versions/components/VersionQuery";
import { RestaurarDBSection } from "@/features/versions/components/RestaurarDBSection";
import { ConsultarRestauracionDBSection } from "@/features/versions/components/ConsultarRestauracionDBSection";
import { ReportFirmas } from "@/features/reports/components/ReportFirmas";
import { ReportDetalles } from "@/features/reports/components/ReportDetalles";
import { AuditoriaSection } from "@/features/auditoria/components/AuditoriaSection";
import { PermisosSection } from "@/features/permisos/components/PermisosSection";
import { ParametrosConfigSection } from "@/features/parametros/components/ParametrosConfigSection";
import { ValoresParametrosSection } from "@/features/parametros/components/ValoresParametrosSection";
import { ParametrosSolicitudesSection } from "@/features/parametros/components/ParametrosSolicitudesSection";
import { UsuariosSolicitudSection } from "@/features/usuarios/components/UsuariosSolicitudSection";
import { UsuariosPermisosSection } from "@/features/usuarios/components/UsuariosPermisosSection";
import { CoordinatorModule } from "@/features/versions/components/CoordinatorModule";
import { VersionCorreoParametrosSection } from "@/features/versions/components/VersionCorreoParametrosSection";
import { ParametrosCorreosUnifiedSection } from "@/features/versions/components/ParametrosCorreosUnifiedSection";
import { ValidatorModule } from "@/features/observaciones/components/ValidatorModule";
import { DocumentModule } from "@/features/observaciones/components/DocumentModule";
import { ValidationRegistration } from "@/features/observaciones/components/ValidationRegistration";

import { DEFAULT_DB_CONTAINERS, normalizeContainerName, toTimestamp, sortVersionsByCompilationDateDesc, getContainerOptions } from "@/lib/versionHelpers";
import { ContainerAutocompleteField } from "@/components/ui/ContainerAutocompleteField";
import { renderImpactoBadge } from "@/features/boletines/components/ImpactoBadge";
import { ManualRow } from "@/features/manuales/components/ManualRow";
import { SolicitudesManualesSection } from "@/features/manuales/components/SolicitudesManualesSection";
import { ModuleSelector } from "@/features/home/components/ModuleSelector";

// ─── Auditoria Section ────────────────────────────────────────────────────────

interface AuditLogItem {
  oid: number;
  fecha_hora: string;
  tipo_accion: string;
  ip_equipo: string;
  nombre_equipo?: string | null;
  usuario_windows_equipo?: string | null;
  modulo: string;
  submodulo: "LOGS_SISTEMAS" | "LOGS_DESCARGAS" | "LOGS_ACCESOS";
  usuario: string;
  detalle?: string | null;
  payload_json?: Record<string, unknown> | null;
}

type AuditSubmodulo = "LOGS_SISTEMAS" | "LOGS_DESCARGAS" | "LOGS_ACCESOS";

// ─── Permisos Section ─────────────────────────────────────────────────────────

const ALL_SECTION_LABELS: Record<string, string> = {
  registro: "Registro de Versión",
  restaurarDB: "Restaurar DB",
  consultaVersiones: "Consultar versión",
  consultaRestauracionDB: "Consultar restauración BD",
  versionParametros: "Parámetros (legacy)",
  detalles: "Detalles de Validación",
  solicitudParametro: "Habilitación de Parámetro",
  solicitudUsuario: "Creación de Usuario",
  solicitudPassword: "Restablecimiento de contraseña",
  parametrosConfig: "Parámetros Solicitudes (legacy)",
  solicitudesManuales: "Solicitudes de manuales",
  reporteFirmas: "Reportes Generados",
  reporteDetalles: "Indicadores Generados",
  documentos_boletines: "Boletines Técnicos",
  documentos_manuales: "Manuales de Usuarios",
  auditoria: "Auditoría",
  permisos: "Permisos (legacy)",
  // Nuevos módulos
  parametrosCorreos: "Parámetros de Correos",
  valoresParametros: "Valores Parámetros",
  modulosInicio: "Módulos de Inicio",
  generalesPermisos: "Generales - Permisos",
  generalesPlataformas: "Generales - Plataformas",
  generalesUsuarios: "Generales - Usuarios",
  generalesUsuariosPermisos: "Generales - Usuarios Permisos",
};

const ALL_SECTION_KEYS = Object.keys(ALL_SECTION_LABELS);

type PermisoUser = {
  usuario: string;
  permisos: string[];
};

// ─── Coordinator Module ───────────────────────────────────────────────────────

type CoordTab =
  | "registro"
  | "restaurarDB"
  | "consultaVersiones"
  | "consultaRestauracionDB"
  | "versionParametros"
  | "detalles"
  | "documentos"
  | "solicitudParametro"
  | "solicitudUsuario"
  | "solicitudPassword"
  | "parametrosConfig"
  | "reporteFirmas"
  | "reporteDetalles"
  | "solicitudesManuales"
  | "auditoria"
  | "permisos"
  | "parametrosCorreos"
  | "parametrosEnviosCorreo"
  | "parametrosSolicitudes"
  | "parametrosCorreosNotificaciones"
  | "valoresParametros"
  | "modulosInicio"
  | "generalesPermisos"
  | "generalesPlataformas"
  | "generalesUsuarios"
  | "generalesUsuariosPermisos";


type ValidatorTab = "registro" | "boletines" | "manuales";

// ─── App Root ─────────────────────────────────────────────────────────────────

export default function App() {
  const [module, setModule] = useState<"home" | "coordinator" | "validator" | "solicitud" | "creacionUsuario" | "restablecimientoPassword">("home");
  const [coordinatorLoggedIn, setCoordinatorLoggedIn] = useState(false);
  const [loggedUser, setLoggedUser] = useState("");
  const [coordinatorLogin, setCoordinatorLogin] = useState({ usuario: "", password: "" });
  const [coordinatorLoginError, setCoordinatorLoginError] = useState("");
  const [coordinatorSection, setCoordinatorSection] = useState<CoordTab>("registro");
  const [solicitudesPublicas, setSolicitudesPublicas] = useState<SolicitudParametro[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [observaciones, setObservaciones] = useState<Observacion[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Estado de autenticación para Solicitudes de Creación de Usuario — Fase 1: Bearer unificado
  const [solicitudUserLoggedIn, setSolicitudUserLoggedIn] = useState(() => !!getBearerToken());
  const [solicitudUserLogin, setSolicitudUserLogin] = useState({ usuario: "", password: "" });
  const [solicitudUserLoginError, setSolicitudUserLoginError] = useState("");
  const [solicitudUserLogging, setSolicitudUserLogging] = useState(false);

  function returnToHome() {
    clearAuthenticatedApiUser();
    setCoordinatorLoggedIn(false);
    setLoggedUser("");
    setCoordinatorLogin({ usuario: "", password: "" });
    setCoordinatorLoginError("");
    // Limpiar sesión de solicitudes de usuario — Fase 1: usa auth centralizado
    try { localStorage.removeItem("usuarios_solicitud_token"); localStorage.removeItem("usuarios_solicitud_user"); } catch { /* no-op */ }
    setSolicitudUserLoggedIn(false);
    setSolicitudUserLogin({ usuario: "", password: "" });
    setSolicitudUserLoginError("");
    setModule("home");
  }

  useEffect(() => {
    let active = true;
    Promise.all([api<ApiVersion[]>("/versions/"), api<Observacion[]>("/observaciones/")])
      .then(([apiVersions, apiObservaciones]) => {
        if (!active) return;
        setVersions(sortVersionsByCompilationDateDesc(apiVersions.map(toVersion)));
        setObservaciones(apiObservaciones);
      })
      .catch((requestError) => active && setError(requestError instanceof Error ? requestError.message : "No fue posible conectar con el servidor."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  if (module === "home") {
    return <><Toaster /><ModuleSelector onSelect={setModule} /></>;
  }

  if (module === "solicitud") {
    return (
      <><Toaster /><div className="h-screen flex flex-col overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="bg-[#0778ac] text-white px-5 h-11 flex items-center justify-between shrink-0 border-b border-[#0778ac]/40">
          <div className="flex items-center gap-2.5">
            <Monitor size={16} className="text-white" />
            <span className="text-sm font-bold text-white">Validación y Solicitudes</span>
            <span className="text-white/60 text-sm">/</span>
            <span className="text-sm text-white/85">Solicitud Parámetro</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.open("https://syac.net.co/boletines/", "_blank")}
              className="rounded-full bg-white/15 text-white px-3 py-1.5 text-xs font-semibold hover:bg-white/20 transition-colors"
            >
              Boletines SYAC
            </button>
            <button
              onClick={returnToHome}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all shadow-sm"
            >
              <Home size={13} /> Regresar al Inicio
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-[#f8f9fa] p-6">
          {error && <div className="mb-6 rounded-lg border border-[#d43a39]/20 bg-[#d43a39]/10 p-3 text-sm text-[#d43a39]">{error}</div>}
          <SolicitudParametroSection
            solicitudes={solicitudesPublicas}
            setSolicitudes={setSolicitudesPublicas}
            onError={setError}
            canApprove={false}
          />
        </div>
      </div></>
    );
  }

  if (module === "restablecimientoPassword") {
    return (
      <><Toaster /><div className="h-screen flex flex-col overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="bg-[#0778ac] text-white px-5 h-11 flex items-center justify-between shrink-0 border-b border-[#0778ac]/40">
          <div className="flex items-center gap-2.5"><Monitor size={16} /><span className="text-sm font-bold">Validación y Solicitudes</span><span className="text-white/60">/</span><span className="text-sm text-white/85">Solicitudes de Restablecimiento de Contraseña</span></div>
          <button
            onClick={returnToHome}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all shadow-sm"
          >
            <Home size={13} /> Regresar al Inicio
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-[#f8f9fa] p-6">
          {error && <div className="mb-6 rounded-lg border border-[#d43a39]/20 bg-[#d43a39]/10 p-3 text-sm text-[#d43a39]">{error}</div>}
          <PasswordResetRequests onError={setError} />
        </div>
      </div></>
    );
  }

  if (module === "creacionUsuario") {
    // ── Pantalla de inicio de sesión ───────────────────────────────────────
    if (!solicitudUserLoggedIn) {
      const handleSolicitudLogin = async () => {
        const user = solicitudUserLogin.usuario.trim();
        const pass = solicitudUserLogin.password;
        if (!user || !pass) {
          setSolicitudUserLoginError("Ingrese usuario y contraseña.");
          return;
        }
        setSolicitudUserLogging(true);
        setSolicitudUserLoginError("");
        try {
          const data = await api<{ access_token: string; token?: string }>("/auth/usuarios-solicitud/login", {
            method: "POST",
            body: JSON.stringify({ identificador: user, nombre_usuario: user, password: pass }),
          });
          const token: string = data.access_token || data.token || "";
          if (!token) {
            setSolicitudUserLoginError("No se recibió token de sesión.");
            return;
          }
          setBearerToken(token);
          setSolicitudUserLoggedIn(true);
          setSolicitudUserLogin({ usuario: "", password: "" });
        } catch (e) {
          setSolicitudUserLoginError(e instanceof Error ? e.message : "Usuario o contraseña incorrectos.");
        } finally {
          setSolicitudUserLogging(false);
        }
      };

      return (
        <><Toaster /><div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-8 text-slate-900">
          <div className="w-full max-w-md rounded-3xl border border-[#0778ac]/20 bg-white p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-[#0778ac]/10 border border-[#0778ac]/20 rounded-2xl flex items-center justify-center">
                <UserPlus size={20} className="text-[#0778ac]" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-[#0778ac]">Solicitudes de Creación de Usuario</h1>
                <p className="text-xs text-slate-400 font-medium">Inicio de sesión requerido</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-6 mt-3">
              Ingrese con su usuario y contraseña para acceder al módulo de solicitudes.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Usuario</label>
                <input
                  value={solicitudUserLogin.usuario}
                  onChange={(e) => setSolicitudUserLogin((f) => ({ ...f, usuario: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && handleSolicitudLogin()}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0778ac]/40"
                  autoComplete="username"
                  placeholder="ej: juan.perez"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Contraseña</label>
                <input
                  type="password"
                  value={solicitudUserLogin.password}
                  onChange={(e) => setSolicitudUserLogin((f) => ({ ...f, password: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && handleSolicitudLogin()}
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0778ac]/40"
                  autoComplete="current-password"
                />
              </div>
              {solicitudUserLoginError && (
                <div className="rounded-2xl bg-[#d43a39]/10 border border-[#d43a39]/20 px-4 py-3 text-sm text-[#d43a39]/80">
                  {solicitudUserLoginError}
                </div>
              )}
              <div className="flex justify-between items-center gap-3 pt-2">
                <button
                  onClick={() => setModule("home")}
                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Volver
                </button>
                <button
                  onClick={handleSolicitudLogin}
                  disabled={solicitudUserLogging}
                  className="rounded-2xl bg-[#0778ac] px-5 py-3 text-sm font-semibold text-white hover:bg-[#056b95] disabled:opacity-60 transition-colors"
                >
                  {solicitudUserLogging ? "Ingresando..." : "Iniciar sesión"}
                </button>
              </div>
            </div>
          </div>
        </div></>
      );
    }

    // ── Módulo (ya autenticado) ────────────────────────────────────────────
    return (
      <><Toaster /><div className="h-screen flex flex-col overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="bg-[#0778ac] text-white px-5 h-11 flex items-center justify-between shrink-0 border-b border-[#0778ac]/40">
          <div className="flex items-center gap-2.5"><Monitor size={16} /><span className="text-sm font-bold">Validación y Solicitudes</span><span className="text-white/60">/</span><span className="text-sm text-white/85">Solicitudes de Creación de Usuario</span></div>
          <button
            onClick={returnToHome}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all shadow-sm"
          >
            <Home size={13} /> Regresar al Inicio
          </button>
        </div>
        <div className="flex-1 overflow-auto bg-[#f8f9fa] p-6">
          {error && <div className="mb-6 rounded-lg border border-[#d43a39]/20 bg-[#d43a39]/10 p-3 text-sm text-[#d43a39]">{error}</div>}
          <UserCreationRequests onError={setError} />
        </div>
      </div></>
    );
  }

  if (module === "coordinator" && !coordinatorLoggedIn) {
    return (
      <><Toaster /><div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-8 text-slate-900">
        <div className="w-full max-w-md rounded-3xl border border-[#0778ac]/20 bg-white p-8 shadow-xl">
          <h1 className="text-2xl font-semibold mb-3 text-[#0778ac]">Acceso Coordinador</h1>
          <p className="text-sm text-slate-600 mb-6">
            Ingrese con el usuario y contraseña de coordinador para acceder al módulo de Coordinador de Sistemas.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Usuario</label>
              <input
                value={coordinatorLogin.usuario}
                onChange={(e) => setCoordinatorLogin((f) => ({ ...f, usuario: e.target.value }))}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Contraseña</label>
              <input
                type="password"
                value={coordinatorLogin.password}
                onChange={(e) => setCoordinatorLogin((f) => ({ ...f, password: e.target.value }))}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
                autoComplete="current-password"
              />
            </div>
            {coordinatorLoginError && (
              <div className="rounded-2xl bg-[#d43a39]/10 border border-[#d43a39]/20 px-4 py-3 text-sm text-[#d43a39]/80">
                {coordinatorLoginError}
              </div>
            )}
            <div className="flex justify-between items-center gap-3 pt-2">
              <button
                onClick={() => setModule("home")}
                className="rounded-2xl border border-slate-700 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800"
              >
                Volver
              </button>
              <button
                onClick={() => {
                  const user = coordinatorLogin.usuario.trim().toLowerCase();
                  const pass = coordinatorLogin.password;
                  let isValid = false;
                  
                  if (user === "sistemas" && pass === "159357**Cesar**") isValid = true;
                  else if (user === "practicante" && pass === "Icvc2024") isValid = true;
                  else if (user === "ingeniero" && pass === "159357**Cesar**") isValid = true;

                  if (!isValid) {
                    setCoordinatorLoginError("Usuario o contraseña incorrectos.");
                    return;
                  }
                  setCoordinatorLoginError("");
                  setAuthenticatedApiUser(user);
                  setLoggedUser(user);
                  setCoordinatorLoggedIn(true);
                  if (user === "practicante") {
                    setCoordinatorSection("solicitudParametro");
                  }
                }}
                className="rounded-2xl bg-[#0778ac] px-5 py-3 text-sm font-semibold text-white hover:bg-[#056b95]"
              >
                Iniciar sesión
              </button>
            </div>
          </div>
        </div>
      </div></>
    );
  }

  const isCoord = module === "coordinator";
  const isValidator = module === "validator";

  return (
    <><Toaster /><div className="h-screen flex flex-col overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Global top bar - No se renderiza en el módulo del coordinador */}
      {!isCoord && (
        <div className="bg-[#0778ac] text-white px-5 h-11 flex items-center justify-between shrink-0 border-b border-[#0778ac]/40">
          <div className="flex items-center gap-2.5">
            <Monitor size={16} className="text-white" />
            <span className="text-sm font-bold text-white">Validación y Solicitudes</span>
            <span className="text-white/60 text-sm">/</span>
            <span className="text-sm text-white/85">Módulo de Validación</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.open("https://syac.net.co/boletines/", "_blank")}
              className="rounded-full bg-white/15 text-white px-3 py-1.5 text-xs font-semibold hover:bg-white/20 transition-colors"
            >
              Boletines SYAC
            </button>
            <button
              onClick={returnToHome}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all shadow-sm"
            >
              <Home size={13} /> Regresar al Inicio
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {loading && <div className="p-6 text-sm text-slate-500">Cargando información...</div>}
        {error && <div className="m-6 rounded-lg border border-[#d43a39]/20 bg-[#d43a39]/10 p-3 text-sm text-[#d43a39]">{error}</div>}
        {!loading && !error && (isCoord ? (
          <CoordinatorModule
            versions={versions}
            setVersions={setVersions}
            observaciones={observaciones}
            setObservaciones={setObservaciones}
            onError={setError}
            selectedSection={coordinatorSection}
            onSelectSection={setCoordinatorSection}
            loggedUser={loggedUser}
            onReturnHome={returnToHome}
          />
        ) : (
          <ValidatorModule
            versions={versions}
            observaciones={observaciones}
            setObservaciones={setObservaciones}
            onError={setError}
          />
        ))}
      </div>
    </div></>
  );
}
