import { PageHero } from "@/components/ui/Titles";
import { CURRENT_DOMAIN } from "@/lib/domains";
import { PLACEMENT_GAMES, rankFor } from "@/lib/ranks";
import { RankHero } from "@/components/classement/RankHero";
import { EloCard } from "@/components/classement/EloCard";
import { TierTrack } from "@/components/classement/TierTrack";
import { Leaderboard } from "@/components/classement/Leaderboard";
import { NextExamCard } from "@/components/classement/NextExamCard";
import { DuelsCard } from "@/components/classement/DuelsCard";
import { DomainRanks, DomainTabs, HowItWorks } from "@/components/classement/Domains";
import type { ClassementData } from "@/components/classement/types";

// Espace « Classement » (V2) : rang et courbe d'ELO, piste des paliers,
// classement général, prochain examen classé, duels, rangs par domaine.
// Composant de présentation : toutes les données arrivent en props (page
// serveur ou page d'aperçu).
export function ClassementView({ data }: { data: ClassementData }) {
  const { me } = data;
  const rank = rankFor(me.elo, me.mastery, me.leaderboardRank);
  const placement = me.gamesPlayed < PLACEMENT_GAMES;

  return (
    <div className="rl-wide flex flex-col gap-10">
      <PageHero kicker="Classement" title={`Ton rang en ${CURRENT_DOMAIN.name}`}>
        <DomainTabs />
      </PageHero>

      <div className="grid gap-[18px] lg:grid-cols-12">
        <div className="rl-in min-w-0 lg:col-span-7">
          <RankHero me={me} />
        </div>
        <div className="rl-in min-w-0 lg:col-span-5" style={{ animationDelay: ".1s" }}>
          <EloCard history={data.history} elo={me.elo} tint={rank.tier.metal[1]} />
        </div>
      </div>

      <TierTrack current={rank.tierIndex} mastery={me.mastery} placement={placement} />

      <div className="grid gap-[18px] lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7">
          <Leaderboard board={data.board} meRow={data.meRow} totalPlayers={me.totalPlayers} />
        </div>
        <div className="flex min-w-0 flex-col gap-[18px] lg:col-span-5">
          <NextExamCard exam={data.exam} />
          <DuelsCard open={data.openDuels} recent={data.recentDuels} />
          <DomainRanks me={me} />
          <HowItWorks />
        </div>
      </div>
    </div>
  );
}
