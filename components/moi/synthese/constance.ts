import { TOPICS } from "@/lib/practiceTopics";
import { MINIS_FR } from "@/lib/voice-moi";
import type { AnswerSubject } from "@/lib/answer-stats";

// Ta volatilité, semaine après semaine : pour chaque matière et chacune des dernières
// semaines, l'écart type de ta réussite hebdomadaire sur une fenêtre glissante de 4
// semaines (une semaine seule ne donne pas d'écart type). Pur, sans accès à la base. Les
// séances (toutes sources : 30 du jour, Salles, duels, QCM…) sont regroupées par semaine
// glissante ; une semaine compte à partir de SEMAINE_MIN réponses, sinon une poignée de
// questions ferait tout varier. La ligne « Volatilité » est la moyenne des matières.

const JOUR_MS = 86400000;
/** Les colonnes : les dernières semaines, de la plus ancienne à l'actuelle. */
const COLONNES = 6;
/** La fenêtre glissante de chaque colonne, en semaines. */
const FENETRE = 4;
const SEMAINE_MIN = 5;
/** Sous 3 semaines mesurées dans la fenêtre, un écart type ne veut rien dire. */
const MESURES_MIN = 3;
/** La volatilité d'une colonne demande au moins ce nombre de matières mesurées. */
const MATIERES_MIN = 2;
/** Sous ce changement (en points), la constance est stable. */
const ECART_STABLE = 1;

export type Tendance = "mieux" | "moins" | "stable" | null;
export type ConstanceLigne = { cle: string; nom: string; periodes: (number | null)[]; tendance: Tendance };
export type ConstanceVue = {
  /** la date de chaque colonne, de la plus ancienne à aujourd'hui : « 4 nov. » */
  dates: string[];
  moyenne: ConstanceLigne;
  lignes: ConstanceLigne[];
};

const arrondi1 = (x: number) => Math.round(x * 10) / 10;

/** L'écart type d'échantillon, ou null sous MESURES_MIN valeurs. */
export function ecartType(v: number[]): number | null {
  if (v.length < MESURES_MIN) return null;
  const moy = v.reduce((a, b) => a + b, 0) / v.length;
  return arrondi1(Math.sqrt(v.reduce((a, b) => a + (b - moy) ** 2, 0) / (v.length - 1)));
}

/** La réussite (%) de chaque semaine, de la plus récente (rang 0) à la plus ancienne ; null : pas assez de réponses cette semaine-là. */
export function reussiteParSemaine(seances: { n: number; ok: number; at: string }[], now: number): (number | null)[] {
  const semaines = Array.from({ length: COLONNES + FENETRE - 1 }, () => ({ n: 0, ok: 0 }));
  for (const s of seances) {
    const rang = Math.floor((now - Date.parse(s.at)) / (7 * JOUR_MS));
    if (rang < 0 || rang >= semaines.length) continue;
    semaines[rang].n += s.n;
    semaines[rang].ok += s.ok;
  }
  return semaines.map((w) => (w.n >= SEMAINE_MIN ? (100 * w.ok) / w.n : null));
}

/** La première et la dernière colonne mesurées ; null sous deux mesures. */
export function extremes(periodes: (number | null)[]): { debut: number; fin: number } | null {
  const v = periodes.filter((x): x is number => x !== null);
  return v.length < 2 ? null : { debut: v[0], fin: v[v.length - 1] };
}

function tendanceDe(periodes: (number | null)[]): Tendance {
  const e = extremes(periodes);
  if (!e) return null;
  if (Math.abs(e.fin - e.debut) < ECART_STABLE) return "stable";
  return e.fin < e.debut ? "mieux" : "moins";
}

const dateCourte = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });

/** Les matières mesurées (ordre du programme) et leur moyenne, colonne par colonne. */
export function constanceVue(sujets: Pick<AnswerSubject, "key" | "seances">[], now: number): ConstanceVue {
  const lignes = TOPICS.map((t): ConstanceLigne => {
    const semaines = reussiteParSemaine(sujets.find((s) => s.key === t.key)?.seances ?? [], now);
    const periodes = Array.from({ length: COLONNES }, (_, p) => {
      const debut = COLONNES - 1 - p;
      return ecartType(semaines.slice(debut, debut + FENETRE).filter((x): x is number => x !== null));
    });
    return { cle: t.key, nom: MINIS_FR[t.key] ?? t.key, periodes, tendance: tendanceDe(periodes) };
  }).filter((l) => l.periodes.some((x) => x !== null));
  const periodes = Array.from({ length: COLONNES }, (_, p) => {
    const v = lignes.flatMap((l) => (l.periodes[p] === null ? [] : [l.periodes[p] as number]));
    return v.length >= MATIERES_MIN ? arrondi1(v.reduce((a, b) => a + b, 0) / v.length) : null;
  });
  const dates = Array.from({ length: COLONNES }, (_, p) => dateCourte.format(now - (COLONNES - 1 - p) * 7 * JOUR_MS));
  return { dates, moyenne: { cle: "moyenne", nom: "", periodes, tendance: tendanceDe(periodes) }, lignes };
}
