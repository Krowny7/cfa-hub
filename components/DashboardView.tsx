import { AnneauDuJourSync } from "@/components/adn/AnneauDuJourSync";
import { ProgressSection } from "@/components/accueil/Sections";
import { Rendezvous } from "@/components/accueil/Rendezvous";
import type { AccueilData } from "@/components/accueil/types";
import { DuNouveau } from "@/components/accueil/DuNouveau";
import { CelebrationSerie } from "@/components/serie/CelebrationSerie";

export type { AccueilData } from "@/components/accueil/types";

// Accueil « Le rendez-vous » : présentation pure (aucune requête), rendue par
// app/dashboard et prévisualisée avec des données d'exemple
// (app/preview-da/accueil). Trois niveaux de lecture :
// 1. le rendez-vous du jour (components/accueil/Rendezvous.tsx), dans l'ordre :
//    Les 30 du jour en héros ; à droite Les 5 du jour puis Tes traits du jour
//    (l'anneau, les bâtons, J-n) ; dessous « Reprendre » et le duel en tuiles
//    calmes, le rang en bande d'encre et trois liens ;
// 2. « Du nouveau » : les nouvelles des amis, s'il y en a ;
// 3. « Ta progression » : une carte à onglets.
// Le reste vit sur /classement et /moi.
// `codex` : la ligne « Ta quête » et les contrats du jour, posée sous les traits
// du jour (components/codex/LigneCodex ; flux Suspense côté serveur).
export function DashboardView({ d, tab, codex }: { d: AccueilData; now?: number; tab?: string; codex?: React.ReactNode }) {
  return (
    <div className="rl-wide rl-page">
      {/* le logo vivant de la barre du haut se recale sur la journée lue ici */}
      <AnneauDuJourSync repondues={d.activity.today} />
      <Rendezvous d={d} codex={codex} />
      {/* le palier de 7 jours de la série d'encre : une petite célébration, une fois par série */}
      {d.serieEncre && d.serieEncre.serieAffichee >= 7 && <CelebrationSerie serie={d.serieEncre.serieAffichee} cle={d.serieEncre.debut ?? d.serieEncre.jour} doubleDeja={d.serieEncre.mult === 2} />}
      {d.duNouveau && <DuNouveau nouvelles={d.duNouveau} />}
      <ProgressSection d={d} tab={tab} />
    </div>
  );
}
