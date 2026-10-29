import { CALC_LEVELS, type CalcLevel } from "@/lib/calc/types";
import type { LevelState } from "@/lib/calc/engine";
import { nombre, pctScore } from "@/lib/voice";

// Les mots des écrans de calcul, dans la voix « Le Trait » (lib/voice.ts) :
// un niveau se « tient » (4 justes sur 5), une erreur est une « rature », et
// le bout qui manque est toujours nommé. Module neutre.

export const NIVEAU: Record<CalcLevel, { label: string; court: string; desc: string }> = {
  facile: { label: "Facile", court: "F", desc: "Une formule, une étape." },
  moyen: { label: "Moyen", court: "M", desc: "Deux ou trois étapes, une conversion." },
  difficile: { label: "Difficile", court: "D", desc: "Un enchaînement, une donnée piège." },
};

export const ETAT_NIVEAU: Record<LevelState, string> = { vierge: "à tracer", entame: "entamé", tenu: "tenu" };

export const CALC = {
  hubKicker: "S'entraîner · calcul pur",
  hubTitre: "Calculs",
  hubLigne: "Un énoncé bref, les données utiles, ton résultat. Cinq questions par round.",
  ouvertes: "Matières",
  bientot: "Bientôt",
  reprendre: "Reprendre",
  prochain: "Ton prochain calcul",
  lancer: "Lancer · 5 questions",
  top: "Top 5",
  topSous: "les calculs qui tombent le plus",
  essentiels: "Essentiels",
  essentielsSous: "à savoir sans hésiter",
  annexes: "Annexes",
  annexesSous: "moins fréquents, au programme",
  rappel: "Rappel",
  pieges: "Pièges",
  choisirNiveau: "Choisis ton niveau",
  juste: "Juste.",
  rature: "Rature.",
  taReponse: "Ta réponse",
  bonneReponse: "Bonne réponse",
  correction: "Correction",
  voirCorrection: "Voir la correction",
  valider: "Valider",
  suivante: "Question suivante",
  voirCopie: "Voir ma copie",
  refaire: "Refaire ce niveau",
  niveauSuivant: "Niveau suivant",
  calculSuivant: "Calcul suivant",
  retour: "Changer de calcul",
  arreter: "Arrêter le round",
  saisie: "Virgule ou point. Entrée pour valider.",
  pasUnNombre: "Écris un nombre : 8,5 ou 8.5.",
  envoiRate: "La correction n'est pas arrivée. Réessaie.",
  tirageRate: "Le round ne s'est pas tiré. Réessaie.",
  toutTenu: "Tout est tenu. Le trait continue au Difficile.",
  copieTitre: "La copie, question par question",
  aEntamer: "à entamer",
  surTitre: "Calculs",
  local: "Suivi gardé sur cet appareil pour l'instant.",
} as const;

/** « 5 questions », « 1 question » au niveau vide : « bientôt » */
export const nbQuestions = (n: number) => (n > 0 ? `${nombre(n)} ${n > 1 ? "questions" : "question"}` : "bientôt");

/** « 12 types · 8 essentiels » */
export const ligneTypes = (types: number, essentiels: number) =>
  `${nombre(types)} ${types > 1 ? "types" : "type"} · ${nombre(essentiels)} ${essentiels > 1 ? "essentiels" : "essentiel"}`;

/** « 7 niveaux tenus sur 54 » */
export const niveauxTenus = (n: number, total: number) => `${nombre(n)} ${n > 1 ? "niveaux tenus" : "niveau tenu"} sur ${nombre(total)}`;

/** La ligne sous la copie : le niveau tenu, ou ce qui manque pour le tenir (règle 2 : le bout qui manque est nommé). */
export function ligneNiveau(level: CalcLevel, justes: number, total: number): { tenu: boolean; texte: string } {
  const label = NIVEAU[level].label;
  if (total >= 5 && justes >= 4) return { tenu: true, texte: `${label} tenu` };
  const manque = Math.max(1, 4 - justes);
  return { tenu: false, texte: `encore ${manque} ${manque > 1 ? "justes" : "juste"} pour tenir ${label}` };
}

// ---------------------------------------------------------------------------
// Session ciblée (/calculs/session) : les mots de l'écran de réglage, du
// round et du bilan.

