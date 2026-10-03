import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dailyPhase, getDaily, getDailyBoard, getDailyHistory, getDailyReview, type DailyReviewItem } from "@/lib/daily";
import { DefiSoon } from "@/components/defi/DefiSoon";
import { DefiToday } from "@/components/defi/DefiToday";

export const metadata = { title: "Défi du jour · Ranked Lobby" };

// Le défi du jour (« Les 30 du jour ») : à faire, en cours ou rendu, avec le
// classement du jour et les jours passés. Le défi est tiré à la première
// ouverture du jour (daily_get). Tant que migration_daily_challenge.sql
// n'est pas appliquée : état « bientôt ».
export default async function DefiPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const load = await getDaily(supabase, null);
  if (load.kind !== "ok") {
    return (
      <div className="rl-wide">
        <DefiSoon variant={load.kind === "soon" ? "soon" : "error"} />
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
          getDailyBoard(supabase, info.day, 50),
          getDailyHistory(supabase, 45),
          phase === "done" ? getDailyReview(supabase, info.day) : Promise.resolve([] as DailyReviewItem[]),
        ]);

  return (
    <div className="rl-wide">
      <DefiToday key={info.day} info={info} board={board} history={history} review={review} nowIso={new Date().toISOString()} />
    </div>
  );
}
