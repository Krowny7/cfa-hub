// Le Codex : le cap en tête de /codex (V3 §4.6, §4.7). Où en est la
// préparation à l'examen, matière par matière, et les trois fuites qui lui
// coûtent le plus de points. Module neutre et pur : le moteur lit la maîtrise
// ici (maitriseLue), la vue construit le cap (capDe), l'écran l'affiche
// (components/codex/Cap.tsx).
//
// La maîtrise unique (types, constantes, zones, préparation, fuites) vient de
// lib/maitrise.ts (V3 §4.3) ; ce fichier la réexporte pour le Codex (lot A7).
//
// La maîtrise vient de codex_mesures_v3 (la maîtrise unique, maitrise_joueur)
// quand la base la donne ; sinon de l'ancienne mesure de codex_lire (séances
// ciblées d'une seule matière), et le cap le dit : « mesure provisoire ».

import type { ContenuMatiere } from "@/lib/codex/catalogue";
import type { MesuresSql } from "@/lib/codex/moteur";
import type { Destination } from "@/lib/codex/destinations";
import { joursEntre } from "@/lib/objectif-calc";
import { MAITRISE, fuites, preparationDe, zoneDe, type Maitrise, type MaitriseMatiere, type StatutMaitrise } from "@/lib/maitrise";

export { MAITRISE, zoneDe, preparationDe, gainPreparation, fuites, type StatutMaitrise, type MaitriseMatiere, type Maitrise } from "@/lib/maitrise";

const sommePoids = (ms: Pick<MaitriseMatiere, "poids">[]) => ms.reduce((s, m) => s + m.poids, 0);

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

/** Les jours (de Paris) écoulés depuis cet instant jusqu'à `jour`, 0 au moins ; null : instant inconnu. */
export function joursDepuis(instant: string | null, jour: string): number | null {
  const t = instant ? Date.parse(instant) : NaN;
  return Number.isFinite(t) ? Math.max(0, joursEntre(JOUR_PARIS.format(t), jour)) : null;
}

/** « aujourd'hui », « hier », « il y a 12 j » : la dernière réponse dans la matière ; null : on ne la connaît pas. */
export function fraicheurDe(derniere: string | null, jour: string): string | null {
  const n = joursDepuis(derniere, jour);
  if (n === null) return null;
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

// ── Les textes du cap (l'écran les affiche tels quels) ─────────────────

export const TEXTES_CAP = {
  titre: "Le cap",
  pronostic: "Ce n'est pas un pronostic : le CFA Institute ne publie pas la note de passage.",
  provisoire: "Mesure provisoire, d'après tes séances ciblées.",
  detail: "Détail par matière",
  aucuneFuite: `Aucune fuite : toutes tes matières tiennent le repère de ${MAITRISE.REPERE} %.`,
  zone: { basse: "zone basse", moyenne: "zone moyenne", haute: "zone haute" } as const,
} as const;

const dixieme = (x: number) => x.toFixed(1).replace(".", ",");

/** « J-10 · Préparation 58 % · zone moyenne · repère 70 % » (sans J-n sans jour J, ou l'examen passé). */
export function enTeteCap(c: Pick<VueCap, "joursAvant" | "preparation" | "zone" | "repere">): string {
  const j = c.joursAvant === null || c.joursAvant < 0 ? null : c.joursAvant === 0 ? "Jour J" : `J-${c.joursAvant}`;
  return [...(j ? [j] : []), `Préparation ${c.preparation} %`, TEXTES_CAP.zone[c.zone], `repère ${c.repere} %`].join(" · ");
}

/** « Les trois fuites : » (ou la fuite, les deux fuites), selon leur nombre. */
export const titreFuites = (n: number) => (n <= 1 ? "La fuite :" : n === 2 ? "Les deux fuites :" : "Les trois fuites :");

/** « FSA −3,1 pts · Equity −2,4 · Ethics −2,0 » : l'unité une seule fois, après la première. */
export function ligneFuites(f: VueCap["fuites"]): string {
  return f.map((x, i) => `${x.court} −${dixieme(x.points)}${i === 0 ? " pts" : ""}`).join(" · ");
}

/** « 52 % », « ≈ 52 % » (provisoire), « pas encore mesurée ». */
export function pctCap(l: Pick<LigneCap, "pct" | "statut">): string {
  if (l.pct === null || l.statut === "non_mesuree") return "pas encore mesurée";
  return l.statut === "provisoire" ? `≈ ${l.pct} %` : `${l.pct} %`;
}

/** « FSA · ≈ 52 % · zone moyenne · touchée il y a 12 j » : une ligne du détail par matière. */
export function ligneMatiereCap(l: LigneCap): string {
  return [l.court, pctCap(l), ...(l.zone ? [TEXTES_CAP.zone[l.zone]] : []), ...(l.fraicheur ? [`touchée ${l.fraicheur}`] : [])].join(" · ");
}

/** L'infobulle d'une matière provisoire : « provisoire · 23 réponses sur 40 » ; null sinon. */
export function aideMatiereCap(l: Pick<LigneCap, "statut" | "n">): string | null {
  return l.statut === "provisoire" ? `provisoire · ${l.n} réponse${l.n > 1 ? "s" : ""} sur ${MAITRISE.SEUIL_MESURE}` : null;
}
