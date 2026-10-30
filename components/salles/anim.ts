"use client";

import { useEffect, useRef, useState } from "react";

// Deux petits outils de l'écran de partie.
//  - useHeureServeur : l'heure du serveur, rafraîchie plusieurs fois par
//    seconde. null avant le montage : le rendu du serveur (Next) et le premier
//    rendu du navigateur sont identiques (aucune heure lue pendant le rendu),
//    l'écran de jeu n'apparaît qu'ensuite — pas d'erreur d'hydratation.
//  - useCompteur : un nombre qui monte (ou descend) en douceur vers sa cible,
//    pour les points. Coupé en mouvement réduit et en mode discret.

export function useHeureServeur(maintenant: () => number, pasMs = 200): number | null {
  const [t, setT] = useState<number | null>(null);
  const lire = useRef(maintenant);
  lire.current = maintenant;
  useEffect(() => {
    setT(lire.current());
    const i = setInterval(() => setT(lire.current()), pasMs);
    return () => clearInterval(i);
  }, [pasMs]);
  return t;
}

/** Le mouvement est-il coupé (préférence du système ou mode discret du site) ? */
export function mouvementReduit(): boolean {
  try {
    if (document.documentElement.dataset.discreet === "1") return true;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return true;
  }
}

export function useCompteur(cible: number, dureeMs = 700, depuis?: number): number {
  const [valeur, setValeur] = useState(depuis ?? cible);
  const courante = useRef(depuis ?? cible);
  useEffect(() => {
    if (cible === courante.current) return;
    if (mouvementReduit()) {
      courante.current = cible;
      setValeur(cible);
      return;
    }
    const de = courante.current;
    const t0 = performance.now();
    let id = 0;
    const pas = (now: number) => {
      const k = Math.min(1, (now - t0) / dureeMs);
      const doux = 1 - Math.pow(1 - k, 3);
      courante.current = Math.round(de + (cible - de) * doux);
      setValeur(courante.current);
      if (k < 1) id = requestAnimationFrame(pas);
    };
    id = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(id);
  }, [cible, dureeMs]);
  return valeur;
}
