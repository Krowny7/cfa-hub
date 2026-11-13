"use client";

import { useLayoutEffect, useRef } from "react";
import { useGagnes } from "@/components/calculs/souvenir";
import { dejaVu } from "@/components/session/premiere-visite";

// Le mouvement « mérité » des packs de /official-exams (cahier du 2026-11-13, règle 8) : la pose des
// packs ne se joue qu'à la première visite de la session (data-calme sur le rayon), et le tampon d'un
// score ne s'abat que s'il est nouveau (ou meilleur) depuis la dernière visite (data-neuf, via le
// souvenir des calculs). Tout se lit après l'hydratation : le rendu serveur ne dépend de rien.
// Ne rend rien de visible : il marque le rayon voisin (ul[data-rayon="packs"]).

export function SouvenirPacks({ scores }: { scores: Record<string, number> }) {
  const ref = useRef<HTMLSpanElement>(null);
  const gagnes = useGagnes("rl-packs-scores", scores, true);
  const cles = Object.keys(gagnes).join("|");

  useLayoutEffect(() => {
    const rayon = ref.current?.parentElement?.querySelector<HTMLElement>('ul[data-rayon="packs"]');
    if (rayon && dejaVu("official-exams")) rayon.dataset.calme = "1";
  }, []);

  useLayoutEffect(() => {
    if (!cles) return;
    const rayon = ref.current?.parentElement?.querySelector<HTMLElement>('ul[data-rayon="packs"]');
    if (!rayon) return;
    for (const cle of cles.split("|")) {
      for (const el of rayon.querySelectorAll<HTMLElement>("[data-tampon]")) {
        if (el.dataset.tampon === cle) el.dataset.neuf = "1";
      }
    }
  }, [cles]);

  return <span ref={ref} hidden />;
}
