export function ParametroBadge({ title, abierto, valor, valor2 }: { title: string, abierto: boolean, valor: number, valor2?: number }) {
  const valueText = valor2 !== undefined ? `: ${valor}, : ${valor2}` : `${valor}`;
  if (abierto) {
    return (
      <div className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-2xl text-xs md:text-sm font-bold ring-1 ring-emerald-300 shadow-sm flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
        Parametro {title} Abierto {valueText}
      </div>
    );
  }
  return (
    <div className="bg-red-100 text-red-800 px-4 py-2 rounded-2xl text-xs md:text-sm font-bold ring-1 ring-red-300 shadow-sm flex items-center gap-2">
      <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
      Parametro {title} Cerrado {valueText}
    </div>
  );
}
