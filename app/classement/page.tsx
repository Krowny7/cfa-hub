import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLeaderboard, getLeaderboardRank, getMyRating, getOpenChallenges, getRatingHistory, getRecentDuels } from "@/lib/rating";
import { getTopicMastery, programMastery } from "@/lib/mastery";
import { ClassementView } from "@/components/classement/ClassementView";
import { bannieresDe, countPlayers, getNextRankedExam, getPastRankedExams, lastDeltaByUser, masteryByUser, toBoardRows, tryAdmin } from "@/components/classement/data";
import { displayName } from "@/components/classement/format";
import type { ClassementData } from "@/components/classement/types";
import { CarteJoueurHote } from "@/components/profil/CarteJoueur";

export const metadata = { title: "Classement · Ranked Lobby" };

// Espace « Classement » : charge le rang, l'historique d'ELO, le classement,
// le prochain examen blanc classé et les duels, puis délègue l'affichage à
// ClassementView. Chaque lecture dégrade proprement (tables des duels pas
// encore créées, clé admin absente).
export default async function ClassementPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const admin = tryAdmin();

  const [rating, topics, history, leaderboard, myRank, totalPlayers, exam, pastExams, openDuels, recentDuels, profileRes] = await Promise.all([
    getMyRating(supabase, user.id),
    getTopicMastery(supabase, user.id),
    getRatingHistory(supabase, user.id, 30),
    getLeaderboard(supabase, 50),
    getLeaderboardRank(supabase, user.id),
    countPlayers(supabase),
    getNextRankedExam(supabase, admin, user.id),
    getPastRankedExams(supabase, user.id, 5),
    getOpenChallenges(supabase, user.id),
    getRecentDuels(supabase, user.id, 5),
    supabase.from("profiles").select("username,avatar_url").eq("id", user.id).maybeSingle(),
  ]);

  const mastery = programMastery(topics);
  const ids = leaderboard.map((r) => r.userId);
  if (!ids.includes(user.id)) ids.push(user.id);
  const [masteries, deltas, bannieres] = await Promise.all([
    masteryByUser(admin, ids),
    lastDeltaByUser(admin, ids),
    // les bannières des trois premiers : le fond de leur carte du podium
    bannieresDe(supabase, leaderboard.slice(0, 3).map((r) => r.userId)),
  ]);
  // Ma maîtrise et mon dernier match viennent de mes propres lectures
  // (toujours disponibles, même sans clé admin).
  masteries.set(user.id, mastery);
  if (history.length) deltas.set(user.id, history[history.length - 1].delta);

  const board = toBoardRows(leaderboard, user.id, masteries, deltas).map((r) => (bannieres.has(r.userId) ? { ...r, bannerUrl: bannieres.get(r.userId) } : r));
  const inBoard = board.some((r) => r.isMe);
  const profile = profileRes.data as { username: string | null; avatar_url: string | null } | null;

  const data: ClassementData = {
    me: { elo: rating.elo, gamesPlayed: rating.gamesPlayed, mastery, leaderboardRank: myRank, totalPlayers },
    history,
    board,
    meRow:
      !inBoard && myRank !== null
        ? {
            userId: user.id,
            name: displayName(profile?.username, user.id),
            avatarUrl: profile?.avatar_url ?? null,
            elo: rating.elo,
            gamesPlayed: rating.gamesPlayed,
            rank: myRank,
            mastery,
            lastDelta: deltas.get(user.id) ?? null,
            isMe: true,
          }
        : null,
    exam,
    pastExams,
    openDuels,
    recentDuels,
  };

  return (
    <>
      <ClassementView data={data} />
      <CarteJoueurHote />
    </>
  );
}
