import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTodayDaily } from "@/lib/daily";
import { getEclairStats } from "@/lib/eclair";
import { lireSerieEncre } from "@/lib/serie-encre";
import { EclairRunner } from "@/components/eclair/EclairRunner";

export const metadata = { title: "Séries éclair · Ranked Lobby" };

// Séries éclair : 5 questions de cours, sans calcul, tirées pour soi dans la
// liste des 5 du jour, à volonté (migration_series_eclair.sql : RPC
// eclair_*). L'accueil suit le modèle des sous-pages (l'en-tête commun, le
// départ, ta série d'encre dans la colonne grise) : il est rendu par
// EclairRunner, qui le quitte dès que la série est lancée. Tant que la
// migration n'est pas appliquée : état « bientôt ».
export default async function EclairPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const [stats, cinq, statut] = await Promise.all([
    getEclairStats(supabase, user.id),
    getTodayDaily(supabase, user.id, "cinq").catch(() => null),
    lireSerieEncre(supabase),
  ]);

  return (
    <EclairRunner
      todayDone={stats?.today ?? 0}
      cinqAFaire={cinq?.status === "todo" || cinq?.status === "playing"}
      depart={{
        recentPct: stats?.recentPct ?? null,
        serie: statut ? { jours: statut.serieAffichee, fait: statut.fait, reste: Math.max(0, statut.seuil - statut.aujourdhui) } : null,
      }}
    />
  );
}
