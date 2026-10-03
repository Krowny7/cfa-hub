import Link from "next/link";
import { Clock, Flame, Swords } from "lucide-react";
import { PageHero } from "@/components/ui/Titles";
import { RankCard } from "@/components/accueil/RankCard";
import { ErrorsCard, GoalCard, MobileTiles, PILL, ResumeCard } from "@/components/accueil/HomeCards";
import { BoardCard, DuelCard, MockExamCardView } from "@/components/accueil/CompeteCards";
import { ActivitySection, ProgressSection, StatsSection } from "@/components/accueil/Sections";
import { plural } from "@/components/accueil/format";
import type { AccueilData } from "@/components/accueil/types";

export type { AccueilData } from "@/components/accueil/types";

// Accueil V2 : présentation pure (aucune requête) pour être rendue telle
// quelle par app/dashboard et prévisualisée avec des données d'exemple
// (app/preview-da/accueil). `historySlot` reçoit l'historique des sessions
// (composant client qui lit la base lui-même), absent de l'aperçu.
export function DashboardView({ d, historySlot, now }: { d: AccueilData; historySlot?: React.ReactNode; now?: number }) {
  const title = d.name ? `${d.hello} ${d.name}` : d.hello;

  return (
    <div className="rl-wide flex flex-col gap-8 md:gap-10">
      {/* Héros + rang */}
      <div className="grid items-stretch gap-[18px] lg:grid-cols-12">
        <div className="flex min-w-0 flex-col justify-center lg:col-span-7">
          <PageHero kicker={d.dateLabel} title={title}>
            {d.examDaysLeft !== null && d.examDaysLeft >= 0 ? (
              <span className={PILL} title={d.examDateLabel ?? undefined}>
                <Clock size={14} />
                {d.examDaysLeft === 0 ? "Examen aujourd'hui" : `J-${d.examDaysLeft} avant l'examen`}
              </span>
            ) : (
              <Link href="/settings" className={PILL + " rl-press"}>
                <Clock size={14} />
                Fixer ta date d&apos;examen
              </Link>
            )}
            <span className={PILL}>
              <Flame size={14} />
              {d.streak > 0 ? `${d.streak} ${plural(d.streak, "jour")} d'affilée` : "Ta série commence aujourd'hui"}
            </span>
            {d.incomingDuel && (
              <Link href={`/duel/${d.incomingDuel.id}`} className={PILL + " rl-press"}>
                <Swords size={14} />
                {d.incomingDuel.kind === "active" ? "Duel en cours" : "Duel en attente"}
              </Link>
            )}
          </PageHero>
        </div>
        <div className="min-w-0 lg:col-span-5">
          <RankCard rating={d.rating} mastery={d.mastery} />
        </div>
      </div>

      {/* Reprendre, objectif du jour, puis à revoir · examen blanc · duel · classement */}
      <div className="flex flex-col gap-3 sm:gap-[18px]">
        <div className="grid gap-3 sm:gap-[18px] lg:grid-cols-12">
          <div className="rl-in min-w-0 lg:col-span-7" style={{ animationDelay: ".1s" }}>
            <ResumeCard resume={d.resume} now={now} />
          </div>
          <div className="rl-in hidden min-w-0 sm:block lg:col-span-5" style={{ animationDelay: ".16s" }}>
            <GoalCard answered={d.activity.today} goal={d.dailyGoal} streak={d.streak} />
          </div>
        </div>
        <MobileTiles answered={d.activity.today} goal={d.dailyGoal} errors={d.errors} />

        <div className="grid gap-3 sm:grid-cols-2 sm:gap-[18px] lg:grid-cols-4">
          <div className="rl-in hidden min-w-0 sm:block" style={{ animationDelay: ".22s" }}>
            <ErrorsCard errors={d.errors} />
          </div>
          <div className="rl-in min-w-0" style={{ animationDelay: ".26s" }}>
            <MockExamCardView exam={d.mockExam} />
          </div>
          <div className="rl-in min-w-0" style={{ animationDelay: ".3s" }}>
            <DuelCard incoming={d.incomingDuel} />
          </div>
          <div className="rl-in min-w-0" style={{ animationDelay: ".34s" }}>
            <BoardCard board={d.board} mastery={d.mastery} />
          </div>
        </div>
      </div>

      <StatsSection topics={d.topics} mastery={d.mastery} masteryAvg={d.masteryAvg} />
      <ProgressSection topics={d.topics} mastery={d.mastery} days={d.activity.days} goal={d.dailyGoal} />
      <ActivitySection d={d} historySlot={historySlot} />
    </div>
  );
}
