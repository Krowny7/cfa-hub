import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calcStreakAndToday, type XpDay } from "@/lib/leveling";
import { getTopicAverages, getTopicMastery, programMastery } from "@/lib/mastery";
import { getLeaderboardRank, getMyRating, getOpenChallenges, getRatingHistory } from "@/lib/rating";
import { getTodayDaily } from "@/lib/daily";
import { getReviewableDuels } from "@/lib/duels";
import { etatDuJour } from "@/lib/voice";
import { JOURS_RETOUR } from "@/lib/voice-z1";
import { etatObjectif, objectifDe } from "@/lib/objectif";
import { demandesDe } from "@/lib/profil/donnees";
import { nouveautesAmis } from "@/lib/profil/nouveau";
import { DashboardView } from "@/components/DashboardView";
import { SUBJECTS } from "@/components/reviser/catalog";
import {
  daysBetweenKeys,
  getProgramAverage,
  lastActiveDay,
  loadActivity,
  loadErrors,
  loadNextMockExam,
  loadResume,
  parisDay,
  parisHour,
  withLiveDaily,
} from "@/components/accueil/queries";
import { loadPointFaible } from "@/components/accueil/point-faible";
import { helloFor, longDay } from "@/components/accueil/format";
import type { AccueilData } from "@/components/accueil/types";

