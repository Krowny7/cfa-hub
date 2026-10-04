// Voix « Le Trait » : les phrases des examens (examens blancs, examens
// officiels, mode examen /exam), zone Z3b, dans l'esprit de lib/voice.ts, à
// y fusionner.
//
// Module neutre (ni « use client » ni serveur). Mêmes garde-fous que
// lib/voice.ts : toujours le chiffre, jamais « raté » ni « Bravo », pas de
// point d'exclamation, et le bout qui reste toujours nommé.
//
// Complète lib/voice-z3.ts (Z3a), sans en reprendre les noms : EPREUVE,
// EXAMEN (copie non enregistrée, sans réponse) et ELO_COPIE (« ELO +18 »)
// restent là-bas ; ici, ce qui manque aux écrans d'examen.

import { SIGNATURE, pluriel, questions } from "@/lib/voice";
import { EPREUVE } from "@/lib/voice-z3";

/** Avant de commencer : la signature. */
export const AVANT_EXAMEN = {
  titre: SIGNATURE,
  surTitreMock: "Examen blanc · ta copie",
  surTitreRetake: "Rejouer cet examen · entraînement",
  commencer: "Commencer l'examen",
  /** examen blanc : les règles, en trois lignes */
  reglesMock: [
    "Pas de correction pendant l'examen : ta copie corrigée t'attend à la fin.",
    "Pas de pause : à la fin du chrono, ta copie est remise d'elle-même.",
    "Garde la page ouverte : tes réponses partent quand tu remets ta copie.",
  ],
  reglesRetake: ["Ne compte ni pour le classement ni pour l'ELO.", "Copie corrigée à la fin ; seul le score est gardé ensuite."],
} as const;

/** Remettre sa copie (examen blanc, essai, mode examen). */
export const REMETTRE = {
  bouton: "Remettre ma copie",
  court: "Remettre",
  envoi: "Envoi…",
  continuer: "Continuer",
  /** « Encore 3 questions sans réponse. Remettre ta copie quand même ? » */
  confirmer: (n: number) => `Encore ${questions(n)} sans réponse. Remettre ta copie quand même ?`,
} as const;

/** Mode examen (/exam) : tes QCM, mélangés et chronométrés. */
export const MODE_EXAMEN = {
  titre: EPREUVE.exam,
  sous: "Tes QCM mélangés et chronométrés, comme le jour J. Correction à la fin ; la copie compte dans tes stats.",
  sources: "Sources",
  aucunQcm: "Aucun QCM pour l'instant.",
  creerQcm: "Créer un QCM",
  systeme: "Système seulement",
  toutes: "Toutes",
  aucune: "Aucune",
  format: "Format",
  formatCfa: "Le format d'une session CFA.",
  pasDeCorrection: "Pas de correction avant la fin.",
  demarrer: "Démarrer l'examen",
  preparation: "Préparation des questions…",
  /** les QCM choisis sont vides (ou la lecture a échoué) */
  vide: "Ces QCM n'ont pas encore de questions. Choisis-en d'autres.",
  parSource: "Par source",
  nouvel: "Nouvel examen",
  retour: "Retour à S'entraîner",
} as const;

/** Examen blanc classé : l'ELO pas encore appliqué, dans l'en-tête de la copie. */
export const ELO_EXAMEN = {
  /** « ton ELO bougera à la clôture, le 13 octobre » */
  aLaCloture: (jour: string) => `ton ELO bougera à la clôture, le ${jour}`,
  tropPeu: "moins de deux copies rendues : l'ELO ne bouge pas",
} as const;

/** La copie d'un examen blanc dont la correction n'est pas lisible. */
export const INDISPONIBLE = "Ta copie est rendue. Sa correction n'est pas lisible pour l'instant.";

/** Rejouer un examen blanc en entraînement. */
export const REJOUER = {
  titre: "Rejouer cet examen",
  meta: "entraînement · hors classement et ELO",
  lien: "Rejouer en entraînement",
  tout: "Tout l'examen",
  mesRatures: "Seulement mes ratures",
  tesRatures: "Tes ratures",
  pagePropre: "page propre : rien à rejouer",
  aucune: "Aucune question à rejouer dans ce mode.",
  scoreSeul: "Seul le score de ces essais est gardé, pas les réponses.",
  tesEssais: "Tes essais",
  essaiTout: "Tout l'examen",
  essaiRatures: "Mes ratures",
  /** sur-titre de la copie d'un essai : « Essai d'entraînement · mes ratures » */
  surTitre: (mode: "full" | "wrong_only") => `${EPREUVE.retake} · ${mode === "full" ? "tout l'examen" : "mes ratures"}`,
  horsClassement: "hors classement et ELO",
  retour: "Retour aux essais",
  enCours: (mode: "full" | "wrong_only") => (mode === "full" ? "Essai complet" : "Essai · mes ratures"),
} as const;

