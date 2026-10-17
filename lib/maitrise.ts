import type { SupabaseClient } from "@supabase/supabase-js";
import { TOPICS } from "@/lib/practiceTopics";
import { subjectByKey } from "@/components/reviser/catalog";
import { NBSP } from "@/lib/voice";

// La maîtrise unique (V3 §4) : une seule définition de la maîtrise d'une
// matière, partout (Codex, profil, sceaux de matière). Elle se calcule en
// base (maitrise_joueur, service role ; migration_v3_profil.sql §4) sur
// toutes les réponses du joueur : les 60 plus récentes de la matière, la
// première réponse à une question pesant 2, une réponse donnée moins de 24 h
// après la précédente à la même question 0,5 (on la reconnaît plus qu'on ne
// la sait), les autres 1. Sous 10 réponses la matière n'est pas mesurée, de
// 10 à 39 elle est provisoire (« ≈ 52 % »), mesurée à 40.
// L'ancienne mesure (séances ciblées d'une seule matière, 5 questions au
// moins) reste rendue à côté : elle seule verrouille les rangs (§4.5,
// programMastery dans lib/mastery.ts), pour qu'aucun rang ne bouge. Tant que
// la section n'est pas collée, tout se replie sur elle (source « ancienne »).
// Module neutre : types, constantes et calculs ; lireMaitrise est à appeler
// côté serveur.

/** Mêmes constantes que maitrise_joueur (migration_v3_profil.sql §4). */
export const MAITRISE = {
  FENETRE: 60,
  SEUIL_PROVISOIRE: 10,
  SEUIL_MESURE: 40,
  POIDS_PREMIERE: 2,
  POIDS_RAPPROCHEE: 0.5,
  RAPPROCHEE_H: 24,
  DEBUT: 40,
  /** basse sous 50, moyenne de 50 à 69, haute à 70 et plus */
  ZONES: [50, 70] as const,
  /** le repère de préparation (et la cible des fuites) */
  REPERE: 70,
} as const;

/** L'ancienne règle : une matière compte à partir de 5 questions en séances ciblées d'une seule matière. */
export const ANCIENNE_MIN_QUESTIONS = 5;

export type StatutMaitrise = "non_mesuree" | "provisoire" | "mesuree";
export type ZoneMaitrise = "basse" | "moyenne" | "haute";

export type MaitriseMatiere = {
  cle: string;
  /** libellé de lib/practiceTopics.ts (« Analyse des États Financiers ») */
  nom: string;
  /** libellé court (« FSA », « Fixed Income ») */
  court: string;
  /** poids à l'examen (milieu de fourchette, en %) */
  poids: number;
  /** null : pas encore mesurée (moins de 10 réponses) */
  pct: number | null;
  /** réponses dans la fenêtre (60 au plus) ; en repli, les questions de l'ancienne mesure */
  n: number;
  /** toutes les réponses de la matière (en repli : comme n) */
  total: number;
  statut: StatutMaitrise;
  /** la dernière réponse (ISO), null si inconnue */
  derniere: string | null;
  /** la maîtrise des 40 premières réponses (null sous 40) */
  debut: number | null;
  /** l'ancienne mesure (verrou des rangs), null : pas assez de questions */
  ancienne: number | null;
  zone: ZoneMaitrise | null;
};

export type Maitrise = {
  matieres: MaitriseMatiere[];
  /** Σ poids × (pct ?? 0) / Σ poids, arrondi */
  preparation: number;
  /** part du poids des matières mesurées (40 réponses et plus), de 0 à 100 */
  couverture: number;
  /** « ancienne » : repli sans la section §4 */
  source: "unique" | "ancienne";
};

export function zoneDe(pct: number | null): MaitriseMatiere["zone"] {
  if (pct === null) return null;
  const [basse, haute] = MAITRISE.ZONES;
  return pct < basse ? "basse" : pct < haute ? "moyenne" : "haute";
}

export function statutDe(n: number): StatutMaitrise {
  return n >= MAITRISE.SEUIL_MESURE ? "mesuree" : n >= MAITRISE.SEUIL_PROVISOIRE ? "provisoire" : "non_mesuree";
}

const sommePoids = (ms: MaitriseMatiere[]) => ms.reduce((s, m) => s + m.poids, 0);
const auDixieme = (x: number) => Math.round(x * 10) / 10;

export function preparationDe(ms: MaitriseMatiere[]): number {
  const total = sommePoids(ms);
  return total > 0 ? Math.round(ms.reduce((s, m) => s + m.poids * (m.pct ?? 0), 0) / total) : 0;
}

/** La part du poids des matières mesurées, de 0 à 100. */
export function couvertureDe(ms: MaitriseMatiere[]): number {
  const total = sommePoids(ms);
  return total > 0 ? Math.round((100 * ms.filter((m) => m.statut === "mesuree").reduce((s, m) => s + m.poids, 0)) / total) : 0;
}

/** Ce que la préparation gagnerait si la matière montait à `seuil` : (poids / Σ poids) × max(0, seuil − pct), au dixième. */
export function gainPreparation(m: MaitriseMatiere, seuil: number, ms: MaitriseMatiere[]): number {
  const total = sommePoids(ms);
  return total > 0 ? auDixieme((m.poids / total) * Math.max(0, seuil - (m.pct ?? 0))) : 0;
}

/** Les fuites (§4.7) : les points de préparation perdus sous le repère de 70 %, les plus grosses d'abord. */
export function fuites(ms: MaitriseMatiere[], n = 3): { cle: string; court: string; points: number }[] {
  return ms
    .map((m) => ({ cle: m.cle, court: m.court, points: gainPreparation(m, MAITRISE.REPERE, ms) }))
    .filter((f) => f.points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, n);
}

