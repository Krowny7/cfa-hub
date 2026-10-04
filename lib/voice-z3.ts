// Voix « Le Trait » : les phrases propres aux sessions, QCM, flashcards et
// examens (zone Z3), dans l'esprit de lib/voice.ts, à y fusionner.
//
// Module neutre (ni « use client » ni serveur). Mêmes garde-fous que
// lib/voice.ts : toujours le chiffre, jamais « raté » ni « Bravo », pas de
// point d'exclamation, et le bout qui reste toujours nommé.

import { joursEncre, nombre, pluriel, questions, ratures, serie, signe, traits, SIGNATURE, type EtatJour } from "@/lib/voice";

/** Le nom de chaque épreuve, en sur-titre de la copie. */
export const EPREUVE = {
  practice: "Entraînement ciblé",
  daily: "Session du jour",
  qcm: "QCM",
  exam: "Mode examen",
  mock: "Examen blanc",
  retake: "Essai d'entraînement",
} as const;

export const cartes = (n: number) => pluriel(n, "carte", "cartes");

/** Avant de commencer (QCM, examen blanc, essai) : la signature. */
export const AVANT = {
  titre: SIGNATURE,
  /** QCM : corrigé à chaque question */
  qcm: "Corrigées une à une, sans chrono.",
} as const;

/** La correction détaillée, sous la copie. */
export const CORRECTION = {
  titre: "Correction",
  mesRatures: "Mes ratures",
  tout: "Tout",
  juste: "Juste",
  rature: "Rature",
  sansReponse: "Sans réponse",
  /** filtre « Mes ratures » sans rien dedans */
  pagePropre: "Page propre. Rien à reprendre ici.",
  /** correction repliée */
  repliee: (err: number, total: number) =>
    err > 0 ? `${ratures(err)} sur ${questions(total)}, avec les explications.` : `Page propre sur ${questions(total)}.`,
  voir: "Voir la correction",
} as const;

/**
 * La répartition par matière sous la copie (rangée de la plus faible à la
 * plus forte) : « le plus fragile : Derivatives, 2/6 » ; tout juste : « page
 * propre partout ».
 */
export const PAR_MATIERE = {
  meta: (plusFaible: { topic: string; correct: number; total: number }) =>
    plusFaible.correct >= plusFaible.total
      ? "page propre partout"
      : `le plus fragile : ${plusFaible.topic}, ${nombre(plusFaible.correct)}/${nombre(plusFaible.total)}`,
} as const;

/** Retour immédiat d'une question corrigée sur-le-champ (QCM, session du jour). */
export const REPONSE = {
  juste: "Juste.",
  rature: "Rature.",
  laBonne: "La bonne réponse",
} as const;

/** « Reprendre mes ratures » : la copie rejouée, ratures seulement. */
export const REPRISE = {
  surTitre: "Reprendre mes ratures",
  compte: (i: number, n: number) => `${nombre(i)}/${nombre(n)}`,
  reprise: "Rature reprise.",
  encore: "Encore une rature : lis l'explication, juste au-dessus.",
  /** question sans explication */
  encoreSeule: "Encore une rature. La bonne réponse est cochée.",
  /** fin de la reprise : « 7 sur 9 reprises. » / « Toutes reprises. » */
  fin: (reprises: number, total: number) => (reprises >= total ? "Toutes reprises." : `${nombre(reprises)} sur ${nombre(total)} reprises.`),
  finLigne: (reste: number) => (reste > 0 ? `${ratures(reste)} à reprendre encore. Ça se reprend.` : "Page propre."),
  recommencer: (n: number) => `Reprendre les ${nombre(n)} restantes`,
  retour: "Revenir à la copie",
  /** la reprise ne s'enregistre pas : on le dit une fois, discrètement */
  note: "Entraînement libre : rien n'est enregistré.",
} as const;

/**
 * Sous la copie, à côté de l'anneau du jour (qui cote lui-même le bout qui
 * reste, « encore 14 ») : « +22 traits · anneau du jour 26/40 » ; à
 * l'objectif, « +22 traits · journée tenue », puis « · +6 en bonus » ;
 * anneau inconnu : « +22 traits ».
 */
export function ligneAnneauFin(ajoutes: number, jour: number | null, objectif: number): string {
  const plus = `+${traits(ajoutes)}`;
  if (jour === null) return plus;
  if (jour < objectif) return `${plus} · anneau du jour ${nombre(jour)}/${nombre(objectif)}`;
  return `${plus} · journée tenue${jour > objectif ? ` · ${signe(jour - objectif)} en bonus` : ""}`;
}

/** Flashcards : la fin d'une passe (les cartes ne sont pas des traits). */
export function finPasse(sues: number, total: number, aRevoir: number): { titre: string; ligne: string } {
  if (total === 0) return { titre: "Papier blanc.", ligne: "Aucune carte cette fois. Relance quand tu veux." };
  if (aRevoir === 0) return { titre: "Page propre.", ligne: `${cartes(sues)} ${sues > 1 ? "sues" : "sue"}. Elles reviendront, de plus en plus espacées.` };
  return {
    titre: `${cartes(aRevoir)} à reprendre.`,
    ligne: `${nombre(sues)} sur ${nombre(total)} ${sues > 1 ? "sues" : "sue"}. Les autres reviendront en premier.`,
  };
}

export const FLASHCARDS = {
  surTitre: "Passe terminée",
  /** l'anneau du jour, à côté d'une passe de cartes (elles ne le font pas avancer) */
  anneau: (jour: number, objectif: number) =>
    jour >= objectif ? "Journée tenue. Le dernier bout, c'est demain." : "Les cartes ne tracent pas l'anneau du jour : les questions, si.",
  reprendre: (n: number) => `Reprendre les ${nombre(n)}`,
} as const;

/**
 * Préparer une session : les jours d'encre en jeu, selon le trait du jour.
 * « 6 jours d'encre · ton trait d'aujourd'hui est tracé » ; le soir, rien
 * encore : « 6 jours d'encre · encre sèche ce soir · une question suffit ».
 */
export function serieSession(jours: number, etat: EtatJour = "attente"): string {
  if (jours <= 0 && etat !== "fait") return "Papier blanc. Un trait suffit pour commencer.";
  return `${joursEncre(Math.max(jours, 1))} · ${serie(jours, etat).ligne}`;
}

/** « Copier pour l'IA » : la petite ligne dans le bouton. */
export const COPIE_IA = {
  tout: "toute la copie",
  mesRatures: (n: number) => `Mes ${ratures(n)}`,
  /** la seconde part du bouton : « Copier pour l'IA · toute la copie | mes 6 ratures » */
  seulement: (n: number) => `mes ${ratures(n)}`,
} as const;

/** Copie rendue sans aucune réponse (session du jour arrêtée tout de suite). */
export const COPIE_BLANCHE = {
  titre: "Papier blanc.",
  ligne: "Aucune question cette fois. Relance quand tu veux : un trait suffit.",
} as const;

/** Mode examen (/exam) : la copie s'enregistre dans tes stats. */
export const EXAMEN = {
  nonEnregistree: "Copie non enregistrée : elle ne comptera pas dans tes stats.",
  sansReponse: (n: number) => (n > 0 ? `${pluriel(n, "question", "questions")} sans réponse` : null),
} as const;

/** Examen blanc classé : l'ELO, dans l'en-tête de la copie. */
export const ELO_COPIE = {
  applique: (delta: number) => `ELO ${signe(delta)}`,
} as const;
