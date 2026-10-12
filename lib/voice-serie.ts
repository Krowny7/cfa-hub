// Voix « Le Trait » pour la série d'encre (lib/serie-encre.ts). Sobre : le
// chiffre d'abord, jamais « raté », « échec » ni « Bravo ».
// Module neutre (ni « use client » ni serveur).

import { pluriel } from "@/lib/voice";
import { libelleMult, minutesAvantMinuit, type SerieEncre } from "@/lib/serie-encre";

export const SERIE = {
  nom: "Série d'encre",
  /** « 9 jours d'affilée » */
  jours: (n: number) => pluriel(n, "jour d'affilée", "jours d'affilée"),
  /** « ×2 · 9 jours d'affilée » ; avant le premier palier, « 2 jours d'affilée · ×1,5 à 3 jours » */
  ligne: (s: SerieEncre) => {
    const m = libelleMult(s.mult);
    const n = s.serieAffichee;
    if (m) return `${m} · ${SERIE.jours(n)}`;
    if (n > 0) return `${SERIE.jours(n)} · ×1,5 à 3 jours`;
    return `${s.seuil} questions par jour pour lancer ta série`;
  },
  /** L'aide d'infobulle : la règle en une phrase. */
  regle: (seuil: number) => `Un jour compte à partir de ${seuil} questions. 3 jours d'affilée : ×1,5 sur l'XP. 7 jours et plus : ×2.`,
  joker: (dispo: boolean) => (dispo ? "Joker de la semaine : 1" : "Joker de la semaine : utilisé"),
  jokerAide: "Un jour manqué par semaine ne casse pas la série.",
  /** « Plus que 5 h pour garder ta série » ; moins d'une heure : « Moins d'une heure ». */
  tempsRestant: (now: Date = new Date()) => {
    const min = minutesAvantMinuit(now);
    if (min <= 60) return "Moins d'une heure pour garder ta série";
    return `Plus que ${Math.ceil(min / 60)} h pour garder ta série`;
  },
  meilleure: (n: number) => `Meilleure série : ${pluriel(n, "jour", "jours")}`,
  celebration: {
    sur: "Série d'encre",
    mot: "Ton XP est doublée.",
    indice: "Toucher pour continuer",
  },
} as const;
