import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  FORMATS,
  dailyPhase,
  dayLabel,
  getDaily,
  getDailyBoard,
  getDailyHistory,
  getDailyReview,
  isDayKey,
  parisDay,
  type DailyReviewItem,
  type FormatDefi,
} from "@/lib/daily";
import { DefiSoon } from "@/components/defi/DefiSoon";
import { DefiToday } from "@/components/defi/DefiToday";
import { DefiDay } from "@/components/defi/DefiDay";
import { DefiReview } from "@/components/defi/DefiReview";
import { DefiRunner } from "@/components/defi/DefiRunner";

// Les pages des deux défis du jour, partagées : /defi et /defi/<jour> (les
// 30 du jour), /defi/cinq et /defi/cinq/<jour> (les 5 du jour). Même moteur,
// même parcours ; seuls changent les RPC, l'adresse et la voix (le format).

/** Le défi d'aujourd'hui : à faire, en cours ou rendu, avec le classement et les jours passés. */
export async function pageDuJour(format: FormatDefi) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const load = await getDaily(supabase, null, format);
  if (load.kind !== "ok") {
    return (
      <div className="rl-wide">
        <DefiSoon variant={load.kind === "soon" ? "soon" : "error"} format={format} />
      </div>
    );
  }

  const info = load.info;
  const phase = dailyPhase(info);
  // Pendant la copie, seule la copie s'affiche : rien d'autre à charger.
  const [board, history, review] =
    phase === "playing"
      ? [null, [], [] as DailyReviewItem[]]
      : await Promise.all([
          getDailyBoard(supabase, info.day, 50, format),
          getDailyHistory(supabase, 45, format),
          phase === "done" ? getDailyReview(supabase, info.day, format) : Promise.resolve([] as DailyReviewItem[]),
        ]);

  return (
    <div className="rl-wide">
      <DefiToday key={info.day} info={info} board={board} history={history} review={review} nowIso={new Date().toISOString()} />
    </div>
  );
}

type PageJour = {
  params: Promise<{ date: string }>;
  searchParams: Promise<{ revue?: string | string[] }>;
};

export async function metaDunJour(format: FormatDefi, { params, searchParams }: PageJour) {
  const { date } = await params;
  const sp = await searchParams;
  const label = isDayKey(date) ? dayLabel(date, "day") : format === "cinq" ? "Les 5 du jour" : "Défi du jour";
  const nom = format === "cinq" ? "Les 5 du" : "Défi du";
  return { title: `${sp.revue !== undefined ? "Revue · " : ""}${isDayKey(date) ? `${nom} ${label}` : label} · Ranked Lobby` };
}

/**
 * Un jour du défi : ma copie et le classement (figé une fois le jour passé).
 * ?revue=1 (ou ?revue=tout) : la revue complète de ma copie, une fois rendue.
 * Aujourd'hui sans copie rendue → la page du jour (c'est là qu'on joue). Une
 * copie commencée la veille avant minuit et encore ouverte se termine ici.
 */
export async function pageDunJour(format: FormatDefi, { params, searchParams }: PageJour) {
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

  const load = await getDaily(supabase, date, format);
  if (load.kind !== "ok") {
    return (
      <div className="rl-wide">
        <DefiSoon variant={load.kind === "soon" ? "soon" : "error"} format={format} />
      </div>
    );
  }
  const info = load.info;
  const phase = dailyPhase(info);

  if (info.isToday && (phase === "todo" || phase === "playing")) redirect(FORMATS[format].href);
  if (phase === "playing") {
    return (
      <div className="rl-wide">
        <DefiRunner day={info.day} today={info.today} questionCount={info.questionCount} timeLimitSeconds={info.timeLimitSeconds} format={format} />
      </div>
    );
  }

  const [review, board] = await Promise.all([
    phase === "done" ? getDailyReview(supabase, info.day, format) : Promise.resolve([] as DailyReviewItem[]),
    wantsReview && phase === "done" ? Promise.resolve(null) : getDailyBoard(supabase, info.day, 100, format),
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
