import Link from "next/link";
import { redirect } from "next/navigation";
import { Layers, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { FlashcardImporterExporter } from "@/components/FlashcardImporterExporter";
import { FlashcardReview } from "@/components/FlashcardReview";
import { FlashcardQuickAdd } from "@/components/FlashcardQuickAdd";
import { FlashcardCardEditor } from "@/components/FlashcardCardEditor";
import { ShareButton } from "@/components/ShareButton";
import { RecentFlashcardSetTracker } from "@/components/RecentFlashcardSetTracker";
import { ContentDetailHeader, DisclosureRow, plural, splitTitle, subjectOfTitle, visibilityLabel } from "@/components/ContentDetailHeader";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/core";
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
      <div className="mx-auto grid max-w-[560px] justify-items-start gap-3 pt-4 md:pt-10">
        <p className="t-eyebrow">Flashcards</p>
        <h1 className="t-h1 m-0">{t(locale, "flashcards.notFound")}</h1>
        <p className="t-small">Il a peut-être été supprimé, ou il n&apos;est pas partagé avec toi.</p>
        <Link href="/flashcards" className="btn btn-secondary mt-3">
          Retour aux flashcards
        </Link>
      </div>
    );
  }

  const set = setData as unknown as SetRow;
  const cards = (cardsData ?? []) as Pick<Flashcard, "id" | "front" | "back" | "position">[];
  const isOwner = set.owner_id === auth.user.id;

  const parts = splitTitle(set.title);
  const subject = subjectOfTitle(set.title);
  const eyebrow = [subject?.name, parts.lead].filter(Boolean).join(" · ") || null;

  return (
    <div className="mx-auto flex w-full max-w-[780px] flex-col gap-8 md:gap-10">
      <RecentFlashcardSetTracker id={id} title={set.title} />

      <ContentDetailHeader
        backHref="/flashcards"
        backLabel={t(locale, "nav.flashcards")}
        title={parts.main}
        eyebrow={eyebrow}
        meta={[plural(cards.length, "carte", "cartes"), visibilityLabel(set.visibility)]}
        rightSlot={set.share_token ? <ShareButton token={set.share_token} base="flashcards" /> : null}
      />

      {/* La révision est l'usage quotidien : premier contenu visible, sans défilement */}
      <FlashcardReview cards={cards} setId={id} />

      {/* Le set : toutes les cartes (pour tous), ajout et import (propriétaire), repliés */}
      <section className="rl-section mt-6 md:mt-10" aria-labelledby="set-cartes">
        <h2 id="set-cartes" className="t-h3 m-0">
          Le set
        </h2>
        <div className="card divide-y divide-line overflow-hidden">
          <DisclosureRow
            icon={<Layers size={18} aria-hidden />}
            title={t(locale, "flashcards.allCards")}
            sub={`${plural(cards.length, "carte", "cartes")}${isOwner ? " · modifier ou supprimer" : " · recto et verso"}`}
          >
            <FlashcardCardEditor setId={id} initialCards={cards} isOwner={isOwner} />
          </DisclosureRow>
          {isOwner && (
            <DisclosureRow icon={<Plus size={18} aria-hidden />} title="Ajouter et importer" sub="Ajout rapide · import et export compatibles Quizlet">
              <div className="grid gap-8">
                <FlashcardQuickAdd setId={id} nextPosition={cards.length + 1} />
                <div className="rule" />
                <FlashcardImporterExporter setId={id} />
              </div>
            </DisclosureRow>
          )}
        </div>
      </section>
    </div>
  );
}
