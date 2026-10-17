// La séance du jour gardée dans CE navigateur (V3 §6.2, repli) : quand la
// base ne la garde pas (codex_seances absente, migration_codex_v3.sql §6),
// « Commencer » et « J'arrête là » se notent ici pour la journée, et la
// pastille « Continuer » s'en souvient d'une page à l'autre. Aussi : la
// pastille masquée pour la journée (« × »), la trace « vue » envoyée une
// fois, la fin de séance fêtée une fois. Jamais d'erreur : stockage bloqué,
// rien de gardé. Module navigateur (appelé depuis des effets).

export type EtatIci = "lancee" | "finie";

const lire = (cle: string): string | null => {
  try {
    return window.localStorage.getItem(cle);
  } catch {
    return null;
  }
};
const ecrire = (cle: string, v: string) => {
  try {
    window.localStorage.setItem(cle, v);
  } catch {
    // stockage bloqué : rien de gardé
  }
};

/** « Commencer » ou « J'arrête là », noté dans ce navigateur pour ce jour. */
export function seanceIci(jour: string): EtatIci | null {
  const v = lire(`rl:seance:${jour}`);
  return v === "lancee" || v === "finie" ? v : null;
}
export const noterSeanceIci = (jour: string, etat: EtatIci) => ecrire(`rl:seance:${jour}`, etat);

/** Une marque d'un jour (« masquee », « vue », « fetee ») : vraie une fois posée, jusqu'au lendemain. */
export const marqueIci = (quoi: "masquee" | "vue" | "fetee", jour: string): boolean => lire(`rl:seance-${quoi}:${jour}`) === "1";
export const poserMarqueIci = (quoi: "masquee" | "vue" | "fetee", jour: string) => ecrire(`rl:seance-${quoi}:${jour}`, "1");
