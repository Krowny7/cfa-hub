import { useSyncExternalStore } from "react";

// Le lien entre le panneau des quêtes (SceauQuetes, lu en flux) et le bouton du joueur de la
// barre du haut (UserMenu) : ils sont voisins, sans parent commun qui porte leur état.

/** Le bouton du joueur demande d'ouvrir le panneau des quêtes (`detail.recolter` : et d'y tout récupérer d'emblée). */
export const OUVRIR_QUETES = "rl:quetes-ouvrir";

let compte: number | null = null;
const abonnes = new Set<() => void>();

/** Le panneau dit combien de récompenses attendent. */
export function direRecompenses(n: number): void {
  compte = n;
  abonnes.forEach((f) => f());
}

const abonner = (f: () => void) => {
  abonnes.add(f);
  return () => {
    abonnes.delete(f);
  };
};

/** Ce que le panneau a dit ; null : rien encore (pas de Codex, ou pas encore lu). */
export const useRecompenses = () => useSyncExternalStore(abonner, () => compte, () => null);
