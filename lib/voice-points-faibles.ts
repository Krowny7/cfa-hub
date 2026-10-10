// Voix « Le Trait » de « Tes points faibles » (Moi › Stats, S'entraîner) :
// un mot par chose, toujours le chiffre, jamais le score brut, pas
// d'emphase. Chaque ligne nomme un fait et mène à une action.
// Module neutre (ni « use client » ni serveur).

import { nombre, pct, pluriel } from "@/lib/voice";
import type { ConceptCoince, Unite } from "@/lib/points-faibles";

/** L'unité nommée dans les phrases : la notion (Learning Module), ou en repli le thème. */
const UNITE: Record<Unite, { aucun: string; unMeme: string; ce: string }> = {
  notion: { aucun: "Aucune notion", unMeme: "une même notion", ce: "cette notion" },
  theme: { aucun: "Aucun thème", unMeme: "un même thème", ce: "ce thème" },
};

const jamaisReprises = (n: number) => (n > 1 ? "jamais reprises" : "jamais reprise");
const justes = (ok: number, n: number) => `${nombre(ok)} ${ok > 1 ? "justes" : "juste"} sur ${nombre(n)}`;

export const POINTS_FAIBLES = {
  titre: "Tes points faibles",
  /** carte héros de S'entraîner */
  kicker: "Ton point faible",
  /** le même surtitre, quand un autre point faible de la liste est mis en avant */
  kickerRang: (rang: number) => `Point faible n° ${nombre(rang)}`,
  liste: (n: number) => (n > 1 ? `Mes ${nombre(n)} points faibles` : "Mon point faible"),
  voirTous: (n: number) => `Voir les ${nombre(n)}`,
  voirMoins: "Voir moins",
  /** assez de données, rien au-dessus du seuil */
  rien: "Rien ne coince vraiment. Continue comme ça.",
  rienTexte: (u: Unite) => `${UNITE[u].aucun} ne ressort : peu de ratures en cours, et ta réussite récente tient.`,
  /** la même chose, tant que les ratures par thème ne se lisent pas */
  rienTexteSansRatures: (u: Unite) => `${UNITE[u].aucun} ne ressort : ta réussite récente tient.`,
  /** pas assez de données */
  peu: "Pas encore assez de réponses pour nommer un point faible.",
  peuTexte: (u: Unite, reponses: number, ratures: number) => `Il faut ${nombre(reponses)} réponses sur ${UNITE[u].unMeme}, ou ${nombre(ratures)} ratures en cours.`,
  repli: (matiere: string) => `En attendant, ta matière la plus fragile : ${matiere}.`,
  repliAction: "Lancer une session",
  /** la jauge (jamais le score) */
  jauge: (niveau: number, max: number) => `Intensité ${nombre(niveau)} sur ${nombre(max)}`,
  /** « Dernier passage il y a 7 semaines » (calculé dans le navigateur ; entrée du tiroir, sans point comme les autres) */
  dernierPassage: (semaines: number) => `Dernier passage il y a ${nombre(semaines)} semaines`,
  /** la ligne de progrès, en encre calme : tout le carnet (Moi), ou la notion (héros de S'entraîner) */
  rattrape: (n: number) => `Rattrapé cette semaine : ${pluriel(n, "rature rayée", "ratures rayées")} dans tout le carnet.`,
  rattrapeNotion: (u: Unite, n: number) => `Rattrapé cette semaine : ${pluriel(n, "rature rayée", "ratures rayées")} sur ${UNITE[u].ce}.`,
  /** le repère d'une notion, après la matière : « Fixed Income · LM 11 » */
  repereLm: (lm: number) => `LM ${nombre(lm)}`,
  /** les concepts les plus chargés d'une notion (tiroir ; héros : le premier) */
  coince: "Ce qui coince",
  coinceUn: (concept: string) => `Ce qui coince : ${concept}`,
  /** actions */
  propre: (n: number) => `Mettre au propre · ${nombre(n)}`,
  lienFiche: (page: number) => `Page ${nombre(page)} de la fiche`,
  /** une fiche d'un seul tenant (ancre, sans page) */
  lienFicheEntiere: "La fiche",
  /** le chapitre du cours audio, au bon module */
  lienCours: "Chapitre audio",
  lienQcm: "Refaire le QCM",
  lienCalcul: "S'entraîner sur ce calcul",
  calcul: (nom: string) => `Calcul · ${nom}`,
} as const;

