// Le Codex : le cap en tête de /codex (V3 §4.6, §4.7). Où en est la
// préparation à l'examen, matière par matière, et les trois fuites qui lui
// coûtent le plus de points. Module neutre et pur : le moteur lit la maîtrise
// ici (maitriseLue), la vue construit le cap (capDe), l'écran l'affiche
// (components/codex/Cap.tsx).
//
// MAITRISE, StatutMaitrise, MaitriseMatiere, Maitrise, zoneDe, preparationDe,
// fuites et gainPreparation sont une COPIE LOCALE de lib/maitrise.ts (couloir
// B, V3 §4.3) : le Codex n'en importe rien avant la fusion F2 ; ensuite, ce
// fichier la réexporte (lot A7). Garder les signatures identiques.
//
// La maîtrise vient de codex_mesures_v3 (la maîtrise unique, maitrise_joueur)
// quand la base la donne ; sinon de l'ancienne mesure de codex_lire (séances
// ciblées d'une seule matière), et le cap le dit : « mesure provisoire ».

import type { ContenuMatiere } from "@/lib/codex/catalogue";
import type { MesuresSql } from "@/lib/codex/moteur";
import type { Destination } from "@/lib/codex/destinations";
import { joursEntre } from "@/lib/objectif-calc";

// ── Copie locale de lib/maitrise.ts (V3 §4.3) ──────────────────────────

export const MAITRISE = { FENETRE: 60, SEUIL_PROVISOIRE: 10, SEUIL_MESURE: 40, POIDS_PREMIERE: 2, POIDS_RAPPROCHEE: 0.5, ZONES: [50, 70] as const, REPERE: 70 } as const;

export type StatutMaitrise = "non_mesuree" | "provisoire" | "mesuree";

export type MaitriseMatiere = {
  cle: string;
  nom: string;
  court: string;
  /** poids à l'examen, en % */
  poids: number;
  /** null : pas encore mesurée (moins de 10 réponses) */
  pct: number | null;
  /** réponses de la fenêtre (60 au plus) */
  n: number;
  /** réponses en tout */
  total: number;
  statut: StatutMaitrise;
  /** la dernière réponse dans la matière (ISO) ; null : on ne la connaît pas */
  derniere: string | null;
  /** la maîtrise des 40 premières réponses (null sous 40) */
  debut: number | null;
  /** l'ancienne règle, gardée pour le verrou des rangs (V3 §4.5) */
  ancienne: number | null;
  zone: "basse" | "moyenne" | "haute" | null;
};

export type Maitrise = {
  matieres: MaitriseMatiere[];
  /** la préparation, 0–100 : la maîtrise pondérée par le poids des matières, les non mesurées à 0 */
  preparation: number;
  /** part du poids mesurée (40 réponses ou plus), 0–100 */
  couverture: number;
  /** « ancienne » : maitrise_joueur absente, la mesure est l'ancienne (affichée « provisoire ») */
  source: "unique" | "ancienne";
};

/** La zone d'une maîtrise : basse sous 50, moyenne de 50 à 69, haute à 70 et plus ; null : pas mesurée. */
export function zoneDe(pct: number | null): MaitriseMatiere["zone"] {
  if (pct === null) return null;
  return pct < MAITRISE.ZONES[0] ? "basse" : pct < MAITRISE.ZONES[1] ? "moyenne" : "haute";
}

const sommePoids = (ms: Pick<MaitriseMatiere, "poids">[]) => ms.reduce((s, m) => s + m.poids, 0);
const auDixieme = (x: number) => Math.round(x * 10) / 10;

/** La préparation : Σ poids × (pct ?? 0) / Σ poids, arrondie. */
export function preparationDe(ms: MaitriseMatiere[]): number {
  const total = sommePoids(ms);
  return total > 0 ? Math.round(ms.reduce((s, m) => s + m.poids * (m.pct ?? 0), 0) / total) : 0;
}

/** Ce que gagnerait la préparation si la matière atteignait ce seuil : (poids / Σ poids) × max(0, seuil − pct), au dixième. */
export function gainPreparation(m: MaitriseMatiere, seuil: number, ms: MaitriseMatiere[]): number {
  const total = sommePoids(ms);
  return total > 0 ? auDixieme((m.poids / total) * Math.max(0, seuil - (m.pct ?? 0))) : 0;
}

/** Les fuites (V3 §4.7) : les points de préparation perdus sous le repère de 70 %, par matière, les plus fortes d'abord. */
export function fuites(ms: MaitriseMatiere[], n = 3): { cle: string; court: string; points: number }[] {
  return ms
    .map((m) => ({ cle: m.cle, court: m.court, points: gainPreparation(m, MAITRISE.REPERE, ms) }))
    .filter((f) => f.points > 0)
    .sort((a, b) => b.points - a.points || a.cle.localeCompare(b.cle))
    .slice(0, n);
}

// ── La maîtrise telle que le Codex la lit ──────────────────────────────

/** La maîtrise d'une matière lue dans les mesures du moteur, sans son nom ni son poids. */
export type MaitriseLue = Pick<MaitriseMatiere, "pct" | "n" | "total" | "statut" | "derniere" | "debut" | "ancienne">;

