"use client";

// Le mouvement « mérité » (cahier du 2026-11-13, règle 8) : une arrivée ne se joue qu'à la première
// visite de la session. `dejaVu` se lit APRÈS l'hydratation (dans un effet) : au premier rendu, rien
// ne dépend du navigateur. Chaque appel relit sessionStorage puis marque la page vue : un retour par
// le site (le module, lui, reste chargé) lit donc « déjà vue ». Le double effet du mode strict ne
// doit pas relire : l'appelant garde la première réponse dans une ref (React la garde entre les deux
// passes). Stockage fermé (navigation privée…) : l'arrivée se joue, sans plus.

/** true si la page `cle` a déjà été vue dans cette session du navigateur (et la marque vue). */
export function dejaVu(cle: string): boolean {
  try {
    const k = "rl-vu:" + cle;
    const vu = window.sessionStorage.getItem(k) === "1";
    window.sessionStorage.setItem(k, "1");
    return vu;
  } catch {
    return false;
  }
}