/**
 * La phrase d'un point faible : les ratures en cours d'abord, puis la
 * réussite récente quand elle repose sur assez de réponses.
 * « 12 ratures en cours, 40 % de réussite sur tes 25 dernières réponses. »
 * « 5 ratures en cours, dont 3 jamais reprises. »
 * « Pas de rature en cours, mais 3 justes sur 10. »
 * Ratures inconnues (migration_points_faibles.sql absente) : la réussite
 * seule, « 3 justes sur tes 10 dernières réponses. »
 */
export function phrasePointFaible(f: {
  n: number;
  ok: number;
  enCours: number;
  vives: number;
  calcul: boolean;
  recentSuffisant: boolean;
  raturesConnues: boolean;
}): string {
  if (f.calcul && (f.enCours === 0 || !f.raturesConnues)) return `Sur tes ${nombre(f.n)} derniers calculs : ${nombre(f.ok)} ${f.ok > 1 ? "justes" : "juste"}.`;
  if (!f.raturesConnues) return `${nombre(f.ok)} ${f.ok > 1 ? "justes" : "juste"} sur tes ${nombre(f.n)} dernières réponses.`;
  if (f.enCours > 0) {
    const tete = pluriel(f.enCours, "rature en cours", "ratures en cours");
    if (f.recentSuffisant && f.n > 0) return `${tete}, ${pct((f.ok / f.n) * 100)} de réussite sur tes ${nombre(f.n)} dernières réponses.`;
    if (f.vives === f.enCours) return `${tete}, ${jamaisReprises(f.vives)}.`;
    if (f.vives > 0) return `${tete}, dont ${nombre(f.vives)} ${jamaisReprises(f.vives)}.`;
    return `${tete}, ${f.enCours > 1 ? "chacune déjà reprise une fois" : "déjà reprise une fois"}.`;
  }
  return `Pas de rature en cours, mais ${justes(f.ok, f.n)}.`;
}

/**
 * Le tiroir d'une ligne ouverte : seulement ce que la phrase ne dit pas. La
 * réussite récente quand la phrase parle des ratures seules ; les ratures
 * jamais reprises quand la phrase cite la réussite ; les anciennes et les
 * rayées de la semaine (comprises dans les anciennes) ; les sources quand il
 * y en a plusieurs.
 * « Ratures : 8 jamais reprises, 4 anciennes, dont 3 rayées cette semaine »
 */
export function detailsPointFaible(f: {
  n: number;
  ok: number;
  enCours: number;
  vives: number;
  anciennes: number;
  rayees7j: number;
  recentSuffisant: boolean;
  sources: { libelle: string; n: number }[];
}): string[] {
  const phraseCiteReussite = f.enCours === 0 || (f.recentSuffisant && f.n > 0);
  const lignes: string[] = [];
  if (!phraseCiteReussite) lignes.push(f.n > 0 ? `Réussite récente : ${pct((f.ok / f.n) * 100)}, ${justes(f.ok, f.n)}` : "Aucune réponse ces 90 derniers jours");
  const ratures = [
    f.enCours > 0 && phraseCiteReussite && f.vives > 0 ? `${nombre(f.vives)} ${jamaisReprises(f.vives)}` : null,
    // les rayées de la semaine sont des anciennes : « dont », pas une addition
    f.anciennes > 0 ? pluriel(f.anciennes, "ancienne", "anciennes") + (f.rayees7j > 0 ? `, dont ${pluriel(f.rayees7j, "rayée", "rayées")} cette semaine` : "") : null,
  ].filter((x): x is string => x !== null);
  if (ratures.length) lignes.push(`Ratures : ${ratures.join(", ")}`);
  if (f.sources.length > 1) lignes.push(`Répondu en : ${f.sources.map((s) => `${s.libelle} ${nombre(s.n)}`).join(" · ")}`);
  return lignes;
}

/** Un concept qui coince et ce qui le charge : « Duration gap · 3 ratures en cours », sinon « … · 2 erreurs récentes ». */
export function conceptCoince(c: ConceptCoince): string {
  return `${c.concept} · ${c.ratures > 0 ? pluriel(c.ratures, "rature en cours", "ratures en cours") : pluriel(c.erreurs, "erreur récente", "erreurs récentes")}`;
}
