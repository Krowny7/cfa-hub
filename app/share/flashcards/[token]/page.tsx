import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { SharedDeckView, type SharedCard } from "@/app/share/deck-view";

type PageProps = { params: Promise<{ token: string }> };

export default async function ShareFlashcardsPage({ params }: PageProps) {
  const { token } = await params;
  const supabase = await createClient();

  // RPC SECURITY DEFINER : lecture par jeton, sans passer par la RLS
  const [setRes, cardsRes] = await Promise.all([
    supabase.rpc("get_flashcard_set_by_token", { p_token: token }).maybeSingle(),
    supabase.rpc("get_flashcards_by_share_token", { p_token: token }),
  ]);

  if (!setRes.data) notFound();

  const set = setRes.data as { id: string; title: string; visibility: string };
  const cards = (cardsRes.data ?? []) as SharedCard[];

  return <SharedDeckView title={set.title} cards={cards} />;
}
