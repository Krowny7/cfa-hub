import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FlashcardImporterExporter } from "@/components/FlashcardImporterExporter";
import { FlashcardReview } from "@/components/FlashcardReview";
import { FlashcardQuickAdd } from "@/components/FlashcardQuickAdd";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/core";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function FlashcardSetPage({ params }: PageProps) {
  const { id } = await params;

  const locale = await getLocale();
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) redirect("/login");

  const [{ data: set, error: setErr }, { data: cards }] = await Promise.all([
    supabase.from("flashcard_sets").select("id,title,visibility").eq("id", id).maybeSingle(),
    supabase
      .from("flashcards")
      .select("id,front,back,position")
      .eq("set_id", id)
      .order("position", { ascending: true }),
  ]);

  if (setErr || !set) {
    return (
      <div className="rounded-2xl border p-6">
        <h1 className="text-xl font-semibold break-words">{t(locale, "flashcards.notFound")}</h1>
        <p className="mt-2 text-sm opacity-80 break-words">{t(locale, "flashcards.notFoundDesc")}</p>
      </div>
    );
  }

  const count = (cards ?? []).length;

  return (
    <div className="grid gap-4 min-w-0 max-w-full overflow-x-hidden">
      <div className="rounded-2xl border p-6">
        <h1 className="text-xl font-semibold break-words">{(set as any).title}</h1>
        <p className="mt-2 text-sm opacity-80 break-words">
          {String((set as any).visibility).toUpperCase()} • {count} {t(locale, "flashcards.cards")}
        </p>
      </div>

      <FlashcardQuickAdd setId={id} nextPosition={count + 1} />

      <FlashcardImporterExporter setId={id} />

      <FlashcardReview cards={(cards ?? []) as any} />

      <div className="rounded-2xl border p-4 min-w-0 max-w-full">
        <h3 className="font-semibold">{t(locale, "flashcards.cards")}</h3>
        <div className="mt-3 grid gap-2">
          {(cards ?? []).map((c: any) => (
            <div key={c.id} className="rounded-xl border p-3">
              <div className="text-xs opacity-70">#{c.position}</div>
              <div className="mt-1 whitespace-pre-wrap text-sm font-medium break-words [overflow-wrap:anywhere]">{c.front}</div>
              <div className="mt-2 whitespace-pre-wrap text-sm opacity-80 break-words [overflow-wrap:anywhere]">{c.back}</div>
            </div>
          ))}
          {(cards ?? []).length === 0 && (
            <div className="text-sm opacity-70">{t(locale, "flashcards.none")}</div>
          )}
        </div>
      </div>
    </div>
  );
}