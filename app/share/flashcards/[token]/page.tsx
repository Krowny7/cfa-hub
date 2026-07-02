import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

type PageProps = { params: Promise<{ token: string }> };

export default async function ShareFlashcardsPage({ params }: PageProps) {
  const { token } = await params;
  const supabase = await createClient();

  // Use RPC to bypass RLS (SECURITY DEFINER function)
  const [setRes, cardsRes] = await Promise.all([
    supabase.rpc("get_flashcard_set_by_token", { p_token: token }).maybeSingle(),
    supabase.rpc("get_flashcards_by_share_token", { p_token: token }),
  ]);

  if (!setRes.data) notFound();

  const set = setRes.data as { id: string; title: string; visibility: string };
  const cards = (cardsRes.data ?? []) as { id: string; front: string; back: string; position: number }[];

  return (
    <div className="grid gap-4">
      <div className="card p-5">
        <div className="text-xs text-white/40 mb-1">Set partagé · lecture seule</div>
        <h1 className="text-xl font-semibold tracking-tight break-words">{set.title}</h1>
        <p className="mt-0.5 text-sm text-white/50">{cards.length} carte(s)</p>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold mb-3">Cartes</h2>
        <div className="grid gap-2">
          {cards.map((c) => (
            <div key={c.id} className="card-soft p-3">
              <div className="text-xs text-white/40">#{c.position}</div>
              <div className="mt-1 whitespace-pre-wrap text-sm font-medium break-words [overflow-wrap:anywhere]">
                {c.front}
              </div>
              <div className="mt-2 whitespace-pre-wrap text-sm text-white/70 break-words [overflow-wrap:anywhere]">
                {c.back}
              </div>
            </div>
          ))}
          {cards.length === 0 && (
            <div className="text-sm text-white/50">Aucune carte.</div>
          )}
        </div>
      </div>
    </div>
  );
}
