import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/core";
import { levelInfoFromXp } from "@/lib/leveling";
import { DailySessionCard } from "@/components/DailySessionCard";
import { QuestionOfDayCard } from "@/components/QuestionOfDayCard";
import { CountdownCard } from "@/components/CountdownCard";

export default async function Dashboard() {
  const locale = await getLocale();
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) redirect("/login");

  const [
    { data: ratingRow },
    { data: profileRow },
    { count: docsCount },
    { count: setsCount },
    { count: qcmCount },
    { data: latestFlashSet },
    { data: latestQuizSet }
  ] = await Promise.all([
    supabase.from("ratings").select("elo,games_played").eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("xp_total").eq("id", user.id).maybeSingle(),
    supabase.from("documents").select("*", { count: "exact", head: true }),
    supabase.from("flashcard_sets").select("*", { count: "exact", head: true }),
    supabase.from("quiz_sets").select("*", { count: "exact", head: true }),
    supabase.from("flashcard_sets").select("id,title,created_at").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("quiz_sets").select("id,title,created_at").order("created_at", { ascending: false }).limit(1).maybeSingle()
  ]);

  const rating = (ratingRow as any)?.elo ?? 1200;
  const games = (ratingRow as any)?.games_played ?? 0;

  const xpTotal = Number((profileRow as any)?.xp_total ?? 0) || 0;
  const lvl = levelInfoFromXp(xpTotal).level;

  const flashcardsSuggestion = latestFlashSet
    ? {
        href: `/flashcards/${(latestFlashSet as any).id}?daily=1`,
        label: String((latestFlashSet as any).title ?? "(set)"),
        hint: t(locale, "daily.suggestionFlashcards")
      }
    : {
        href: "/flashcards",
        label: t(locale, "daily.noFlashcards"),
        hint: null
      };

  const qcmSuggestion = latestQuizSet
    ? {
        href: `/qcm/${(latestQuizSet as any).id}?daily=1`,
        label: String((latestQuizSet as any).title ?? "(quiz)"),
        hint: t(locale, "daily.suggestionQcm")
      }
    : {
        href: "/qcm",
        label: t(locale, "daily.noQcm"),
        hint: null
      };

  return (
    <div className="grid gap-4">
      {/* Header + quick stats */}
      <div className="card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">{t(locale, "dashboard.title")}</h1>
            <p className="mt-2 max-w-[72ch] text-sm text-white/80">{t(locale, "dashboard.subtitle")}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="card-soft p-4">
            <div className="text-xs opacity-70">XP</div>
            <div className="mt-1 text-2xl font-semibold">{t(locale, "dashboard.level", { n: lvl })}</div>
            <div className="text-xs opacity-70">{xpTotal} XP</div>
          </div>

          <div className="card-soft p-4">
            <div className="text-xs opacity-70">{t(locale, "dashboard.elo")}</div>
            <div className="mt-1 text-2xl font-semibold">{rating}</div>
            <div className="text-xs opacity-70">{t(locale, "dashboard.games", { n: games })}</div>
          </div>

          <div className="card-soft p-4">
            <div className="text-xs opacity-70">{t(locale, "dashboard.pdfs")}</div>
            <div className="mt-1 text-2xl font-semibold">{docsCount ?? 0}</div>
          </div>

          <div className="card-soft p-4">
            <div className="text-xs opacity-70">{t(locale, "dashboard.sets")}</div>
            <div className="mt-1 text-2xl font-semibold">{setsCount ?? 0}</div>
          </div>

          <div className="card-soft p-4">
            <div className="text-xs opacity-70">{t(locale, "qcm.title")}</div>
            <div className="mt-1 text-2xl font-semibold">{qcmCount ?? 0}</div>
          </div>
        </div>
      </div>

      {/* Today */}
      <div>
        <div className="px-1">
          <h2 className="font-semibold">{t(locale, "dashboard.sections.today")}</h2>
          <p className="mt-1 text-sm text-white/70">{t(locale, "dashboard.sections.todayHint")}</p>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <DailySessionCard flashcardsSuggestion={flashcardsSuggestion as any} qcmSuggestion={qcmSuggestion as any} />
          <QuestionOfDayCard />
        </div>
      </div>

      {/* Progress */}
      <div>
        <div className="px-1">
          <h2 className="font-semibold">{t(locale, "dashboard.sections.progress")}</h2>
          <p className="mt-1 text-sm text-white/70">{t(locale, "dashboard.sections.progressHint")}</p>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <CountdownCard
            defaultDate={process.env.NEXT_PUBLIC_CFA_EXAM_DATE ?? null}
            defaultLabel={process.env.NEXT_PUBLIC_CFA_EXAM_LABEL ?? null}
          />

          <div className="card p-6">
            <h3 className="font-semibold">{t(locale, "dashboard.progress.title")}</h3>
            <p className="mt-1 text-sm text-white/70">{t(locale, "dashboard.progress.subtitle")}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="card-soft p-4">
                <div className="text-xs opacity-70">XP</div>
                <div className="mt-1 text-xl font-semibold">{t(locale, "dashboard.level", { n: lvl })}</div>
                <div className="text-xs opacity-70">{xpTotal} XP</div>
              </div>
              <div className="card-soft p-4">
                <div className="text-xs opacity-70">{t(locale, "dashboard.pdfs")}</div>
                <div className="mt-1 text-xl font-semibold">{docsCount ?? 0}</div>
                <div className="text-xs opacity-70">{t(locale, "dashboard.sets")}: {setsCount ?? 0}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Next steps */}
      <div className="card p-6">
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
