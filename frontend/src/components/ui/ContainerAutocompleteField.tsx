/**
 * PR10 — extraído desde src/app/App.tsx:89 ContainerAutocompleteField
 */
export function ContainerAutocompleteField({
  label,
  listId,
  value,
  onChange,
  options,
}: {
  label: string;
  listId: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">{label}</label>
      <input
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Seleccione o escriba un contenedor"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0778ac]"
      />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
      <p className="mt-2 text-xs text-slate-500">Puede elegir un contenedor existente o escribir uno nuevo.</p>
    </div>
  );
}