// Un duel terminé reste « à revoir » sur l'accueil pendant 3 jours (la liste
// complète, 14 jours, vit sur /duel et dans le Classement).
const DUEL_FRESH_DAYS = 3;

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  // Client admin : moyennes des joueurs, titres des quiz officiels, inscrits
  // aux examens blancs. Absent (variables d'environnement) → on s'en passe.
  let admin: SupabaseClient | null = null;
  try {
    admin = createAdminClient();
  } catch {
    admin = null;
  }

  const now = new Date();

  const [profileRes, xpDailyRes, topics, topicAvg, programAvg, rating, history, open, myRank, activityRaw, errors, resume, mockExam, daily, reviewable, cinq, pointFaible] =
    await Promise.all([
      supabase.from("profiles").select("username,exam_date").eq("id", user.id).maybeSingle(),
      // XP par jour : sert seulement à la série (le détail est sur /moi).
      (async () => {
        try {
          return await supabase.rpc("get_xp_daily", { p_days: 30 });
        } catch {
          return { data: null };
        }
      })(),
      getTopicMastery(supabase, user.id),
      admin ? getTopicAverages(admin) : Promise.resolve({} as Record<string, number | null>),
      getProgramAverage(admin),
      getMyRating(supabase, user.id),
      getRatingHistory(supabase, user.id, 1),
      getOpenChallenges(supabase, user.id),
      // Rang au classement : seulement pour le palier Top 10 du badge.
      getLeaderboardRank(supabase, user.id),
      loadActivity(supabase, user.id, now),
      loadErrors(supabase, admin, user.id),
      loadResume(supabase, admin, user.id),
      loadNextMockExam(supabase, admin, user.id, now),
      // Défi du jour : « bientôt » tant que la migration n'est pas appliquée.
      getTodayDaily(supabase, user.id),
      getReviewableDuels(supabase, user.id, { days: DUEL_FRESH_DAYS, limit: 1 }),
      // les 5 du jour, le défi éclair (« bientôt » tant que migration_cinq_du_jour.sql manque)
      getTodayDaily(supabase, user.id, "cinq"),
      // le point faible n° 1 quand il est net (points_faibles seule, sans getAnswerStats)
      loadPointFaible(supabase, user.id, now),
    ]);

  const profile = profileRes.data as { username?: string | null; exam_date?: string | null } | null;
  const examDate = profile?.exam_date ?? null;
  const examDaysLeft = examDate ? Math.ceil((new Date(examDate).getTime() - now.getTime()) / 86_400_000) : null;

  // La journée : réponses du jour (avec une copie du défi encore ouverte),
  // série en jours d'encre (qui ne retombe pas à 0 avant le soir), heure.
  const activity = withLiveDaily(withLiveDaily(activityRaw, daily), cinq);
  // l'objectif de questions d'ici l'examen : l'objectif du jour et la courbe
  const [objectif, demandes, duNouveau] = await Promise.all([etatObjectif(user, activity.today), demandesDe(supabase, user.id), nouveautesAmis(supabase, admin, user.id)]);
  const dayKey = parisDay(now);
  const hour = parisHour(now);
  const xpDays = Array.isArray(xpDailyRes.data) ? (xpDailyRes.data as XpDay[]).map((x) => ({ day: String(x.day).slice(0, 10), xp: Number(x.xp) || 0 })) : [];
  const { streak, todayDone } = calcStreakAndToday(xpDays, { today: dayKey, actifs: activity.activeDays });
  const dayState = todayDone || activity.today > 0 ? "fait" : etatDuJour(0, hour);

  // Dernier passage : au-delà de JOURS_RETOUR jours sans rien, la variante « retour ».
  const last = lastActiveDay([
    ...xpDays.filter((x) => x.xp > 0).map((x) => x.day),
    ...(activity.activeDays ?? []),
    resume ? parisDay(new Date(resume.at)) : null,
    reviewable[0] ? parisDay(new Date(reviewable[0].finishedAt)) : null,
  ]);
  const returning = dayState !== "fait" && last !== null && daysBetweenKeys(last, dayKey) >= JOURS_RETOUR;

  // Matières dans l'ordre officiel du programme (celui du radar et des barres).
  const byKey = new Map(topics.map((t) => [t.key, t]));
  const topicStats = SUBJECTS.map((s) => ({
    key: s.key,
    name: s.name,
    short: s.short,
    code: s.code,
    pct: byKey.get(s.key)?.pct ?? null,
    avg: topicAvg[s.key] ?? null,
  }));
  const mastery = programMastery(topics);

  // Un défi reçu passe avant un duel en cours (il attend une réponse).
  const pendingIn = open.find((c) => c.incoming && c.status === "pending");
  const active = open.find((c) => c.status === "active");
  const duel = pendingIn ? { c: pendingIn, kind: "incoming" as const } : active ? { c: active, kind: "active" as const } : null;
  const lastElo = history.length ? history[history.length - 1] : null;
  const fresh = reviewable[0] ?? null;

  const d: AccueilData = {
    name: profile?.username ?? null,
    hello: helloFor(now),
    dateLabel: longDay(now),
    dayKey,
    hour,
    examDaysLeft,
    examDateLabel: examDate ? `le ${new Date(examDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}` : null,
    streak,
    dayState,
    seenBefore: last !== null,
    returning,
    daily,
    cinq,
    reviewDuel: fresh
      ? {
          id: fresh.id,
          opponentName: fresh.opponentName,
          myScore: fresh.myScore,
          theirScore: fresh.theirScore,
          total: fresh.total,
          myDelta: fresh.myDelta,
          won: fresh.won,
          finishedAt: fresh.finishedAt,
        }
      : null,
    nowIso: now.toISOString(),
    rating: {
      elo: rating.elo,
      gamesPlayed: rating.gamesPlayed,
      leaderboardRank: myRank,
      last: lastElo ? { delta: lastElo.delta, source: lastElo.source } : null,
    },
    incomingDuel: duel ? { id: duel.c.id, from: duel.c.opponentName, kind: duel.kind } : null,
    demandesAmi: demandes && demandes.recues.length ? { n: demandes.recues.length, premier: demandes.recues[0] } : null,
    duNouveau,
    resume,
    activity,
    dailyGoal: objectifDe(objectif),
    objectif,
    errors,
    pointFaible,
    mockExam,
    topics: topicStats,
    mastery,
    masteryAvg: programAvg,
  };

  return <DashboardView d={d} now={now.getTime()} />;
}
