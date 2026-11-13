"use client";

// Le mouvement « mérité » (cahier du 2026-11-13, règle 8) : une arrivée ne se joue qu'à la première
// visite de la session. `dejaVu` se lit APRÈS l'hydratation (useEffect) : au premier rendu, rien ne
// dépend du navigateur. La réponse est gardée pour la durée de la page (le double effet du mode
// strict lit la même chose). Stockage fermé (navigation privée…) : l'arrivée se joue, sans plus.

const lus = new Map<string, boolean>();

/** true si la page `cle` a déjà été vue dans cette session du navigateur (et la marque vue). */
export function dejaVu(cle: string): boolean {
  const deja = lus.get(cle);
  if (deja !== undefined) return deja;
  let vu = false;
  try {
    const k = "rl-vu:" + cle;
    vu = window.sessionStorage.getItem(k) === "1";
    window.sessionStorage.setItem(k, "1");
  } catch {
    vu = false;
  }
  lus.set(cle, vu);
  return vu;
}
