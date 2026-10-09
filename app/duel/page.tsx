import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyRating, getRecentDuels } from "@/lib/rating";
import { duelsReady, getDuelSuggestions, getMyOpenDuels, getPlayerCard, getReviewableDuels, refreshMyDuels } from "@/lib/duels";
import { DuelLobby } from "@/components/duel/DuelLobby";
import { DuelSoon } from "@/components/duel/DuelSoon";
import { CarteJoueurHote } from "@/components/profil/CarteJoueur";

export const metadata = { title: "Duel · Ranked Lobby" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PageProps = { searchParams: Promise<{ adversaire?: string | string[] }> };

// Lobby des duels. /duel?adversaire=<userId> met ce joueur en tête de la
// liste « Défier quelqu'un », avec l'enjeu. « Tes duels » : en cours, et les
// duels terminés ces 14 derniers jours, à revoir.
export default async function DuelLobbyPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const sp = await searchParams;
  const raw = Array.isArray(sp.adversaire) ? sp.adversaire[0] : sp.adversaire;
  const targetId = raw && UUID_RE.test(raw) && raw !== user.id ? raw : null;

  if (!(await duelsReady(supabase))) {
    return (
      <div className="rl-wide">
        <DuelSoon />
      </div>
    );
  }

  // Règle d'abord les duels arrivés à échéance (pas de tâche planifiée)
  await refreshMyDuels(supabase);

  const [me, suggestions, open, recent, reviewable, target] = await Promise.all([
    getMyRating(supabase, user.id),
    getDuelSuggestions(supabase, 6),
    getMyOpenDuels(supabase, user.id),
    getRecentDuels(supabase, user.id, 6),
    getReviewableDuels(supabase, user.id),
    targetId ? getPlayerCard(supabase, targetId) : Promise.resolve(null),
  ]);

  return (
    <div className="rl-wide">
      <DuelLobby
        me={me}
        suggestions={suggestions}
        target={target}
        open={open}
        recent={recent}
        reviewable={reviewable}
        nowIso={new Date().toISOString()}
      />
      <CarteJoueurHote />
    </div>
  );
}
