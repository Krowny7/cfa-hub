// Les Sceaux du profil (étape 1) : 16 sceaux à trois paliers (encre,
// vermillon, dorure), soit 48 paliers, tous calculés depuis ProfilStats
// (statsProfil, lib/profil/donnees.ts), sans table ni migration. Ils ne
// sont pas encore gardés en base : une maîtrise qui baisse retire le
// palier d'une matière, et la date d'obtention n'est pas connue.
// Les seuils ne vivent qu'ici (comme CADRES dans lib/profil/catalogue.ts).
// Module neutre (client et serveur).

import type { ProfilStats } from "@/lib/profil/catalogue";
import { SUBJECTS } from "@/components/reviser/catalog";

/** 0 : pas encore gagné (gaufré) ; 1 encre ; 2 vermillon ; 3 dorure */
export type Palier = 0 | 1 | 2 | 3;

export type Famille = "regularite" | "duels" | "calculs" | "examens" | "matieres";
export const FAMILLES: Famille[] = ["regularite", "duels", "calculs", "examens", "matieres"];

/** ce que compte un sceau (le libellé vient de lib/voice-profil.ts) */
export type Unite = "jours" | "questions" | "defis" | "victoires" | "calculs" | "examens" | "maitrise";

export type DefSceau = {
  /** « assiduite », « matiere:fsa » */
  cle: string;
  famille: Famille;
  unite: Unite;
  /** seuils de l'encre, du vermillon et de la dorure */
  seuils: readonly [number, number, number];
  /**
   * À palier égal, l'ordre des sceaux posés d'office : à défaut de rareté
   * mesurée (étape 3), la difficulté estimée du palier (plus haut : plus rare).
   */
  difficulte: number;
  /** la matière (clé de lib/practiceTopics.ts) d'un sceau de maîtrise */
  matiere?: string;
};

/** une matière n'est mesurée qu'à partir de 40 questions */
export const MAITRISE_MIN_QUESTIONS = 40;

export const SCEAUX: DefSceau[] = [
  { cle: "assiduite", famille: "regularite", unite: "jours", seuils: [7, 30, 100], difficulte: 4 },
  { cle: "copie-pleine", famille: "regularite", unite: "questions", seuils: [500, 2500, 10000], difficulte: 2 },
  { cle: "defi-tenu", famille: "regularite", unite: "defis", seuils: [7, 30, 100], difficulte: 3 },
  { cle: "duelliste", famille: "duels", unite: "victoires", seuils: [1, 25, 100], difficulte: 5 },
  { cle: "calculateur", famille: "calculs", unite: "calculs", seuils: [50, 250, 1000], difficulte: 3 },
  { cle: "examen-blanc", famille: "examens", unite: "examens", seuils: [1, 3, 10], difficulte: 4 },
  ...SUBJECTS.map((m): DefSceau => ({ cle: `matiere:${m.key}`, famille: "matieres", unite: "maitrise", seuils: [60, 75, 90], difficulte: 1, matiere: m.key })),
];


export type EtatSceau = {
  def: DefSceau;
  palier: Palier;
  /** la mesure du sceau (jours, questions…, ou % de maîtrise) */
  valeur: number;
  /** matière : questions répondues (la maîtrise compte à partir de 40) */
  questions: number | null;
  /** seuil du palier suivant (null : dorure) */
  prochain: number | null;
  /** avancée vers le palier suivant, de 0 à 1 (1 : dorure) */
  avance: number;
};

function mesure(def: DefSceau, s: ProfilStats): { valeur: number; questions: number | null } {
  switch (def.cle) {
    case "assiduite":
      return { valeur: s.meilleureSerie, questions: null };
    case "copie-pleine":
      return { valeur: s.questions, questions: null };
    case "defi-tenu":
      return { valeur: s.defisRendus, questions: null };
    case "duelliste":
      return { valeur: s.duelsGagnes, questions: null };
    case "calculateur":
      return { valeur: s.calculsJustes, questions: null };
    case "examen-blanc":
      return { valeur: s.examensBlancs, questions: null };
    default: {
      const m = s.matieres.find((x) => x.key === def.matiere);
      return { valeur: m && m.pct !== null ? Math.round(m.pct) : 0, questions: m ? m.answered : 0 };
    }
  }
}

/** L'état d'un sceau pour un joueur. */
export function etatSceau(def: DefSceau, s: ProfilStats): EtatSceau {
  const { valeur, questions } = mesure(def, s);
  const mesuree = questions === null || questions >= MAITRISE_MIN_QUESTIONS;
  const palier = (mesuree ? def.seuils.filter((x) => valeur >= x).length : 0) as Palier;
  const prochain: number | null = palier < 3 ? (def.seuils as readonly number[])[palier] : null;
  let avance = 1;
  if (prochain !== null) {
    if (!mesuree) avance = (questions ?? 0) / MAITRISE_MIN_QUESTIONS;
    else {
      // une maîtrise part de 40 % (le hasard en fait déjà 33) ; un compte, de 0
      const base = palier > 0 ? def.seuils[palier - 1] : def.unite === "maitrise" ? 40 : 0;
      avance = Math.max(0, Math.min(1, (valeur - base) / Math.max(1, prochain - base)));
    }
  }
  return { def, palier, valeur, questions, prochain, avance: Math.min(1, avance) };
}

/** Les 16 sceaux d'un joueur, dans l'ordre du catalogue. */
export function sceauxDe(s: ProfilStats): EtatSceau[] {
  return SCEAUX.map((d) => etatSceau(d, s));
}

/** Sceaux gagnés, quel que soit leur palier (7 sur 16). */
export const sceauxGagnes = (etats: EtatSceau[]) => etats.filter((e) => e.palier > 0).length;

/** Les 3 paliers les plus proches (sur son propre profil) : les mieux avancées, hors dorures. */
export function aPortee(s: ProfilStats, n = 3): EtatSceau[] {
  return sceauxDe(s)
    .filter((e) => e.prochain !== null && e.avance < 1)
    .sort((a, b) => b.avance - a.avance || b.palier - a.palier || b.def.difficulte - a.def.difficulte)
    .slice(0, n);
}

/**
 * Les 3 sceaux posés d'office dans l'en-tête : les paliers les plus hauts,
 * puis les plus rares (difficulté estimée) ; une famille différente d'abord,
 * pour que trois matières ne prennent pas toute la place.
 */
export function posesDe(etats: EtatSceau[], n = 3): EtatSceau[] {
  const gagnes = etats.filter((e) => e.palier > 0).sort((a, b) => b.palier - a.palier || b.def.difficulte - a.def.difficulte);
  const out: EtatSceau[] = [];
  for (const e of gagnes) if (out.length < n && !out.some((x) => x.def.famille === e.def.famille)) out.push(e);
  for (const e of gagnes) if (out.length < n && !out.includes(e)) out.push(e);
  return out;
}

/** Le seuil affiché sur un sceau : celui de son palier, ou de l'encre s'il est encore gaufré. */
export const seuilAffiche = (e: EtatSceau) => e.def.seuils[Math.max(0, e.palier - 1)];
