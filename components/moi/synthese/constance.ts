import { TOPICS } from "@/lib/practiceTopics";
import { MINIS_FR } from "@/lib/voice-moi";
import type { AnswerSubject } from "@/lib/answer-stats";

// Ta constance par matière : l'écart type de ta réussite d'une semaine à l'autre. Pur,
// sans accès à la base. Les séances de chaque matière (toutes sources : 30 du jour, Salles,
// duels, QCM…) sont regroupées par semaine glissante ; une semaine compte à partir de
// SEMAINE_MIN réponses, sinon une poignée de questions ferait tout varier.

const JOUR_MS = 86400000;
const SEMAINES = 12;
/** Une moitié de la fenêtre : l'évolution compare les 6 dernières semaines aux 6 d'avant. */
const MOITIE = SEMAINES / 2;
const SEMAINE_MIN = 5;
/** Sous 3 semaines mesurées, un écart type ne veut rien dire. */
const MESURES_MIN = 3;

export type ConstanceMatiere = {
  cle: string;
  nom: string;
  /** l'écart type en points de réussite sur 12 semaines ; null : pas assez de semaines mesurées */
  ecart: number | null;
  /** l'écart type des 6 dernières semaines moins celui des 6 d'avant ; négatif : plus régulier. null : pas de quoi comparer */
  evolution: number | null;
};

const arrondi1 = (x: number) => Math.round(x * 10) / 10;

/** L'écart type d'échantillon, ou null sous MESURES_MIN valeurs. */
export function ecartType(v: number[]): number | null {
  if (v.length < MESURES_MIN) return null;
  const moy = v.reduce((a, b) => a + b, 0) / v.length;
  return arrondi1(Math.sqrt(v.reduce((a, b) => a + (b - moy) ** 2, 0) / (v.length - 1)));
}

/** La réussite (%) de chaque semaine mesurée, de la plus récente (rang 0) à la plus ancienne ; null : pas assez de réponses cette semaine-là. */
export function reussiteParSemaine(seances: { n: number; ok: number; at: string }[], now: number): (number | null)[] {
  const semaines = Array.from({ length: SEMAINES }, () => ({ n: 0, ok: 0 }));
  for (const s of seances) {
    const rang = Math.floor((now - Date.parse(s.at)) / (7 * JOUR_MS));
    if (rang < 0 || rang >= SEMAINES) continue;
    semaines[rang].n += s.n;
    semaines[rang].ok += s.ok;
  }
  return semaines.map((w) => (w.n >= SEMAINE_MIN ? (100 * w.ok) / w.n : null));
}

const mesurees = (v: (number | null)[]) => v.filter((x): x is number => x !== null);

/** Les dix matières, de la plus régulière à la moins régulière ; celles qu'on ne peut pas mesurer ferment la liste. */
export function constanceMatieres(sujets: Pick<AnswerSubject, "key" | "seances">[], now: number): ConstanceMatiere[] {
  const lignes = TOPICS.map((t): ConstanceMatiere => {
    const semaines = reussiteParSemaine(sujets.find((s) => s.key === t.key)?.seances ?? [], now);
    const recent = ecartType(mesurees(semaines.slice(0, MOITIE)));
    const avant = ecartType(mesurees(semaines.slice(MOITIE)));
    return { cle: t.key, nom: MINIS_FR[t.key] ?? t.key, ecart: ecartType(mesurees(semaines)), evolution: recent !== null && avant !== null ? arrondi1(recent - avant) : null };
  });
  return lignes.sort((a, b) => (a.ecart ?? Infinity) - (b.ecart ?? Infinity));
}