/** « ≈ 52 % » si provisoire, « 52 % » si mesurée, null sinon. */
export function libellePct(m: { pct: number | null; statut?: StatutMaitrise }): string | null {
  if (m.pct === null) return null;
  return `${m.statut === "provisoire" ? `≈${NBSP}` : ""}${m.pct}${NBSP}%`;
}

/** L'infobulle d'une maîtrise provisoire : « provisoire · 23 réponses sur 40 ». */
export function infobulleMaitrise(m: { statut?: StatutMaitrise; n: number }): string | null {
  return m.statut === "provisoire" ? `provisoire · ${m.n} réponse${m.n > 1 ? "s" : ""} sur ${MAITRISE.SEUIL_MESURE}` : null;
}

export const PAS_MESUREE = "pas encore mesurée";

function base(cle: string): Pick<MaitriseMatiere, "cle" | "nom" | "court" | "poids"> {
  const t = TOPICS.find((x) => x.key === cle);
  return { cle, nom: t?.label ?? cle, court: subjectByKey(cle)?.short ?? t?.label ?? cle, poids: t?.weight ?? 0 };
}

function assembler(matieres: MaitriseMatiere[], source: Maitrise["source"]): Maitrise {
  return { matieres, preparation: preparationDe(matieres), couverture: couvertureDe(matieres), source };
}

type Raw = Record<string, unknown>;
const entier = (v: unknown): number | null => {
  const x = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(x) ? Math.round(x) : null;
};
const borne = (v: number | null) => (v === null ? null : Math.max(0, Math.min(100, v)));

/**
 * La réponse de maitrise_joueur, complétée en « non mesurée » pour les
 * matières absentes (les 10 du CFA Niveau I, dans l'ordre officiel).
 * Illisible : null (le lecteur se replie).
 */
export function maitriseDepuis(data: unknown): Maitrise | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const brut = (data as Raw).matieres;
  if (!brut || typeof brut !== "object" || Array.isArray(brut)) return null;
  const lues = brut as Record<string, Raw | null>;
  const matieres = TOPICS.map((t): MaitriseMatiere => {
    const r = lues[t.key] && typeof lues[t.key] === "object" ? (lues[t.key] as Raw) : {};
    const n = Math.max(0, entier(r.n) ?? 0);
    const statut = statutDe(n);
    const pct = statut === "non_mesuree" ? null : borne(entier(r.pct));
    return {
      ...base(t.key),
      pct,
      n,
      total: Math.max(n, entier(r.total) ?? 0),
      statut,
      derniere: typeof r.derniere === "string" ? r.derniere : null,
      debut: borne(entier(r.debut)),
      ancienne: borne(entier(r.ancienne)),
      zone: zoneDe(pct),
    };
  });
  return assembler(matieres, "unique");
}

// ── l'ancienne règle (verrou des rangs, repli) ─────────────────────────

export type LigneAncienne = { topics: string[] | null; score: number | null; total: number | null };
export type MesureAncienne = { cle: string; pct: number | null; questions: number };

/** L'ancienne règle, matière par matière : séances ciblées d'une seule matière, 5 questions au moins. */
export function ancienneRegle(rows: LigneAncienne[]): MesureAncienne[] {
  const agg = new Map<string, { correct: number; total: number }>();
  for (const r of rows) {
    const topics = r.topics ?? [];
    if (topics.length !== 1) continue;
    const a = agg.get(topics[0]) ?? { correct: 0, total: 0 };
    a.correct += r.score ?? 0;
    a.total += r.total ?? 0;
    agg.set(topics[0], a);
  }
  return TOPICS.map((t) => {
    const a = agg.get(t.key);
    const pct = a && a.total >= ANCIENNE_MIN_QUESTIONS ? Math.round((a.correct / a.total) * 100) : null;
    return { cle: t.key, pct, questions: a?.total ?? 0 };
  });
}

/** L'ancienne mesure d'un joueur, lue avec sa session (ou le client admin). */
export async function lireAncienne(supabase: SupabaseClient, userId: string): Promise<MesureAncienne[]> {
  let rows: LigneAncienne[] = [];
  try {
    const { data } = await supabase.from("practice_session_results").select("topics,score,total").eq("user_id", userId).limit(500);
    rows = (data as LigneAncienne[] | null) ?? [];
  } catch {
    rows = [];
  }
  return ancienneRegle(rows);
}

/**
 * Le repli sans la section §4 : l'ancienne mesure tient lieu de maîtrise
 * (mesurée dès 40 questions, provisoire de 5 à 39).
 */
export function maitriseAncienne(mesures: MesureAncienne[]): Maitrise {
  const matieres = mesures.map((a): MaitriseMatiere => {
    const statut: StatutMaitrise = a.pct === null ? "non_mesuree" : a.questions >= MAITRISE.SEUIL_MESURE ? "mesuree" : "provisoire";
    return { ...base(a.cle), pct: a.pct, n: a.questions, total: a.questions, statut, derniere: null, debut: null, ancienne: a.pct, zone: zoneDe(a.pct) };
  });
  return assembler(matieres, "ancienne");
}

/**
 * La maîtrise d'un joueur : maitrise_joueur avec le client admin, sinon
 * (pas de clé de service, section absente, réponse illisible) l'ancienne
 * mesure lue avec la session. Ne lance jamais d'erreur.
 */
export async function lireMaitrise(admin: SupabaseClient | null, supabase: SupabaseClient, userId: string): Promise<Maitrise> {
  if (admin) {
    try {
      const { data, error } = await admin.rpc("maitrise_joueur", { p_user: userId });
      const lue = error ? null : maitriseDepuis(data);
      if (lue) return lue;
    } catch {
      // repli silencieux
    }
  }
  return maitriseAncienne(await lireAncienne(supabase, userId));
}
