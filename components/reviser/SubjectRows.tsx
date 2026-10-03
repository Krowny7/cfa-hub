// Briques de liste calme, partagées par Réviser, S'entraîner et les index
// /fiches et /courses : une ligne fine de maîtrise, et une liste en deux
// colonnes (ordre du programme, de haut en bas) séparée par des filets.
// Sans état ni hook : utilisable côté serveur.

/** Ligne fine de maîtrise (0–100 ; null = pas encore mesurée : piste vide). */
export function MasteryLine({ pct, label, delay = 0 }: { pct: number | null; label: string; delay?: number }) {
  return (
    <span
      className="ink-bar block h-[3px]"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct ?? 0}
      aria-label={pct === null ? `${label} : pas encore mesuré` : `${label} : ${pct} %`}
    >
      {pct !== null && <span className="rl-grow" style={{ width: `${pct}%`, animationDelay: `${delay}s` }} />}
    </span>
  );
}

/**
 * Deux colonnes sur ordinateur, une seule sur téléphone. Les éléments se
 * lisent de haut en bas puis de gauche à droite, comme le programme.
 */
export function TwoColumnRows<T>({ items, keyOf, render, className = "" }: { items: T[]; keyOf: (it: T) => string; render: (it: T, i: number) => React.ReactNode; className?: string }) {
  const half = Math.ceil(items.length / 2);
  const cols = [items.slice(0, half), items.slice(half)].filter((c) => c.length > 0);
  return (
    <div className={"grid grid-cols-1 md:grid-cols-2 md:gap-x-10 " + className}>
      {cols.map((col, c) => (
        <ul key={c} className={"m-0 flex min-w-0 list-none flex-col divide-y divide-line p-0 " + (c === 1 ? "border-t border-line md:border-t-0" : "")}>
          {col.map((it, i) => (
            <li key={keyOf(it)}>{render(it, c * half + i)}</li>
          ))}
        </ul>
      ))}
    </div>
  );
}
