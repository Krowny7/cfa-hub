import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLeaderboardRank } from "@/lib/rating";
import { getTopicMastery, programMastery } from "@/lib/mastery";
import { duelsReady, getDuelReview, getDuelState } from "@/lib/duels";
import { DuelSoon } from "@/components/duel/DuelSoon";
import { DuelMatch } from "@/components/duel/DuelMatch";
import { DuelResult } from "@/components/duel/DuelResult";
import { DuelStatusCard } from "@/components/duel/DuelStatusCard";

export const metadata = { title: "Duel · Ranked Lobby" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PageProps = { params: Promise<{ id: string }> };

// Un duel : défi reçu, partie, attente de l'adversaire ou résultat, selon
// son état. duel_state règle le duel au passage s'il est arrivé à échéance.
export default async function DuelPage({ params }: PageProps) {
  const { id } = await params;
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

  const [state, topics] = await Promise.all([getDuelState(supabase, id), getTopicMastery(supabase, user.id)]);
  if (!state) notFound();
  const mastery = programMastery(topics);

  if (state.status === "finished") {
    const [review, lbRank] = await Promise.all([getDuelReview(supabase, id), getLeaderboardRank(supabase, user.id)]);
    return (
      <div className="rl-wide">
        <DuelResult state={state} review={review} mastery={mastery} leaderboardRank={lbRank} />
      </div>
    );
  }

  let view: React.ReactNode;
  if (state.status === "declined" || state.status === "expired") {
    view = <DuelStatusCard state={state} variant="closed" myMastery={mastery} />;
  } else if (state.status === "pending" && !state.iAmChallenger) {
    view = <DuelStatusCard state={state} variant="invite" myMastery={mastery} />;
  } else if (state.me.finishedAt) {
    view = <DuelStatusCard state={state} variant="waiting" myMastery={mastery} />;
  } else {
    view = <DuelMatch state={state} myMastery={mastery} />;
  }
  return <div className="rl-wide">{view}</div>;
}
