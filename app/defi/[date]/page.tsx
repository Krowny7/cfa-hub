import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dailyPhase, dayLabel, getDaily, getDailyBoard, getDailyReview, isDayKey, parisDay, type DailyReviewItem } from "@/lib/daily";
import { DefiSoon } from "@/components/defi/DefiSoon";
import { DefiDay } from "@/components/defi/DefiDay";
import { DefiReview } from "@/components/defi/DefiReview";
import { DefiRunner } from "@/components/defi/DefiRunner";

type PageProps = {
  params: Promise<{ date: string }>;
  searchParams: Promise<{ revue?: string | string[] }>;
};

export async function generateMetadata({ params, searchParams }: PageProps) {
  const { date } = await params;
  const sp = await searchParams;
  const label = isDayKey(date) ? dayLabel(date, "day") : "Défi du jour";
  return { title: `${sp.revue !== undefined ? "Revue · " : ""}Défi du ${label} · Ranked Lobby` };
}

// Un jour du défi : ma copie et le classement (figé une fois le jour passé).
// ?revue=1 (ou ?revue=tout) : la revue complète de ma copie, une fois rendue.
// Aujourd'hui sans copie rendue → /defi (c'est là qu'on joue). Une copie
// commencée la veille avant minuit et encore ouverte se termine ici.
export default async function DefiDayPage({ params, searchParams }: PageProps) {
  const { date } = await params;
  const sp = await searchParams;
  const rawRevue = Array.isArray(sp.revue) ? sp.revue[0] : sp.revue;
  const wantsReview = rawRevue !== undefined;
  const initialFilter = rawRevue === "tout" ? "all" : undefined;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");
  if (!isDayKey(date) || date > parisDay()) notFound();

  const load = await getDaily(supabase, date);
  if (load.kind !== "ok") {
    return (
      <div className="rl-wide">
        <DefiSoon variant={load.kind === "soon" ? "soon" : "error"} />
      </div>
    );
  }
  const info = load.info;
  const phase = dailyPhase(info);

  if (info.isToday && (phase === "todo" || phase === "playing")) redirect("/defi");
  if (phase === "playing") {
    return (
      <div className="rl-wide">
        <DefiRunner day={info.day} today={info.today} questionCount={info.questionCount} timeLimitSeconds={info.timeLimitSeconds} />
      </div>
    );
  }

  const [review, board] = await Promise.all([
    phase === "done" ? getDailyReview(supabase, info.day) : Promise.resolve([] as DailyReviewItem[]),
    wantsReview && phase === "done" ? Promise.resolve(null) : getDailyBoard(supabase, info.day, 100),
  ]);

  if (wantsReview && phase === "done") {
    return (
      <div className="rl-wide">
        <DefiReview info={info} review={review} initialFilter={initialFilter} />
      </div>
    );
  }

  return (
    <div className="rl-wide">
      <DefiDay info={info} board={board} review={review} nowIso={new Date().toISOString()} />
    </div>
  );
}
