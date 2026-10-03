import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { XpBarChart, type XpDay } from "@/components/XpBarChart";
import { PracticeTrophies } from "@/components/PracticeTrophies";
import { PracticeProgressChart } from "@/components/PracticeProgressChart";
import { TOPIC_LABELS } from "@/lib/practiceTopics";
import { levelInfoFromXp } from "@/lib/leveling";
import { getLeaderboardRank } from "@/lib/rating";
import { DEFAULT_ELO } from "@/lib/ranks";
import { PlayerHeader } from "@/components/classement/PlayerHeader";
import { masteryByUser, tryAdmin } from "@/components/classement/data";
import { displayName } from "@/components/classement/format";
import type { Profile, Rating } from "@/lib/types";

type PageProps = { params: Promise<{ id: string }> };
type ProfileRow = Pick<Profile, "id" | "username" | "avatar_url" | "xp_total">;
type RatingRow = Pick<Rating, "elo" | "games_played">;

// Profil d'un joueur (espace Classement) : en-tête (niveau sur une ligne,
// une seule action : Défier), rang en carte sombre, puis trophées et
// progression.
export default async function PersonProfilePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const [{ data: profileData }, { data: ratingData }] = await Promise.all([
    supabase.from("profiles").select("id,username,avatar_url,xp_total").eq("id", id).maybeSingle(),
    supabase.from("ratings").select("elo,games_played").eq("user_id", id).maybeSingle(),
  ]);

  if (!profileData) notFound();

  const [{ data: myGroups }, { data: theirGroups }, leaderboardRank, masteries] = await Promise.all([
    supabase.from("group_memberships").select("group_id").eq("user_id", user.id),
    supabase.from("group_memberships").select("group_id").eq("user_id", id),
    getLeaderboardRank(supabase, id),
    masteryByUser(tryAdmin(), [id]),
  ]);

  const myIds = new Set((myGroups ?? []).map((g: { group_id: string }) => g.group_id).filter(Boolean));
  const mutualCount = (theirGroups ?? [])
    .map((g: { group_id: string }) => g.group_id)
    .filter(Boolean)
    .filter((gid) => myIds.has(gid)).length;

  const profile = profileData as ProfileRow;
  const rating = ratingData as RatingRow | null;
  const display = displayName(profile.username, id);
  const xpTotal = Number(profile.xp_total ?? 0) || 0;
  const lvl = levelInfoFromXp(xpTotal);
  const elo = rating?.elo ?? DEFAULT_ELO;
  const games = rating?.games_played ?? 0;
  const isMe = user.id === id;
  const mastery = masteries.get(id) ?? null;

  let xpDaily: XpDay[] | null = null;
  if (isMe) {
    try {
      const { data } = await supabase.rpc("get_xp_daily", { p_days: 90 });
      if (Array.isArray(data)) {
        xpDaily = data.slice(0, 90).map((d: { day: string; xp: number }) => ({ day: String(d.day), xp: Number(d.xp ?? 0) || 0 }));
      }
    } catch {
      // fonction pas encore créée
    }
  }

  let trophyRows: { topic_count: number; trophy_count: number }[] = [];
  try {
    const { data } = await supabase.rpc("get_user_practice_trophies", { p_user_id: id });
    if (Array.isArray(data)) {
      trophyRows = data.map((r: { topic_count: number; trophy_count: number }) => ({
        topic_count: Number(r.topic_count ?? 0) || 0,
        trophy_count: Number(r.trophy_count ?? 0) || 0,
      }));
    }
  } catch {
    // fonction pas encore créée
  }

  type ProgressRow = { id: string; topics: string[]; format: number; score: number; total: number; completed_at: string };
  let progressSessions: ProgressRow[] = [];
  try {
    const { data } = await supabase.rpc("get_user_practice_progress", { p_user_id: id });
    if (Array.isArray(data)) progressSessions = data as ProgressRow[];
  } catch {
    // fonction pas encore créée
  }

  return (
    <div className="rl-wide rl-page">
      <PlayerHeader
        p={{
          id,
          name: display,
          avatarUrl: profile.avatar_url ?? null,
          isMe,
          level: lvl.level,
          xpTotal,
          levelPct: Math.round(lvl.progressPct * 100),
          xpToNextLevel: lvl.xpToNextLevel,
          mutualGroups: mutualCount,
          elo,
          gamesPlayed: games,
          mastery,
          leaderboardRank,
        }}
      />

      {isMe && xpDaily && <XpBarChart data={xpDaily} title="XP gagnée par jour (90 jours)" />}

      <PracticeTrophies rows={trophyRows} />

      <PracticeProgressChart pastSessions={progressSessions} topicLabels={TOPIC_LABELS} />
    </div>
  );
}
