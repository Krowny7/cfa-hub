// « Tes points faibles » : le score de faiblesse d'une notion, sa phrase et
// le classement. Module pur (ni serveur ni client), testé par
// scripts/test-points-faibles.mjs.
//
// L'unité est la « notion ». À l'étape 1, c'est un thème (un QCM de 2 à 5
// readings, une page de fiche, un type de calcul) ; à l'étape 2, ce sera un
// Learning Module. Une notion n'est qu'une clé, un libellé, des liens et des
// mesures : changer d'unité, c'est changer ce qui construit les notions
// (components/moi/points-faibles-data.ts), pas ce module.
//
// Le score (0 à 100, jamais affiché) croise deux faits :
//   lisse  = (ok + 3,25) / (n + 5)           réussite récente, lissée vers 65 %
//   manque = max(0, 0,85 − lisse) / 0,85     nul dès 85 %
//   charge = 1 − exp(−(vives + 0,5·enVoie) / 6)
//   score  = round(100 × (0,55·manque + 0,45·charge))
// n, ok : les dernières réponses sur la notion (séances entières, des plus
// récentes aux plus anciennes, jusqu'à 20 réponses, sur 90 jours au plus,
// comme formeDe dans lib/forme.ts). vives : ratures en cours jamais reprises
// juste depuis la dernière erreur ; enVoie : ratures en cours déjà reprises
// (les vives comptent donc double). Les anciennes (rayées) ne comptent pas :
// elles s'affichent comme un progrès.
// Une notion est éligible dès 8 réponses récentes ou 3 ratures en cours, et
// affichée comme point faible à partir d'un score de 25.

import { phrasePointFaible } from "@/lib/voice-points-faibles";

export const RECENT_REPONSES = 20;
export const RECENT_JOURS = 90;
/** a priori du lissage : 3,25 justes sur 5, soit 65 % */
export const LISSAGE = { ok: 3.25, n: 5 } as const;
export const CIBLE = 0.85;
export const ECHELLE_CHARGE = 6;
export const POIDS = { manque: 0.55, charge: 0.45 } as const;
export const MIN_REPONSES = 8;
export const MIN_RATURES = 3;
export const SEUIL_AFFICHAGE = 25;
export const MAX_LISTE = 10;
export const JAUGE_MAX = 4;
/** au-delà, « Dernier passage il y a N semaines » s'ajoute */
export const SEMAINES_OUBLI = 6;

const JOUR_MS = 86_400_000;

export type Lien = { nature: "fiche" | "qcm" | "calcul"; href: string; libelle: string };

export type Mesures = {
  /** réponses récentes et justes parmi elles (voir recentDe) */
  n: number;
  ok: number;
  /** ratures en cours, dont vives (jamais reprises depuis la dernière erreur) */
  enCours: number;
  vives: number;
  /** ratures rayées, dont ces 7 derniers jours */
  anciennes: number;
  rayees7j: number;
  /** ratures en cours que « Mettre au propre » peut repasser (question encore dans un set de la notion) */
  aRepasser: number;
  /** dernière activité (ISO), réponses et ratures confondues */
  derniere: string | null;
};

export type Notion = {
  /** clé stable : « qcm:fixed_income:R59–R61 », « fiche:equity:4 », « calc:equity:margin-purchase » (étape 2 : « fixed_income:11 ») */
  cle: string;
  libelle: string;
  /** clé de matière (components/reviser/catalog.ts) et son nom */
  matiere: string;
  matiereNom: string;
  /** repère court : « R59–R61 », « p. 4 », null */
  repere: string | null;
  calcul: boolean;
  liens: Lien[];
  /** les sets de questions de la notion (« Mettre au propre » filtré) ; vide : pas de reprise ciblée */
  sets: string[];
  /** réponses par source, les plus nombreuses d'abord (détail) */
  sources: { libelle: string; n: number }[];
  mesures: Mesures;
};

export type PointFaible = Notion & {
  /** 0 à 100, pour trier : jamais affiché */
  score: number;
  /** la jauge, 1 à JAUGE_MAX */
  niveau: number;
  phrase: string;
};

export type EtatPointsFaibles = {
  /** faibles : au moins un point faible ; rien : assez de données, rien au-dessus du seuil ; peu : pas assez de données */
  etat: "faibles" | "rien" | "peu";
  /** les points faibles, du plus net au moins net (MAX_LISTE au plus) */
  liste: PointFaible[];
  /** notions éligibles (assez de données) */
  eligibles: number;
  /** ratures rayées ces 7 derniers jours, toutes notions */
  rayeesSemaine: number;
};

