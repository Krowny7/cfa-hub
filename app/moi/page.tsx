import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLeaderboardRank, getMyRating } from "@/lib/rating";
import { getTopicAverages, getTopicMastery, programMastery } from "@/lib/mastery";
import { calcStreakAndToday, levelInfoFromXp, type XpDay } from "@/lib/leveling";
import type { GroupRow } from "@/components/GroupSettings";
import { MoiView } from "@/components/moi/MoiView";
import { SettingsPanel } from "@/components/moi/SettingsPanel";
import { buildTopicStats, xpThisWeek } from "@/components/moi/data";
import { getFicheErrors } from "@/components/moi/errors-data";
import { countPlayers, tryAdmin } from "@/components/classement/data";
import { displayName } from "@/components/classement/format";
import type { MoiData } from "@/components/moi/types";

export const metadata = { title: "Moi · Ranked Lobby" };

type ProfileRow = {
  username: string | null;
  avatar_url: string | null;
  xp_total: number | null;
  exam_date?: string | null;
  active_group_id: string | null;
} | null;

// Espace « Moi » : profil, rang compact, stats, erreurs des fiches,
// progression et réglages. Chaque lecture dégrade proprement.
export default async function MoiPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const admin = tryAdmin();

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

  const [profile, rating, topics, averages, myRank, totalPlayers, xpDays, errors, groupsRes] = await Promise.all([
    profileCall,
    getMyRating(supabase, user.id),
    getTopicMastery(supabase, user.id),
    admin ? getTopicAverages(admin) : Promise.resolve({} as Record<string, number | null>),
    getLeaderboardRank(supabase, user.id),
    countPlayers(supabase),
    xpCall,
    getFicheErrors(supabase, admin ?? supabase, user.id),
    supabase.from("group_memberships").select("group_id, study_groups(id,name,invite_code)").eq("user_id", user.id),
  ]);

  const xpTotal = Number(profile?.xp_total ?? 0) || 0;
  const lvl = levelInfoFromXp(xpTotal);
  const { streak } = calcStreakAndToday(xpDays);

  const d: MoiData = {
    userId: user.id,
    name: displayName(profile?.username, user.id),
    avatarUrl: profile?.avatar_url ?? null,
    examDate: profile?.exam_date ?? null,
    streak,
    xpTotal,
    level: lvl.level,
    levelPct: Math.round(lvl.progressPct * 100),
    xpToNextLevel: lvl.xpToNextLevel,
    xpWeek: xpThisWeek(xpDays),
    xpDays,
    me: { elo: rating.elo, gamesPlayed: rating.gamesPlayed, mastery: programMastery(topics), leaderboardRank: myRank, totalPlayers },
    topics: buildTopicStats(topics, averages),
    errors,
  };

  return (
    <MoiView
      d={d}
      settings={<SettingsPanel activeGroupId={profile?.active_group_id ?? null} groups={(groupsRes.data ?? []) as unknown as GroupRow[]} />}
    />
  );
}
