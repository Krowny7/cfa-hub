import type { ModeleRangee } from "@/lib/profil/disposition";

// Les modèles de rangée en CSS (partagés par la page et l'éditeur) : la
// grille de chaque modèle sur grand écran, la place de chaque case, et la
// vignette du modèle (comme les dispositions d'ancrage de Windows). Sur
// téléphone, toutes les cases passent l'une sous l'autre, dans l'ordre.

/** La grille d'une rangée, sur grand écran. */
export const GRILLE: Record<ModeleRangee, string> = {
  plein: "",
  deux: "lg:grid-cols-2",
  "grand-petit": "lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]",
  "petit-grand": "lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]",
  trois: "lg:grid-cols-3",
  // la pile : 1re case à sa hauteur, la 2e juste dessous (la rangée 1fr prend le reste)
  "grand-pile": "lg:grid-cols-2 lg:grid-rows-[auto_1fr]",
  "pile-grand": "lg:grid-cols-2 lg:grid-rows-[auto_1fr]",
  quatre: "lg:grid-cols-2",
};

/** La place de chaque case, quand elle n'est pas dans l'ordre naturel. */
export const PLACE: Partial<Record<ModeleRangee, string[]>> = {
  "grand-pile": ["lg:col-start-1 lg:row-start-1 lg:row-span-2", "lg:col-start-2 lg:row-start-1", "lg:col-start-2 lg:row-start-2"],
  "pile-grand": ["lg:col-start-1 lg:row-start-1", "lg:col-start-1 lg:row-start-2", "lg:col-start-2 lg:row-start-1 lg:row-span-2"],
};
export const placeDe = (m: ModeleRangee, i: number) => PLACE[m]?.[i] ?? "";

// la vignette : les mêmes formes, à toutes les tailles
const SCHEMA: Record<ModeleRangee, { grille: string; cases: string[] }> = {
  plein: { grille: "grid-cols-1", cases: [""] },
  deux: { grille: "grid-cols-2", cases: ["", ""] },
  "grand-petit": { grille: "grid-cols-[2fr_1fr]", cases: ["", ""] },
  "petit-grand": { grille: "grid-cols-[1fr_2fr]", cases: ["", ""] },
  trois: { grille: "grid-cols-3", cases: ["", "", ""] },
  "grand-pile": { grille: "grid-cols-2 grid-rows-2", cases: ["row-span-2", "", ""] },
  "pile-grand": { grille: "grid-cols-2 grid-rows-2", cases: ["col-start-1 row-start-1", "col-start-1 row-start-2", "col-start-2 row-start-1 row-span-2"] },
  quatre: { grille: "grid-cols-2 grid-rows-2", cases: ["", "", "", ""] },
};

/** La vignette d'un modèle ; `actives` : les cases à remplir (les autres en creux). */
export function SchemaModele({ m, className = "", pleines }: { m: ModeleRangee; className?: string; pleines?: boolean[] }) {
  const s = SCHEMA[m];
  return (
    <span aria-hidden className={`grid gap-[3px] ${s.grille} ${className}`}>
      {s.cases.map((c, i) => (
        <span key={i} className={`min-h-0 rounded-[3px] border border-current ${c} ${pleines?.[i] ? "bg-current opacity-80" : "opacity-60"}`} />
      ))}
    </span>
  );
}
