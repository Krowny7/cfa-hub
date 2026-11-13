"use client";

import { GrapheCraie } from "@/components/ui/Dispositions";
import { nombre } from "@/lib/voice";
import { SOUS_ENTRAINEMENT } from "@/lib/voice-entrainement-sous";

const M = SOUS_ENTRAINEMENT.calculsMatiere;

export type PointFaible = { cle: string; nom: string; pct: number; ok: number; n: number; tenus: number; href: string };

/**
 * Les points faibles d'une matière, écrits au bas du tableau noir (direction du 2026-11-13 : un seul
 * objet, plus d'annexe) : les calculs entamés sous le seuil « tenu » (4 justes sur 5), les plus faibles
 * en haut, en barres de craie hachurées ; le seuil en pointillé de craie glace. Le détail (justes,
 * essais, niveaux) au survol et au lecteur d'écran ; chaque barre mène au calcul. Au-delà de `max`, une
 * ligne dit combien il en reste. Se pose dans le `dessous` du Tableau.
 */
export function PointsFaibles({ points, seuil, max = 8 }: { points: PointFaible[]; seuil: number; max?: number }) {
  const vus = points.slice(0, max);
  const reste = points.length - vus.length;
  return (
    <GrapheCraie
      titre={M.faibles}
      seuil={seuil}
      seuilNom={M.seuil(seuil)}
      reste={reste > 0 ? M.autres(reste) : null}
      barres={vus.map((p) => ({
        cle: p.cle,
        nom: p.nom,
        pct: p.pct,
        href: p.href,
        detail: M.detail(p.ok, p.n, p.tenus),
        aria: `${p.nom}, ${nombre(p.pct)} %, ${M.detail(p.ok, p.n, p.tenus)}`,
      }))}
    />
  );
}
