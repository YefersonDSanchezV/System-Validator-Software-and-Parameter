import { useState, useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { SectionHeader } from "@/components/ui/custom";
import { type ConfiguracionParametrosDTO } from "@/types/solicitud-parametro";

function Time24hInput({
  value,
  onChange,
  disabled = false,
  maxHours = 23,
  placeholder = "00:00",
}: {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  maxHours?: number;
  placeholder?: string;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^0-9:]/g, "");
    if (raw.length === 2 && !raw.includes(":") && !e.target.value.endsWith(":")) {
      raw = raw + ":";
    }
    if (raw.length > 5) raw = raw.slice(0, 5);
    onChange(raw);
  };

  const handleBlur = () => {
    if (!value || !value.trim()) return;
    const parts = value.split(":");
    let h = parseInt(parts[0] || "0", 10);
    let m = parseInt(parts[1] || "0", 10);
    if (isNaN(h)) h = 0;
    if (isNaN(m)) m = 0;
    if (h > maxHours) h = maxHours;
    if (h < 0) h = 0;
    if (m > 59) m = 59;
    if (m < 0) m = 0;
    onChange(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  };

  return (
    <div className={`relative flex items-center rounded-xl border border-slate-300 bg-white transition-all focus-within:ring-2 focus-within:ring-[#0778ac] focus-within:border-[#0778ac] ${disabled ? "bg-slate-100 opacity-60 cursor-not-allowed" : ""}`}>
      <input
        type="text"
        inputMode="numeric"
        maxLength={5}
        placeholder={placeholder}
        value={value || ""}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        className="w-full px-3 py-2 text-sm bg-transparent font-semibold font-mono text-slate-800 focus:outline-none"
      />
      <span className="pr-3 text-[11px] font-mono font-bold text-slate-400 select-none">
        24H
      </span>
    </div>
  );
}

