import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { OBJECTIF_DU_JOUR } from "@/components/adn/AnneauDuJourEvents";
import { parisMidnight } from "@/components/adn/AnneauDuJourData";
import { construireTrajectoire, lireObjectifMeta, planDuJour, type ObjectifInitial, type ObjectifMeta, type PlanDuJour, type Trajectoire } from "@/lib/objectif-calc";

// L'objectif de questions d'ici l'examen, côté serveur : l'objectif du jour
// (barre du haut, accueil, fins de session) et la trajectoire (courbe).
//
// Il faut le nombre de questions posées avant aujourd'hui, toutes sources, et
// leur répartition par jour. Mêmes sources et même compte que l'anneau du
// jour (components/adn/AnneauDuJourData.ts), mais depuis le début : une
// lecture plus lourde, faite une fois par joueur et par jour (cache de
// données Next, clé = joueur + jour ; les jours passés ne bougent plus).
// Sans clé admin, lecture directe avec le client du joueur, sans cache.
// Module serveur.

const TZ = "Europe/Paris";
const DAY_FMT = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
export const jourParis = (d: Date | number = new Date()) => DAY_FMT.format(typeof d === "number" ? new Date(d) : d);

type Page<T> = { data: T[] | null; error: unknown };

/** Toutes les lignes, par pages de 1000 (limite de l'API) ; [] si la table manque. */
async function toutes<T>(run: (from: number, to: number) => PromiseLike<Page<T>>, max = 50_000): Promise<T[]> {
  const out: T[] = [];
  try {
    for (let from = 0; from < max; from += 1000) {
      const { data, error } = await run(from, from + 999);
      if (error || !Array.isArray(data)) break;
      out.push(...data);
      if (data.length < 1000) break;
    }
  } catch {
    // table absente ou lecture refusée : la source compte pour 0
  }
  return out;
}

type Repondu = { selected_index?: number | null };
/** Répondues d'une copie : le détail quand il est gardé, sinon le total. */
const repondues = (answers: unknown, total: unknown) =>
  Array.isArray(answers) ? (answers as Repondu[]).filter((a) => a && a.selected_index !== null && a.selected_index !== undefined).length : Number(total) || 0;

