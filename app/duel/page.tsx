import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyRating } from "@/lib/rating";
import { duelsReady, getDuelSuggestions, getMyOpenDuels, getPlayerCard, refreshMyDuels } from "@/lib/duels";
import { DuelLobby } from "@/components/duel/DuelLobby";
import { DuelSoon } from "@/components/duel/DuelSoon";

export const metadata = { title: "Duel · Ranked Lobby" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PageProps = { searchParams: Promise<{ adversaire?: string | string[] }> };

// Lobby des duels. /duel?adversaire=<userId> met ce joueur devant le carrousel des adversaires, avec
// son défi et l'enjeu. Les duels en cours sont dans la colonne grise ; les duels terminés se revoient
// depuis S'affronter.
export default async function DuelLobbyPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const sp = await searchParams;
  const raw = Array.isArray(sp.adversaire) ? sp.adversaire[0] : sp.adversaire;
  const targetId = raw && UUID_RE.test(raw) && raw !== user.id ? raw : null;

  if (!(await duelsReady(supabase))) return <DuelSoon />;

  // Règle d'abord les duels arrivés à échéance (pas de tâche planifiée)
  await refreshMyDuels(supabase);

  const [me, suggestions, open, target] = await Promise.all([
    getMyRating(supabase, user.id),
    getDuelSuggestions(supabase, 6),
    getMyOpenDuels(supabase, user.id),
    targetId ? getPlayerCard(supabase, targetId) : Promise.resolve(null),
  ]);

  return <DuelLobby me={me} suggestions={suggestions} target={target} open={open} nowIso={new Date().toISOString()} />;
}
