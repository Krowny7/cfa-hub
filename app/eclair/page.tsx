import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTodayDaily } from "@/lib/daily";
import { getEclairStats } from "@/lib/eclair";
import { ECLAIR } from "@/lib/voice-z2c";
import { BackLink } from "@/components/defi/parts";
import { EclairRunner } from "@/components/eclair/EclairRunner";

export const metadata = { title: "Séries éclair · Ranked Lobby" };

// Séries éclair : 5 questions de cours, sans calcul, tirées pour soi dans la
// liste des 5 du jour, à volonté (migration_series_eclair.sql : RPC
// eclair_*). La série commence (ou reprend) dès l'affichage ; tant que la
// migration n'est pas appliquée : état « bientôt ».
export default async function EclairPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const [stats, cinq] = await Promise.all([getEclairStats(supabase, user.id), getTodayDaily(supabase, user.id, "cinq").catch(() => null)]);

  return (
    <div className="rl-wide grid gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <BackLink href="/entrainement">{ECLAIR.retour}</BackLink>
        <p className="t-micro m-0">{ECLAIR.promesse}</p>
      </div>
      <EclairRunner todayDone={stats?.today ?? 0} cinqAFaire={cinq?.status === "todo" || cinq?.status === "playing"} />
    </div>
  );
}
