import type { SupabaseClient } from "@supabase/supabase-js";
import { toQuestion, type EclairAnswer, type EclairQuestion } from "@/lib/eclair";
import { NBSP, nombre } from "@/lib/voice";

// La mémoire planifiée (V3 §5.1, §5.2) : la file des révisions et la séance
// « À revoir ». La file se calcule en base (revisions_dues, service role ;
// mes_revisions_dues, le joueur connecté ; migration_v3_profil.sql §3b) :
// d'abord les ratures en cours et sèches, puis les rappels (dernière réponse
// juste, à revoir après 1, 3, 7 puis 21 jours), 25 par jour au plus, le reste
// attend sans reproche. La séance réutilise les séries éclair
// (eclair_series.genre = 'revoir') : revoir_lancer, revoir_repondre, puis
// eclair_finish. Tant que la section n'est pas collée : la file se replie
// sur les ratures ouvertes (25 au plus), /revoir dit « bientôt ».
// Module neutre (client et serveur).

export const REVOIR_HREF = "/revoir";
/** Jamais plus de 25 à revoir par jour. */
export const PLAFOND_REVISIONS = 25;
/** La taille d'une séance « À revoir » : 15 par défaut, de 10 à 25 (?n=). */
export const TAILLE_REVOIR = { defaut: 15, min: 10, max: 25 } as const;
/** L'intervalle de rappel (jours) après k bonnes réponses d'affilée ; à 5, la question est tenue. */
export const INTERVALLE_RAPPEL: Record<number, number> = { 1: 1, 2: 3, 3: 7, 4: 21 };

export type GenreRevision = "rature" | "rappel";
/** palier : 0 pour une rature, k (1 à 4) pour un rappel ; due : l'échéance (ISO). */
export type ItemRevision = { q: string; genre: GenreRevision; palier: number; due: string };
export type Revisions = {
  /** dues aujourd'hui, 25 au plus */
  aujourdhui: number;
  /** ce qui restera demain plus ce qui deviendra dû, 25 au plus */
  demain: number;
  ratures: number;
  rappels: number;
  items: ItemRevision[];
  /** false : repli sans la section §3b (ratures ouvertes seulement) */
  complet: boolean;
};

type Raw = Record<string, unknown>;
const entier = (v: unknown) => (typeof v === "number" || (typeof v === "string" && v.trim() !== "") ? Math.max(0, Math.round(Number(v)) || 0) : 0);

/** La section §3b n'est pas collée (fonction, table ou colonne absente). */
export function revisionsAbsentes(e: { code?: string; message?: string } | null | undefined): boolean {
  return !!e && (["PGRST202", "PGRST205", "42883", "42P01", "42703"].includes(e.code ?? "") || /could not find|does not exist/i.test(e.message ?? ""));
}

/** La réponse de revisions_dues / mes_revisions_dues ; illisible : null. */
export function revisionsDepuis(data: unknown): Revisions | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const r = data as Raw;
  if (!("aujourdhui" in r)) return null;
  const items = (Array.isArray(r.items) ? (r.items as Raw[]) : [])
    .filter((it) => it && typeof it.q === "string" && (it.genre === "rature" || it.genre === "rappel"))
    .map((it) => ({ q: String(it.q), genre: it.genre as GenreRevision, palier: entier(it.palier), due: String(it.due ?? "") }));
  return {
    aujourdhui: Math.min(PLAFOND_REVISIONS, entier(r.aujourdhui)),
    demain: Math.min(PLAFOND_REVISIONS, entier(r.demain)),
    ratures: entier(r.ratures),
    rappels: entier(r.rappels),
    items,
    complet: true,
  };
}

/** Le repli sans la section : les ratures ouvertes visibles, 25 au plus. */
export function repliRevisions(ouvertes: number): Revisions {
  const n = Math.max(0, Math.round(ouvertes) || 0);
  return { aujourdhui: Math.min(PLAFOND_REVISIONS, n), demain: 0, ratures: n, rappels: 0, items: [], complet: false };
}

/**
 * La file d'un joueur, lue avec le client admin (Codex, accueil). Sans la
 * section, ou au moindre souci : les ratures ouvertes et visibles, comptées
 * dans la table (le client admin n'a pas d'auth.uid() pour get_ratures).
 */
