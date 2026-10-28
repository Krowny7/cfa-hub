import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EntrainementView, type EntrainementData } from "@/components/entrainement/EntrainementView";
import { getEclairStats } from "@/lib/eclair";
import { getAnswerStats } from "@/lib/answer-stats";
import { construirePointsFaibles, lireBanqueQcm, lireBasePointsFaibles } from "@/components/moi/points-faibles-data";

// Espace « S'entraîner » : point d'entrée vers les façons de s'entraîner.
// Chacune garde sa page et ses routes (calculs, entraînement ciblé, séries
// éclair, QCM, examens officiels ; l'Atelier, les examens blancs, les duels
// et le défi du jour restent sur leurs pages, sans carte ici). Le diptyque
// (calculs, entraînement ciblé) ne lit rien en base. La page lit seulement
// de quoi dire un chiffre vrai sur le reste : les séries éclair du jour et
// la réussite récente, et les points faibles (réponses de toutes sources et
// ratures par notion ou par thème).
export default async function EntrainementPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");
  const userId = auth.user.id;

  let admin: SupabaseClient | null = null;
  try {
    admin = createAdminClient();
  } catch {
    admin = null;
  }

  const now = Date.now();
  const [eclair, answers, basePointsFaibles, banqueQcm] = await Promise.all([
    getEclairStats(supabase, userId),
    // « Tes points faibles » : les réponses (client admin, toujours filtrées sur ce joueur), les notions (sinon les ratures par thème) et les QCM de la banque
    getAnswerStats(admin ?? supabase, userId, { privileged: !!admin, now }),
    lireBasePointsFaibles(supabase),
    lireBanqueQcm(admin ?? supabase),
  ]);

  const d: EntrainementData = {
    // séries éclair rendues aujourd'hui et réussite récente (null tant que migration_series_eclair.sql manque)
    eclair: eclair?.today ?? null,
    eclairPct: eclair?.recentPct ?? null,
    pointsFaibles: construirePointsFaibles(answers, basePointsFaibles, banqueQcm, now),
  };

  return <EntrainementView d={d} />;
}