/** Questions posées par jour (Paris), toutes sources, avant `avantIso`. */
export async function lireJours(sb: SupabaseClient, userId: string, avantIso: string): Promise<[string, number][]> {
  type DuelRow = { challenger_id: string; question_ids: string[] | null; challenger_finished_at: string | null; opponent_finished_at: string | null; finished_at: string | null };
  const [fiche, qcm, practice, mock, retakes, duels, daily, quizzes, calc, eclair] = await Promise.all([
    toutes<{ answered_at: string }>((a, b) => sb.from("quiz_answer_log").select("answered_at").eq("user_id", userId).lt("answered_at", avantIso).order("answered_at").range(a, b)),
    toutes<{ occurred_at: string; total: number; mode: string }>((a, b) =>
      sb.from("practice_sessions").select("occurred_at,total,mode").eq("user_id", userId).lt("occurred_at", avantIso).order("occurred_at").range(a, b),
    ),
    toutes<{ completed_at: string; total: number; answers: unknown }>((a, b) =>
      sb.from("practice_session_results").select("completed_at,total,answers").eq("user_id", userId).lt("completed_at", avantIso).order("completed_at").range(a, b),
    ),
    toutes<{ completed_at: string; total: number; answers: unknown }>((a, b) =>
      sb.from("mock_exam_results").select("completed_at,total,answers").eq("user_id", userId).lt("completed_at", avantIso).order("completed_at").range(a, b),
    ),
    toutes<{ completed_at: string; total: number }>((a, b) =>
      sb.from("mock_exam_attempts").select("completed_at,total").eq("user_id", userId).lt("completed_at", avantIso).order("completed_at").range(a, b),
    ),
    toutes<DuelRow>((a, b) =>
      sb
        .from("duels")
        .select("challenger_id,question_ids,challenger_finished_at,opponent_finished_at,finished_at")
        .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
        .eq("status", "finished")
        .lt("finished_at", avantIso)
        .order("finished_at")
        .range(a, b),
    ),
    toutes<{ finished_at: string | null; total: number | null }>((a, b) =>
      sb.from("daily_attempts").select("finished_at,total").eq("user_id", userId).lt("finished_at", avantIso).order("finished_at").range(a, b),
    ),
    toutes<{ created_at: string; total: number }>((a, b) =>
      sb.from("quiz_attempts").select("created_at,total").eq("user_id", userId).lt("created_at", avantIso).order("created_at").range(a, b),
    ),
    toutes<{ answered_at: string }>((a, b) => sb.from("calc_attempts").select("answered_at").eq("user_id", userId).lt("answered_at", avantIso).order("answered_at").range(a, b)),
    toutes<{ finished_at: string | null; total: number | null }>((a, b) =>
      sb.from("eclair_series").select("finished_at,total").eq("user_id", userId).not("finished_at", "is", null).lt("finished_at", avantIso).order("finished_at").range(a, b),
    ),
  ]);

  const parJour = new Map<string, number>();
  const add = (at: string | null | undefined, n: number) => {
    if (!at || !(n > 0)) return;
    const t = Date.parse(at);
    if (!Number.isFinite(t)) return;
    const k = jourParis(t);
    parJour.set(k, (parJour.get(k) ?? 0) + n);
  };
  for (const r of fiche) add(r.answered_at, 1);
  // les sessions de flashcards ne sont pas des questions
  for (const r of qcm) if (r.mode === "qcm") add(r.occurred_at, Number(r.total) || 0);
  for (const r of practice) add(r.completed_at, repondues(r.answers, r.total));
  for (const r of mock) add(r.completed_at, repondues(r.answers, r.total));
  for (const r of retakes) add(r.completed_at, Number(r.total) || 0);
  for (const d of duels) add((d.challenger_id === userId ? d.challenger_finished_at : d.opponent_finished_at) ?? d.finished_at, d.question_ids?.length ?? 0);
  for (const r of daily) add(r.finished_at, Number(r.total) || 0);
  for (const r of quizzes) add(r.created_at, Number(r.total) || 0);
  for (const r of calc) add(r.answered_at, 1);
  for (const r of eclair) add(r.finished_at, Number(r.total) || 0);
  return [...parJour.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
}

function adminOuNull(): SupabaseClient | null {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

/**
 * Questions posées par jour avant aujourd'hui (Paris). Une lecture par
 * joueur et par jour ; une requête la partage (React cache).
 */
export const joursAvant = cache(async (userId: string, aujourdhui: string): Promise<{ day: string; n: number }[]> => {
  const avantIso = parisMidnight(new Date(aujourdhui + "T12:00:00Z")).toISOString();
  const admin = adminOuNull();
  let rows: [string, number][];
  if (admin) {
    rows = await unstable_cache(() => lireJours(admin, userId, avantIso), ["rl-objectif-jours", userId, aujourdhui], { revalidate: 60 * 60 * 26 })();
  } else {
    rows = await lireJours(await createClient(), userId, avantIso);
  }
  return rows.map(([day, n]) => ({ day, n }));
});

/** La date d'examen du joueur (null : pas fixée, ou colonne absente). */
export const dateExamen = cache(async (userId: string): Promise<string | null> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("profiles").select("exam_date").eq("id", userId).maybeSingle();
    if (error) return null;
    const d = (data as { exam_date?: string | null } | null)?.exam_date ?? null;
    return d ? String(d).slice(0, 10) : null;
  } catch {
    return null;
  }
});

export type ObjectifDuJour = {
  /** l'objectif du jour à tracer (le défaut sans plan actif) */
  objectif: number;
  meta: ObjectifMeta | null;
  examen: string | null;
  plan: PlanDuJour | null;
};

