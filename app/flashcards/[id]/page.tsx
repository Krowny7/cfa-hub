import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FlashcardImporterExporter } from "@/components/FlashcardImporterExporter";
import { FlashcardReview } from "@/components/FlashcardReview";
import { FlashcardQuickAdd } from "@/components/FlashcardQuickAdd";
import { FlashcardCardEditor } from "@/components/FlashcardCardEditor";
import { ShareButton } from "@/components/ShareButton";
import { RecentFlashcardSetTracker } from "@/components/RecentFlashcardSetTracker";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/core";
import Link from "next/link";
import type { Flashcard } from "@/lib/types";

type SetRow = { id: string; title: string; visibility: string; owner_id: string; share_token: string | null };
type PageProps = { params: Promise<{ id: string }> };

export default async function FlashcardSetPage({ params }: PageProps) {
  const { id } = await params;
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const [{ data: setData, error: setErr }, { data: cardsData }] = await Promise.all([
    supabase.from("flashcard_sets").select("id,title,visibility,owner_id,share_token").eq("id", id).maybeSingle(),
    supabase.from("flashcards").select("id,front,back,position,topic_id").eq("set_id", id).order("position", { ascending: true }),
  ]);

  if (setErr || !setData) {
    return (
      <div className="card p-6">
        <h1 className="text-xl font-semibold">{t(locale, "flashcards.notFound")}</h1>
        <p className="mt-2 text-sm opacity-70">{t(locale, "flashcards.notFoundDesc")}</p>
      </div>
    );
  }

  const set = setData as unknown as SetRow;
  const cards = (cardsData ?? []) as Pick<Flashcard, "id" | "front" | "back" | "position">[];
  const isOwner = set.owner_id === auth.user.id;

  return (
    <div className="grid gap-4">
      <RecentFlashcardSetTracker id={id} title={set.title} />

      {/* Header — compact, ne mange pas d'espace vertical sur mobile */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link href="/flashcards" className="text-xs text-white/50 hover:text-white/80">
            ← {t(locale, "nav.flashcards")}
          </Link>
          <h1 className="mt-1 text-xl font-semibold tracking-tight break-words">{set.title}</h1>
          <p className="mt-0.5 text-sm text-white/50">
            {String(set.visibility).toUpperCase()} · {cards.length} {t(locale, "flashcards.cards")}
          </p>
        </div>
        {set.share_token && (
          <ShareButton token={set.share_token} base="flashcards" />
        )}
      </div>

      {/* La révision est l'usage quotidien -> premier contenu visible, sans scroll */}
      <FlashcardReview cards={cards} />

      {/* Outils de création/import — repliés, réservés au propriétaire du set */}
      {isOwner && (
        <details className="card p-4">
          <summary className="cursor-pointer select-none text-sm font-semibold">
            {t(locale, "flashcards.manageCards")}
          </summary>
          <div className="mt-3 grid gap-3">
            <FlashcardQuickAdd setId={id} nextPosition={cards.length + 1} />
            <FlashcardImporterExporter setId={id} />
          </div>
        </details>
      )}

      {/* Liste complète des cartes — repliée par défaut, consultable par tous */}
      <details className="card p-4">
        <summary className="cursor-pointer select-none text-sm font-semibold">
          {t(locale, "flashcards.allCards")} ({cards.length})
        </summary>
        <div className="mt-3">
          <FlashcardCardEditor setId={id} initialCards={cards} isOwner={isOwner} />
        </div>
      </details>
    </div>
  );
}
