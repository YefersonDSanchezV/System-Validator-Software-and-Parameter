import { useState, useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { SectionHeader } from "@/components/ui/custom";
import { type ConfiguracionParametrosDTO } from "@/types/solicitud-parametro";

export function ParametrosConfigSection({
  onError,
}: {
  onError: (msg: string) => void;
}) {
  const [config, setConfig] = useState<ConfiguracionParametrosDTO>({
    hc_default: 30,
    enf_hcrenf_default: 48,
    enf_haplmed_default: 48,
    hora_restablecimiento: "20:05",
    auto_restablecer: true,
    tipos_habilitados: ["Historia Clinica", "Enfermeria", "Otros"],
    correos_historia_clinica: "",
    correos_enfermeria: "",
    correos_otros: "",
  });
  const [loading, setLoading] = useState(true);
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [savingHora, setSavingHora] = useState(false);
  const [savingTipos, setSavingTipos] = useState(false);
  const [savingCorreos, setSavingCorreos] = useState(false);
  const [resetting, setResetting] = useState(false);

  const fetchConfig = () => {
    api<ConfiguracionParametrosDTO>("/parametros-clinicos/config")
      .then((data) => {
        setConfig(data);
      })
      .catch((err) => {
        onError(err instanceof Error ? err.message : "Error cargando configuración de parámetros");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSaveDefaults = () => {
    setSavingDefaults(true);
    api<ConfiguracionParametrosDTO>("/parametros-clinicos/config", {
      method: "PUT",
      body: JSON.stringify(config),
    })
      .then((data) => {
        setConfig(data);
        toast.success("Valores por defecto guardados correctamente.");
      })
      .catch((e) => {
        onError(e instanceof Error ? e.message : "Error guardando valores por defecto");
      })
      .finally(() => setSavingDefaults(false));
  };

  const handleSaveHora = () => {
    setSavingHora(true);
    api<ConfiguracionParametrosDTO>("/parametros-clinicos/config", {
      method: "PUT",
      body: JSON.stringify(config),
    })
      .then((data) => {
        setConfig(data);
        toast.success("Hora de restablecimiento automático programada correctamente.");
      })
      .catch((e) => {
        onError(e instanceof Error ? e.message : "Error guardando hora de restablecimiento");
      })
      .finally(() => setSavingHora(false));
  };

  const handleSaveCorreos = () => {
    setSavingCorreos(true);
    api<ConfiguracionParametrosDTO>("/parametros-clinicos/config", {
      method: "PUT",
      body: JSON.stringify(config),
    })
      .then((data) => {
        setConfig(data);
        toast.success("Correos de notificación guardados correctamente.");
      })
      .catch((e) => {
        onError(e instanceof Error ? e.message : "Error guardando correos de notificación");
      })
      .finally(() => setSavingCorreos(false));
  };

  const handleToggleTipo = (tipoName: string) => {
    const exists = config.tipos_habilitados.includes(tipoName);
    const updated = exists
      ? config.tipos_habilitados.filter((t) => t !== tipoName)
      : [...config.tipos_habilitados, tipoName];

    const nextConfig = { ...config, tipos_habilitados: updated };
    setConfig(nextConfig);

    setSavingTipos(true);
    api<ConfiguracionParametrosDTO>("/parametros-clinicos/config", {
      method: "PUT",
      body: JSON.stringify(nextConfig),
    })
      .then((data) => {
        setConfig(data);
        toast.success(`Tipo "${tipoName}" ${exists ? "deshabilitado" : "habilitado"} con éxito.`);
      })
      .catch((e) => {
        onError(e instanceof Error ? e.message : "Error al actualizar tipo de parámetro");
      })
      .finally(() => setSavingTipos(false));
  };

  const handleResetNow = () => {
    if (!window.confirm("¿Está seguro de restablecer los parámetros clínicos a los valores por defecto en el servidor de base de datos?")) {
      return;
    }
    setResetting(true);
    api<{ message: string }>("/parametros-clinicos/restablecer-defecto", {
      method: "POST",
    })
      .then((res) => {
        toast.success(res.message || "Parámetros restablecidos a sus valores por defecto.");
      })
      .catch((e) => {
        onError(e instanceof Error ? e.message : "Error restableciendo los parámetros");
      })
      .finally(() => setResetting(false));
  };

  const allAvailableTypes = [
    { key: "Historia Clinica", label: "Historia Clínica", desc: "Parámetro HCPDIAAUT (Control de días de autorización de HC)" },
    { key: "Enfermeria", label: "Enfermería", desc: "Parámetros HCNMHRCRENF y HCNHAPLMED (Control de horas de enfermería)" },
    { key: "Otros", label: "Otros", desc: "Habilitación general con registro de observación y soporte de horas" },
  ];

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500">
        Cargando configuración de parámetros...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Parámetros"
        subtitle="Configuración y parametrización de valores por defecto, horarios, tipos de soporte clínico y correos de notificación."
      />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Card 1: Valores por Defecto */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="p-2 bg-[#0778ac]/10 text-[#0778ac] rounded-xl font-bold">⚙</div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Valores por Defecto</h3>
                <p className="text-xs text-slate-400">Valores estándar de cierre</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Historia Clínica (HCPDIAAUT)
              </label>
              <input
                type="number"
                value={config.hc_default}
                onChange={(e) => setConfig({ ...config, hc_default: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Enfermería (HCNMHRCRENF)
              </label>
              <input
                type="number"
                value={config.enf_hcrenf_default}
                onChange={(e) => setConfig({ ...config, enf_hcrenf_default: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Enfermería (HCNHAPLMED)
              </label>
              <input
                type="number"
                value={config.enf_haplmed_default}
                onChange={(e) => setConfig({ ...config, enf_haplmed_default: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white font-semibold"
              />
            </div>
          </div>

          <div className="pt-5 mt-4 border-t border-slate-100 space-y-2">
            <button
              onClick={handleSaveDefaults}
              disabled={savingDefaults}
              className="w-full py-2.5 px-4 rounded-xl bg-[#0778ac] hover:bg-[#066591] text-white text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
            >
              {savingDefaults ? "Guardando..." : "Guardar Valores por Defecto"}
            </button>
            <button
              onClick={handleResetNow}
              disabled={resetting}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <RotateCcw size={13} /> {resetting ? "Restableciendo..." : "Restablecer Valores Ahora"}
            </button>
          </div>
        </div>

        {/* Card 2: Hora de Restablecimiento Automático */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl font-bold">⏰</div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Restablecimiento Automático</h3>
                <p className="text-xs text-slate-400">Programación diaria nocturna</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-700">Activar tarea automática</span>
              <input
                type="checkbox"
                checked={config.auto_restablecer}
                onChange={(e) => setConfig({ ...config, auto_restablecer: e.target.checked })}
                className="w-5 h-5 accent-[#0778ac] rounded cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Hora de Restablecimiento Diario (24h)
              </label>
              <input
                type="time"
                value={config.hora_restablecimiento}
                onChange={(e) => setConfig({ ...config, hora_restablecimiento: e.target.value })}
                disabled={!config.auto_restablecer}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white font-semibold disabled:bg-slate-100 disabled:text-slate-400"
              />
            </div>

            <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-2xl text-xs text-blue-800 leading-relaxed">
              <strong>Nota:</strong> Todos los días a la hora configurada (<strong>{config.hora_restablecimiento}</strong>), el sistema verificará automáticamente el servidor y restablecerá los parámetros que se encuentren abiertos.
            </div>
          </div>

          <div className="pt-5 mt-4 border-t border-slate-100">
            <button
              onClick={handleSaveHora}
              disabled={savingHora}
              className="w-full py-2.5 px-4 rounded-xl bg-[#0778ac] hover:bg-[#066591] text-white text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
            >
              {savingHora ? "Guardando..." : "Guardar Horario"}
            </button>
          </div>
        </div>

        {/* Card 3: Tipos de Parámetros */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl font-bold">📋</div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Tipos de Parámetros</h3>
                <p className="text-xs text-slate-400">Activar o desactivar módulos</p>
              </div>
            </div>

            <div className="space-y-3">
              {allAvailableTypes.map((tipo) => {
                const isEnabled = config.tipos_habilitados.includes(tipo.key);
                return (
                  <div
                    key={tipo.key}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isEnabled ? "bg-emerald-50/50 border-emerald-200" : "bg-slate-50 border-slate-200 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">{tipo.label}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleTipo(tipo.key)}
                        disabled={savingTipos}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                          isEnabled
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : "bg-slate-300 hover:bg-slate-400 text-slate-700"
                        }`}
                      >
                        {isEnabled ? "Habilitado" : "Deshabilitado"}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">{tipo.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] text-slate-500 text-center mt-4">
            Solo los tipos habilitados se mostrarán en el formulario de nuevas solicitudes.
          </div>
        </div>

        {/* Card 4: Correos de Notificación por Tipo */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between md:col-span-3">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="p-2 bg-indigo-500/10 text-indigo-600 rounded-xl font-bold">✉</div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Correos Electrónicos de Notificación por Tipo de Parámetro</h3>
                <p className="text-xs text-slate-400">Ingrese las direcciones de correo separadas por comas para cada tipo de parámetro.</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Correos - Historia Clínica
                </label>
                <textarea
                  value={config.correos_historia_clinica || ""}
                  onChange={(e) => setConfig({ ...config, correos_historia_clinica: e.target.value })}
                  placeholder="ejemplo1@empresa.com, ejemplo2@empresa.com"
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Correos - Enfermería
                </label>
                <textarea
                  value={config.correos_enfermeria || ""}
                  onChange={(e) => setConfig({ ...config, correos_enfermeria: e.target.value })}
                  placeholder="ejemplo1@empresa.com, ejemplo2@empresa.com"
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Correos - Tipo Otros
                </label>
                <textarea
                  value={config.correos_otros || ""}
                  onChange={(e) => setConfig({ ...config, correos_otros: e.target.value })}
                  placeholder="ejemplo1@empresa.com, ejemplo2@empresa.com"
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white font-mono"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={handleSaveCorreos}
              disabled={savingCorreos}
              className="py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {savingCorreos ? "Guardando..." : "Guardar Correos de Notificación"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ParametrosConfigSection;
