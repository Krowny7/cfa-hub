import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLeaderboardRank } from "@/lib/rating";
import { getTopicMastery, programMastery } from "@/lib/mastery";
import { duelsReady, getDuelReview, getDuelState, type DuelReviewItem } from "@/lib/duels";
import { DuelSoon } from "@/components/duel/DuelSoon";
import { DuelMatch } from "@/components/duel/DuelMatch";
import { DuelResult } from "@/components/duel/DuelResult";
import { DuelReview } from "@/components/duel/DuelReview";
import { DuelStatusCard } from "@/components/duel/DuelStatusCard";
import { countPlayers } from "@/components/classement/data";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ revue?: string | string[] }>;
};

export async function generateMetadata({ searchParams }: PageProps) {
  const sp = await searchParams;
  return { title: sp.revue !== undefined ? "Revue du duel · Ranked Lobby" : "Duel · Ranked Lobby" };
}

// Un duel : défi reçu, partie, attente de l'adversaire ou résultat, selon
// son état. duel_state règle le duel au passage s'il est arrivé à échéance.
// ?revue=1 (ou ?revue=tout) : la revue complète d'un duel terminé — aussi
// d'un duel refusé ou expiré que tu as joué, avec migration_duel_review.sql.
export default async function DuelPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const rawRevue = Array.isArray(sp.revue) ? sp.revue[0] : sp.revue;
  const wantsReview = rawRevue !== undefined;
  const initialFilter = rawRevue === "tout" ? "all" : undefined;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");
  if (!UUID_RE.test(id)) notFound();

  if (!(await duelsReady(supabase))) {
    return (
      <div className="rl-wide">
        <DuelSoon />
      </div>
    );
  }

  const state = await getDuelState(supabase, id);
  if (!state) notFound();

  const finished = state.status === "finished";
  const closed = state.status === "declined" || state.status === "expired";
  // La correction d'un duel clos n'existe que si tu l'as joué (et après la migration)
  const needReview = finished || (closed && !!state.me.startedAt);
  const reviewOnly = wantsReview && finished;
  const showResult = finished && !wantsReview;
  const [review, topics, lbRank, players] = await Promise.all([
    needReview ? getDuelReview(supabase, id) : Promise.resolve([] as DuelReviewItem[]),
    reviewOnly ? Promise.resolve(null) : getTopicMastery(supabase, user.id),
    showResult ? getLeaderboardRank(supabase, user.id) : Promise.resolve(null),
    showResult ? countPlayers(supabase) : Promise.resolve(null),
  ]);

  if (wantsReview && (finished || review.length > 0)) {
    return (
      <div className="rl-wide">
        <DuelReview state={state} review={review} initialFilter={initialFilter} />
      </div>
    );
  }

  const mastery = topics ? programMastery(topics) : null;

  if (finished) {
    return (
      <div className="rl-wide">
        <DuelResult state={state} review={review} mastery={mastery} leaderboardRank={lbRank} players={players} />
      </div>
    );
  }

  let view: React.ReactNode;
  if (closed) {
    view = <DuelStatusCard state={state} variant="closed" myMastery={mastery} reviewable={review.length > 0} />;
  } else if (state.status === "pending" && !state.iAmChallenger) {
    view = <DuelStatusCard state={state} variant="invite" myMastery={mastery} />;
  } else if (state.me.finishedAt) {
    view = <DuelStatusCard state={state} variant="waiting" myMastery={mastery} />;
  } else {
    view = <DuelMatch state={state} myMastery={mastery} />;
  }
  return <div className="rl-wide">{view}</div>;
}
