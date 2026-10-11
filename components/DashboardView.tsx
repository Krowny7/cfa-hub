import { AnneauDuJourSync } from "@/components/adn/AnneauDuJourSync";
import { ProgressSection } from "@/components/accueil/Sections";
import { Rendezvous } from "@/components/accueil/Rendezvous";
import type { AccueilData } from "@/components/accueil/types";
import { DuNouveau } from "@/components/accueil/DuNouveau";

export type { AccueilData } from "@/components/accueil/types";

// Accueil « Le rendez-vous » : présentation pure (aucune requête), rendue par
// app/dashboard et prévisualisée avec des données d'exemple
// (app/preview-da/accueil). Trois niveaux de lecture :
// 1. la journée en héros (components/accueil/Rendezvous.tsx) : un bandeau
//    peint, le titre (« Encore 14 traits, Théo. »), les bâtons de la série,
//    la prochaine action, « Aujourd'hui » et le grand anneau du jour ; à
//    côté, le rendez-vous de tous, Les 30 du jour, en carte « lieu » ; dessous,
//    deux tuiles calmes, le rang en bande d'encre et trois liens ;
// 2. « Du nouveau » : les nouvelles des amis, s'il y en a ;
// 3. « Ta progression » : une carte à onglets.
// Le reste vit sur /classement et /moi.
export function DashboardView({ d, tab }: { d: AccueilData; now?: number; tab?: string }) {
  return (
    <div className="rl-wide rl-page">
      {/* le logo vivant de la barre du haut se recale sur la journée lue ici */}
      <AnneauDuJourSync repondues={d.activity.today} />
      <Rendezvous d={d} />
      {d.duNouveau && <DuNouveau nouvelles={d.duNouveau} />}
      <ProgressSection d={d} tab={tab} />
    </div>
  );
}
