import Link from "next/link";
import { Radar, RadarLegend } from "@/components/ui/Radar";
import { SectionTitle } from "@/components/ui/Titles";
import { ErrorsTile, GoalTile } from "@/components/accueil/HomeCards";
import { ContextTile } from "@/components/accueil/CompeteCards";
import { ProgressTabs } from "@/components/accueil/ProgressTabs";
import { TopicRail } from "@/components/ui/TopicRail";
import { reviserHref, subjectRail } from "@/components/reviser/rail";
import type { AccueilData, TopicStat, WeekDay } from "@/components/accueil/types";

// Les deux sections sous le point focal : « Aujourd'hui » (trois tuiles
// calmes) et « Ta progression » (une carte, trois vues en onglets : les
// matières en rangée horizontale, le radar, la semaine). Le détail (radar
// complet, activité, niveau, erreurs) vit sur /moi.

const DAY_NAMES = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export function TodaySection({ d }: { d: AccueilData }) {
  return (
    <section className="rl-section" aria-labelledby="accueil-today">
      <SectionTitle title={<span id="accueil-today">Aujourd&apos;hui</span>} />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 lg:gap-5">
        <GoalTile answered={d.activity.today} goal={d.dailyGoal} />
        <ErrorsTile errors={d.errors} />
        <div className="col-span-2 min-w-0 lg:col-span-1">
          <ContextTile duel={d.incomingDuel} exam={d.mockExam} />
        </div>
      </div>
    </section>
  );
}

export function ProgressSection({ d, tab }: { d: AccueilData; tab?: string }) {
  const measured = d.topics.some((t) => t.pct !== null);
  const masteryMeta = measured ? `maîtrise ${d.mastery} %${d.masteryAvg !== null ? ` · moyenne ${d.masteryAvg} %` : ""}` : "maîtrise pas encore mesurée";
  const total = d.activity.days.reduce((s, x) => s + x.count, 0);
  const correct = d.activity.days.reduce((s, x) => s + x.correct, 0);
  const weekMeta = total > 0 ? `${total} ${total > 1 ? "questions" : "question"} · ${Math.round((correct / total) * 100)} % de réussite` : "cette semaine";

  return (
    <section className="rl-section" aria-labelledby="accueil-progress">
      <SectionTitle
        title={<span id="accueil-progress">Ta progression</span>}
        action={
          <Link href="/moi?onglet=stats" className="t-small font-semibold hover:text-white">
            Toutes tes stats →
          </Link>
        }
      />
      <ProgressTabs
        initial={tab}
        tabs={[
          { key: "matieres", label: "Matières", meta: masteryMeta, panel: <SubjectRail topics={d.topics} /> },
          { key: "radar", label: "Radar", meta: <RadarLegend />, panel: <RadarPanel topics={d.topics} /> },
          { key: "semaine", label: "Semaine", meta: weekMeta, panel: <WeekBars days={d.activity.days} goal={d.dailyGoal} /> },
        ]}
      />
    </section>
  );
}

/** Les 10 matières en rangée horizontale : ta maîtrise, la moyenne des joueurs ; une carte ouvre la matière dans Réviser. */
function SubjectRail({ topics }: { topics: TopicStat[] }) {
  return (
    <TopicRail
      label="Ta progression par matière"
      actionLabel="Ouvrir la matière"
      surface="quiet"
      bleed="card"
      items={subjectRail(topics, (key) => {
        const avg = topics.find((t) => t.key === key)?.avg ?? null;
        return { href: reviserHref(key), note: avg !== null ? `moyenne ${avg} %` : null, mark: avg };
      })}
    />
  );
}

/** Radar des 10 matières, toi contre la moyenne des joueurs (domaine ouvert : Finance). */
function RadarPanel({ topics }: { topics: TopicStat[] }) {
  const measured = topics.filter((t) => t.pct !== null).sort((a, b) => (a.pct as number) - (b.pct as number));
  const weak = measured.length >= 2 ? measured.slice(0, Math.min(3, Math.floor(measured.length / 2))) : [];
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-full max-w-[600px]">
        <Radar axes={topics.map((t) => ({ label: t.code, me: t.pct, avg: t.avg }))} size={360} title="Tes 10 matières face à la moyenne des joueurs" />
      </div>
      {measured.length === 0 ? (
        <p className="t-small text-center">
          Ton tracé apparaît dès 5 questions dans une matière.{" "}
          <Link href="/practice" className="font-semibold text-white underline underline-offset-2">
            S&apos;entraîner
          </Link>
        </p>
      ) : (
        weak.length > 0 && (
          <p className="t-small text-center">
            À travailler :{" "}
            {weak.map((t, i) => (
              <span key={t.key}>
                {i > 0 && " · "}
                <Link href={`/practice?topic=${t.key}`} className="font-semibold text-white underline-offset-2 hover:underline">
                  {t.name}
                </Link>
              </span>
            ))}
          </p>
        )
      )}
    </div>
  );
}

/** La semaine en cours, lundi → dimanche ; aujourd'hui en encre pleine. */
function WeekBars({ days, goal }: { days: WeekDay[]; goal: number }) {
  const max = Math.max(goal, ...days.map((x) => x.count));
  const empty = days.every((x) => x.count === 0);
  return (
    <div className="flex flex-col gap-4">
      <ul className="mx-auto grid h-[170px] w-full max-w-[640px] grid-cols-7 items-end gap-3 sm:gap-5">
        {days.map((x, i) => {
          const h = x.count > 0 ? Math.max(8, Math.round((x.count / max) * 140)) : 4;
          return (
            <li
              key={x.key}
              className="flex h-full flex-col items-center justify-end gap-2"
              aria-label={`${DAY_NAMES[i]} : ${x.future ? "à venir" : `${x.count} question${x.count > 1 ? "s" : ""}`}`}
              title={x.future ? undefined : `${x.count} question${x.count > 1 ? "s" : ""}`}
            >
              {x.future ? (
                <span className="block h-1 w-full max-w-[40px] rounded-[9px] border border-dashed border-line-2" />
              ) : (
                <span className={"rl-barup block w-full max-w-[40px] rounded-[9px] " + (x.isToday ? "bg-white" : "bg-surface-2")} style={{ height: h, animationDelay: `${0.2 + i * 0.04}s` }} />
              )}
              <span className={"text-[12px] font-semibold " + (x.isToday ? "text-white" : "text-muted")}>{x.label}</span>
            </li>
          );
        })}
      </ul>
      {empty && <p className="t-small text-center">Pas encore de question cette semaine.</p>}
    </div>
  );
}
