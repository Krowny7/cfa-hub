import Link from "next/link";
import { Radar, RadarLegend } from "@/components/ui/Radar";
import { SectionTitle } from "@/components/ui/Titles";
import { DefiTile } from "@/components/defi/DefiTile";
import { DuelTile, EXAM_SOON_DAYS, ExamTile, LaunchDuelTile, RaturesTile, ReviewDuelTile } from "@/components/accueil/CompeteCards";
import { RankCard } from "@/components/accueil/RankCard";
import { ProgressTabs } from "@/components/accueil/ProgressTabs";
import { TopicRail } from "@/components/ui/TopicRail";
import { reviserHref, subjectRail } from "@/components/reviser/rail";
import { maitrise, pct, precision, traits, VIDE } from "@/lib/voice";
import { TUILES } from "@/lib/voice-z1";
import type { AccueilData, TopicStat, WeekDay } from "@/components/accueil/types";

// Les deux sections sous le point focal : « Aujourd'hui » (trois tuiles
// calmes au plus, choisies par priorité) et « Ta progression » (le rang,
// puis une carte à trois vues en onglets : les matières en rangée
// horizontale, le radar, la semaine). Le détail vit sur /moi.

const DAY_NAMES = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

/** Trois tuiles au plus. */
export const MAX_TILES = 3;

type Candidate = { key: string; score: number; node: React.ReactNode };

/**
 * Les tuiles de la journée, de la plus pressante à la moins pressante :
 * défi reçu > copie du défi en cours > duel en cours > examen classé
 * imminent > défi du jour à faire > duel à revoir (avec des ratures) >
 * ratures à reprendre > examen classé dans la semaine > défi rendu > duel
 * revu sans rature > page propre > lancer un duel > défi « bientôt ».
 */
export function pickTiles(d: AccueilData): Candidate[] {
  const out: Candidate[] = [];
  if (d.incomingDuel) out.push({ key: "duel", score: d.incomingDuel.kind === "incoming" ? 100 : 90, node: <DuelTile duel={d.incomingDuel} /> });
  if (d.daily) {
    const s = d.daily.status;
    const score = s === "playing" ? 95 : s === "todo" ? 80 : s === "done" ? 40 : 10;
    out.push({ key: "defi", score, node: <DefiTile daily={d.daily} nowIso={d.nowIso} actionEnBas className="h-full" /> });
  }
  if (d.mockExam && d.mockExam.daysLeft <= EXAM_SOON_DAYS) out.push({ key: "exam", score: d.mockExam.daysLeft <= 1 ? 85 : 50, node: <ExamTile exam={d.mockExam} /> });
  if (d.reviewDuel) {
    const r = d.reviewDuel.myScore !== null ? d.reviewDuel.total - d.reviewDuel.myScore : 0;
    out.push({ key: "revue", score: r > 0 ? 60 : 35, node: <ReviewDuelTile duel={d.reviewDuel} nowIso={d.nowIso} /> });
  }
  // « Page propre. » seulement pour qui a déjà joué des quiz de fiches
  if (d.errors.available && (d.errors.total > 0 || (d.errors.answered ?? 1) > 0))
    out.push({ key: "ratures", score: d.errors.total > 0 ? 55 : 20, node: <RaturesTile errors={d.errors} /> });
  if (!d.incomingDuel) out.push({ key: "lancer", score: 15, node: <LaunchDuelTile /> });
  return out.sort((a, b) => b.score - a.score).slice(0, MAX_TILES);
}

export function TodaySection({ d }: { d: AccueilData }) {
  const tiles = pickTiles(d);
  if (tiles.length === 0) return null;
  return (
    <section className="rl-section" aria-labelledby="accueil-today">
      <SectionTitle title={<span id="accueil-today">{TUILES.titre}</span>} />
      <div
        className={
          "grid gap-3 sm:grid-cols-2 sm:gap-4 lg:gap-5 " +
          (tiles.length >= 3 ? "lg:grid-cols-3 sm:[&>*:first-child]:col-span-2 lg:[&>*:first-child]:col-span-1" : "")
        }
      >
        {tiles.map((t) => (
          <div key={t.key} className="min-w-0">
            {t.node}
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProgressSection({ d, tab }: { d: AccueilData; tab?: string }) {
  const measured = d.topics.some((t) => t.pct !== null);
  const masteryMeta = measured ? maitrise(d.mastery) + (d.masteryAvg !== null ? ` · moyenne ${pct(d.masteryAvg)}` : "") : "maîtrise pas encore mesurée";
  const total = d.activity.days.reduce((s, x) => s + x.count, 0);
  const correct = d.activity.days.reduce((s, x) => s + x.correct, 0);
  const weekMeta = total > 0 ? `${traits(total)} · ${precision(Math.round((correct / total) * 100))}` : "cette semaine";

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
      <div className="grid gap-4 md:gap-5 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-4">
          <RankCard rating={d.rating} mastery={d.mastery} />
        </div>
        <div className="min-w-0 lg:col-span-8">
          <ProgressTabs
            initial={tab}
            tabs={[
              { key: "matieres", label: "Matières", meta: masteryMeta, panel: <SubjectRail topics={d.topics} /> },
              { key: "radar", label: "Radar", meta: <RadarLegend />, panel: <RadarPanel topics={d.topics} /> },
              { key: "semaine", label: "Semaine", meta: weekMeta, panel: <WeekBars days={d.activity.days} goal={d.dailyGoal} /> },
            ]}
          />
        </div>
      </div>
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
      <div className="w-full max-w-[560px]">
        <Radar axes={topics.map((t) => ({ label: t.code, me: t.pct, avg: t.avg }))} size={340} title="Tes 10 matières face à la moyenne des joueurs" />
      </div>
      {measured.length === 0 ? (
        <p className="t-small text-center">
          {VIDE.radar}{" "}
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
      <ul className="mx-auto grid h-[170px] w-full max-w-[600px] grid-cols-7 items-end gap-3 sm:gap-5">
        {days.map((x, i) => {
          const h = x.count > 0 ? Math.max(8, Math.round((x.count / max) * 140)) : 4;
          return (
            <li
              key={x.key}
              className="flex h-full flex-col items-center justify-end gap-2"
              aria-label={`${DAY_NAMES[i]} : ${x.future ? "à venir" : traits(x.count)}`}
              title={x.future ? undefined : traits(x.count)}
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
      {empty && <p className="t-small text-center">{VIDE.semaine}</p>}
    </div>
  );
}