/** La liste des examens blancs. */
export const LISTE = {
  titre: "Examens blancs",
  sousClasse: "Chronométrés, au format de l'examen. À la clôture, ton ELO bouge selon ta place face aux autres.",
  sous: "Chronométrés, au format de l'examen, avec un classement entre participants.",
  videTitre: "Aucun examen blanc au calendrier.",
  videTexte: "Le prochain s'affichera ici, avec ses inscriptions.",
  ensuite: "Ensuite",
  passes: "Passés",
  passesMeta: "ta copie, le classement, la correction",
  ouvert: "Ouvert",
  inscrit: "Inscrit",
  participe: "Copie rendue",
  eloApplique: "ELO appliqué",
  prochain: "Prochain examen",
  enPreparation: "En préparation",
  fenetreFinie: "Fenêtre terminée",
  ouvertJusquau: (jour: string) => `Ouvert jusqu'au ${jour}`,
  ouverture: (jour: string) => `ouverture le ${jour}`,
  passer: "Passer l'examen",
  voir: "Voir l'examen",
  resultats: "Voir ta copie",
  sinscrire: "S'inscrire",
  tuEsInscrit: "Ta place est réservée",
  nExamens: (n: number) => pluriel(n, "examen", "examens"),
} as const;

/** La page d'un examen blanc. */
export const DETAIL = {
  retour: "Examens blancs",
  classe: "classé (ELO)",
  termine: "Terminé",
  ouvertureDans: (heures: number, jours: number) => `Ouverture dans ${heures < 24 ? `${heures} h` : `${jours} j`}`,
  pasOuvertTitre: "Pas encore ouvert",
  pasOuvertTexte: "Cet examen n'est pas encore ouvert aux inscriptions.",
  bientotTitre: "Bientôt ton tour",
  bientotTexte: (debut: string, fin: string) => `Ta copie t'attend du ${debut} au ${fin}.`,
  finiTitre: "Fenêtre terminée",
  finiTexte: (fin: string) => `La fenêtre pour rendre ta copie s'est fermée le ${fin}.`,
} as const;

/** Le classement d'un examen blanc. */
export const CLASSEMENT_EXAMEN = {
  titre: "Classement",
  participants: (n: number) => pluriel(n, "copie rendue", "copies rendues"),
  toi: "toi",
  parMatiere: "Par matière, tous les participants",
  parMatiereMeta: "de la plus fragile à la plus sûre",
  matiere: "Matière",
} as const;

/** L'inscription à un examen blanc. */
export const INSCRIPTION = {
  surTitre: "Inscription",
  titre: "Réserve ta place",
  classe: "examen classé : à la clôture, ton ELO bouge selon ta place face aux autres.",
  classeCourt: "examen classé (ELO)",
  /** null : nombre inconnu (lecture impossible), on n'affiche rien */
  inscrits: (n: number | null) => (n === null ? null : n > 0 ? pluriel(n, "inscrit", "inscrits") : "Aucun inscrit pour l'instant"),
  sinscrire: "S'inscrire",
  inscrit: "Ta place est réservée",
  desinscrire: "Se désinscrire",
  confirmee: "Ta place est réservée. Tu recevras un rappel.",
  dejaInscrit: "Ta place était déjà réservée.",
  desinscrit: "Tu t'es désinscrit(e).",
} as const;

/** Examens officiels : les vrais mocks, rejoués en entier ou par matière. */
export const OFFICIELS = {
  titre: "Examens officiels",
  sous: "Tes examens officiels, aux questions près : en entier, ou une matière à la fois pour reprendre un point fragile.",
  videTitre: "Aucun examen officiel pour l'instant.",
  videTexte: "Ils s'afficheront ici dès qu'ils seront ajoutés.",
  complet: "Session complète",
  questionsOfficielles: "questions officielles",
  matieres: (n: number) => pluriel(n, "matière", "matières"),
  variantes: "variantes pour t'entraîner autrement",
  variantesTitre: "Variantes des mêmes questions (énoncés et chiffres différents)",
  sessions: (n: number) => pluriel(n, "session", "sessions"),
  nQuestions: (n: number) => questions(n),
} as const;