export const SESSION = {
  nom: "Session ciblée",
  hubLigne: "Choisis tes matières, le nombre de questions et la difficulté, ou un mélange de niveaux. Les calculs sont tirés au hasard, corrigés un à un.",
  hubAction: "Régler ma session",
  hubKicker: "Sur mesure",
  hubPoints: ["Matières au choix", "5 à 50 questions", "Niveaux au pourcentage"] as const,
  ligne: "Tes matières, ton nombre de questions, ta difficulté. Les calculs sont tirés au hasard, sans doublon, puis mêlés.",
  retour: "Calculs",
  matieres: "Matières",
  matieresAide: "Une ou plusieurs, ou toutes.",
  toutes: "Toutes",
  nombre: "Nombre de questions",
  difficulte: "Difficulté",
  melange: "Mélange",
  melangeAide: "Règle la part de chaque niveau : la somme reste à 100 %.",
  melangeNiveau: "Un seul niveau",
  preregles: "Préréglages",
  partDe: (niveau: string) => `Part de questions ${niveau.toLowerCase()}`,
  resume: "Ta session",
  repriseDernier: "Réglages repris de ta dernière session.",
  aucuneMatiere: "Choisis au moins une matière.",
  lancer: (n: number) => `Lancer la session · ${nombreQuestions(n)}`,
  tirage: "Tirage de la session…",
  tirageRate: "La session ne s'est pas tirée. Réessaie.",
  arreter: "Arrêter la session",
  progression: (fait: number, n: number) => `Avancement de la session : ${fait} sur ${n}`,
  surTitre: "Calculs · Session ciblée",
  recommencer: "Recommencer avec les mêmes réglages",
  changer: "Changer les réglages",
  parNiveau: "Réussite par niveau",
  parMatiere: "Réussite par matière",
  manquees: "Les questions manquées",
  toutJuste: "Aucune rature : toute la session est juste.",
  justes: "Les questions justes",
  corrections: "Corrections",
  matieresTitre: (noms: string[], toutes: boolean) => (toutes ? "Toutes les matières" : noms.join(", ")),
} as const;

const nombreQuestions = (n: number) => `${nombre(n)} ${n > 1 ? "questions" : "question"}`;

const ADJ_NIVEAU: Record<CalcLevel, [string, string]> = {
  facile: ["facile", "faciles"],
  moyen: ["moyenne", "moyennes"],
  difficile: ["difficile", "difficiles"],
};

/** « 10 questions : 5 faciles, 3 moyennes, 2 difficiles » ; un seul niveau : « 10 questions difficiles ». */
export function phraseRepartition(counts: Record<CalcLevel, number>): string {
  const total = CALC_LEVELS.reduce((s, l) => s + counts[l], 0);
  if (total === 0) return "Aucune question avec ces réglages.";
  const niveaux = CALC_LEVELS.filter((l) => counts[l] > 0);
  if (niveaux.length === 1) return `${nombreQuestions(total)} ${ADJ_NIVEAU[niveaux[0]][total > 1 ? 1 : 0]}`;
  return `${nombreQuestions(total)} : ${niveaux.map((l) => `${nombre(counts[l])} ${ADJ_NIVEAU[l][counts[l] > 1 ? 1 : 0]}`).join(", ")}`;
}

/**
 * Ce que le vivier change à la demande, dit sans détour. null quand tout tient.
 * `dispo` : le nombre de questions de chaque niveau dans les matières choisies.
 */
export function phraseAjustement(count: number, plan: { voulu: Record<CalcLevel, number>; retenu: Record<CalcLevel, number>; total: number; courts: CalcLevel[] }, dispo: Record<CalcLevel, number>): string | null {
  if (!plan.courts.length) return null;
  const manques = plan.courts.map((l) => `${NIVEAU[l].label} : ${nombreQuestions(dispo[l])} dans ces matières pour ${nombre(plan.voulu[l])} demandées`);
  const fin =
    plan.total >= count
      ? "Les questions qui manquent sont reprises sur les autres niveaux du mélange."
      : `La session compte donc ${nombreQuestions(plan.total)} au lieu de ${nombre(count)}.`;
  return `${manques.join(" ; ")}. ${fin}`;
}

// ---------------------------------------------------------------------------
// « Tes calculs » (/calculs) : le compte des calculs réalisés, par niveau et
// par matière.

export const COMPTE = {
  titre: "Tes calculs",
  vide: "Aucun calcul réalisé pour l'instant",
  videAide: "Les compteurs se remplissent dès le premier round.",
  voirTableau: "Voir le tableau croisé",
  legende: "Calculs réalisés et part de justes, par matière et par niveau",
  matiere: "Matière",
  total: "Total",
  aucun: "Aucun calcul",
  teinte: "Fond vert dès 80 % de justes, rouge sous 60 %.",
} as const;

/** « 1 calcul », « 128 calculs » */
export const nbCalculs = (n: number) => `${nombre(n)} ${n > 1 ? "calculs" : "calcul"}`;

/** « 128 calculs réalisés » */
export const calculsRealises = (n: number) => `${nbCalculs(n)} ${n > 1 ? "réalisés" : "réalisé"}`;

/** Part de justes d'une case : « 76 % » ; null si aucun calcul. */
export const reussite = (ok: number, n: number) => pctScore(ok, n);