export async function lireRevisions(admin: SupabaseClient, userId: string, n: number = PLAFOND_REVISIONS): Promise<Revisions> {
  try {
    const { data, error } = await admin.rpc("revisions_dues", { p_user: userId, p_n: n });
    const lue = error ? null : revisionsDepuis(data);
    if (lue) return lue;
  } catch {
    // réseau ou base : le repli ci-dessous
  }
  try {
    const { count, error } = await admin
      .from("ratures")
      .select("question_id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("removed_at", null)
      .lte("visible_from", new Date().toISOString());
    if (!error) return repliRevisions(count ?? 0);
  } catch {
    // table absente ou réseau : rien à revoir
  }
  return repliRevisions(0);
}

/** La file du joueur connecté (sa session) ; repli : le total des ratures en cours de get_ratures. */
export async function lireMesRevisions(supabase: SupabaseClient, n: number = PLAFOND_REVISIONS): Promise<Revisions> {
  try {
    const { data, error } = await supabase.rpc("mes_revisions_dues", { p_n: n });
    const lue = error ? null : revisionsDepuis(data);
    if (lue) return lue;
  } catch {
    // réseau ou base : le repli ci-dessous
  }
  try {
    const { data, error } = await supabase.rpc("get_ratures", { p_source: null, p_retirees: false, p_limit: 1, p_offset: 0 });
    if (!error && data && typeof data === "object") return repliRevisions(entier((data as Raw).total));
  } catch {
    // carnet absent : rien à revoir
  }
  return repliRevisions(0);
}

/** « J+7 » : l'intervalle d'un palier de rappel. */
export function intervalleLibelle(palier: number): string | null {
  const j = INTERVALLE_RAPPEL[palier];
  return j ? `J+${j}` : null;
}

/** La pastille d'une question : « rature » ou « rappel · J+7 ». */
export function pastilleRevision(genre: GenreRevision, palier: number): string {
  if (genre === "rature") return "rature";
  const j = intervalleLibelle(palier);
  return j ? `rappel · ${j}` : "rappel";
}

/** « 15 à revoir · demain 22 », « 15 à revoir », « Rien à revoir · demain 3 », ou rien. */
export function ligneRevisions(r: Pick<Revisions, "aujourdhui" | "demain">): string | null {
  const demain = r.demain > 0 ? `demain${NBSP}${nombre(r.demain)}` : null;
  if (r.aujourdhui > 0) return [`${nombre(r.aujourdhui)} à revoir`, demain].filter(Boolean).join(" · ");
  return demain ? `Rien à revoir · ${demain}` : null;
}

/** La taille demandée (?n=) : 15 par défaut, ramenée entre 10 et 25. */
export function tailleRevoir(n: unknown): number {
  const v = Math.round(Number(Array.isArray(n) ? n[0] : n));
  if (!Number.isFinite(v) || v <= 0) return TAILLE_REVOIR.defaut;
  return Math.min(TAILLE_REVOIR.max, Math.max(TAILLE_REVOIR.min, v));
}

// ── la séance « À revoir » ───────────────────────────────────────────────

export type QuestionRevoir = EclairQuestion & { genre: GenreRevision; palier: number };
export type SerieRevoir = { id: string; startedAt: string; questions: QuestionRevoir[] };
export type LancementRevoir =
  | { kind: "ok"; serie: SerieRevoir }
  | { kind: "vide"; aujourdhui: number; demain: number }
  | { kind: "soon" }
  | { kind: "error"; message: string };
/** Ce qu'une réponse juste a fait au carnet : rayée, encre fraîche (sèche à secheLe), scellée, ou rien. */
export type EffetRature = "rayee" | "fraiche" | "scellee" | null;
export type ReponseRevoir = EclairAnswer & { rature: EffetRature; secheLe: string | null };

/** La réponse de revoir_lancer : la série et ses étiquettes, ou « vide ». */
export function lancementDepuis(data: unknown): LancementRevoir {
  const r = (data && typeof data === "object" ? data : {}) as Raw;
  if (r.vide === true) return { kind: "vide", aujourdhui: entier(r.aujourdhui), demain: entier(r.demain) };
  if (!r.id) return { kind: "soon" };
  const etiquettes = new Map(
    (Array.isArray(r.etiquettes) ? (r.etiquettes as Raw[]) : []).map((e) => [String(e.q ?? ""), { genre: (e.genre === "rature" ? "rature" : "rappel") as GenreRevision, palier: entier(e.palier) }]),
  );
  const questions = (Array.isArray(r.questions) ? (r.questions as Raw[]) : [])
    .map(toQuestion)
    .sort((a, b) => a.position - b.position)
    .map((q) => ({ ...q, ...(etiquettes.get(q.id) ?? { genre: "rappel" as const, palier: 0 }) }));
  return { kind: "ok", serie: { id: String(r.id), startedAt: String(r.started_at ?? ""), questions } };
}

/** Lance la séance du jour (ou reprend celle en cours) ; RPC absente : « bientôt ». */
export async function lancerRevoir(supabase: SupabaseClient, n: number = TAILLE_REVOIR.defaut): Promise<LancementRevoir> {
  const { data, error } = await supabase.rpc("revoir_lancer", { p_n: n });
  if (error) return revisionsAbsentes(error) ? { kind: "soon" } : { kind: "error", message: error.message };
  return lancementDepuis(data);
}

/** Répond (définitivement) et reçoit la correction, plus l'effet sur le carnet. */
export async function repondreRevoir(supabase: SupabaseClient, serieId: string, position: number, choix: number): Promise<ReponseRevoir> {
  const { data, error } = await supabase.rpc("revoir_repondre", { p_id: serieId, p_position: position, p_choix: choix });
  if (error) throw new Error(error.message);
  const r = (data ?? {}) as Raw;
  const num = (v: unknown) => (v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v));
  return {
    selectedIndex: num(r.selected_index),
    correctIndex: num(r.correct_index),
    explanation: r.explanation ? String(r.explanation) : null,
    isCorrect: r.is_correct === true,
    rature: r.rature === "rayee" || r.rature === "fraiche" || r.rature === "scellee" ? r.rature : null,
    secheLe: typeof r.seche_le === "string" ? r.seche_le : null,
  };
}

