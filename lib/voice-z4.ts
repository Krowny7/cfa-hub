// Voix « Le Trait » pour les fiches, les cours, Réviser et S'entraîner (zone
// Z4). Complète lib/voice.ts (en lecture seule) avec les phrases qui manquent
// à ces écrans ; le coordinateur les fusionnera. Même esprit : un mot par
// chose, toujours le chiffre, jamais « raté », « échec » ni « Bravo ».
// Module neutre (ni « use client » ni serveur).

import { nombre, ratures } from "@/lib/voice";

// ---------------------------------------------------------------------------
// Dates (calendrier de Paris)

/** « 28 sept. » ; null si la date est illisible. */
export function dateCourte(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" }).format(d);
}

const JOUR_PARIS = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" });

/** « 2026-10-03 » : le jour calendaire à Paris. */
export const jourParis = (d: string | Date) => JOUR_PARIS.format(new Date(d));

/** Même jour calendaire à Paris ? */
export function memeJour(a: string | Date, b: string | Date): boolean {
  return jourParis(a) === jourParis(b);
}

/** Le lundi de la semaine de `now` (Paris), en clé « AAAA-MM-JJ ». */
export function lundiParis(now: Date = new Date()): string {
  const key = jourParis(now);
  const d = new Date(key + "T12:00:00Z");
  const depuisLundi = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - depuisLundi * 86_400_000).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Quiz de fiche (« quiz », jamais « série » : la série, ce sont les jours d'encre)

export const QUIZ = {
  /** retour d'une réponse juste */
  juste: "Juste",
  /** retour d'une erreur */
  rature: "Rature",
  /** première erreur sur une question : elle entre au carnet */
  entree: "Elle rejoint ton carnet.",
  /** juste sur une question du carnet, pas encore rayée (il en faut deux d'affilée) */
  reprise: "Rature reprise · encore une fois juste pour la rayer",
  /** la règle du carnet, en une ligne */
  regle: "Deux fois juste d'affilée, et elle est rayée.",
  copie: "Copié",
  /** un quiz laissé en route */
  enCours: "Quiz en cours",
  termine: "Quiz terminé",
  aRelire: "Ta copie t'attend",
  voirCopie: "Voir ma copie",
  reprendre: "Reprendre",
  /** sur-titre de la copie corrigée, selon le quiz */
  surTitre: { page: "Quiz de fiche", errors: "Reprise des ratures", mixed: "Bilan aléatoire" } as Record<"page" | "errors" | "mixed", string>,
  /** titre d'une reprise des ratures : « Mes 4 ratures » */
  titreReprise: (n: number) => `Mes ${ratures(n)}`,
  /** « 9/15 questions répondues » */
  avance: (faites: number, total: number) => `${nombre(faites)}/${nombre(total)} ${total > 1 ? "questions répondues" : "question répondue"}`,
} as const;

/** « Reprendre mes 9 ratures » (même formule que verdictSession().action) */
export const reprendreRatures = (n: number) => `Reprendre mes ${ratures(n)}`;

/** « 12 à reprendre » */
export const aReprendre = (n: number) => `${nombre(n)} à reprendre`;

/** « ratée 3 fois » (lecteurs d'écran : le « ×3 » rouge du carnet) */
export const rateeFois = (n: number) => `ratée ${n > 1 ? `${nombre(n)} fois` : "une fois"}`;

// ---------------------------------------------------------------------------
// Le carnet d'une fiche (onglet « Mes erreurs »)

export const CARNET = {
  libelle: "à reprendre",
  /** carnet vide, rien jamais répondu */
  videNeuf: "Fais un quiz : tes ratures viendront ici, jusqu'à ce que tu les rayes.",
  /** carnet vide, des réponses déjà données (après « Page propre. ») */
  videPropre: "Elles reviennent ici dès qu'une question résiste.",
  /** l'historique : on raye, on n'efface pas */
  rayees: "Rayées",
  rayeeLe: (date: string) => `rayée le ${date}`,
} as const;

// ---------------------------------------------------------------------------
// Fiche : en-tête et progression

export const FICHE = {
  maitrisees: (n: number) => (n > 1 ? "maîtrisées" : "maîtrisée"),
  jamaisVues: (n: number) => (n > 1 ? "jamais vues" : "jamais vue"),
} as const;

// ---------------------------------------------------------------------------
// Réviser, S'entraîner

/** l'entrée « Calculs » (/calculs) */
const CALCULS_TEXTE = "Le calcul pur : l'énoncé, les données, ton résultat.";

export const ESPACES = {
  /** titre de Réviser (au lieu de « Apprendre, à ton rythme », slogan de MOOC) */
  reviserTitre: "Révise trait par trait.",
  fichesTexte: "Une synthèse par thème, les formules clés, puis son quiz corrigé.",
  calculsTexte: CALCULS_TEXTE,
  /** maîtrise pas encore mesurée (VIDE.radar, à l'échelle d'une matière) */
  maitriseAVenir: "Ta maîtrise se dessine dès 5 questions",
} as const;

// ---------------------------------------------------------------------------
// S'entraîner : le diptyque (Calculs | Entraînement ciblé), la rangée éclair
// et points faibles, puis les deux autres entrées. Les chiffres viennent de
// la base ou des catalogues ; sans eux, une ligne neutre.

export const ENTRAINER = {
  /** étiquettes des régions (lecteurs d'écran) */
  entrees: "Les deux entrées principales",
  autres: "Les autres façons de s'entraîner",
  /** les deux entrées principales, à égalité */
  calculsTitre: "Calculs",
  calculsAction: "Ouvrir les calculs",
  /** les trois pastilles de niveau (du plus simple au plus dur) et leur libellé accessible */
  calculsNiveaux: ["Facile", "Moyen", "Difficile"] as const,
  calculsNiveauxLibelle: "Trois niveaux par calcul, de facile à difficile",
  cibleTitre: "Entraînement ciblé",
  cibleAction: "Lancer une session",
  /** l'échelle du poids de chaque matière à l'examen (CFA niveau I) : légende visible, libellé de la barre, un segment, le reste des matières */
  echelleTitre: "Répartition de l'examen par matière",
  echelleLibelle: "Poids de chaque matière à l'examen",
  echelleSegment: (nom: string, fourchette: string) => `${nom} · ${fourchette} %`,
  echelleAutres: "autres matières",
  /** fourchette officielle du poids de chaque matière (les largeurs viennent des milieux, lib/practiceTopics) */
  echelleFourchettes: {
    ethics: "15–20",
    quant: "6–9",
    economics: "6–9",
    fsa: "11–14",
    corporate: "6–9",
    equity: "11–14",
    fixed_income: "11–14",
    derivatives: "5–8",
    alternatives: "7–10",
    portfolio: "8–12",
  } as Record<string, string>,
  /** séries éclair */
  eclairPhrase: "Des séries de 5 questions de cours, sans calcul, à volonté.",
  eclairUnite: (n: number) => (n > 1 ? "séries aujourd'hui" : "série aujourd'hui"),
  eclairAucune: "Pas encore de série aujourd'hui.",
  eclairReussite: (pct: number) => `Réussite récente : ${pct} %`,
  eclairAction: "Lancer une série",
  /** points faibles */
  faiblesTitre: "Tes points faibles",
  faiblesSous: "Les notions les plus fragiles, mesurées sur tes dernières réponses.",
  faiblesSeuil: "seuil 70 %",
  /** lecteurs d'écran : la piste d'une notion mesurée */
  faiblesPiste: (libelle: string, pct: number) => `${libelle} : ${pct} %, seuil à 70 %`,
  faiblesPisteRatures: (libelle: string, n: number) => `${libelle} : ${ratures(n)}`,
  /** les deux autres entrées */
  qcmTitre: "QCM par thème",
  qcmTexte: "Toutes les banques, classées par matière.",
  examsTitre: "Examens officiels",
  examsTexte: "Les sessions officielles, rejouées question par question.",
} as const;

// ---------------------------------------------------------------------------
// Cours complets

export const COURS = {
  /** ?module=N, lecture refusée par le navigateur : le module attend un geste */
  modulePret: (n: number) => `Module ${n} prêt · appuie sur lecture.`,
  reprise: (t: string) => `Reprise là où tu t'étais arrêté, à ${t}.`,
} as const;
