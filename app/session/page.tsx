import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SessionClient, type SetOption } from "@/components/SessionClient";
import { calcStreakAndToday, type XpDay } from "@/lib/leveling";
import { etatDuJour } from "@/lib/voice";
import { traitsDuJour } from "@/components/adn/AnneauDuJourData";
import { loadActivity, parisDay, parisHour } from "@/components/accueil/queries";

type SetRow = {
  id: string;
  title: string;
  is_official?: boolean | null;
  official_published?: boolean | null;
};

export default async function SessionPage() {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const now = new Date();

  const [qcmRes, flashRes, xpDailyRes, activity, traitsJour] = await Promise.all([
    supabase
      .from("quiz_sets")
      .select("id,title,is_official,official_published")
      .order("is_official", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("flashcard_sets")
      .select("id,title")
      .order("created_at", { ascending: false }),
    (async () => {
      try {
        return await supabase.rpc("get_xp_daily", { p_days: 30 });
      } catch {
        return { data: null };
      }
    })(),
    // questions répondues par jour (toutes sources) : la série compte aussi
    // les jours sans XP, comme sur l'accueil
    loadActivity(supabase, user.id, now),
    // traits du jour (lecture de la barre du haut, en cache) : l'anneau sous la copie
    traitsDuJour(user.id),
  ]);

  // Jours d'encre : même calcul que l'accueil (jour de Paris, jours actifs).
  const xpDays = Array.isArray(xpDailyRes.data)
    ? (xpDailyRes.data as XpDay[]).map((x) => ({ day: String(x.day).slice(0, 10), xp: Number(x.xp) || 0 }))
    : [];
  const { streak, todayDone } = calcStreakAndToday(xpDays, { today: parisDay(now), actifs: activity.activeDays });
  const etatJour = todayDone || activity.today > 0 ? "fait" : etatDuJour(0, parisHour(now));

  const qcmSets: SetOption[] = ((qcmRes.data ?? []) as SetRow[])
    .filter((s) => s.id && s.title)
    .map((s) => ({
      id: s.id,
      title: s.title,
      isOfficial: Boolean(s.is_official && s.official_published),
    }));

  const flashSets: SetOption[] = ((flashRes.data ?? []) as SetRow[])
    .filter((s) => s.id && s.title)
    .map((s) => ({ id: s.id, title: s.title, isOfficial: false }));

  return <SessionClient qcmSets={qcmSets} flashSets={flashSets} streak={streak} etatJour={etatJour} traitsJour={traitsJour} />;
}
