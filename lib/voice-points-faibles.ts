// Voix « Le Trait » de « Tes points faibles » (Moi › Stats, S'entraîner) :
// un mot par chose, toujours le chiffre, jamais le score brut, pas
// d'emphase. Chaque ligne nomme un fait et mène à une action.
// Module neutre (ni « use client » ni serveur).

import { nombre, pct, pluriel } from "@/lib/voice";

const jamaisReprises = (n: number) => (n > 1 ? "jamais reprises" : "jamais reprise");
const justes = (ok: number, n: number) => `${nombre(ok)} ${ok > 1 ? "justes" : "juste"} sur ${nombre(n)}`;

export const POINTS_FAIBLES = {
  titre: "Tes points faibles",
  /** carte héros de S'entraîner */
  kicker: "Ton point faible",
  liste: (n: number) => (n > 1 ? `Mes ${nombre(n)} points faibles` : "Mon point faible"),
  voirTous: (n: number) => `Voir les ${nombre(n)}`,
  voirMoins: "Voir moins",
  /** assez de données, rien au-dessus du seuil */
  rien: "Rien ne coince vraiment. Continue comme ça.",
  rienTexte: "Aucun thème ne ressort : peu de ratures en cours, et ta réussite récente tient.",
  /** pas assez de données */
  peu: "Pas encore assez de réponses pour nommer un point faible.",
  peuTexte: (reponses: number, ratures: number) => `Il faut ${nombre(reponses)} réponses sur un même thème, ou ${nombre(ratures)} ratures en cours.`,
  repli: (matiere: string) => `En attendant, ta matière la plus fragile : ${matiere}.`,
  repliAction: "Lancer une session",
  /** la jauge (jamais le score) */
  jauge: (niveau: number, max: number) => `Intensité ${nombre(niveau)} sur ${nombre(max)}`,
  /** la ligne ouverte */
  recente: (ok: number, n: number) => (n > 0 ? `Réussite récente : ${pct((ok / n) * 100)}, ${justes(ok, n)}` : "Aucune réponse ces 90 derniers jours"),
  ratures: (enCours: number, vives: number, anciennes: number) =>
    [
      enCours > 0
        ? `Ratures : ${nombre(enCours)} en cours${vives >= enCours ? `, ${jamaisReprises(vives)}` : vives > 0 ? `, dont ${nombre(vives)} ${jamaisReprises(vives)}` : ""}`
        : "Aucune rature en cours",
      anciennes > 0 ? pluriel(anciennes, "ancienne", "anciennes") : null,
    ]
      .filter(Boolean)
      .join(" · "),
  rayeesSemaine: (n: number) => `${pluriel(n, "rayée", "rayées")} cette semaine`,
  sources: (liste: { libelle: string; n: number }[]) => `Répondu en : ${liste.map((s) => `${s.libelle} ${nombre(s.n)}`).join(" · ")}`,
  /** « Dernier passage il y a 7 semaines. » (calculé dans le navigateur) */
  dernierPassage: (semaines: number) => `Dernier passage il y a ${nombre(semaines)} semaines.`,
  /** la ligne de progrès, en encre calme */
  rattrape: (n: number) => `Rattrapé cette semaine : ${pluriel(n, "rature rayée", "ratures rayées")}.`,
  /** actions */
  propre: (n: number) => `Mettre au propre · ${nombre(n)}`,
  lienFiche: (page: number) => `Page ${nombre(page)} de la fiche`,
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
 */
export function phrasePointFaible(f: { n: number; ok: number; enCours: number; vives: number; calcul: boolean; recentSuffisant: boolean }): string {
  if (f.enCours > 0) {
    const tete = pluriel(f.enCours, "rature en cours", "ratures en cours");
    if (f.recentSuffisant && f.n > 0) return `${tete}, ${pct((f.ok / f.n) * 100)} de réussite sur tes ${nombre(f.n)} dernières réponses.`;
    if (f.vives === f.enCours) return `${tete}, ${jamaisReprises(f.vives)}.`;
    if (f.vives > 0) return `${tete}, dont ${nombre(f.vives)} ${jamaisReprises(f.vives)}.`;
    return `${tete}, ${f.enCours > 1 ? "chacune déjà reprise une fois" : "déjà reprise une fois"}.`;
  }
  if (f.calcul) return `Sur tes ${nombre(f.n)} derniers calculs : ${nombre(f.ok)} ${f.ok > 1 ? "justes" : "juste"}.`;
  return `Pas de rature en cours, mais ${justes(f.ok, f.n)}.`;
}
