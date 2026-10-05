// Voix « Le Trait », morceau Z2c : le défi du jour (« Les 30 du jour »).
// Complète lib/voice.ts (lecture seule) dans le même esprit : un mot par
// chose, toujours le chiffre, jamais « raté » ni « Bravo », pas de point
// d'exclamation. Le coordinateur pourra fusionner ce module dans
// lib/voice.ts ; d'ici là, les pages du défi l'importent directement.
// Module neutre (ni « use client » ni serveur).
//
// DEFI reprend, clé pour clé, l'ancien DAILY_VOICE de lib/daily.ts (qui le
// réexporte sous ce nom pour ne rien casser), plus les phrases des écrans du
// défi (copie, classement, jours passés, revue, tuile).

import { IA, LEXIQUE, NBSP, SIGNATURE, nombre, pct, pluriel, precision, ratures, traits, verdictSession } from "@/lib/voice";

/** « 6 ratures », « page propre » (une copie rendue) */
export function raturesOuPropre(n: number) {
  return n > 0 ? ratures(n) : "page propre";
}

/** Verdict d'une copie (seuils des fins de session) : « Trait sûr. » */
export const verdictCopie = (score: number, total: number) => verdictSession(score, total).titre;

/** « 16 joueurs », « 1 joueur » */
export const joueurs = (n: number) => pluriel(n, "joueur", "joueurs");

/** « 1er », « 2e », « 12e » */
export const rangOrdinal = (n: number) => (n === 1 ? "1er" : `${n}e`);

