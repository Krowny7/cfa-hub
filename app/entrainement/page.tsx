import { lireTrophees } from "@/lib/trophees";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EntrainementView, type EntrainementData } from "@/components/entrainement/EntrainementView";
import { getEclairStats } from "@/lib/eclair";
import { getAnswerStats } from "@/lib/answer-stats";
import { construirePointsFaibles, lireBanqueQcm, lireBasePointsFaibles } from "@/components/moi/points-faibles-data";
import { avecAtelier, lireEtatAtelier } from "@/app/atelier/donnees";
import { loadCalcProgress } from "@/app/calculs/data";
import { calcSubject, calcType } from "@/lib/calc/index";
import { calculsFaibles } from "@/lib/calc/faibles";

// Espace « S'entraîner » : point d'entrée vers les façons de s'entraîner.
// Chacune garde sa page et ses routes (calculs, entraînement ciblé, séries
// éclair, QCM, examens officiels ; l'Atelier, les examens blancs, les duels
// et le défi du jour restent sur leurs pages, sans carte ici). Le diptyque
// (calculs, entraînement ciblé) ne lit rien en base. La page lit seulement
// de quoi dire un chiffre vrai sur le reste : les séries éclair du jour et
// la réussite récente, et les points faibles (réponses de toutes sources et
// ratures par notion ou par thème ; la progression des calculs, la même
// fonction SQL calc_progress que /calculs, sommée par type).
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
  const [eclair, answers, basePointsFaibles, banqueQcm, atelier, progressCalcul, trophees] = await Promise.all([
    getEclairStats(supabase, userId),
    // « Tes points faibles » : les réponses (client admin, toujours filtrées sur ce joueur), les notions (sinon les ratures par thème) et les QCM de la banque
    getAnswerStats(admin ?? supabase, userId, { privileged: !!admin, now }),
    lireBasePointsFaibles(supabase),
    lireBanqueQcm(admin ?? supabase),
    // l'Atelier (ouvert ou non) : une notion mène alors à l'Atelier plutôt qu'à la carte des points faibles
    lireEtatAtelier(supabase, userId),
    // la progression des calculs, une ligne par matière × type × niveau (null : la base ne répond pas, le volet dit qu'il manque de calculs)
    loadCalcProgress(supabase, null),
    // « Tes trophées », sous les séries éclair (jamais d'exception : un compte vide au moindre souci)
    lireTrophees(supabase, userId),
  ]);

  const d: EntrainementData = {
    // séries éclair rendues aujourd'hui et réussite récente (null tant que migration_series_eclair.sql manque)
    eclair: eclair?.today ?? null,
    eclairPct: eclair?.recentPct ?? null,
    pointsFaibles: avecAtelier(construirePointsFaibles(answers, basePointsFaibles, banqueQcm, now), atelier, !!admin),
    // les 4 types de calcul les moins réussis (au moins 5 réponses, tous niveaux confondus)
    calculs: calculsFaibles(progressCalcul, (topic, typeKey) => {
      const matiere = calcSubject(topic);
      const type = calcType(topic, typeKey);
      return matiere && type ? { nom: type.name, matiere: matiere.short, href: `/calculs/${matiere.slug}/${type.key}` } : null;
    }),
    trophees: { lignes: trophees.lignes, complet: trophees.complet },
  };

  return <EntrainementView d={d} />;
}
