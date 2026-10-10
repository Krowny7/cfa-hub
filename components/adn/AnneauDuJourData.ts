import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Les traits du jour (questions répondues aujourd'hui, à l'heure de Paris),
// pour le logo vivant de la barre du haut et l'anneau du jour.
//
// Mêmes sources que l'objectif du jour de l'accueil (loadActivity dans
// components/accueil/queries.ts) : quiz des fiches, sessions QCM, sessions
// ciblées, QCM entiers et mode examen, examens blancs et reprises, duels réglés. Mais seulement depuis
// minuit, avec le strict nécessaire : un simple comptage pour le journal des
// fiches (la seule table volumineuse), deux ou trois colonnes ailleurs. Les
// lectures partent ensemble ; au-delà d'un court délai, ou au moindre souci,
// on rend null et la barre affiche le logo plein (repli).
//
// Mis en cache pour la durée d'une requête (React cache) : l'accueil peut
// réutiliser la même valeur sans relancer les lectures.
// Module serveur (pas de « use client »), sans effet de bord.

export { OBJECTIF_DU_JOUR } from "@/components/adn/AnneauDuJourEvents";

const TZ = "Europe/Paris";
const DAY_FMT = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const parisDay = (ms: number) => DAY_FMT.format(new Date(ms));

/** Minuit à Paris (instant UTC) pour le jour de `now`. Paris est à UTC+1 ou UTC+2. */
export function parisMidnight(now = new Date()): Date {
  const day = parisDay(now.getTime());
  const base = Date.parse(day + "T00:00:00Z");
  for (const h of [1, 2, 0]) {
    const c = base - h * 3600_000;
    if (parisDay(c) === day && parisDay(c - 1) !== day) return new Date(c);
  }
  return new Date(base - 3600_000);
}

type Rows<T> = { data: T[] | null; error: unknown; count?: number | null };

async function rows<T>(run: () => PromiseLike<Rows<T>>): Promise<T[]> {
  try {
    const { data, error } = await run();
    return error || !Array.isArray(data) ? [] : data;
  } catch {
    return [];
  }
}

async function load(supabase: SupabaseClient, userId: string, now: Date): Promise<number | null> {
  const since = parisMidnight(now).toISOString();
  const today = parisDay(now.getTime());
  const sum = (list: { total?: number | null }[]) => list.reduce((s, r) => s + (Number(r.total) || 0), 0);

  type DuelRow = { challenger_id: string; question_ids: string[] | null; challenger_finished_at: string | null; opponent_finished_at: string | null; finished_at: string | null };

  const [fiche, qcm, practice, mock, retakes, duels, daily, calc, quizzes, eclair, ateliers] = await Promise.all([
    (async () => {
      try {
        const { count, error } = await supabase
          .from("quiz_answer_log")
          .select("answered_at", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("answered_at", since);
        return error ? 0 : (count ?? 0);
      } catch {
        return 0;
      }
    })(),
    rows<{ total: number; mode: string }>(() =>
      supabase.from("practice_sessions").select("total,mode").eq("user_id", userId).gte("occurred_at", since).limit(200),
    ),
    rows<{ total: number }>(() => supabase.from("practice_session_results").select("total").eq("user_id", userId).gte("completed_at", since).limit(200)),
    rows<{ total: number }>(() => supabase.from("mock_exam_results").select("total").eq("user_id", userId).gte("completed_at", since).limit(50)),
    rows<{ total: number }>(() => supabase.from("mock_exam_attempts").select("total").eq("user_id", userId).gte("completed_at", since).limit(50)),
    rows<DuelRow>(() =>
      supabase
        .from("duels")
        .select("challenger_id,question_ids,challenger_finished_at,opponent_finished_at,finished_at")
        .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
        .eq("status", "finished")
        .gte("finished_at", since)
        .limit(50),
    ),
    // Défi du jour : copies rendues aujourd'hui (table absente avant la
    // migration : liste vide). Même lecture que loadActivity de l'accueil.
    rows<{ total: number }>(() => supabase.from("daily_attempts").select("total").eq("user_id", userId).gte("finished_at", since).limit(5)),
    // Exercices de calcul : une ligne par réponse (table absente avant la migration : 0).
    (async () => {
      try {
        const { count, error } = await supabase
          .from("calc_attempts")
          .select("answered_at", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("answered_at", since);
        return error ? 0 : (count ?? 0);
      } catch {
        return 0;
      }
    })(),
    // QCM joués en entier (/qcm) et copies du mode examen (/exam) : une ligne
    // par passage, avec le nombre de questions.
    rows<{ total: number }>(() => supabase.from("quiz_attempts").select("total").eq("user_id", userId).gte("created_at", since).limit(200)),
    // Séries éclair rendues aujourd'hui (table absente avant la migration : liste vide).
    rows<{ total: number }>(() => supabase.from("eclair_series").select("total").eq("user_id", userId).gte("finished_at", since).limit(500)),
    // Ateliers touchés aujourd'hui : leurs réponses aux questions (les calculs sont dans calc_attempts)
    rows<{ reponses: { k?: string; at?: string }[] | null }>(() => supabase.from("ateliers").select("reponses").eq("user_id", userId).gte("vu_at", since).limit(20)),
  ]);

  // Les sessions de flashcards ne sont pas des questions : seules les sessions QCM comptent.
  let n = fiche + sum(qcm.filter((r) => r.mode === "qcm")) + sum(practice) + sum(mock) + sum(retakes) + sum(daily) + calc + sum(quizzes) + sum(eclair);
  for (const a of ateliers) for (const x of Array.isArray(a.reponses) ? a.reponses : []) if (x.k !== "calc" && x.at && Date.parse(x.at) >= Date.parse(since)) n += 1;
  for (const d of duels) {
    const at = (d.challenger_id === userId ? d.challenger_finished_at : d.opponent_finished_at) ?? d.finished_at;
    if (at && parisDay(Date.parse(at)) === today) n += d.question_ids?.length ?? 0;
  }
  return n;
}

/**
 * Questions répondues aujourd'hui (Paris), toutes sources, avec le client
 * Supabase fourni ; null si la lecture échoue ou dépasse `timeoutMs` (la
 * barre du haut ne doit jamais attendre).
 */
export async function chargerTraitsDuJour(supabase: SupabaseClient, userId: string, timeoutMs = 1500): Promise<number | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      load(supabase, userId, new Date()),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Même lecture, une seule fois par requête serveur (barre du haut, accueil). */
export const traitsDuJour = cache(async (userId: string): Promise<number | null> => {
  try {
    const supabase = await createClient();
    return await chargerTraitsDuJour(supabase, userId);
  } catch {
    return null;
  }
});
