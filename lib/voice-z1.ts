// Voix « Le Trait », zone Z1 (accueil, Moi, inscription, connexion, 404) :
// les phrases qui manquaient à lib/voice.ts, écrites dans le même esprit
// (un mot par chose, toujours le chiffre, pas d'emphase, jamais « raté »).
// Module neutre (ni « use client » ni serveur), à fusionner dans lib/voice.ts.

import { ENCRE, LEXIQUE, nombre, pct, pluriel, serie, signe, type EtatJour } from "@/lib/voice";

// ---------------------------------------------------------------------------
// Accueil

/**
 * La phrase des bâtons, sous la ligne de contexte. Comme `serie().ligne`,
 * sauf une série perdue (déjà venu, rien depuis avant-hier) : « L'encre a
 * séché. Un trait suffit pour repartir. »
 */
export function ligneSerie(jours: number, jour: EtatJour, dejaVenu: boolean): string {
  if (jours <= 0 && jour !== "fait" && dejaVenu) return ENCRE.aSeche;
  return serie(jours, jour).ligne;
}

/** Jours sans venir à partir desquels l'accueil prend la variante « retour ». */
export const JOURS_RETOUR = 3;

export const TUILES = {
  titre: "Aujourd'hui",
  defiRecu: "Défi reçu",
  duelEnCours: "Duel en cours",
  duelRevoir: "Duel à revoir",
  ratures: "Ratures",
  reprendre: "Les reprendre",
  examen: "Examen blanc classé",
  duel: "Duel",
  lancer: "Lancer un duel",
  meta: "même épreuve, 30 questions",
} as const;

/** Tuile « duel à revoir » : « Défaite contre Hugo P. » + « 19 contre 22 · −9 ELO ». */
export function duelARevoir({
  gagne,
  moi,
  lui,
  adversaire,
  delta,
}: {
  /** true : victoire · false : défaite · null : nulle */
  gagne: boolean | null;
  moi: number | null;
  lui: number | null;
  adversaire: string | null;
  delta?: number | null;
}): { titre: string; ligne: string } {
  const mot = gagne === true ? "Victoire" : gagne === false ? "Défaite" : LEXIQUE.nulle;
  const qui = adversaire ?? "un joueur";
  const score = moi !== null && lui !== null ? `${nombre(moi)} contre ${nombre(lui)}` : null;
  return { titre: `${mot} contre ${qui}`, ligne: [score, delta ? `${signe(delta)} ELO` : null].filter(Boolean).join(" · ") || "partie terminée" };
}

/** Rang, verrou en une ligne (carte de rang compacte) : « Diamant demande 60 % de maîtrise ». */
export const verrouCourt = (palier: string, requise: number) => `${palier} demande ${pct(requise)} de maîtrise`;

/** « 60 % de maîtrise requise » (après « 88 points avant Diamant · ») */
export const maitriseRequise = (requise: number) => `${pct(requise)} de maîtrise requise`;

export const REPRISE = {
  /** variante « retour » : l'action, sans « tu nous as manqué » */
  action: "Reprendre",
  /** premier usage : l'action de la carte */
  choisir: "Choisir une fiche",
  ouQcm: "ou lance un QCM",
} as const;

// ---------------------------------------------------------------------------
// Moi

export const MOI = {
  /** ligne de repères de l'en-tête */
  serieVide: "Papier blanc",
  fixeJourJ: "Fixe ton jour J",
  examenPasse: "Examen passé",
  /** onglet Erreurs : le carnet de ratures */
  ratures: "Ratures",
  aReprendre: "à reprendre",
  regle: "Une rature se raye quand tu réussis la question deux fois d'affilée.",
  liste: "Ratures à reprendre",
  recentes: "les plus récentes",
  rayeesTitre: "Rayées",
  pagePropre: LEXIQUE.pagePropre,
  pagePropreTexte: (tentees: number) => `${pluriel(tentees, "question de fiche tentée", "questions de fiches tentées")} : chaque rature a été reprise.`,
  rienEncore: "Pas encore de rature",
  rienEncoreTexte: "Les questions manquées dans les quiz des fiches s'inscriront ici, au stylo rouge.",
  appareil: "Tes ratures sont gardées sur cet appareil",
  appareilTexte: "La sauvegarde des réponses sur ton compte n'est pas encore activée : retrouve-les dans l'onglet « Mes erreurs » de chaque fiche.",
  ratee: (fois: number) => `manquée ${fois} fois`,
  rayee: "rayée",
  autres: (n: number) => `Et ${pluriel(n, "autre", "autres")} : ouvre une fiche, onglet « Mes erreurs », pour tout reprendre.`,
  /** carte Activité, sous les bâtons */
  serieAide: (jours: number) => (jours > 0 ? "Une question par jour suffit à garder l'encre fraîche." : "Une question aujourd'hui, et le premier bâton est tracé."),
} as const;

/** « 3 ratures reprises cette semaine », sous le compteur barré. */
export const reprisesSemaine = (n: number) => `${pluriel(n, "rature reprise", "ratures reprises")} cette semaine`;

export const SONS = {
  titre: "Sons",
  grands: "Sons des grands moments",
  grandsSous: "Le tampon d'une journée tenue, la note tenue d'un nouveau rang.",
  petits: "Aussi à chaque trait",
  petitsSous: "Une goutte par réponse, le « scritch » d'une rature. Discret.",
} as const;

export const REJOUER = {
  titre: "Ton premier trait",
  texte: "L'anneau, ton jour J, ton sceau : rejoue le geste du premier jour.",
  action: "Rejouer",
} as const;

// ---------------------------------------------------------------------------
// Inscription (premier trait)

export const INSCRIPTION = {
  pseudoRegle: "Ton nom de joueur : 3 à 24 caractères, lettres, chiffres ou _.",
  pseudoPris: "Ce nom est déjà pris. Choisis-en un autre.",
  pseudoErreur: "Ton nom n'a pas pu être enregistré. Réessaie.",
  dateErreur: "Ton jour J n'a pas pu être enregistré : tu pourras le fixer dans Moi › Réglages.",
  photo: "Une photo ? Facultatif : ton sceau en tient lieu.",
  photoAction: "Ajouter une photo",
  photoChanger: "Changer de photo",
  photoOk: "Photo ajoutée.",
  photoErreur: "La photo n'a pas pu être envoyée. Ton sceau suffit : tu pourras réessayer dans Moi › Réglages.",
  entrer: "Entrer dans le lobby",
  retourReglages: "Revenir à mes réglages",
  // comptes déjà configurés, repassés par la présentation d'une nouvelle version
  presentationTitre: "Nouvelle version du lobby",
  presentationTexte:
    "On te la présente en une minute, puis Léonard te fait visiter. Rien ne bouge : ton nom, ton jour J, ta progression et tes duels sont conservés.",
} as const;

// ---------------------------------------------------------------------------
// Connexion (en plus de CONNEXION) : les quatre espaces

export const CONNEXION_Z1 = {
  reviser: "Fiches, cours audio, flashcards.",
  entrainer: "QCM officiels, défi du jour, examens blancs.",
  classement: "Duels de 30 questions, ELO façon échecs.",
} as const;

// ---------------------------------------------------------------------------
// 404

export const INTROUVABLE_Z1 = {
  sous: "Le lien est peut-être ancien. Le bout qui manque, lui, t'attend ailleurs.",
} as const;