export const DEFI = {
  title: "Les 30 du jour.",
  /** titre d'un jour passé : « Les 30 du 2 octobre. » */
  titleDay: (jour: string) => `Les 30 du ${jour}.`,
  /** sur-titre de la page : « Défi du jour · samedi 3 octobre » */
  kicker: (jour: string) => `Défi du jour · ${jour}`,
  start: SIGNATURE,
  commencer: "Commencer",
  handedIn: "Copie rendue.",
  counting: "On compte les traits…",
  boardEmpty: "Personne n'a encore rendu sa copie. Le premier trait est à toi.",
  boardEmptyPast: "Personne n'a rendu de copie ce jour-là.",
  boardFrozen: "Classement définitif.",
  missed: "Pas de trait ce jour-là.",
  missedText: "Une copie se trace le jour même. Le classement, lui, reste ouvert.",
  closed: "Ce défi est clos : celui d'aujourd'hui t'attend.",
  historyEmpty: "Ton historique commence aujourd'hui.",
  soonTitle: "Le défi du jour arrive bientôt.",
  soonText: "Chaque jour, les mêmes 30 questions pour tout le monde, une seule copie, et le classement du jour.",
  unavailable: "Le défi du jour n'est pas disponible pour le moment. Réessaie dans un instant.",
  /** le serveur ne répond pas (titre de la carte « indisponible ») */
  silence: "Le défi du jour ne répond pas.",
  /** « bientôt » : deux portes pour patienter */
  enAttendant: "S'entraîner en attendant",
  lancerDuel: "Lancer un duel",
  /** pas de défi tiré aujourd'hui (banque vide…) */
  aucunTitre: "Pas de défi pour l'instant",
  /** un jour sans défi (personne ne l'a ouvert) */
  jourSansTitre: "Pas de défi ce jour-là",
  jourSansTexte: "Personne n'a ouvert le défi ce jour-là : ses questions n'ont jamais été tirées.",
  aujourdhui: "Le défi d'aujourd'hui",
  /** à faire : sur-titre et ouverture */
  rendues: (n: number, meilleur: number | null, total: number) =>
    `${pluriel(n, "copie rendue", "copies rendues")}${meilleur !== null ? ` · meilleur ${meilleur}/${total}` : ""}`,
  format: (questions: number, minutes: number) => `${questions} questions · ${minutes} min`,
  /** les coches au crayon, avant de commencer : « 30 traits à tracer » */
  aTracer: (n: number) => `${traits(n)} à tracer`,
  ouvert: (reste: string | null) => (reste ? `Ouvert jusqu'à minuit · ${reste}` : "Ouvert jusqu'à minuit"),
  /** l'écart à la tête, quand on est seul ou devant */
  alone: (today: boolean) => (today ? "Seul en lice pour l'instant : le classement se remplit jusqu'à minuit." : "Seul en lice ce jour-là."),
  ahead: (today: boolean) => (today ? "En tête. Tiens ta place jusqu'à minuit." : "En tête ce jour-là."),
  /** la cote vers la 1re place : « encore 3 », « 1:12 d'écart » */
  ecartPoints: (n: number) => `encore${NBSP}${nombre(n)}`,
  ecartTemps: (t: string) => `${t} d'écart`,
  premiere: "1re place",
  /** règles, avant de commencer : [en gras, la suite] */
  rules: (questions: number, minutes: number): [string, string][] => [
    [`${questions} questions`, ", les mêmes et dans le même ordre pour tout le monde."],
    [`${minutes} min, une seule copie`, " : le chrono ne s'arrête plus, même si tu fermes la page."],
    ["Réponses définitives", " ; tu peux passer et revenir. La correction s'ouvre dès ta copie rendue."],
  ],
  confirmHandIn: (blanches: number) =>
    blanches > 0
      ? `Rendre ta copie maintenant ? ${blanches > 1 ? `${blanches} questions sans réponse compteront comme ratures` : "1 question sans réponse comptera comme rature"}. Tu n'auras pas d'autre copie aujourd'hui.`
      : "Rendre ta copie maintenant ?",
  /** pendant la copie */
  copie: (heure: string | null) => (heure ? `Ta copie · rendue à ${heure}` : "Ta copie"),
  preparation: "Préparation de ta copie…",
  neSouvrePas: "La copie ne s'ouvre pas",
  reessayer: "Réessayer",
  recharger: "Recharger le défi",
  question: (n: number, total: number, matiere: string) => `Question ${n} sur ${total} · ${matiere}`,
  passer: "Passer pour l'instant",
  valider: "Valider et continuer",
  envoi: "Envoi…",
  rendre: "Rendre ma copie",
  definitif: "Réponses définitives · correction dès ta copie rendue",
  pasPartie: "Ta réponse n'est pas partie — réessaie.",
  repondues: "répondues",
  avancement: "Avancement de ta copie",
  /** ma copie rendue : « précision 87 % · 4 ratures » */
  ligneCopie: (p: number, n: number) => `${precision(p)} · ${raturesOuPropre(n)}`,
  revoir: "Revoir ma copie",
  rang: "Rang",
  temps: "Temps",
  meilleurDuJour: "Meilleur du jour",
  /** le sceau posé sur la copie : « DÉFI · TENU · 4·10 » */
  sceauSur: "DÉFI",
  sceauTitre: (jm: string) => `Défi tenu : copie rendue le ${jm}`,
  /** coches : « Ta copie, question par question » */
  coches: "Ta copie, question par question",
  /** classement du jour */
  classement: "Classement du jour",
  enCours: (n: number) => pluriel(n, "copie en cours", "copies en cours"),
  seFigeDans: (reste: string) => `se fige à minuit · ${reste}`,
  autres: (n: number) => `+ ${nombre(n)} ${n > 1 ? "autres" : "autre"}`,
  toi: "toi",
  /** étiquette de ma réponse dans la revue */
  toiEtiquette: "Toi",
  /** jours passés */
  joursPasses: "Jours passés",
  aRevoir: (n: number, jours: number) => `${pluriel(n, "copie à revoir", "copies à revoir")} · ${jours} jours`,
  seRevoit: (jours: number) => `chaque copie se revoit ici ${jours} jours`,
  pasDeCopie: (n: number) => `pas de copie · ${joueurs(n)}`,
  copieEnCours: "copie en cours",
  meilleur: (score: number, total: number) => `meilleur ${score}/${total}`,
  revue: (reste: string) => `revue ${reste}`,
  revoirCourt: "Revoir",
  reprendreCourt: "Reprendre",
  voirPlus: (n: number) => `Voir plus · ${pluriel(n, "jour", "jours")}`,
  /** revue */
  reviewEmpty: "La correction s'ouvre dès que tu as rendu ta copie. Si c'est déjà le cas, recharge la page dans un instant.",
  correctionIndispo: "Correction indisponible",
  revueKicker: (jour: string) => `Revue · défi du jour · ${jour}`,
  revueTitre: (jour: string) => `Ta copie du ${jour}`,
  retourDefi: "Retour au défi",
  retourJour: (jour: string) => `Le classement du ${jour}`,
  taCopie: "Ta copie",
  hardest: "La plus dure",
  foundBy: (rate: number, moi: boolean) => `trouvée par ${pct(rate)} des joueurs${moi ? ", toi compris" : ""}`,
  trouveePar: "trouvée par",
  copiesCeJour: (n: number) => `${pluriel(n, "copie rendue", "copies rendues")} ce jour-là`,
  /** filtres de la revue */
  mesRatures: IA.mesRatures,
  tout: IA.tout,
  pagePropre: LEXIQUE.pagePropre,
  pagePropreTexte: "Aucune rature dans ta copie. Tu peux tout relire dans « Toute la copie ».",
  /** marque d'une question corrigée */
  etiquette: (m: "ok" | "ko" | "none") => (m === "ok" ? "Juste" : m === "ko" ? "Rature" : "Sans réponse"),
  bonneReponse: "Bonne réponse",
  explication: "Explication",
  voirExplication: "Voir l'explication",
  /** « Copier pour l'IA » du défi */
  iaTexte: "Colle ta copie dans ton IA : bilan par thème et explication de chaque rature, avec le contexte du jour.",
  iaTout: "Toute la copie",
  iaToutSeul: "Copier toute la copie",
  /** la tuile (accueil, S'entraîner) */
  tuile: {
    label: "Défi du jour",
    titre: "Les 30 du jour",
    rendue: "copie rendue",
    enCours: "Copie en cours",
    repondues: (n: number, total: number) => `${n}/${total} répondues`,
    seFige: "se fige à minuit",
    personne: "Personne n'a encore rendu sa copie",
    bientot: "Mêmes questions pour tous, chaque jour.",
    indispo: "Pas de défi pour l'instant.",
    reprendre: "Reprendre ma copie",
    etatBientot: "bientôt",
    etatIndispo: "indisponible",
    etatEnCours: "en cours",
    etatAujourdhui: "aujourd'hui",
  },
} as const;