export function ValoresParametrosSection({ onError }: { onError: (msg: string) => void }) {
  const [config, setConfig] = useState<ConfiguracionParametrosDTO>({
    hc_default: 30, enf_hcrenf_default: 48, enf_haplmed_default: 48,
    hora_restablecimiento: "20:05", auto_restablecer: true,
    tipos_habilitados: ["Historia Clinica", "Enfermeria", "Otros"],
    tiempo_maximo_contador: "12:00",
    correos_historia_clinica: "", correos_enfermeria: "", correos_otros: "",
  });
  const [loading, setLoading] = useState(true);
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [savingHora, setSavingHora] = useState(false);
  const [savingTipos, setSavingTipos] = useState(false);
  const [resetting, setResetting] = useState(false);

  const fetchConfig = () => {
    api<ConfiguracionParametrosDTO>("/parametros-clinicos/config")
      .then((data) => setConfig(data))
      .catch((err) => onError(err instanceof Error ? err.message : "Error cargando configuración"))
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
        toast.success("Valores por defecto guardados.");
      })
      .catch((e) => onError(e instanceof Error ? e.message : "Error"))
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
        toast.success("Configuración de horarios y contador guardada.");
      })
      .catch((e) => onError(e instanceof Error ? e.message : "Error"))
      .finally(() => setSavingHora(false));
  };

  const handleToggleTipo = (tipoName: string) => {
    const exists = config.tipos_habilitados.includes(tipoName);
    const updated = exists ? config.tipos_habilitados.filter((t) => t !== tipoName) : [...config.tipos_habilitados, tipoName];
    const nextConfig = { ...config, tipos_habilitados: updated };
    setConfig(nextConfig);
    setSavingTipos(true);
    api<ConfiguracionParametrosDTO>("/parametros-clinicos/config", {
      method: "PUT",
      body: JSON.stringify(nextConfig),
    })
      .then((data) => {
        setConfig(data);
        toast.success(`Tipo "${tipoName}" ${exists ? "deshabilitado" : "habilitado"}.`);
      })
      .catch((e) => onError(e instanceof Error ? e.message : "Error"))
      .finally(() => setSavingTipos(false));
  };

  const handleResetNow = () => {
    if (!window.confirm("¿Restablecer parámetros a valores por defecto?")) return;
    setResetting(true);
    api<{ message: string }>("/parametros-clinicos/restablecer-defecto", { method: "POST" })
      .then((res) => toast.success(res.message || "Restablecidos"))
      .catch((e) => onError(e instanceof Error ? e.message : "Error"))
      .finally(() => setResetting(false));
  };

  const allAvailableTypes = [
    { key: "Historia Clinica", label: "Historia Clínica", desc: "HCPDIAAUT" },
    { key: "Enfermeria", label: "Enfermería", desc: "HCNMHRCRENF y HCNHAPLMED" },
    { key: "Otros", label: "Otros", desc: "Habilitación general con observación" },
  ];

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando configuración...</div>;

  return (
    <div className="space-y-6">
      <SectionHeader title="Valores Parámetros" subtitle="Valores por defecto, restablecimiento automático, tiempo máximo de contador y tipos de parámetros." />
      <div className="grid gap-6 md:grid-cols-3">
        {/* Valores por Defecto */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="p-2 bg-[#0778ac]/10 text-[#0778ac] rounded-xl font-bold">⚙</div>
              <div><h3 className="font-bold text-slate-800 text-sm">Valores por Defecto</h3><p className="text-xs text-slate-400">Valores estándar de cierre</p></div>
            </div>
            <div><label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Historia Clínica (HCPDIAAUT)</label><input type="number" value={config.hc_default} onChange={(e) => setConfig({ ...config, hc_default: Number(e.target.value) })} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white font-semibold" /></div>
            <div><label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Enfermería (HCNMHRCRENF)</label><input type="number" value={config.enf_hcrenf_default} onChange={(e) => setConfig({ ...config, enf_hcrenf_default: Number(e.target.value) })} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white font-semibold" /></div>
            <div><label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Enfermería (HCNHAPLMED)</label><input type="number" value={config.enf_haplmed_default} onChange={(e) => setConfig({ ...config, enf_haplmed_default: Number(e.target.value) })} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white font-semibold" /></div>
          </div>
          <div className="pt-5 mt-4 border-t border-slate-100 space-y-2">
            <button onClick={handleSaveDefaults} disabled={savingDefaults} className="w-full py-2.5 px-4 rounded-xl bg-[#0778ac] text-white text-xs font-bold disabled:opacity-50">{savingDefaults ? "Guardando..." : "Guardar Valores por Defecto"}</button>
            <button onClick={handleResetNow} disabled={resetting} className="w-full py-2.5 px-4 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"><RotateCcw size={13} /> {resetting ? "Restableciendo..." : "Restablecer Ahora"}</button>
          </div>
        </div>

        {/* Restablecimiento y Contador */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl font-bold">⏰</div>
              <div><h3 className="font-bold text-slate-800 text-sm">Restablecimiento y Contador</h3><p className="text-xs text-slate-400">Programación diaria y límite de contador</p></div>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-700">Activar tarea automática</span>
              <input type="checkbox" checked={config.auto_restablecer} onChange={(e) => setConfig({ ...config, auto_restablecer: e.target.checked })} className="w-5 h-5 accent-[#0778ac]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Hora Restablecimiento (24h)</label>
              <Time24hInput
                value={config.hora_restablecimiento || "20:05"}
                onChange={(val) => setConfig({ ...config, hora_restablecimiento: val })}
                disabled={!config.auto_restablecer}
                maxHours={23}
                placeholder="20:05"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Tiempo Máximo de Contador (HH:mm - Máx 12h)</label>
              <Time24hInput
                value={config.tiempo_maximo_contador || "12:00"}
                onChange={(val) => setConfig({ ...config, tiempo_maximo_contador: val })}
                maxHours={12}
                placeholder="12:00"
              />
              <p className="text-[11px] text-slate-500 mt-1">Valor por defecto y límite máximo permitido en solicitudes de enfermería e historia clínica.</p>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-xs text-blue-800">
              Todos los días a las <strong>{config.hora_restablecimiento}</strong> se restablecerán los parámetros abiertos y los contadores vencidos.
            </div>
          </div>
          <div className="pt-5 mt-4 border-t border-slate-100">
            <button onClick={handleSaveHora} disabled={savingHora} className="w-full py-2.5 px-4 rounded-xl bg-[#0778ac] text-white text-xs font-bold disabled:opacity-50">
              {savingHora ? "Guardando..." : "Guardar Configuración"}
            </button>
          </div>
        </div>

        {/* Tipos de Parámetros */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl font-bold">📋</div>
              <div><h3 className="font-bold text-slate-800 text-sm">Tipos de Parámetros</h3><p className="text-xs text-slate-400">Activar/desactivar módulos</p></div>
            </div>
            <div className="space-y-3">
              {allAvailableTypes.map((tipo) => {
                const isEnabled = config.tipos_habilitados.includes(tipo.key);
                return (
                  <div key={tipo.key} className={`p-3.5 rounded-2xl border ${isEnabled ? "bg-emerald-50/50 border-emerald-200" : "bg-slate-50 border-slate-200 opacity-60"}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">{tipo.label}</span>
                      <button onClick={() => handleToggleTipo(tipo.key)} disabled={savingTipos} className={`px-3 py-1 rounded-full text-xs font-bold ${isEnabled ? "bg-emerald-600 text-white" : "bg-slate-300 text-slate-700"}`}>
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
            Solo tipos habilitados aparecen en solicitudes.
          </div>
        </div>
      </div>
    </div>
  );
}

export default ValoresParametrosSection;

