import { useState, useEffect } from "react";
import {
  Monitor, ShieldCheck, X, Eye, Pencil, Power, CheckCircle,
  XCircle, Download, Plus, ExternalLink, FileText, BookOpen,
  BarChart3, ArrowLeft, Upload, Printer, AlertCircle,
  ChevronDown, ChevronRight, ChevronLeft, Settings, Home, ClipboardList,
  Link, RotateCcw, Mail, UserPlus, KeyRound, Trash2, Folder, Search, Menu,
  Lock, Save,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { Modal, StatusBadge, Btn, Field, FormInput, FormTextarea, SectionHeader, EmptyState, type BtnVariant } from "@/components/ui/custom";
import { type Version } from "@/types/version";
import { type Observacion } from "@/types/observacion";
import { type SolicitudParametro } from "@/types/solicitud-parametro";
import { type ConfiguracionParametrosDTO } from "@/types/solicitud-parametro";
import { type ParametrosEstado } from "@/types/parametros";
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
import { AccessPlatformsConfig, PasswordResetRequests, SolicitudesEmailNotificationsConfig, UserCreationRequests } from "@/features/solicitudes-accesos";
import { VersionCorreoParametrosSection } from "@/features/versions/components/VersionCorreoParametrosSection";
import { ParametrosCorreosUnifiedSection } from "@/features/versions/components/ParametrosCorreosUnifiedSection";

type AuditSubmodulo = "LOGS_SISTEMAS" | "LOGS_DESCARGAS" | "LOGS_ACCESOS";

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
  parametrosCorreos: "Parámetros de Correos",
  valoresParametros: "Valores Parámetros",
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
  | "generalesPermisos"
  | "generalesPlataformas"
  | "generalesUsuarios"
  | "generalesUsuariosPermisos";

import { ParametrosConfigSection } from "@/features/parametros/components/ParametrosConfigSection";
import { ValoresParametrosSection } from "@/features/parametros/components/ValoresParametrosSection";
import { ParametrosSolicitudesSection } from "@/features/parametros/components/ParametrosSolicitudesSection";
import { UsuariosSolicitudSection } from "@/features/usuarios/components/UsuariosSolicitudSection";
import { UsuariosPermisosSection } from "@/features/usuarios/components/UsuariosPermisosSection";
import { SolicitudesManualesSection } from "@/features/manuales/components/SolicitudesManualesSection";

function CoordinatorModule({
  versions, setVersions, observaciones, setObservaciones, onError,
  selectedSection,
  onSelectSection,
  loggedUser,
  onReturnHome,
}: {
  loggedUser: string;
  versions: Version[];
  setVersions: React.Dispatch<React.SetStateAction<Version[]>>;
  observaciones: Observacion[];
  setObservaciones: React.Dispatch<React.SetStateAction<Observacion[]>>;
  onError: (message: string) => void;
  selectedSection: CoordTab;
  onSelectSection: React.Dispatch<React.SetStateAction<CoordTab>>;
  onReturnHome?: () => void;
}) {
  const [tab, setTab] = useState<CoordTab>(selectedSection);
  const [activeSection, setActiveSection] = useState<CoordTab>(selectedSection);
  const [searchQuery, setSearchQuery] = useState("");
  const [userPermissions, setUserPermissions] = useState<string[]>(ALL_SECTION_KEYS);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({
    procesos: false,
    consultaVersion: false,
    parametros: false,
    parametrosCorreos: false,
    detalles: false,
    solicitudes: false,
    reportes: false,
    documentos: false,
    auditoria: false,
    generales: false,
    generalesUsuarios: false,
  });

  const [auditoriaSubmodulo, setAuditoriaSubmodulo] = useState<AuditSubmodulo>("LOGS_SISTEMAS");
  const [documentView, setDocumentView] = useState<"boletines" | "manuales" | "solicitudesManuales" | null>(null);
  const [solicitudes, setSolicitudes] = useState<SolicitudParametro[]>([]);

  const fetchUserPerms = () => {
    const userClean = (loggedUser || "sistemas").toLowerCase().trim();
    api<PermisoUser[]>(`/versions/permisos?_ts=${Date.now()}`, { cache: "no-store" })
      .then((data) => {
        const found = data.find((u) => u.usuario.toLowerCase() === userClean);
        if (found) {
          setUserPermissions(found.permisos);
          // Si la sección actual no está permitida, redirigir a la primera permitida
          const currentKey = activeSection === "documentos"
            ? (documentView === "boletines" ? "documentos_boletines" : documentView === "manuales" ? "documentos_manuales" : "documentos_boletines")
            : activeSection;
          if (found.permisos.length > 0 && !found.permisos.includes(currentKey as string)) {
            const firstAllowed = found.permisos[0] as string;
            if (firstAllowed === "documentos_boletines") {
              setActiveSection("documentos");
              setTab("documentos");
              setDocumentView("boletines");
              onSelectSection("documentos");
            } else if (firstAllowed === "documentos_manuales") {
              setActiveSection("documentos");
              setTab("documentos");
              setDocumentView("manuales");
              onSelectSection("documentos");
            } else {
              setActiveSection(firstAllowed as typeof activeSection);
              setTab(firstAllowed as typeof tab);
              onSelectSection(firstAllowed as CoordTab);
            }
          }
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchUserPerms();
  }, [loggedUser]);

  useEffect(() => {
    setTab(selectedSection);
    setActiveSection(selectedSection);
  }, [selectedSection]);

  const canAccess = (key: string) => {
    if (key === "parametrosCorreos") {
      return (
        userPermissions.includes("parametrosCorreos") ||
        userPermissions.includes("parametrosEnviosCorreo") ||
        userPermissions.includes("parametrosSolicitudes") ||
        userPermissions.includes("parametrosCorreosNotificaciones") ||
        userPermissions.includes("versionParametros") ||
        userPermissions.includes("parametrosConfig")
      );
    }
    return userPermissions.includes(key);
  };

  const goToSection = (section: CoordTab, docView?: "boletines" | "manuales" | null, auditSub?: AuditSubmodulo) => {
    const permKey = section === "documentos"
      ? (docView === "boletines" ? "documentos_boletines" : docView === "manuales" ? "documentos_manuales" : "documentos_boletines")
      : section;

    if (!canAccess(permKey)) {
      toast.error("No tienes permisos para acceder a esta sección.");
      return;
    }
    setTab(section);
    setActiveSection(section);
    onSelectSection(section);
    if (docView !== undefined) setDocumentView(docView);
    if (auditSub !== undefined) setAuditoriaSubmodulo(auditSub);
  };

  const toggleFolder = (folderKey: string) => {
    setOpenFolders((prev) => ({ ...prev, [folderKey]: !prev[folderKey] }));
  };

  const usernameDisplay = (loggedUser || "YEFERSON.SANCHEZ").toUpperCase();
  const matchesSearch = (text: string) => !searchQuery.trim() || text.toLowerCase().includes(searchQuery.toLowerCase());

  return (
    <div className="flex flex-row h-full overflow-hidden w-full bg-[#f8f9fa]">
      {/* Sidebar Lateral Izquierdo */}
      <aside
        className={`bg-[#212529] text-white flex flex-col h-full shadow-xl z-20 select-none font-sans shrink-0 transition-all duration-300 overflow-hidden ${
          sidebarCollapsed ? "w-0 opacity-0 pointer-events-none" : "w-72 opacity-100"
        }`}
      >
        <div className="w-72 flex flex-col h-full shrink-0">
          {/* Info Usuario + Botón Regresar al Inicio */}
          <div className="px-3.5 py-3 flex items-center justify-between border-b border-slate-700/50 bg-[#1a1d21] gap-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-white shrink-0 font-bold text-xs">
              {usernameDisplay.slice(0, 2)}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-100 truncate" title={usernameDisplay}>
                {usernameDisplay}
              </p>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">COORDINADOR</p>
            </div>
          </div>
          {onReturnHome && (
            <button
              onClick={onReturnHome}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-[#0091ea] text-slate-200 hover:text-white text-[11px] font-semibold transition-all border border-slate-700 shrink-0 cursor-pointer shadow-sm"
              title="Regresar al inicio de módulos"
            >
              <Home size={12} /> Inicio
            </button>
          )}
        </div>

        {/* Buscador de Opciones */}
        <div className="p-3 border-b border-slate-700/50">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#16181b] text-slate-200 text-xs rounded-lg pl-8 pr-3 py-1.5 border border-slate-700 focus:outline-none focus:border-[#0091ea]"
            />
          </div>
        </div>

        {/* Lista de Menús Colapsables */}
        <div className="flex-1 overflow-y-auto py-2 text-xs divide-y divide-slate-800/40">
          {/* Home */}
          <div className="px-2 py-1">
            <button
              onClick={() => goToSection(canAccess("registro") ? "registro" : (userPermissions[0] as CoordTab || "registro"))}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-all ${
                activeSection === "registro" ? "bg-[#0091ea] text-white font-bold" : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Home size={14} /> Home
            </button>
          </div>

          {/* Folder: Procesos */}
          {(canAccess("registro") || canAccess("restaurarDB")) && (
            <div className="px-2 py-1 space-y-1">
              <button
                onClick={() => toggleFolder("procesos")}
                className="w-full flex items-center justify-between px-3 py-2 text-slate-200 hover:text-white font-bold rounded-lg hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2 text-[#0091ea]">
                  <Settings size={15} className="text-[#0091ea]" />
                  <span>Registrar</span>
                </div>
                <ChevronDown size={12} className={`transition-transform ${openFolders.procesos ? "rotate-180" : ""}`} />
              </button>

              {openFolders.procesos && (
                <div className="ml-4 pl-3 border-l border-slate-700/60 space-y-1 my-1">
                  {canAccess("registro") && matchesSearch("Registro de Versión") && (
                    <button
                      onClick={() => goToSection("registro")}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md font-medium transition-all text-xs ${
                        activeSection === "registro" ? "bg-[#0091ea] text-white font-bold shadow-sm" : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                      }`}
                    >
                      <span className="truncate block">Registro de Versión</span>
                    </button>
                  )}
                  {canAccess("restaurarDB") && matchesSearch("Restaurar DB") && (
                    <button
                      onClick={() => goToSection("restaurarDB")}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md font-medium transition-all text-xs ${
                        activeSection === "restaurarDB" ? "bg-[#0091ea] text-white font-bold shadow-sm" : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                      }`}
                    >
                      <span className="truncate block">Restaurar DB</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Folder: Consulta de Versión (ahora solo 2 items, Parámetros movido a módulo Parámetros) */}
          {(canAccess("consultaVersiones") || canAccess("consultaRestauracionDB")) && (
            <div className="px-2 py-1 space-y-1">
              <button
                onClick={() => toggleFolder("consultaVersion")}
                className="w-full flex items-center justify-between px-3 py-2 text-slate-200 hover:text-white font-bold rounded-lg hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2 text-[#0091ea]">
                  <Search size={15} className="text-[#0091ea]" />
                  <span>Consultas</span>
                </div>
                <ChevronDown size={12} className={`transition-transform ${openFolders.consultaVersion ? "rotate-180" : ""}`} />
              </button>

              {openFolders.consultaVersion && (
                <div className="ml-4 pl-3 border-l border-slate-700/60 space-y-1 my-1">
                  {canAccess("consultaVersiones") && matchesSearch("Consultar versión") && (
                    <button
                      onClick={() => goToSection("consultaVersiones")}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md font-medium transition-all text-xs ${
                        activeSection === "consultaVersiones" ? "bg-[#0091ea] text-white font-bold shadow-sm" : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                      }`}
                    >
                      <span className="truncate block">Consultar versión</span>
                    </button>
                  )}
                  {canAccess("consultaRestauracionDB") && matchesSearch("Consultar restauración BD") && (
                    <button
                      onClick={() => goToSection("consultaRestauracionDB")}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md font-medium transition-all text-xs ${
                        activeSection === "consultaRestauracionDB" ? "bg-[#0091ea] text-white font-bold shadow-sm" : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                      }`}
                    >
                      <span className="truncate block">Consultar restauración BD</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Folder: Parámetros */}
          {(canAccess("parametrosCorreos") || canAccess("valoresParametros") || canAccess("parametrosConfig")) && (
            <div className="px-2 py-1 space-y-1">
              <button
                onClick={() => toggleFolder("parametros")}
                className="w-full flex items-center justify-between px-3 py-2 text-slate-200 hover:text-white font-bold rounded-lg hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2 text-[#0091ea]">
                  <Settings size={15} className="text-[#0091ea]" />
                  <span>Parámetros</span>
                </div>
                <ChevronDown size={12} className={`transition-transform ${openFolders.parametros ? "rotate-180" : ""}`} />
              </button>
              {openFolders.parametros && (
                <div className="ml-4 pl-3 border-l border-slate-700/60 space-y-1 my-1">
                  {(canAccess("parametrosCorreos") || canAccess("parametrosConfig")) && matchesSearch("Parametros de Correos") && (
                    <button
                      onClick={() => goToSection("parametrosCorreos")}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md font-medium transition-all text-xs ${activeSection === "parametrosCorreos" || activeSection === "parametrosEnviosCorreo" || activeSection === "parametrosSolicitudes" || activeSection === "parametrosCorreosNotificaciones" ? "bg-[#0091ea] text-white font-bold shadow-sm" : "text-slate-300 hover:text-white hover:bg-slate-800/60"}`}
                    >
                      <span className="truncate block">Parámetros de Correos</span>
                    </button>
                  )}
                  {(canAccess("valoresParametros") || canAccess("parametrosConfig")) && matchesSearch("Valores Parametros") && (
                    <button
                      onClick={() => goToSection("valoresParametros")}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md font-medium transition-all text-xs ${activeSection === "valoresParametros" ? "bg-[#0091ea] text-white font-bold shadow-sm" : "text-slate-300 hover:text-white hover:bg-slate-800/60"}`}
                    >
                      <span className="truncate block">Valores Parámetros</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Folder: Detalles */}
          {canAccess("detalles") && (
            <div className="px-2 py-1 space-y-1">
              <button
                onClick={() => toggleFolder("detalles")}
                className="w-full flex items-center justify-between px-3 py-2 text-slate-200 hover:text-white font-bold rounded-lg hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2 text-[#0091ea]">
                  <ClipboardList size={15} className="text-[#0091ea]" />
                  <span>Detalles de Validación</span>
                </div>
                <ChevronDown size={12} className={`transition-transform ${openFolders.detalles ? "rotate-180" : ""}`} />
              </button>

              {openFolders.detalles && (
                <div className="ml-4 pl-3 border-l border-slate-700/60 space-y-1 my-1">
                  {matchesSearch("Detalles de Validación") && (
                    <button
                      onClick={() => goToSection("detalles")}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md font-medium transition-all text-xs ${
                        activeSection === "detalles" ? "bg-[#0091ea] text-white font-bold shadow-sm" : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                      }`}
                    >
                      <span className="truncate block">Detalles de Validación</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Folder: Solicitudes (incluye Solicitudes de manuales movido desde Docs) */}
          {(canAccess("solicitudParametro") || canAccess("solicitudUsuario") || canAccess("solicitudPassword") || canAccess("solicitudesManuales")) && (
            <div className="px-2 py-1 space-y-1">
              <button
                onClick={() => toggleFolder("solicitudes")}
                className="w-full flex items-center justify-between px-3 py-2 text-slate-200 hover:text-white font-bold rounded-lg hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2 text-[#0091ea]">
                  <UserPlus size={15} className="text-[#0091ea]" />
                  <span>Solicitudes</span>
                </div>
                <ChevronDown size={12} className={`transition-transform ${openFolders.solicitudes ? "rotate-180" : ""}`} />
              </button>

              {openFolders.solicitudes && (
                <div className="ml-4 pl-3 border-l border-slate-700/60 space-y-1 my-1">
                  {canAccess("solicitudParametro") && matchesSearch("Habilitación de Parámetro") && (
                    <button
                      onClick={() => goToSection("solicitudParametro")}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md font-medium transition-all text-xs ${
                        activeSection === "solicitudParametro" ? "bg-[#0091ea] text-white font-bold shadow-sm" : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                      }`}
                    >
                      <span className="truncate block">Habilitación de Parámetro</span>
                    </button>
                  )}
                  {canAccess("solicitudUsuario") && matchesSearch("Creación de Usuario") && (
                    <button
                      onClick={() => goToSection("solicitudUsuario")}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md font-medium transition-all text-xs ${
                        activeSection === "solicitudUsuario" ? "bg-[#0091ea] text-white font-bold shadow-sm" : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                      }`}
                    >
                      <span className="truncate block">Creación de Usuario</span>
                    </button>
                  )}
                  {canAccess("solicitudPassword") && matchesSearch("Restablecimiento de contraseña") && (
                    <button
                      onClick={() => goToSection("solicitudPassword")}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md font-medium transition-all text-xs ${
                        activeSection === "solicitudPassword" ? "bg-[#0091ea] text-white font-bold shadow-sm" : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                      }`}
                    >
                      <span className="truncate block">Restablecimiento de contraseña</span>
                    </button>
                  )}
                  {canAccess("solicitudesManuales") && matchesSearch("Solicitudes de manuales") && (
                    <button
                      onClick={() => goToSection("solicitudesManuales")}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md font-medium transition-all text-xs ${
                        activeSection === "solicitudesManuales" ? "bg-[#0091ea] text-white font-bold shadow-sm" : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                      }`}
                    >
                      <span className="truncate block">Solicitudes de manuales</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Folder: Reportes */}
          {(canAccess("reporteFirmas") || canAccess("reporteDetalles")) && (
            <div className="px-2 py-1 space-y-1">
              <button
                onClick={() => toggleFolder("reportes")}
                className="w-full flex items-center justify-between px-3 py-2 text-slate-200 hover:text-white font-bold rounded-lg hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2 text-[#0091ea]">
                  <BarChart3 size={15} className="text-[#0091ea]" />
                  <span>Reportes</span>
                </div>
                <ChevronDown size={12} className={`transition-transform ${openFolders.reportes ? "rotate-180" : ""}`} />
              </button>

              {openFolders.reportes && (
                <div className="ml-4 pl-3 border-l border-slate-700/60 space-y-1 my-1">
                  {canAccess("reporteFirmas") && matchesSearch("Reportes Generados") && (
                    <button
                      onClick={() => goToSection("reporteFirmas")}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md font-medium transition-all text-xs ${
                        activeSection === "reporteFirmas" ? "bg-[#0091ea] text-white font-bold shadow-sm" : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                      }`}
                    >
                      <span className="truncate block">Firmas de Directivos</span>
                    </button>
                  )}
                  {canAccess("reporteDetalles") && matchesSearch("Indicadores Generados") && (
                    <button
                      onClick={() => goToSection("reporteDetalles")}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md font-medium transition-all text-xs ${
                        activeSection === "reporteDetalles" ? "bg-[#0091ea] text-white font-bold shadow-sm" : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                      }`}
                    >
                      <span className="truncate block">Detalles de Validacion</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Folder: Documentos (ahora solo 2 items) */}
          {(canAccess("documentos_boletines") || canAccess("documentos_manuales")) && (
            <div className="px-2 py-1 space-y-1">
              <button
                onClick={() => toggleFolder("documentos")}
                className="w-full flex items-center justify-between px-3 py-2 text-slate-200 hover:text-white font-bold rounded-lg hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2 text-[#0091ea]">
                  <BookOpen size={15} className="text-[#0091ea]" />
                  <span>Utilidades / Docs</span>
                </div>
                <ChevronDown size={12} className={`transition-transform ${openFolders.documentos ? "rotate-180" : ""}`} />
              </button>

              {openFolders.documentos && (
                <div className="ml-4 pl-3 border-l border-slate-700/60 space-y-1 my-1">
                  {canAccess("documentos_boletines") && matchesSearch("Boletines Técnicos") && (
                    <button
                      onClick={() => goToSection("documentos", "boletines")}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md font-medium transition-all text-xs ${
                        activeSection === "documentos" && documentView === "boletines" ? "bg-[#0091ea] text-white font-bold shadow-sm" : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                      }`}
                    >
                      <span className="truncate block">Boletines Técnicos</span>
                    </button>
                  )}
                  {canAccess("documentos_manuales") && matchesSearch("Manuales de Usuarios") && (
                    <button
                      onClick={() => goToSection("documentos", "manuales")}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md font-medium transition-all text-xs ${
                        activeSection === "documentos" && documentView === "manuales" ? "bg-[#0091ea] text-white font-bold shadow-sm" : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                      }`}
                    >
                      <span className="truncate block">Manuales de Usuarios</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Folder: Auditoría */}
          {canAccess("auditoria") && (
            <div className="px-2 py-1 space-y-1">
              <button
                onClick={() => toggleFolder("auditoria")}
                className="w-full flex items-center justify-between px-3 py-2 text-slate-200 hover:text-white font-bold rounded-lg hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2 text-[#0091ea]">
                  <ShieldCheck size={15} className="text-[#0091ea]" />
                  <span>Auditoría</span>
                </div>
                <ChevronDown size={12} className={`transition-transform ${openFolders.auditoria ? "rotate-180" : ""}`} />
              </button>

              {openFolders.auditoria && (
                <div className="ml-4 pl-3 border-l border-slate-700/60 space-y-1 my-1">
                  {([
                    ["LOGS_SISTEMAS", "Logs Sistemas"],
                    ["LOGS_DESCARGAS", "Logs Descargas"],
                    ["LOGS_ACCESOS", "Logs Accesos"],
                  ] as const).map(([key, label]) => (
                    matchesSearch(label) && (
                      <button
                        key={key}
                        onClick={() => goToSection("auditoria", null, key)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-md font-medium transition-all text-xs ${
                          activeSection === "auditoria" && auditoriaSubmodulo === key ? "bg-[#0091ea] text-white font-bold shadow-sm" : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                        }`}
                      >
                        <span className="truncate block">{label}</span>
                      </button>
                    )
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Folder: Generales (NUEVO) */}
          {(canAccess("generalesPermisos") || canAccess("generalesPlataformas") || canAccess("generalesUsuarios") || canAccess("generalesUsuariosPermisos") || canAccess("permisos")) && (
            <div className="px-2 py-1 space-y-1">
              <button
                onClick={() => toggleFolder("generales")}
                className="w-full flex items-center justify-between px-3 py-2 text-slate-200 hover:text-white font-bold rounded-lg hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2 text-[#0091ea]">
                  <Folder size={15} className="text-[#0091ea]" />
                  <span>Generales</span>
                </div>
                <ChevronDown size={12} className={`transition-transform ${openFolders.generales ? "rotate-180" : ""}`} />
              </button>
              {openFolders.generales && (
                <div className="ml-4 pl-3 border-l border-slate-700/60 space-y-1 my-1">
                  {(canAccess("generalesPermisos") || canAccess("permisos")) && matchesSearch("Permisos") && (
                    <button onClick={() => goToSection("generalesPermisos")} className={`w-full text-left px-2.5 py-1.5 rounded-md font-medium transition-all text-xs ${activeSection === "generalesPermisos" ? "bg-[#0091ea] text-white font-bold shadow-sm" : "text-slate-300 hover:text-white hover:bg-slate-800/60"}`}><span className="truncate block">Permisos</span></button>
                  )}
                  {canAccess("generalesPlataformas") && matchesSearch("Plataformas") && (
                    <button onClick={() => goToSection("generalesPlataformas")} className={`w-full text-left px-2.5 py-1.5 rounded-md font-medium transition-all text-xs ${activeSection === "generalesPlataformas" ? "bg-[#0091ea] text-white font-bold shadow-sm" : "text-slate-300 hover:text-white hover:bg-slate-800/60"}`}><span className="truncate block">Plataformas</span></button>
                  )}
                  {(canAccess("generalesUsuarios") || canAccess("generalesUsuariosPermisos")) && (
                    <div className="space-y-1">
                      <button onClick={() => toggleFolder("generalesUsuarios")} className="w-full flex items-center justify-between px-2 py-1.5 text-slate-300 hover:text-white font-semibold rounded-md hover:bg-slate-800/60">
                        <span className="text-xs">Usuarios</span><ChevronDown size={10} className={`transition-transform ${openFolders.generalesUsuarios ? "rotate-180" : ""}`} />
                      </button>
                      {openFolders.generalesUsuarios && (
                        <div className="ml-3 pl-2 border-l border-slate-700/60 space-y-1">
                          {canAccess("generalesUsuarios") && matchesSearch("Usuarios de Solicitudes") && (
                            <button onClick={() => goToSection("generalesUsuarios")} className={`w-full text-left px-2 py-1 rounded-md font-medium transition-all text-xs ${activeSection === "generalesUsuarios" ? "bg-[#0091ea] text-white font-bold shadow-sm" : "text-slate-300 hover:text-white hover:bg-slate-800/60"}`}><span className="truncate block">Usuarios de Solicitudes de Usuarios</span></button>
                          )}
                          {canAccess("generalesUsuariosPermisos") && matchesSearch("Permisos") && (
                            <button onClick={() => goToSection("generalesUsuariosPermisos")} className={`w-full text-left px-2 py-1 rounded-md font-medium transition-all text-xs ${activeSection === "generalesUsuariosPermisos" ? "bg-[#0091ea] text-white font-bold shadow-sm" : "text-slate-300 hover:text-white hover:bg-slate-800/60"}`}><span className="truncate block">Permisos</span></button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {/* Legacy Permisos fallback */}
          {canAccess("permisos") && !canAccess("generalesPermisos") && (
            <div className="px-2 py-1">
              {matchesSearch("Permisos") && (
                <button onClick={() => goToSection("permisos")} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-all ${activeSection === "permisos" ? "bg-[#0091ea] text-white font-bold" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}><Lock size={14} /> Permisos</button>
              )}
            </div>
          )}
        </div>
        </div>
      </aside>

      {/* Barra separadora con botón para expandir y comprimir el menú lateral */}
      <div className="relative z-30 flex items-center shrink-0">
        <div
          onClick={() => setSidebarCollapsed((prev) => !prev)}
          className="w-1.5 h-full bg-slate-200 hover:bg-[#0091ea]/60 transition-colors cursor-pointer flex items-center justify-center group"
          title={sidebarCollapsed ? "Expandir menú lateral" : "Comprimir menú lateral"}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSidebarCollapsed((prev) => !prev);
            }}
            className="absolute flex items-center justify-center w-5 h-12 rounded-r-lg bg-[#212529] hover:bg-[#0091ea] text-slate-300 hover:text-white shadow-md border-y border-r border-slate-600 hover:border-[#0091ea] transition-all cursor-pointer group-hover:scale-105"
            title={sidebarCollapsed ? "Expandir menú lateral" : "Comprimir menú lateral"}
          >
            {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6 bg-[#f8f9fa]">
        {activeSection === "registro" && (
          <VersionRegistration versions={versions} setVersions={setVersions} onError={onError} loggedUser={loggedUser} />
        )}
        {activeSection === "restaurarDB" && (
          <RestaurarDBSection versions={versions} onError={onError} />
        )}
        {activeSection === "consultaVersiones" && (
          <VersionQuery versions={versions} setVersions={setVersions} onError={onError} loggedUser={loggedUser} />
        )}
        {activeSection === "consultaRestauracionDB" && (
          <ConsultarRestauracionDBSection versions={versions} onError={onError} />
        )}
        {activeSection === "versionParametros" && (
          <VersionCorreoParametrosSection onError={onError} />
        )}
        {activeSection === "detalles" && (
          <ValidationDetails versions={versions} observaciones={observaciones} />
        )}
        {activeSection === "documentos" && (
          <>
            {documentView === "boletines" && <Boletines />}
            {documentView === "manuales" && <ManualesUsuarios />}
            {documentView === null && (
              <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-500">
                Seleccione Documentos → Boletines, Manuales de Usuarios o Solicitudes de manuales.
              </div>
            )}
          </>
        )}
        {activeSection === "solicitudesManuales" && (
          <SolicitudesManualesSection onError={onError} />
        )}
        {activeSection === "solicitudParametro" && (
          <SolicitudParametroSection
            solicitudes={solicitudes}
            setSolicitudes={setSolicitudes}
            onError={onError}
            canApprove={true}
            canHabilitarParametro={true}
          />
        )}
        {activeSection === "solicitudUsuario" && (
          <UserCreationRequests onError={onError} admin />
        )}
        {activeSection === "solicitudPassword" && (
          <PasswordResetRequests onError={onError} admin />
        )}
        {(activeSection === "parametrosCorreos" || activeSection === "parametrosEnviosCorreo" || activeSection === "parametrosSolicitudes" || activeSection === "parametrosCorreosNotificaciones" || activeSection === "versionParametros") && (
          <ParametrosCorreosUnifiedSection onError={onError} />
        )}
        {activeSection === "valoresParametros" && (
          <ValoresParametrosSection onError={onError} />
        )}
        {activeSection === "parametrosConfig" && (
          <><ParametrosConfigSection onError={onError} /><AccessPlatformsConfig onError={onError} /></>
        )}
        {activeSection === "reporteFirmas" && (
          <ReportFirmas versions={versions} observaciones={observaciones} />
        )}
        {activeSection === "reporteDetalles" && (
          <ReportDetalles versions={versions} observaciones={observaciones} />
        )}
        {activeSection === "auditoria" && (
          <AuditoriaSection submodulo={auditoriaSubmodulo} />
        )}
        {(activeSection === "permisos" || activeSection === "generalesPermisos") && (
          <PermisosSection onError={onError} />
        )}
        {activeSection === "generalesPlataformas" && (
          <AccessPlatformsConfig onError={onError} />
        )}
        {activeSection === "generalesUsuarios" && (
          <UsuariosSolicitudSection onError={onError} />
        )}
        {activeSection === "generalesUsuariosPermisos" && (
          <UsuariosPermisosSection onError={onError} />
        )}
      </div>
    </div>
  );
}

export { CoordinatorModule };
export default CoordinatorModule;
