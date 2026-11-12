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
import { ColonneSeance, EnTeteSousPage, SousPage } from "@/components/ui/SousPage";
import { countPlayers } from "@/components/classement/data";
import { RETOUR_DUEL, SOUS_AFFRONTER } from "@/lib/voice-affronter-sous";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const D = SOUS_AFFRONTER.duel;

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
// Sur le modèle des séances (2026-11-12) : l'en-tête commun (retour au lobby des duels ; à la revue,
// retour au résultat), puis la colonne des séances (760 px). Pendant la partie, plus d'en-tête :
// DuelMatch ne le montre qu'avant de commencer.
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

  if (!(await duelsReady(supabase))) return <DuelSoon />;

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

  // l'en-tête commun : contre qui, et le format
  const titre = state.them ? D.contre(state.them.username ?? D.unJoueur) : D.auHasard;
  const format = D.format(state.questionCount, Math.round(state.timeLimitSeconds / 60));
  const illustration = { nom: "duel-lice", position: "50% 70%" } as const;

  if (wantsReview && (finished || review.length > 0)) {
    return (
      <SousPage
        entete={<EnTeteSousPage retour={{ href: `/duel/${id}`, label: finished ? D.resultat : D.leDuel }} titre={titre} ligne={D.revue} illustration={illustration} />}
      >
        <ColonneSeance>
          <DuelReview state={state} review={review} initialFilter={initialFilter} />
        </ColonneSeance>
      </SousPage>
    );
  }

  const mastery = topics ? programMastery(topics) : null;
  const entete = <EnTeteSousPage retour={RETOUR_DUEL} titre={titre} ligne={format} illustration={illustration} />;

  if (finished) {
    return (
      <SousPage entete={entete}>
        <ColonneSeance>
          <DuelResult state={state} review={review} mastery={mastery} leaderboardRank={lbRank} players={players} />
        </ColonneSeance>
      </SousPage>
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
    // la partie : l'en-tête n'est montré qu'avant de commencer (DuelMatch le pose lui-même)
    return (
      <SousPage entete={null}>
        <DuelMatch state={state} myMastery={mastery} entete={entete} />
      </SousPage>
    );
  }
  return (
    <SousPage entete={entete}>
      <ColonneSeance>{view}</ColonneSeance>
    </SousPage>
  );
}