/**
 * Les 5 du jour, le défi éclair : seulement ce qui diffère des 30 du jour.
 * Le contraste tient en deux mots : éclair (5 questions de cours, sans
 * calcul, 2 min) contre épreuve (30 questions, 45 min, calculs compris).
 */
export const DEFI_CINQ = {
  title: "Les 5 du jour.",
  titleDay: (jour: string) => `Les 5 du ${jour}.`,
  kicker: (jour: string) => `Défi éclair · ${jour}`,
  soonTitle: "Les 5 du jour arrivent bientôt.",
  soonText: "Chaque jour, 5 questions de cours, sans calcul : deux minutes, dans le bus ou en attendant le café.",
  aujourdhui: "Les 5 d'aujourd'hui",
  revueKicker: (jour: string) => `Revue · les 5 du jour · ${jour}`,
  format: (questions: number, _minutes?: number) => `${questions} questions de cours · 2 min environ`,
  rules: (questions: number, minutes: number): [string, string][] => [
    [`${questions} questions de cours`, ", sans calcul : la même série pour tout le monde."],
    ["Deux minutes suffisent", ` (${minutes} min au plus), une seule copie.`],
    ["Réponses définitives", " ; la correction s'ouvre dès ta copie rendue."],
  ],
  tuile: {
    ...DEFI.tuile,
    label: "Défi éclair",
    titre: "Les 5 du jour",
    bientot: "5 questions de cours, sans calcul.",
  },
} as const;

/** La voix d'un défi : les 30 du jour, ou les 5 du jour (même forme que DEFI). */
export function voixDefi(format: "trente" | "cinq"): typeof DEFI {
  return format === "cinq" ? ({ ...DEFI, ...DEFI_CINQ } as unknown as typeof DEFI) : DEFI;
}

/** « Copier pour l'IA » du défi : le nom reste (règle de la voix), la voix l'entoure. */
export const COPIER_DEFI = {
  label: IA.label,
  /** « Copier mes 8 ratures » */
  ratures: (n: number) => `Copier mes ${ratures(n)}`,
  /** retour après la copie (pas de point d'exclamation) */
  fait: "Copié.",
  /** sous la carte sombre, juste après la copie */
  colle: "Copié. Colle-le dans ChatGPT, Claude ou ton IA : elle te fait le bilan.",
  manuel: "Ton navigateur bloque la copie automatique : sélectionne le texte ci-dessous et copie-le.",
  champ: "Texte à copier pour l'IA",
} as const;
