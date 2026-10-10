// Voix « Le Trait » de l'Atelier (la séance de 30 minutes sur ses points
// faibles) : un mot par chose, toujours le chiffre, pas d'emphase. Les blocs
// gardent leur nom du début à la fin : Rappel, Tes ratures, Questions neuves,
// Calcul, Re-test (trait d'union insécable : jamais coupé en fin de ligne).
// Module neutre (ni « use client » ni serveur).

import { nombre, pct, pluriel } from "@/lib/voice";
import type { Bloc, Conseil, Niveau } from "@/lib/atelier";

export const BLOC_NOM: Record<Bloc, string> = {
  rappel: "Rappel",
  ratures: "Tes ratures",
  neuves: "Questions neuves",
  calcul: "Calcul",
  retest: "Re‑test",
};

/** Le nom court d'un bloc, dans l'en-tête de la séance sur téléphone */
export const BLOC_COURT: Record<Bloc, string> = {
  rappel: "Rappel",
  ratures: "Ratures",
  neuves: "Neuves",
  calcul: "Calcul",
  retest: "Re‑test",
};

/** Le niveau d'une question neuve (la position dans les drills) */
export const NIVEAU_QUESTION: Record<Niveau, string> = { 1: "Officielle", 2: "Autre angle", 3: "Plus dure" };
/** Le niveau d'un calcul (lib/calc) */
export const NIVEAU_CALCUL: Record<Niveau, string> = { 1: "facile", 2: "moyen", 3: "difficile" };

const CONSEIL: Record<Conseil, string> = {
  demain: "Prochain Atelier conseillé : demain.",
  "apres-demain": "Prochain Atelier conseillé : après-demain.",
  semaine: "Prochain Atelier conseillé : dans une semaine.",
};

