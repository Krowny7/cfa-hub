import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLeaderboardRank, getMyRating } from "@/lib/rating";
import { getTopicAverages, getTopicMastery, programMastery } from "@/lib/mastery";
import { calcStreakAndToday, levelInfoFromXp, type XpDay } from "@/lib/leveling";
import type { GroupRow } from "@/components/GroupSettings";
import { MoiView } from "@/components/moi/MoiView";
import { SettingsPanel } from "@/components/moi/SettingsPanel";
import { buildTopicStats, parseMoiTab, xpLastDays, xpThisWeek } from "@/components/moi/data";
import { getFicheErrors } from "@/components/moi/errors-data";
import { getSessionHistory } from "@/components/moi/history-data";
import { getAnswerStats } from "@/lib/answer-stats";
import { countPlayers, tryAdmin } from "@/components/classement/data";
import { displayName } from "@/components/classement/format";
import { loadActivity, parisDay, parisHour } from "@/components/accueil/queries";
import { etatDuJour } from "@/lib/voice";
import type { MoiData } from "@/components/moi/types";

export const metadata = { title: "Moi · Ranked Lobby" };

type ProfileRow = {
  username: string | null;
  avatar_url: string | null;
  xp_total: number | null;
  exam_date?: string | null;
  active_group_id: string | null;
} | null;

// Espace « Moi » : en-tête (profil, rang compact) puis trois onglets liables
// avec ?onglet=stats|erreurs|reglages. Chaque lecture dégrade proprement.
export default async function MoiPage({ searchParams }: { searchParams?: Promise<{ onglet?: string }> }) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const tab = parseMoiTab((await searchParams)?.onglet) ?? "stats";
  const admin = tryAdmin();
  const now = Date.now();

  const profileCall = (async (): Promise<ProfileRow> => {
    const full = await supabase.from("profiles").select("username,avatar_url,xp_total,exam_date,active_group_id").eq("id", user.id).maybeSingle();
    if (!full.error) return full.data as ProfileRow;
    // colonne exam_date absente (ancienne base)
    const basic = await supabase.from("profiles").select("username,avatar_url,xp_total,active_group_id").eq("id", user.id).maybeSingle();
    return basic.data as ProfileRow;
  })();

  const xpCall = (async (): Promise<XpDay[]> => {
    try {
      const { data } = await supabase.rpc("get_xp_daily", { p_days: 90 });
      if (!Array.isArray(data)) return [];
      return data.map((d: { day: string; xp: number }) => ({ day: String(d.day).slice(0, 10), xp: Number(d.xp ?? 0) || 0 }));
    } catch {
      return [];
    }
  })();

  const [profile, rating, topics, averages, myRank, totalPlayers, xpDays, errors, groupsRes, sessions, answers, activity] = await Promise.all([
    profileCall,
    getMyRating(supabase, user.id),
    getTopicMastery(supabase, user.id),
    admin ? getTopicAverages(admin) : Promise.resolve({} as Record<string, number | null>),
    getLeaderboardRank(supabase, user.id),
    countPlayers(supabase),
    xpCall,
    getFicheErrors(supabase, admin ?? supabase, user.id, now),
    supabase.from("group_memberships").select("group_id, study_groups(id,name,invite_code)").eq("user_id", user.id),
    getSessionHistory(supabase, user.id, now),
    // questions répondues, toutes sources : le client admin lit aussi les
    // réponses de duels (sans policy), toujours filtrées sur ce joueur
    getAnswerStats(admin ?? supabase, user.id, { privileged: !!admin, now }),
    // questions répondues par jour : la série compte aussi les jours sans XP
    // (même calcul que l'accueil)
    loadActivity(supabase, user.id, new Date(now)),
  ]);

  const xpTotal = Number(profile?.xp_total ?? 0) || 0;
  const lvl = levelInfoFromXp(xpTotal);
  const { streak, todayDone } = calcStreakAndToday(xpDays, { today: parisDay(new Date(now)), actifs: activity.activeDays });
  const dayState = todayDone || activity.today > 0 ? "fait" : etatDuJour(0, parisHour(new Date(now)));
  const last30 = xpLastDays(xpDays, 30, new Date(now));

  const d: MoiData = {
    userId: user.id,
    name: displayName(profile?.username, user.id),
    avatarUrl: profile?.avatar_url ?? null,
    examDate: profile?.exam_date ?? null,
    streak,
    dayState,
    xpTotal,
    level: lvl.level,
    levelPct: Math.round(lvl.progressPct * 100),
    xpToNextLevel: lvl.xpToNextLevel,
    xpWeek: xpThisWeek(xpDays),
    xp30: last30.xp,
    activeDays30: last30.active,
    xpDays,
    me: { elo: rating.elo, gamesPlayed: rating.gamesPlayed, mastery: programMastery(topics), leaderboardRank: myRank, totalPlayers },
    topics: buildTopicStats(topics, averages),
    errors,
    sessions,
    answers,
  };

  return (
    <MoiView
      d={d}
      tab={tab}
      now={now}
      settings={<SettingsPanel activeGroupId={profile?.active_group_id ?? null} groups={(groupsRes.data ?? []) as unknown as GroupRow[]} />}
    />
  );
}
