import { PageHero } from "@/components/ui/Titles";
import { CURRENT_DOMAIN } from "@/lib/domains";
import { PLACEMENT_GAMES, rankFor } from "@/lib/ranks";
import { RankHero } from "@/components/classement/RankHero";
import { TierTrack } from "@/components/classement/TierTrack";
import { Leaderboard } from "@/components/classement/Leaderboard";
import { DuelsPanel } from "@/components/classement/DuelsPanel";
import { ExamsPanel, examTag } from "@/components/classement/ExamsPanel";
import { ClassementTabs, type TabKey } from "@/components/classement/ClassementTabs";
import { Disclosure } from "@/components/classement/Disclosure";
import { DomainPills, HowItWorks } from "@/components/classement/Domains";
import type { ClassementData } from "@/components/classement/types";

export const CLASSEMENT_TABS: TabKey[] = ["classement", "duels", "examens"];

// Espace « Classement » (V3, « moins dense ») : un héros (rang, ELO, courbe,
// lancer un duel), puis trois onglets — Classement, Duels, Examens classés —
// et, repliés en bas, les 8 rangs et les règles. Composant de présentation :
// toutes les données arrivent en props (page serveur ou page d'aperçu).
export function ClassementView({ data, tab = "classement" }: { data: ClassementData; tab?: TabKey }) {
  const { me } = data;
  const rank = rankFor(me.elo, me.mastery, me.leaderboardRank);
  const placement = me.gamesPlayed < PLACEMENT_GAMES;
  const incoming = data.openDuels.filter((d) => d.incoming && d.status === "pending").length;

  return (
    <div className="rl-wide rl-page">
      <div className="flex flex-col gap-8 md:gap-10">
        <PageHero kicker="Classement" title={`Ton rang en ${CURRENT_DOMAIN.name}`}>
          <DomainPills me={me} />
        </PageHero>
        <RankHero me={me} history={data.history} />
      </div>

      <ClassementTabs
        initial={tab}
        tabs={[
          { key: "classement", label: "Classement", panel: <Leaderboard board={data.board} meRow={data.meRow} totalPlayers={me.totalPlayers} /> },
          {
            key: "duels",
            label: "Duels",
            badge: incoming > 0 ? `${incoming} défi${incoming > 1 ? "s" : ""}` : null,
            panel: <DuelsPanel open={data.openDuels} recent={data.recentDuels} />,
          },
          {
            key: "examens",
            label: "Examens classés",
            short: "Examens",
            badge: examTag(data.exam),
            panel: <ExamsPanel exam={data.exam} past={data.pastExams} />,
          },
        ]}
      />

      <div>
        <Disclosure title="Les 8 rangs" hint={placement ? "ton rang s'affiche après le placement" : `tu es ${rank.tier.name}${rank.division ? " " + rank.division : ""}`}>
          <TierTrack current={rank.tierIndex} mastery={me.mastery} placement={placement} />
        </Disclosure>
        <Disclosure title="Comment ça marche" hint="ELO, maîtrise, placement">
          <HowItWorks />
        </Disclosure>
      </div>
    </div>
  );
}