/**
 * L'objectif du jour du joueur : le plan s'il a fixé un total et une date à
 * venir, sinon le défaut (40). Ne lit rien de lourd sans objectif fixé. Au
 * moindre souci, ou au-delà de `timeoutMs`, le défaut.
 */
export const objectifDuJour = cache(async (user: Pick<User, "id" | "user_metadata"> | null, timeoutMs = 1500): Promise<ObjectifDuJour> => {
  const defaut: ObjectifDuJour = { objectif: OBJECTIF_DU_JOUR, meta: null, examen: null, plan: null };
  if (!user) return defaut;
  const meta = lireObjectifMeta(user.user_metadata);
  if (!meta) return defaut;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const run = (async (): Promise<ObjectifDuJour> => {
      const aujourdhui = jourParis();
      const [examen, jours] = await Promise.all([dateExamen(user.id), joursAvant(user.id, aujourdhui)]);
      if (!examen) return { ...defaut, meta };
      const avant = jours.reduce((s, j) => s + j.n, 0);
      const plan = planDuJour({ total: meta.total, examen, aujourdhui, avant });
      return { objectif: plan.statut === "actif" ? plan.quotidien : OBJECTIF_DU_JOUR, meta, examen, plan };
    })();
    return await Promise.race([
      run,
      new Promise<ObjectifDuJour>((resolve) => {
        timer = setTimeout(() => resolve({ ...defaut, meta }), timeoutMs);
      }),
    ]);
  } catch {
    return { ...defaut, meta };
  } finally {
    if (timer) clearTimeout(timer);
  }
});

export type EtatObjectif =
  | { etat: "sans-objectif"; examen: string | null; aujourdhui: string; avant: number; jour: number }
  | { etat: "sans-date"; meta: ObjectifMeta; aujourdhui: string; avant: number; jour: number }
  | { etat: "trajectoire"; t: Trajectoire };

/**
 * Tout ce qu'il faut à la courbe (accueil, Moi) et au réglage : la
 * trajectoire si un objectif et une date sont fixés, sinon de quoi proposer
 * un rythme (déjà posées, date). `jour` : questions posées aujourd'hui, telles
 * que l'anneau les compte.
 */
export async function etatObjectif(user: Pick<User, "id" | "user_metadata">, jour: number): Promise<EtatObjectif> {
  const aujourdhui = jourParis();
  const meta = lireObjectifMeta(user.user_metadata);
  const [examen, jours] = await Promise.all([dateExamen(user.id), joursAvant(user.id, aujourdhui)]);
  const avant = jours.reduce((s, j) => s + j.n, 0);
  if (!meta) return { etat: "sans-objectif", examen, aujourdhui, avant, jour };
  if (!examen) return { etat: "sans-date", meta, aujourdhui, avant, jour };
  return { etat: "trajectoire", t: construireTrajectoire({ objectif: meta, examen, aujourdhui, jours, jour }) };
}

/** Les valeurs de départ du réglage « Ton examen ». */
export function reglageInitial(e: EtatObjectif): ObjectifInitial {
  if (e.etat === "trajectoire") {
    const t = e.t;
    return { examen: t.examen, meta: { total: t.total, depuis: t.depuis }, avant: t.avant, jour: t.jour, aujourdhui: t.aujourdhui };
  }
  return { examen: e.etat === "sans-objectif" ? e.examen : null, meta: e.etat === "sans-date" ? e.meta : null, avant: e.avant, jour: e.jour, aujourdhui: e.aujourdhui };
}

/** L'objectif du jour tiré d'un état déjà lu (accueil) : le plan actif, sinon le défaut. */
export function objectifDe(e: EtatObjectif): number {
  return e.etat === "trajectoire" && e.t.plan.statut === "actif" ? e.t.plan.quotidien : OBJECTIF_DU_JOUR;
}