/** Ce que reçoivent les cartes : le classement, et si « Mettre au propre ce thème » est ouvert (migration_points_faibles.sql collée). */
export type PointsFaiblesData = EtatPointsFaibles & { propre: boolean };

export type SeanceDatee = { n: number; ok: number; at: string };

/** La réussite récente : séances entières, des plus récentes aux plus anciennes, jusqu'à RECENT_REPONSES réponses, sur RECENT_JOURS jours au plus. */
export function recentDe(seances: SeanceDatee[], now: number): { n: number; ok: number } {
  const depuis = now - RECENT_JOURS * JOUR_MS;
  const liste = seances
    .filter((s) => s.n > 0 && Date.parse(s.at) >= depuis)
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  let n = 0;
  let ok = 0;
  for (const s of liste) {
    if (n >= RECENT_REPONSES) break;
    n += s.n;
    ok += Math.min(s.ok, s.n);
  }
  return { n, ok };
}

/** Assez de données pour juger : MIN_REPONSES réponses récentes, ou MIN_RATURES ratures en cours. */
export function eligible(m: Pick<Mesures, "n" | "enCours">): boolean {
  return m.n >= MIN_REPONSES || m.enCours >= MIN_RATURES;
}

/** Le score de faiblesse, 0 à 100. */
export function scoreDe(m: Pick<Mesures, "n" | "ok" | "enCours" | "vives">): number {
  const n = Math.max(0, m.n);
  const ok = Math.min(Math.max(0, m.ok), n);
  const vives = Math.max(0, Math.min(m.vives, m.enCours));
  const enVoie = Math.max(0, m.enCours - vives);
  const lisse = (ok + LISSAGE.ok) / (n + LISSAGE.n);
  const manque = Math.max(0, CIBLE - lisse) / CIBLE;
  const charge = 1 - Math.exp(-(vives + 0.5 * enVoie) / ECHELLE_CHARGE);
  return Math.round(100 * (POIDS.manque * manque + POIDS.charge * charge));
}

/** La jauge : 1 (moins de 30), 2 (moins de 50), 3 (moins de 75), 4. */
export function niveauDe(score: number): number {
  return score < 30 ? 1 : score < 50 ? 2 : score < 75 ? 3 : 4;
}

/** Semaines depuis la dernière activité, quand elle dépasse SEMAINES_OUBLI semaines (sinon null). À appeler dans le navigateur. */
export function semainesDepuis(derniere: string | null, now: number): number | null {
  if (!derniere) return null;
  const t = Date.parse(derniere);
  if (!Number.isFinite(t)) return null;
  const jours = (now - t) / JOUR_MS;
  return jours > SEMAINES_OUBLI * 7 ? Math.floor(jours / 7) : null;
}

const ratio = (m: Mesures) => (m.n > 0 ? m.ok / m.n : 1);

/** Ordre des points faibles : score, puis ratures vives, ratures en cours, réussite récente la plus basse, libellé. */
export function comparer(a: PointFaible, b: PointFaible): number {
  return (
    b.score - a.score ||
    b.mesures.vives - a.mesures.vives ||
    b.mesures.enCours - a.mesures.enCours ||
    ratio(a.mesures) - ratio(b.mesures) ||
    a.libelle.localeCompare(b.libelle, "fr") ||
    (a.cle < b.cle ? -1 : a.cle > b.cle ? 1 : 0)
  );
}

/** Une notion jugée : son score, sa jauge et sa phrase. */
export function jugerNotion(x: Notion): PointFaible {
  const m = x.mesures;
  const score = scoreDe(m);
  return {
    ...x,
    score,
    niveau: niveauDe(score),
    phrase: phrasePointFaible({ n: m.n, ok: m.ok, enCours: m.enCours, vives: m.vives, calcul: x.calcul, recentSuffisant: m.n >= MIN_REPONSES }),
  };
}

/** Les points faibles d'un joueur, à partir de ses notions. */
export function pointsFaibles(notions: Notion[]): EtatPointsFaibles {
  const eligibles = notions.filter((x) => eligible(x.mesures));
  const liste = eligibles
    .map(jugerNotion)
    .filter((p) => p.score >= SEUIL_AFFICHAGE)
    .sort(comparer)
    .slice(0, MAX_LISTE);
  const rayeesSemaine = notions.reduce((s, x) => s + Math.max(0, x.mesures.rayees7j), 0);
  return { etat: liste.length ? "faibles" : eligibles.length ? "rien" : "peu", liste, eligibles: eligibles.length, rayeesSemaine };
}

export const AUCUN_POINT_FAIBLE: PointsFaiblesData = { etat: "peu", liste: [], eligibles: 0, rayeesSemaine: 0, propre: false };
