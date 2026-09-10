import { useState, useEffect, useMemo } from "react";
import {
  Save, ChevronRight, ChevronDown, Check, Search, ShieldCheck,
  FolderOpen, FolderClosed, CheckSquare, Square, MinusSquare
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { Btn, SectionHeader, EmptyState } from "@/components/ui/custom";

interface TreeItem {
  code: string;
  key: string;
  name: string;
  description?: string;
}

interface TreeNode {
  code: string;
  name: string;
  children: TreeItem[];
}

const TREE_DATA: TreeNode[] = [
  {
    code: "REG",
    name: "REGISTRAR",
    children: [
      { code: "REG1", key: "registro", name: "Registro de Versión", description: "Permite registrar y publicar nuevas versiones y compilaciones" },
      { code: "REG2", key: "restaurarDB", name: "Restaurar DB", description: "Permite registrar y vincular restauraciones de base de datos" },
    ],
  },
  {
    code: "CON",
    name: "CONSULTAS",
    children: [
      { code: "CON1", key: "consultaVersiones", name: "Consultar versión", description: "Búsqueda y consulta de versiones del sistema" },
      { code: "CON2", key: "consultaRestauracionDB", name: "Consultar restauración BD", description: "Historial y consulta de restauraciones de base de datos" },
    ],
  },
  {
    code: "PAR",
    name: "PARÁMETROS",
    children: [
      { code: "PAR1", key: "parametrosCorreos", name: "Parámetros de Correos", description: "Configuración unificada de destinatarios y notificaciones por correo" },
      { code: "PAR2", key: "valoresParametros", name: "Valores Parámetros", description: "Ajuste de tiempos, horas límite y valores clínicos por defecto" },
    ],
  },
  {
    code: "DET",
    name: "DETALLES DE VALIDACIÓN",
    children: [
      { code: "DET1", key: "detalles", name: "Detalles de Validación", description: "Consulta de observaciones, incidencias y aprobaciones por módulos" },
    ],
  },
  {
    code: "SOL",
    name: "SOLICITUDES",
    children: [
      { code: "SOL1", key: "solicitudParametro", name: "Habilitación de Parámetro", description: "Aprobación y habilitación de solicitudes de parámetros clínicos" },
      { code: "SOL2", key: "solicitudUsuario", name: "Creación de Usuario", description: "Gestión de solicitudes de nuevos usuarios para plataformas" },
      { code: "SOL3", key: "solicitudPassword", name: "Restablecimiento de contraseña", description: "Gestión de solicitudes de restablecimiento de claves" },
      { code: "SOL4", key: "solicitudesManuales", name: "Solicitudes de manuales", description: "Solicitud y seguimiento de manuales de usuario para funcionarios" },
    ],
  },
  {
    code: "REP",
    name: "REPORTES",
    children: [
      { code: "REP1", key: "reporteFirmas", name: "Firmas de Directivos", description: "Generación y descarga de reporte de firmas de directivos" },
      { code: "REP2", key: "reporteDetalles", name: "Indicadores Generados", description: "Métricas y resumen de validaciones por versión y módulo" },
    ],
  },
  {
    code: "DOC",
    name: "UTILIDADES / DOCS",
    children: [
      { code: "DOC1", key: "documentos_boletines", name: "Boletines Técnicos", description: "Gestión y publicación de boletines técnicos de software" },
      { code: "DOC2", key: "documentos_manuales", name: "Manuales de Usuarios", description: "Carga y visualización de manuales de usuario por módulo" },
    ],
  },
  {
    code: "AUD",
    name: "AUDITORÍA",
    children: [
      { code: "AUD1", key: "auditoria", name: "Auditoría del Sistema", description: "Logs de operaciones, descargas y accesos del sistema" },
    ],
  },
  {
    code: "MOD",
    name: "MÓDULOS",
    children: [
      { code: "MOD1", key: "modulosInicio", name: "Módulos de inicio", description: "Habilitación o inhabilitación de módulos en la pantalla de inicio" },
    ],
  },
  {
    code: "GEN",
    name: "GENERALES",
    children: [
      { code: "GEN1", key: "generalesPermisos", name: "Permisos", description: "Control y asignación de permisos a usuarios coordinadores" },
      { code: "GEN2", key: "generalesPlataformas", name: "Plataformas", description: "Administración de plataformas para solicitudes de accesos" },
      { code: "GEN3", key: "generalesUsuarios", name: "Usuarios de Solicitudes", description: "Configuración de usuarios autorizados para solicitar accesos" },
      { code: "GEN4", key: "generalesUsuariosPermisos", name: "Permisos de Usuarios", description: "Asignación de plataformas permitidas por usuario solicitante" },
    ],
  },
];

const ALL_KEYS = TREE_DATA.flatMap((n) => n.children.map((c) => c.key));

type PermisoUser = {
  usuario: string;
  permisos: string[];
};

export function PermisosSection({ onError }: { onError: (msg: string) => void }) {
  const [permisos, setPermisos] = useState<PermisoUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("sistemas");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const fetchPermisos = () => {
    setLoading(true);
    api<PermisoUser[]>(`/versions/permisos?_ts=${Date.now()}`, { cache: "no-store" })
      .then((data) => {
        setPermisos(data);
        if (data.length > 0 && !data.some((u) => u.usuario === selectedUser)) {
          setSelectedUser(data[0].usuario);
        }
      })
      .catch((e) => onError(e instanceof Error ? e.message : "Error cargando permisos"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPermisos();
  }, []);

  const toggleExpand = (nodeCode: string) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [nodeCode]: !prev[nodeCode],
    }));
  };

  const handleExpandAll = (expand: boolean) => {
    const next: Record<string, boolean> = {};
    TREE_DATA.forEach((n) => {
      next[n.code] = expand;
    });
    setExpandedNodes(next);
  };

  const toggleItem = (usuario: string, key: string) => {
    setPermisos((prev) =>
      prev.map((p) => {
        if (p.usuario !== usuario) return p;
        const exists = p.permisos.includes(key);
        return {
          ...p,
          permisos: exists
            ? p.permisos.filter((k) => k !== key)
            : [...p.permisos, key],
        };
      })
    );
  };

  const toggleNodeGroup = (usuario: string, node: TreeNode) => {
    const nodeKeys = node.children.map((c) => c.key);
    const currentUser = permisos.find((p) => p.usuario === usuario);
    if (!currentUser) return;

    const allChecked = nodeKeys.every((k) => currentUser.permisos.includes(k));

    setPermisos((prev) =>
      prev.map((p) => {
        if (p.usuario !== usuario) return p;
        const base = p.permisos.filter((k) => !nodeKeys.includes(k));
        return {
          ...p,
          permisos: allChecked ? base : [...base, ...nodeKeys],
        };
      })
    );
  };

  const toggleAll = (usuario: string, enable: boolean) => {
    setPermisos((prev) =>
      prev.map((p) => {
        if (p.usuario !== usuario) return p;
        return { ...p, permisos: enable ? [...ALL_KEYS] : [] };
      })
    );
  };

  const handleSave = (usuario: string) => {
    const user = permisos.find((p) => p.usuario === usuario);
    if (!user) return;
    setSaving(usuario);
    api(`/versions/permisos`, {
      method: "PUT",
      body: JSON.stringify({ usuario: user.usuario, permisos: user.permisos }),
    })
      .then(() => {
        toast.success(`Permisos de "${usuario}" guardados exitosamente.`);
        fetchPermisos();
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Error guardando permisos"))
      .finally(() => setSaving(null));
  };

  const currentUser = permisos.find((p) => p.usuario === selectedUser) || permisos[0];

  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return TREE_DATA;
    const q = searchQuery.toLowerCase().trim();
    return TREE_DATA.map((node) => {
      const nodeMatch = node.name.toLowerCase().includes(q) || node.code.toLowerCase().includes(q);
      const matchingChildren = node.children.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q))
      );
      if (nodeMatch) return node;
      if (matchingChildren.length > 0) {
        return { ...node, children: matchingChildren };
      }
      return null;
    }).filter(Boolean) as TreeNode[];
  }, [searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 text-sm">
        Cargando árbol de permisos...
      </div>
    );
  }

  const activeCount = currentUser
    ? ALL_KEYS.filter((k) => currentUser.permisos.includes(k)).length
    : 0;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Gestión de Permisos"
        subtitle="Administre los módulos y submódulos autorizados por usuario coordinador mediante la estructura jerárquica de árbol."
      />

      {permisos.length === 0 && (
        <EmptyState message="No se encontraron usuarios configurados." />
      )}

      {currentUser && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden font-sans">
          {/* Header Controls Bar */}
          <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-300 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#0091ea]/15 border border-[#0091ea]/30 flex items-center justify-center text-[#0091ea] font-bold text-sm uppercase">
                {currentUser.usuario.charAt(0)}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                  Usuario Coordinador
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={currentUser.usuario}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0091ea] shadow-xs"
                  >
                    {permisos.map((p) => (
                      <option key={p.usuario} value={p.usuario} className="capitalize">
                        {p.usuario.charAt(0).toUpperCase() + p.usuario.slice(1)}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-white text-slate-700 border border-slate-300">
                    {activeCount} de {ALL_KEYS.length} activos
                  </span>
                </div>
              </div>
            </div>

            {/* Actions & Filters */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar módulo o código..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0091ea] w-48 sm:w-56"
                />
              </div>

              <button
                type="button"
                onClick={() => handleExpandAll(true)}
                className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
                title="Expandir todos los módulos"
              >
                Expandir todo
              </button>
              <button
                type="button"
                onClick={() => handleExpandAll(false)}
                className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
                title="Colapsar todos los módulos"
              >
                Colapsar todo
              </button>

              <button
                type="button"
                onClick={() =>
                  toggleAll(
                    currentUser.usuario,
                    !ALL_KEYS.every((k) => currentUser.permisos.includes(k))
                  )
                }
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
              >
                {ALL_KEYS.every((k) => currentUser.permisos.includes(k))
                  ? "Deseleccionar todos"
                  : "Seleccionar todos"}
              </button>

              <Btn
                v="primary"
                onClick={() => handleSave(currentUser.usuario)}
                disabled={saving === currentUser.usuario}
              >
                <Save size={14} /> {saving === currentUser.usuario ? "Guardando..." : "Guardar Permisos"}
              </Btn>
            </div>
          </div>

          {/* Tree Table matching Enterprise Style */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm select-none">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider">
                  <th className="py-2.5 px-4 w-36 border-r border-slate-300">Código</th>
                  <th className="py-2.5 px-4 border-r border-slate-300">Módulo / Submódulo</th>
                  <th className="py-2.5 px-4 w-44 text-center">Permiso / Acceso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredTree.map((node) => {
                  const isExpanded = !!expandedNodes[node.code] || (!!searchQuery.trim());
                  const nodeKeys = node.children.map((c) => c.key);
                  const activeInNode = nodeKeys.filter((k) => currentUser.permisos.includes(k)).length;
                  const allChecked = activeInNode === nodeKeys.length;
                  const someChecked = activeInNode > 0 && !allChecked;

                  return (
                    <div key={node.code} className="contents">
                      {/* Parent Node Row */}
                      <tr className="hover:bg-sky-50/60 transition-colors bg-slate-50/70 border-t-2 border-slate-300/80">
                        {/* Tree Arrow + Node Code */}
                        <td className="py-2 px-3 border-r border-slate-300 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => toggleExpand(node.code)}
                              className="w-5 h-5 flex items-center justify-center text-slate-600 hover:text-slate-900 focus:outline-none transition-transform"
                            >
                              {isExpanded ? (
                                <ChevronDown size={14} className="stroke-[2.5]" />
                              ) : (
                                <ChevronRight size={14} className="stroke-[2.5]" />
                              )}
                            </button>
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded border border-slate-300 bg-white text-slate-800 shadow-2xs">
                              {node.code}
                            </span>
                          </div>
                        </td>

                        {/* Node Name */}
                        <td
                          onClick={() => toggleExpand(node.code)}
                          className="py-2 px-4 border-r border-slate-300 cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs uppercase tracking-wide text-[#0778ac]">
                              {node.name}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full">
                              {activeInNode} de {nodeKeys.length}
                            </span>
                          </div>
                        </td>

                        {/* Node Toggle Action */}
                        <td className="py-2 px-4 text-center">
                          <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={allChecked}
                              ref={(el) => {
                                if (el) el.indeterminate = someChecked;
                              }}
                              onChange={() => toggleNodeGroup(currentUser.usuario, node)}
                              className="accent-[#0091ea] w-4 h-4 rounded cursor-pointer"
                            />
                            <span className="text-xs font-bold text-slate-700">
                              {allChecked ? "Autorizado" : someChecked ? "Parcial" : "Sin acceso"}
                            </span>
                          </label>
                        </td>
                      </tr>

                      {/* Child Rows */}
                      {isExpanded &&
                        node.children.map((item) => {
                          const isChecked = currentUser.permisos.includes(item.key);

                          return (
                            <tr
                              key={item.key}
                              className={`hover:bg-blue-50/40 transition-colors ${
                                isChecked ? "bg-white" : "bg-slate-50/30 opacity-75"
                              }`}
                            >
                              {/* Indented Child Code */}
                              <td className="py-1.5 px-3 pl-8 border-r border-slate-300 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400 text-xs select-none">▸</span>
                                  <span className="font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded border border-slate-200 bg-white text-slate-700">
                                    {item.code}
                                  </span>
                                </div>
                              </td>

                              {/* Child Name & Description */}
                              <td className="py-1.5 px-4 border-r border-slate-300">
                                <div>
                                  <span
                                    className={`text-xs font-semibold ${
                                      isChecked ? "text-slate-900" : "text-slate-600"
                                    }`}
                                  >
                                    {item.name}
                                  </span>
                                  {item.description && (
                                    <p className="text-[11px] text-slate-400 font-normal leading-tight mt-0.5">
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                              </td>

                              {/* Child Checkbox */}
                              <td className="py-1.5 px-4 text-center">
                                <label className="inline-flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleItem(currentUser.usuario, item.key)}
                                    className="accent-[#0091ea] w-4 h-4 rounded cursor-pointer"
                                  />
                                  <span
                                    className={`text-xs font-medium ${
                                      isChecked ? "text-[#0778ac] font-bold" : "text-slate-400"
                                    }`}
                                  >
                                    {isChecked ? "Habilitado" : "Deshabilitado"}
                                  </span>
                                </label>
                              </td>
                            </tr>
                          );
                        })}
                    </div>
                  );
                })}

                {filteredTree.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-400 text-xs">
                      No se encontraron módulos o permisos con el término de búsqueda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default PermisosSection;
