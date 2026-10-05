import { AnneauDuJourSync } from "@/components/adn/AnneauDuJourSync";
import { JourAnneau, JourHero, ResumeHero } from "@/components/accueil/HomeCards";
import { ProgressSection, TodaySection } from "@/components/accueil/Sections";
import { DefiHero, defiEnTete } from "@/components/defi/DefiHero";
import type { AccueilData } from "@/components/accueil/types";
import { CinqCarte, cinqVisible } from "@/components/defi/CinqCarte";

export type { AccueilData } from "@/components/accueil/types";

// Accueil : présentation pure (aucune requête), rendue par app/dashboard et
// prévisualisée avec des données d'exemple (app/preview-da/accueil).
// Trois niveaux de lecture :
// 1. le point focal, l'anneau du jour en grand (moment 1) : le titre le dit
//    (« Encore 14 traits, Théo. »), les bâtons comptent la série (moment 2),
//    et la prochaine action est juste à côté ;
// 2. « Aujourd'hui » : trois tuiles calmes au plus, choisies par priorité ;
// 3. « Ta progression » : le rang, puis une carte à onglets.
// Le reste vit sur /classement et /moi.
export function DashboardView({ d, now, tab }: { d: AccueilData; now?: number; tab?: string }) {
  return (
    <div className="rl-wide rl-page">
      {/* le logo vivant de la barre du haut se recale sur la journée lue ici */}
      <AnneauDuJourSync repondues={d.activity.today} />

      {/* téléphone : titre, anneau, action ; ordinateur : titre et action à
          gauche, centrés ensemble sur la hauteur de l'anneau, à droite */}
      <section aria-label="Ta journée" className="grid gap-x-12 gap-y-7 lg:grid-cols-12 lg:grid-rows-[1fr_auto_auto_1fr] lg:gap-y-0">
        <div className="min-w-0 lg:col-span-7 lg:row-start-2">
          <JourHero d={d} />
        </div>
        <div className="min-w-0 self-center lg:col-span-5 lg:col-start-8 lg:row-span-4 lg:row-start-1" data-leonard="anneau">
          <JourAnneau d={d} />
        </div>
        <div className="min-w-0 lg:col-span-7 lg:row-start-3 lg:mt-9" data-leonard="defi">
          {/* le défi du jour (jouable ou joué) ; sinon où reprendre */}
          {defiEnTete(d.daily) ? (
            <DefiHero daily={d.daily} nowIso={d.nowIso} />
          ) : (
            <ResumeHero resume={d.resume} returning={d.returning} evening={d.dayState === "sec" && d.streak > 0} now={now} />
          )}
          {/* les 5 du jour : le défi éclair, en carte légère sous l'épreuve */}
          {cinqVisible(d.cinq) && <CinqCarte daily={d.cinq} nowIso={d.nowIso} className="mt-4" />}
        </div>
      </section>

      <TodaySection d={d} />
      <ProgressSection d={d} tab={tab} />
    </div>
  );
}