/** Les textes de /revoir. */
export const REVOIR = {
  nom: "À revoir",
  titre: "À revoir.",
  kicker: "La mémoire · chaque jour",
  promesse: "Tes ratures sèches d'abord, puis ce qu'il est temps de te rappeler. 25 au plus par jour.",
  enTete: (i: number, n: number) => `À revoir · ${i}/${n}`,
  question: (i: number, n: number, matiere: string) => `Question ${i} sur ${n} · ${matiere}`,
  lancer: (n: number) => `Revoir ${nombre(n)} question${n > 1 ? "s" : ""}`,
  reprendre: (n: number) => `Reprendre ma séance · ${nombre(n)} à faire`,
  justes: "justes",
  xp: (n: number) => `+${nombre(n)} XP`,
  depart: (r: Pick<Revisions, "aujourdhui" | "ratures" | "rappels">) =>
    [r.ratures > 0 ? `${nombre(r.ratures)} rature${r.ratures > 1 ? "s" : ""} sèche${r.ratures > 1 ? "s" : ""}` : null, r.rappels > 0 ? `${nombre(r.rappels)} rappel${r.rappels > 1 ? "s" : ""}` : null]
      .filter(Boolean)
      .join(" · "),
  rayee: "Rayée.",
  fraiche: "Encre fraîche : elle sèche demain.",
  scellee: "Scellée : tu la tiens depuis une semaine.",
  juste: "Juste.",
  rate: (lettre: string) => `Raté : la bonne réponse est ${lettre}. Elle revient au carnet.`,
  valider: "Valider",
  envoi: "Correction…",
  suivante: "Question suivante",
  bilan: "Voir le bilan",
  regle: "Correction à chaque question · ta séance t'attend si tu pars",
  arreter: "Arrêter là",
  preparation: "Ta séance se prépare…",
  /** le bilan : « 15 revues · 13 justes · demain 22 » */
  resume: (revues: number, justes: number, demain: number | null) =>
    [`${nombre(revues)} revue${revues > 1 ? "s" : ""}`, `${nombre(justes)} juste${justes > 1 ? "s" : ""}`, demain !== null && demain > 0 ? `demain${NBSP}${nombre(demain)}` : null].filter(Boolean).join(" · "),
  assez: "C'est assez pour aujourd'hui",
  rendue: "Séance rendue",
  videTitre: "Rien à revoir pour l'instant.",
  videTexte: (aujourdhui: number, demain: number) =>
    aujourdhui > 0
      ? `${nombre(aujourdhui)} seulement : trop peu pour une séance, garde-les pour demain.${demain > 0 ? ` Demain, ${nombre(demain)}.` : ""}`
      : demain > 0
        ? `Tout est à jour. Demain, ${nombre(demain)} à revoir.`
        : "Tout est à jour. Les prochaines reviendront d'elles-mêmes.",
  soonTitre: "« À revoir » arrive bientôt.",
  soonTexte: "En attendant, tes ratures t'attendent dans le carnet.",
  miseAuPropre: "Mettre au propre",
  erreurTitre: "La séance ne s'ouvre pas.",
  reessayer: "Réessayer",
  retour: "Accueil",
} as const;
