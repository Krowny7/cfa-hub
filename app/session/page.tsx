import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SessionClient, type SetOption } from "@/components/SessionClient";
import { calcStreakAndToday, type XpDay } from "@/lib/leveling";
import { joursEncreUnifies, lireSerieEncre } from "@/lib/serie-encre";
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

  const [qcmRes, flashRes, xpDailyRes, activity, traitsJour, serieBase] = await Promise.all([
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
    // la série d'encre (null tant que migration_serie_encre.sql n'est pas collée : l'ancien calcul)
    lireSerieEncre(supabase),
  ]);

  // Jours d'encre : la même série que l'accueil (10 questions, joker ; l'ancien calcul sans la migration).
  const xpDays = Array.isArray(xpDailyRes.data)
    ? (xpDailyRes.data as XpDay[]).map((x) => ({ day: String(x.day).slice(0, 10), xp: Number(x.xp) || 0 }))
    : [];
  const ancien = calcStreakAndToday(xpDays, { today: parisDay(now), actifs: activity.activeDays });
  const { streak, dayState: etatJour, reste: serieReste } = joursEncreUnifies(serieBase, activity.today, parisHour(now), ancien);

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

  return <SessionClient qcmSets={qcmSets} flashSets={flashSets} streak={streak} etatJour={etatJour} serieReste={serieReste} traitsJour={traitsJour} />;
}
