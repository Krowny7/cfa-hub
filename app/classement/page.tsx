import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLeaderboard, getLeaderboardRank, getMyRating, getOpenChallenges, getRatingHistory, getRecentDuels } from "@/lib/rating";
import { getTopicMastery, programMastery } from "@/lib/mastery";
import { CLASSEMENT_TABS, ClassementView } from "@/components/classement/ClassementView";
import { countPlayers, getNextRankedExam, getPastRankedExams, lastDeltaByUser, masteryByUser, toBoardRows, tryAdmin } from "@/components/classement/data";
import { displayName } from "@/components/classement/format";
import type { ClassementData } from "@/components/classement/types";
import type { TabKey } from "@/components/classement/ClassementTabs";
import { CarteJoueurHote } from "@/components/profil/CarteJoueur";

export const metadata = { title: "Classement · Ranked Lobby" };

type PageProps = { searchParams?: Promise<{ onglet?: string | string[] }> };

// Espace « Classement » : charge le rang, l'historique d'ELO, le classement,
// le prochain examen blanc classé et les duels, puis délègue l'affichage à
// ClassementView. Chaque lecture dégrade proprement (tables des duels pas
// encore créées, clé admin absente). ?onglet=duels|examens ouvre l'onglet.
export default async function ClassementPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const rawTab = Array.isArray(sp.onglet) ? sp.onglet[0] : sp.onglet;
  const tab: TabKey = CLASSEMENT_TABS.includes(rawTab as TabKey) ? (rawTab as TabKey) : "classement";

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
  const [masteries, deltas] = await Promise.all([masteryByUser(admin, ids), lastDeltaByUser(admin, ids)]);
  // Ma maîtrise et mon dernier match viennent de mes propres lectures
  // (toujours disponibles, même sans clé admin).
  masteries.set(user.id, mastery);
  if (history.length) deltas.set(user.id, history[history.length - 1].delta);

  const board = toBoardRows(leaderboard, user.id, masteries, deltas);
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
      <ClassementView data={data} tab={tab} />
      <CarteJoueurHote />
    </>
  );
}
