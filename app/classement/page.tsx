import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLeaderboard, getLeaderboardRank, getMyRating, getOpenChallenges, getRatingHistory, getRecentDuels } from "@/lib/rating";
import { getTopicMastery, programMastery } from "@/lib/mastery";
import { CLASSEMENT_TABS, ClassementView } from "@/components/classement/ClassementView";
import { avecPlaces, lireMaitres } from "@/components/classement/maitres";
import { lireRival } from "@/components/classement/rival";
import { amisClassement, countPlayers, getNextRankedExam, getPastRankedExams, lastDeltaByUser, masteryByUser, podiumDe, toBoardRows, tryAdmin } from "@/components/classement/data";
import type { TabKey } from "@/components/classement/ClassementTabs";
import { displayName } from "@/components/classement/format";
import type { ClassementData } from "@/components/classement/types";
import { CarteJoueurHote } from "@/components/profil/CarteJoueur";
import { lireEntreeSalles } from "@/lib/salles/entree";

export const metadata = { title: "S'affronter · Ranked Lobby" };

// Espace « S'affronter » (adresse /classement) : charge le rang, l'historique
// d'ELO, le classement, le prochain examen blanc classé, les duels et les amis
// (onglet « Amis » du classement général), ton plus grand rival et les maîtres
// de chaque matière et les salles (lus en parallèle des autres), puis délègue l'affichage à
// ClassementView. ?onglet= choisit l'onglet du classement général. Chaque
// lecture dégrade proprement (tables des duels ou des amitiés pas encore
// créées, clé admin absente).
export default async function ClassementPage({ searchParams }: { searchParams?: Promise<{ onglet?: string }> }) {
  const onglet = (await searchParams)?.onglet;
  const tab: TabKey = CLASSEMENT_TABS.includes(onglet as TabKey) ? (onglet as TabKey) : "classement";
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const admin = tryAdmin();

  const [rating, topics, history, leaderboard, myRank, totalPlayers, exam, pastExams, openDuels, recentDuels, profileRes, rival, maitres, salles] = await Promise.all([
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
    // sans clé admin ou sans données : null, la carte ne s'affiche pas
    lireRival(supabase, admin, user.id),
    lireMaitres(supabase, admin, user.id),
    // la carte « Les Salles » : sans la migration des salles, elle dit qu'elles arrivent
    lireEntreeSalles(supabase),
  ]);

  const mastery = programMastery(topics);
  const ids = leaderboard.map((r) => r.userId);
  if (!ids.includes(user.id)) ids.push(user.id);
  const [masteries, deltas, podium] = await Promise.all([
    masteryByUser(admin, ids),
    lastDeltaByUser(admin, ids),
    // les bannières des trois premiers : le fond de leur carte du podium
    podiumDe(supabase, leaderboard.slice(0, 3).map((r) => r.userId)),
  ]);
  // Ma maîtrise et mon dernier match viennent de mes propres lectures
  // (toujours disponibles, même sans clé admin).
  masteries.set(user.id, mastery);
  if (history.length) deltas.set(user.id, history[history.length - 1].delta);

  const board = toBoardRows(leaderboard, user.id, masteries, deltas).map((r) => (podium.has(r.userId) ? { ...r, ...podium.get(r.userId) } : r));
  const inBoard = board.some((r) => r.isMe);
  const profile = profileRes.data as { username: string | null; avatar_url: string | null } | null;
  // l'onglet « Amis » : mes amis et moi (ma ligne vient de mes propres lectures)
  const amis = await amisClassement(
    supabase,
    admin,
    user.id,
    { userId: user.id, name: displayName(profile?.username, user.id), avatarUrl: profile?.avatar_url ?? null, elo: rating.elo, gamesPlayed: rating.gamesPlayed, rank: myRank, mastery, isMe: true },
    board,
    masteries,
  );

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
    amis,
    rival,
    // la place générale des maîtres connus du tableau (le palier du Top 10 de leur insigne)
    maitres: avecPlaces(maitres, new Map(leaderboard.map((r) => [r.userId, r.rank]))),
    salles,
  };

  return (
    <>
      <ClassementView data={data} tab={tab} />
      <CarteJoueurHote />
    </>
  );
}
