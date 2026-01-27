import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/core";

export default async function Dashboard() {
  const locale = await getLocale();
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) redirect("/login");

  const [{ data: ratingRow }, { count: docsCount }, { count: setsCount }, { count: qcmCount }] = await Promise.all([
    supabase.from("ratings").select("rating,games_played").eq("user_id", user.id).maybeSingle(),
    supabase.from("documents").select("*", { count: "exact", head: true }),
    supabase.from("flashcard_sets").select("*", { count: "exact", head: true }),
    supabase.from("quiz_sets").select("*", { count: "exact", head: true })
  ]);

  const rating = (ratingRow as any)?.rating ?? 1200;
  const games = (ratingRow as any)?.games_played ?? 0;

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border p-6">
        <h1 className="text-xl font-semibold">{t(locale, "dashboard.title")}</h1>
        <p className="mt-2 text-sm opacity-80">{t(locale, "dashboard.subtitle")}</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border p-4">
            <div className="text-xs opacity-70">{t(locale, "dashboard.elo")}</div>
            <div className="mt-1 text-2xl font-semibold">{rating}</div>
            <div className="text-xs opacity-70">{t(locale, "dashboard.games", { n: games })}</div>
          </div>

          <div className="rounded-2xl border p-4">
            <div className="text-xs opacity-70">{t(locale, "dashboard.pdfs")}</div>
            <div className="mt-1 text-2xl font-semibold">{docsCount ?? 0}</div>
          </div>

          <div className="rounded-2xl border p-4">
            <div className="text-xs opacity-70">{t(locale, "dashboard.sets")}</div>
            <div className="mt-1 text-2xl font-semibold">{setsCount ?? 0}</div>
          </div>

          <div className="rounded-2xl border p-4">
            <div className="text-xs opacity-70">{t(locale, "qcm.title")}</div>
            <div className="mt-1 text-2xl font-semibold">{qcmCount ?? 0}</div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link className="rounded-lg border px-3 py-2 text-sm hover:bg-white/5" href="/library">
            {t(locale, "dashboard.goLibrary")}
          </Link>
          <Link className="rounded-lg border px-3 py-2 text-sm hover:bg-white/5" href="/flashcards">
            {t(locale, "dashboard.goFlashcards")}
          </Link>
          <Link className="rounded-lg border px-3 py-2 text-sm hover:bg-white/5" href="/qcm">
            {t(locale, "nav.qcm")}
          </Link>
          <Link className="rounded-lg border px-3 py-2 text-sm hover:bg-white/5" href="/people">
            {t(locale, "nav.people")}
          </Link>
          <Link className="rounded-lg border px-3 py-2 text-sm hover:bg-white/5" href="/settings">
            {t(locale, "dashboard.goSettings")}
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border p-6">
        <h2 className="font-semibold">{t(locale, "dashboard.nextTitle")}</h2>
        <ul className="mt-3 list-disc pl-5 text-sm opacity-90">
          <li>{t(locale, "dashboard.next1")}</li>
          <li>{t(locale, "dashboard.next2")}</li>
          <li>{t(locale, "dashboard.next3")}</li>
        </ul>
      </div>
    </div>
  );
}
