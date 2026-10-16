// Les paramètres de /practice : ce qu'un lien (une quête ou un bloc de la
// séance du jour du Codex, une carte de l'accueil) peut demander à
// l'entraînement ciblé. Module neutre et pur (client et serveur), testé par
// scripts/profil/test-trophees.ts.
//   topic=<cle>     une matière (comme avant)
//   topic=a,b,c     plusieurs matières ; topic=all : les dix
//   n=<10..90>      la taille de la séance (sans n : celle du format, comme avant)
//   poids=1         avec n : la part de chaque matière suit les poids officiels
//                   de l'examen (sans poids : parts égales)
//   format=90|180   le format (90 par défaut)
//   go=1            la séance se prépare tout de suite, sans le constructeur
// Une clé inconnue est ignorée ; un lien sans matière valable retombe sur la
// séance conseillée (les matières faibles), comme avant.

import { TOPICS } from "@/lib/practiceTopics";

/** Bornes de n : une séance d'au moins 10 questions, d'au plus un demi-examen. */
export const TAILLE_MIN = 10;
export const TAILLE_MAX = 90;

export type LienPractice = {
  /** les matières demandées, dans l'ordre de TOPICS ; null : aucune (la séance conseillée) */
  matieres: string[] | null;
  /** le nombre de questions demandé (borné à 10..90) ; null : celui du format */
  taille: number | null;
  /** avec une taille : parts au prorata des poids officiels */
  poids: boolean;
  format: 90 | 180 | null;
  go: boolean;
};

/** Lit les paramètres d'un lien (searchParams.get, ou un objet de page serveur). */
export function lireLienPractice(get: (cle: string) => string | null | undefined): LienPractice {
  const topic = (get("topic") ?? "").trim();
  let matieres: string[] | null = null;
  if (topic === "all") matieres = TOPICS.map((t) => t.key);
  else if (topic) {
    const voulues = new Set(topic.split(",").map((s) => s.trim()));
    const connues = TOPICS.filter((t) => voulues.has(t.key)).map((t) => t.key);
    matieres = connues.length ? connues : null;
  }
  const n = (get("n") ?? "").trim();
  const taille = /^\d{1,4}$/.test(n) ? Math.min(TAILLE_MAX, Math.max(TAILLE_MIN, Number(n))) : null;
  const format = get("format");
  return {
    matieres,
    taille,
    poids: get("poids") === "1",
    format: format === "180" ? 180 : format === "90" ? 90 : null,
    go: get("go") === "1",
  };
}

const POIDS: Record<string, number> = Object.fromEntries(TOPICS.map((t) => [t.key, t.weight]));

/**
 * La part de chaque matière dans une séance de n questions : au prorata des
 * poids officiels (`poids`) ou à parts égales, arrondie par la méthode des
 * plus forts restes (à égalité, l'ordre donné) : la somme fait n. Une matière
 * qui n'a pas assez de questions (`dispo`) donne tout ce qu'elle a et le
 * manque passe aux autres, dans les mêmes proportions ; la somme n'est plus
 * petite que n que si toutes sont épuisées. Une clé inconnue ne reçoit rien.
 */
export function repartir(n: number, matieres: string[], o: { poids?: boolean; dispo?: Record<string, number> } = {}): Record<string, number> {
  const parts: Record<string, number> = Object.fromEntries(matieres.map((m) => [m, 0]));
  const plafond = (m: string) => (o.dispo ? Math.max(0, Math.floor(o.dispo[m] ?? 0)) : Infinity);
  const poidsDe = (m: string) => (o.poids ? POIDS[m] ?? 0 : m in POIDS ? 1 : 0);
  let ouvertes = [...new Set(matieres)].filter((m) => poidsDe(m) > 0 && plafond(m) > 0);
  let reste = Math.max(0, Math.floor(n) || 0);
  while (reste > 0 && ouvertes.length > 0) {
    const w = ouvertes.map(poidsDe);
    const somme = w.reduce((a, b) => a + b, 0);
    const brut = w.map((x) => (reste * x) / somme);
    const base = brut.map(Math.floor);
    let manque = reste - base.reduce((a, b) => a + b, 0);
    const ordre = base.map((_, i) => i).sort((a, b) => brut[b] - base[b] - (brut[a] - base[a]) || a - b);
    for (const i of ordre) {
      if (manque <= 0) break;
      base[i] += 1;
      manque -= 1;
    }
    let pose = 0;
    ouvertes.forEach((m, i) => {
      const k = Math.min(base[i], plafond(m) - parts[m]);
      parts[m] += k;
      pose += k;
    });
    reste -= pose;
    ouvertes = ouvertes.filter((m) => parts[m] < plafond(m));
  }
  return parts;
}

/** Les matières qui reçoivent au moins une question. */
export const matieresServies = (parts: Record<string, number>): string[] => Object.keys(parts).filter((m) => parts[m] > 0);

/** Un mélange de Fisher-Yates (le hasard est passé pour les tests). */
export function melanger<T>(liste: readonly T[], alea: () => number = Math.random): T[] {
  const l = [...liste];
  for (let i = l.length - 1; i > 0; i--) {
    const j = Math.floor(alea() * (i + 1));
    [l[i], l[j]] = [l[j], l[i]];
  }
  return l;
}

/**
 * Le tirage d'une séance de n questions : les questions tirées par matière
 * (déjà dans un ordre au hasard), réparties par `repartir` selon ce que chaque
 * matière a vraiment, puis mêlées. Rend les questions et les matières servies.
 */
export function tirerSeance<Q>(
  parMatiere: Record<string, readonly Q[]>,
  n: number,
  matieres: string[],
  o: { poids?: boolean; alea?: () => number } = {},
): { questions: Q[]; matieres: string[] } {
  const uniques = [...new Set(matieres)];
  const dispo = Object.fromEntries(uniques.map((m) => [m, parMatiere[m]?.length ?? 0]));
  const parts = repartir(n, uniques, { poids: o.poids, dispo });
  const questions = melanger(
    uniques.flatMap((m) => (parMatiere[m] ?? []).slice(0, parts[m] ?? 0)),
    o.alea,
  );
  return { questions, matieres: matieresServies(parts) };
}
