"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * Ce qui a été gagné depuis la dernière visite d'une page de calculs (direction du 2026-11-13 : seul ce
 * qui a changé s'anime). `etat` : des compteurs par clé (bâtons d'une matière, pastille tenue d'un
 * niveau…). Le souvenir de la visite précédente est lu dans le navigateur APRÈS l'hydratation (rien au
 * premier rendu, donc pas d'écart serveur/navigateur), puis remplacé par l'état du moment. Effet de
 * mise en page (useLayoutEffect) : en navigation interne, la marque « neuf » est posée avant la
 * première peinture, la pièce gagnée ne paraît pas pleine puis effacée. Rend, par
 * clé, combien de crans ont été gagnés. Sans souvenir (première visite, navigation privée) : rien ne
 * s'anime. `pret` : la progression est lue (le repli local arrive après le montage).
 */
export function useGagnes(cle: string, etat: Record<string, number>, pret: boolean): Record<string, number> {
  const [gagnes, setGagnes] = useState<Record<string, number>>({});
  const fait = useRef(false);
  const signature = JSON.stringify(etat);
  useLayoutEffect(() => {
    if (!pret || fait.current) return;
    fait.current = true;
    const maintenant = JSON.parse(signature) as Record<string, number>;
    let avant: Record<string, number> | null = null;
    try {
      const brut = window.localStorage.getItem(cle);
      avant = brut ? (JSON.parse(brut) as Record<string, number>) : null;
    } catch {
      avant = null;
    }
    try {
      window.localStorage.setItem(cle, signature);
    } catch {
      /* stockage fermé : rien ne s'animera la prochaine fois */
    }
    if (!avant || typeof avant !== "object") return;
    const d: Record<string, number> = {};
    for (const [k, v] of Object.entries(maintenant)) {
      const a = Number(avant[k] ?? 0) || 0;
      if (v > a) d[k] = v - a;
    }
    if (Object.keys(d).length) setGagnes(d);
  }, [cle, signature, pret]);
  return gagnes;
}