/** L'ancienne mesure : mesurée à 40 questions (comme les sceaux), provisoire dès 5 (MIN_QUESTIONS_FOR_SIGNAL, lib/mastery.ts). */
const SEUIL_ANCIEN_PROVISOIRE = 5;

/**
 * La maîtrise d'une matière : la maîtrise unique si codex_mesures_v3 l'a
 * rendue (une matière absente n'a encore aucune réponse), sinon l'ancienne
 * mesure de codex_lire.
 */
export function maitriseLue(mesures: Pick<MesuresSql, "maitrise" | "maitrise_unique">, cle: string): MaitriseLue {
  if (mesures.maitrise_unique) {
    const u = mesures.maitrise_unique[cle];
    if (!u) return { pct: null, n: 0, total: 0, statut: "non_mesuree", derniere: null, debut: null, ancienne: mesures.maitrise?.[cle]?.pct ?? null };
    return { pct: u.statut === "non_mesuree" ? null : u.pct, n: u.questions, total: u.total, statut: u.statut, derniere: u.derniere, debut: u.debut, ancienne: u.ancienne };
  }
  const a = mesures.maitrise?.[cle];
  const q = a?.questions ?? 0;
  const statut: StatutMaitrise = q >= MAITRISE.SEUIL_MESURE ? "mesuree" : q >= SEUIL_ANCIEN_PROVISOIRE ? "provisoire" : "non_mesuree";
  return { pct: a && statut !== "non_mesuree" ? a.pct : null, n: q, total: q, statut, derniere: null, debut: a?.debut ?? null, ancienne: a?.pct ?? null };
}

/** La maîtrise du programme, matière par matière, la préparation et sa couverture. */
export function maitriseDuCodex(contenu: ContenuMatiere[], mesures: Pick<MesuresSql, "maitrise" | "maitrise_unique">): Maitrise {
  const matieres = contenu.map((c): MaitriseMatiere => {
    const m = maitriseLue(mesures, c.key);
    return { cle: c.key, nom: c.nom, court: c.court, poids: c.poids, ...m, zone: zoneDe(m.pct) };
  });
  const total = sommePoids(matieres);
  const mesure = sommePoids(matieres.filter((m) => m.statut === "mesuree"));
  return {
    matieres,
    preparation: preparationDe(matieres),
    couverture: total > 0 ? Math.round((100 * mesure) / total) : 0,
    source: mesures.maitrise_unique ? "unique" : "ancienne",
  };
}

// ── Le cap ─────────────────────────────────────────────────────────────

/** Le jour de Paris d'un instant (lib/objectif.ts est un module serveur). */
const JOUR_PARIS = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" });

/** « aujourd'hui », « hier », « il y a 12 j » : la dernière réponse dans la matière ; null : on ne la connaît pas. */
export function fraicheurDe(derniere: string | null, jour: string): string | null {
  const t = derniere ? Date.parse(derniere) : NaN;
  if (!Number.isFinite(t)) return null;
  const n = Math.max(0, joursEntre(JOUR_PARIS.format(t), jour));
  return n === 0 ? "aujourd'hui" : n === 1 ? "hier" : `il y a ${n} j`;
}

export type LigneCap = Pick<MaitriseMatiere, "cle" | "nom" | "court" | "poids" | "pct" | "n" | "statut" | "zone"> & {
  /** la largeur du segment de la règle : la part du poids de la matière, en % */
  part: number;
  /** « touchée il y a 12 j » (null : inconnue) */
  fraicheur: string | null;
};

export type VueCap = {
  /** J-n ; null : pas de jour J, ou un programme sans examen */
  joursAvant: number | null;
  preparation: number;
  zone: NonNullable<MaitriseMatiere["zone"]>;
  repere: number;
  couverture: number;
  /** l'ancienne mesure (maitrise_joueur absente) : « mesure provisoire » */
  provisoire: boolean;
  matieres: LigneCap[];
  fuites: { cle: string; court: string; points: number }[];
  /** « Y aller » : ce qui coince dans la première fuite (null : aucune, ou nulle part où aller) */
  destination: Destination | null;
};

/**
 * Le cap : la préparation, sa zone, la règle des matières, les trois fuites et
 * où aller pour la première. `destination` : le résolveur (destinationCoince,
 * lib/codex/destinations.ts) appliqué à la matière de la première fuite.
 */
export function capDe(m: Maitrise, o: { jour: string; joursAvant: number | null; destination: (matiere: string) => Destination | null }): VueCap {
  const total = sommePoids(m.matieres);
  const f = fuites(m.matieres);
  return {
    joursAvant: o.joursAvant,
    preparation: m.preparation,
    zone: zoneDe(m.preparation) ?? "basse",
    repere: MAITRISE.REPERE,
    couverture: m.couverture,
    provisoire: m.source === "ancienne",
    matieres: m.matieres.map((x) => ({
      cle: x.cle, nom: x.nom, court: x.court, poids: x.poids, pct: x.pct, n: x.n, statut: x.statut, zone: x.zone,
      part: total > 0 ? (100 * x.poids) / total : 0,
      fraicheur: fraicheurDe(x.derniere, o.jour),
    })),
    fuites: f,
    destination: f.length ? o.destination(f[0].cle) : null,
  };
}
