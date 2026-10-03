import Link from "next/link";
import { PageHero } from "@/components/ui/Titles";
import { RankCard } from "@/components/accueil/RankCard";
import { ResumeHero } from "@/components/accueil/HomeCards";
import { ProgressSection, TodaySection } from "@/components/accueil/Sections";
import { plural } from "@/components/accueil/format";
import type { AccueilData } from "@/components/accueil/types";

export type { AccueilData } from "@/components/accueil/types";

// Accueil : présentation pure (aucune requête), rendue par app/dashboard et
// prévisualisée avec des données d'exemple (app/preview-da/accueil).
// Trois niveaux de lecture : le point focal (titre, rang, prochaine action),
// puis « Aujourd'hui » (trois tuiles), puis « Ta progression » (une carte à
// onglets). Le reste vit sur /classement et /moi.
export function DashboardView({ d, now, tab }: { d: AccueilData; now?: number; tab?: string }) {
  const title = d.name ? `${d.hello} ${d.name}` : d.hello;

  return (
    <div className="rl-wide rl-page">
      <div className="flex flex-col gap-6 md:gap-8">
        <div className="grid items-center gap-6 lg:grid-cols-12 lg:gap-10">
          <div className="min-w-0 lg:col-span-7">
            <PageHero kicker={d.dateLabel} title={title}>
              <ContextLine d={d} />
            </PageHero>
          </div>
          <div className="min-w-0 lg:col-span-5">
            <RankCard rating={d.rating} mastery={d.mastery} />
          </div>
        </div>
        <ResumeHero resume={d.resume} now={now} />
      </div>

      <TodaySection d={d} />
      <ProgressSection d={d} tab={tab} />
    </div>
  );
}

/** Une ligne de contexte sous le titre : « J-212 · série de 6 jours ». */
function ContextLine({ d }: { d: AccueilData }) {
  const exam =
    d.examDaysLeft !== null && d.examDaysLeft > 0 ? (
      <span title={d.examDateLabel ?? undefined}>J-{d.examDaysLeft}</span>
    ) : d.examDaysLeft === 0 ? (
      <span>Examen aujourd&apos;hui</span>
    ) : (
      <Link href="/moi?onglet=reglages" className="font-semibold text-white underline-offset-2 hover:underline">
        Fixe ta date d&apos;examen
      </Link>
    );
  const streak = d.streak > 0 ? `série de ${d.streak} ${plural(d.streak, "jour")}` : "ta série commence aujourd'hui";
  return (
    <p className="t-small">
      {exam} · {streak}
    </p>
  );
}