/** « 12:40 » */
export function horloge(secondes: number): string {
  const s = Math.max(0, Math.floor(secondes));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const taux = (ok: number, n: number) => (n > 0 ? pct((ok / n) * 100) : "—");

export const ATELIER = {
  nom: "L'Atelier",
  /** points d'entrée (Tes points faibles) */
  action: "Atelier · 30 min",
  actionSeule: "Atelier sur cette seule notion",
  reprendre: "Reprendre l'Atelier",
  /** la carte de S'entraîner (components/atelier/CarteAtelier.tsx) */
  lancer: "Lancer l'Atelier",
  carteTitre: (n: number) => (n > 1 ? `Tes ${nombre(n)} points faibles, en une séance` : "Ton point faible, en une séance"),
  /** les blocs réellement prévus, comme deroule, puis le bilan */
  carteDeroule: (ratures: boolean, calcul: boolean) =>
    `${["Rappel", ratures ? "tes ratures" : null, "questions neuves", calcul ? "calcul" : null, "re‑test"].filter(Boolean).join(", ")}, puis le bilan avant/après.`,
  enCoursLigne: (faites: number) => `Un Atelier est en cours : ${pluriel(faites, "réponse donnée", "réponses données")}.`,
  /** avant la migration, ou tant que les notions ne sont pas en place */
  bientotTitre: "L'Atelier arrive bientôt",
  bientotTexte: "La séance de 30 minutes sur tes points faibles ouvre très bientôt. En attendant, tes ratures t'attendent dans Moi › Erreurs.",
  bientotAction: "Voir mes points faibles",
  peuTitre: "Pas encore assez de matière",
  peuTexte: "Il faut au moins un point faible pour lancer un Atelier : quelques réponses de plus sur une même notion, ou des ratures en cours.",
  retour: "Revenir à S'entraîner",

  /** écran d'ouverture */
  kicker: "L'Atelier · 30 min",
  aujourdhui: "Aujourd'hui",
  /** la ligne d'une notion : « 12 ratures en cours », « calcul », « questions neuves » */
  detailNotion: (enCours: number, calcul: boolean) => (enCours > 0 ? pluriel(enCours, "rature en cours", "ratures en cours") : calcul ? "calcul" : "questions neuves"),
  remplacer: "Remplacer",
  remplacerPar: (libelle: string) => `Remplacer par ${libelle}`,
  ajouterAutres: "Ajouter mes autres points faibles",
  /** les blocs réellement prévus : sans ratures en cours ni calcul, ils ne sont pas annoncés */
  deroule: (ratures: boolean, calcul: boolean) =>
    `${["Rappel", ratures ? "tes ratures" : null, "questions neuves", calcul ? "calcul" : null, "re‑test"].filter(Boolean).join(", ")}. Tu t'arrêtes quand tu veux et tu reprends dans les 24 heures.`,
  commencer: "Commencer",
  preparation: "L'Atelier se prépare…",
  vide: "Pas assez de questions sur ces notions pour un Atelier. Remplace-en une.",
  erreur: "L'Atelier ne s'est pas lancé. Réessaie.",
  enCoursTitre: "Un Atelier est en cours",
  enCoursTexte: (notions: string, faites: number) => `${notions} · ${pluriel(faites, "réponse donnée", "réponses données")}. Tu peux le reprendre, ou le clore pour voir son bilan.`,
  clore: "Le clore et voir le bilan",

  /** pendant la séance */
  etape: (k: number, total: number, bloc: Bloc, court = false) => `${nombre(k)}/${nombre(total)} · ${(court ? BLOC_COURT : BLOC_NOM)[bloc]}`,
  chrono: (secondes: number) => `${horloge(secondes)} / 30`,
  chronoLabel: (secondes: number) => `Temps de la séance : ${horloge(secondes)} sur 30 minutes`,
  plan: "Le plan",
  notions: "Notions",
  rappel: "Rappel",
  /** « Duration · Rature, 3 erreurs », « Duration · Question neuve · Plus dure » */
  surRature: (misses: number | null) => (misses && misses > 0 ? `Rature, ${pluriel(misses, "erreur", "erreurs")}` : "Rature"),
  surNeuve: "Question neuve",
  surRetest: "Est-ce que c'est rentré ?",
  valider: "Valider",
  reponses: "Réponses",
  tonResultat: "Ton résultat",
  taReponse: (unite: string) => (unite ? `Ta réponse (en ${unite})` : "Ta réponse"),
  suivante: "Suivante",
  envoi: "…",
  arreter: "Arrêter là",
  arreterLabel: "Arrêter l'Atelier",
  statut: {
    rayee: "Juste : rayée du carnet.",
    ancienne: "Juste.",
    reste: "Elle reste au carnet.",
    revenue: "Elle revient au carnet.",
    juste: "Juste.",
    nouvelle: "Au carnet : elle reviendra.",
    reprise: "Juste : c'est rentré.",
  } as Record<string, string>,
  retestReste: "Pas encore : elle reste au carnet.",
  xp: (n: number) => `+${nombre(n)} XP`,
  erreurReponse: "La réponse n'est pas partie. Réessaie.",

  /** carte Rappel */
  rappelOuverture: "Avant de commencer",
  rappelFautes: (libelle: string) => `Deux erreurs de suite sur ${libelle}`,
  rappelFautesSuite: "La question suivante de cette notion sera plus simple.",
  formules: "Formules",
  pieges: "Pièges",
  flashcards: "Flashcards",
  coince: "Ce qui coince",
  sansContenu: "Relis la page de fiche ou écoute le chapitre : quelques minutes suffisent.",
  fiche: (page: number) => `Fiche p. ${nombre(page)}`,
  ficheEntiere: "La fiche",
  cours: "Chapitre audio",
  coursDetail: (debut: string, minutes: number) => `${debut} · ${nombre(minutes)} min`,
  continuer: "Continuer",
  verso: "Verso",
  commencerQuestions: "Aux questions",
  feuille: (page: number | null) => (page !== null ? `Fiche · page ${nombre(page)}` : "La fiche"),
  ouvrirFiche: "Ouvrir dans la fiche",
  ficheIndisponible: "La fiche ne s'affiche pas ici : ouvre-la dans la page des fiches.",

  /** arrêt et reprise */
  pauseTitre: "Atelier en pause",
  pauseTexte: (heure: string) => `Tu peux le reprendre jusqu'à ${heure}. Ensuite, il se clôt tout seul.`,
  pauseTexteSansHeure: "Tu peux le reprendre dans les 24 heures. Ensuite, il se clôt tout seul.",
  reprendreCourt: "Reprendre",
  partiel: "Bilan partiel",

  /** bilan */
  epreuve: (minutes: number, score: number, total: number) => `Atelier · ${nombre(minutes)} min · ${nombre(score)}/${nombre(total)}`,
  parNotion: "Par notion",
  avantPendant: (avant: { ok: number; n: number }, pendant: { ok: number; n: number }) => `avant ${taux(avant.ok, avant.n)} → pendant ${taux(pendant.ok, pendant.n)}`,
  avantPendantDetail: (avant: { ok: number; n: number }, pendant: { ok: number; n: number }) =>
    `Avant : ${nombre(avant.ok)} sur ${nombre(avant.n)}. Pendant l'Atelier : ${nombre(pendant.ok)} sur ${nombre(pendant.n)}.`,
  ratures: (avant: number, apres: number) => `ratures ${nombre(avant)} → ${nombre(apres)}`,
  /** la même ligne, l'ancien chiffre rayé à l'encre : « ratures », 12 rayé, « → 7 » */
  raturesMot: "ratures",
  raturesAvant: (avant: number) => nombre(avant),
  raturesApres: (apres: number) => `→ ${nombre(apres)}`,
  rayees: (n: number) => `${pluriel(n, "rayée", "rayées")}`,
  nouvelles: (n: number) => `${pluriel(n, "nouvelle", "nouvelles")}`,
  calcul: (avant: { ok: number; n: number } | null, pendant: { ok: number; n: number }, niveau: Niveau) =>
    `calcul ${avant ? `${nombre(avant.ok)}/${nombre(avant.n)} → ` : ""}${nombre(pendant.ok)}/${nombre(pendant.n)} ${NIVEAU_CALCUL[niveau]}`,
  tenue: "tenue",
  sansQuestion: "pas de question pendant cet Atelier",
  retest: (ok: number, n: number) => `Re‑test : ${nombre(ok)} sur ${nombre(n)}.`,
  xpGagne: (n: number) => `${nombre(n)} XP gagnés (questions neuves et calculs).`,
  prochainPas: (titre: string) => `Prochain pas : écoute « ${titre} »`,
  prochainAtelier: (c: Conseil) => CONSEIL[c],
  revenir: "Revenir à mes points faibles",
  autre: "Un autre Atelier",

  /** l'historique des Ateliers (Moi › Stats) */
  historique: "Tes Ateliers",
  historiqueCompte: (n: number) => pluriel(n, "séance", "séances"),
  dernier: "Dernier Atelier",
  /** « 6 oct. · 28 min · 14/20 » */
  seance: (date: string, minutes: number, score: number, total: number) => `${date} · ${nombre(minutes)} min · ${nombre(score)}/${nombre(total)}`,
  /** « 40 % → 75 % » ; joué seulement en calcul : « calcul 3/10 → 4/5 » ; sinon « pas de question » */
  notionCourte: (avant: { ok: number; n: number }, pendant: { ok: number; n: number }, calcul: { avant: { ok: number; n: number } | null; pendant: { ok: number; n: number } } | null) =>
    pendant.n > 0
      ? `${taux(avant.ok, avant.n)} → ${taux(pendant.ok, pendant.n)}`
      : calcul
        ? `calcul ${calcul.avant ? `${nombre(calcul.avant.ok)}/${nombre(calcul.avant.n)} → ` : ""}${nombre(calcul.pendant.ok)}/${nombre(calcul.pendant.n)}`
        : "pas de question",
  rayeesXp: (rayees: number, xp: number) => [rayees > 0 ? pluriel(rayees, "rature rayée", "ratures rayées") : null, xp > 0 ? `${nombre(xp)} XP` : null].filter(Boolean).join(" · "),
  detail: "Le détail",
  precedents: (n: number) => (n > 1 ? `Les ${nombre(n)} précédents` : "Le précédent"),
} as const;
