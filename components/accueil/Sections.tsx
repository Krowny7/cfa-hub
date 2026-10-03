import Link from "next/link";
import { BarChart3, CalendarClock, Clock, Globe2, Sparkles, TriangleAlert } from "lucide-react";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { Radar, RadarLegend } from "@/components/ui/Radar";
import { CardLabel, SectionTitle } from "@/components/ui/Titles";
import { DomainStats } from "@/components/accueil/DomainStats";
import { DOMAINS } from "@/lib/domains";
import type { AccueilData, TopicStat, WeekDay } from "@/components/accueil/types";

// Sections du bas de l'accueil : stats (radars), progression (10 matières +
// semaine), activité (niveau, XP, régularité — repris de l'ancien tableau de
// bord). Sans état, sauf les onglets du radar par domaine.

const WEAK_BELOW = 50;
const DAY_NAMES = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export function StatsSection({ topics, mastery, masteryAvg }: { topics: TopicStat[]; mastery: number; masteryAvg: number | null }) {
  const anyMeasured = topics.some((t) => t.pct !== null);
  const axes = DOMAINS.map((d) =>
    d.ready ? { label: d.name, me: anyMeasured ? mastery : null, avg: masteryAvg } : { label: d.name, me: null, avg: null, soon: true },
  );
  return (
    <section className="rl-rv flex flex-col gap-4" aria-label="Tes stats">
      <SectionTitle title="Tes stats" sub="toi face à la moyenne des joueurs" />
      <div className="grid gap-[18px] lg:grid-cols-12">
        <section className="card rl-lift flex min-w-0 flex-col gap-4 p-[22px] lg:col-span-5" aria-label="Tous les domaines">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <CardLabel icon={<Globe2 size={15} />}>Tous les domaines</CardLabel>
            <RadarLegend />
          </div>
          <div className="flex flex-1 items-center">
            <Radar axes={axes} size={300} title="Ta maîtrise par domaine face à la moyenne des joueurs" />
          </div>
          <p className="text-[12.5px] text-muted">Aperçu : chaque domaine s&apos;allume quand il ouvre, avec son propre rang.</p>
        </section>
        <div className="min-w-0 lg:col-span-7">
          <DomainStats topics={topics} />
        </div>
      </div>
    </section>
  );
}

function WeekChart({ days, goal }: { days: WeekDay[]; goal: number }) {
  const total = days.reduce((s, d) => s + d.count, 0);
  const correct = days.reduce((s, d) => s + d.correct, 0);
  const acc = total > 0 ? Math.round((correct / total) * 100) : null;
  const max = Math.max(goal, ...days.map((d) => d.count));
  return (
    <section className="card rl-lift flex h-full flex-col gap-4 p-[22px]" aria-label="Ta semaine">
      <CardLabel icon={<Clock size={15} />} right={<span className="font-mono text-[12px]">{total} questions{acc !== null ? ` · ${acc} %` : ""}</span>}>
        Ta semaine
      </CardLabel>
      <ul className="grid h-[150px] grid-cols-7 items-end gap-2.5">
        {days.map((d, i) => {
          const h = d.count > 0 ? Math.max(8, Math.round((d.count / max) * 120)) : 4;
          return (
            <li
              key={d.key}
              className="flex h-full flex-col items-center justify-end gap-1.5"
              aria-label={`${DAY_NAMES[i]} : ${d.future ? "à venir" : `${d.count} question${d.count > 1 ? "s" : ""}`}`}
              title={d.future ? undefined : `${d.count} question${d.count > 1 ? "s" : ""}`}
            >
              {d.future ? (
                <span className="block h-1 w-full max-w-[34px] rounded-[9px] border border-dashed border-line-2" />
              ) : (
                <span
                  className={"rl-barup block w-full max-w-[34px] rounded-[9px] " + (d.isToday ? "bg-white" : "bg-surface-2")}
                  style={{ height: h, animationDelay: `${0.3 + i * 0.05}s` }}
                />
              )}
              <span className={"text-[12px] font-semibold " + (d.isToday ? "text-white" : "text-muted")}>{d.label}</span>
            </li>
          );
        })}
      </ul>
      {total === 0 && <p className="text-[12.5px] text-muted">Pas encore de question cette semaine.</p>}
    </section>
  );
}

export function ProgressSection({ topics, mastery, days, goal }: { topics: TopicStat[]; mastery: number; days: WeekDay[]; goal: number }) {
  return (
    <section className="rl-rv flex flex-col gap-4" aria-label="Ta progression">
      <SectionTitle title="Ta progression" sub="Finance · CFA Niveau I" />
      <div className="grid gap-[18px] lg:grid-cols-12">
        <section className="card rl-lift flex min-w-0 flex-col gap-4 p-[22px] lg:col-span-8" aria-label="Tes 10 matières">
          <CardLabel icon={<BarChart3 size={15} />} right={<span className="text-[13px]">maîtrise moyenne {mastery} %</span>}>
            Finance · CFA Niveau I — tes 10 matières
          </CardLabel>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(190px,100%),1fr))] gap-2.5">
            {topics.map((t, i) =>
              t.pct === null ? (
                <Link
                  key={t.key}
                  href={`/practice?topic=${t.key}`}
                  className="rl-lift flex flex-col gap-2.5 rounded-[14px] border-[1.5px] border-dashed border-line-2 p-3.5"
                >
                  <span className="text-[13.5px] font-[650] leading-tight">{t.name}</span>
                  <span className="text-[12px] text-muted">pas commencé</span>
                </Link>
              ) : (
                <Link key={t.key} href={`/practice?topic=${t.key}`} className="rl-lift flex flex-col gap-2.5 rounded-[14px] border border-line bg-surface p-3.5">
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-[13.5px] font-[650] leading-tight">{t.name}</span>
                    {t.pct < WEAK_BELOW && (
                      <span title="point faible" aria-label="point faible">
                        <TriangleAlert size={14} />
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="ink-bar block h-1.5 flex-1" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={t.pct} aria-label={t.name}>
                      <span className="rl-grow" style={{ width: `${t.pct}%`, animationDelay: `${0.4 + i * 0.05}s` }} />
                    </span>
                    <span className="font-mono text-[12px] font-semibold tabular-nums">{t.pct}%</span>
                  </span>
                </Link>
              ),
            )}
          </div>
        </section>
        <div className="min-w-0 lg:col-span-4">
          <WeekChart days={days} goal={goal} />
        </div>
      </div>
    </section>
  );
}

export function ActivitySection({ d, historySlot }: { d: AccueilData; historySlot?: React.ReactNode }) {
  const xp30 = d.xpDays.reduce((s, x) => s + (Number(x.xp) || 0), 0);
  const activeDays = d.xpDays.filter((x) => Number(x.xp) > 0).length;
  return (
    <section className="rl-rv flex flex-col gap-4" aria-label="Ton activité">
      <SectionTitle title="Ton activité" sub="niveau, XP et régularité" />
      <div className="grid gap-[18px] lg:grid-cols-12">
        <section className="card rl-lift flex min-w-0 flex-col gap-4 p-[22px] lg:col-span-5" aria-label="Niveau">
          <CardLabel icon={<Sparkles size={15} />} right={<span className="font-mono text-[12px]">{d.level.xpTotal} XP au total</span>}>
            Niveau
          </CardLabel>
          <div className="flex items-baseline gap-2.5">
            <span className="font-brand text-[52px] leading-none">{d.level.level}</span>
            <span className="text-[15px] text-muted">
              {d.level.into}/{d.level.forNext} XP
            </span>
          </div>
          <div className="ink-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={d.level.pct} aria-label="Progression du niveau">
            <span className="rl-grow" style={{ width: `${d.level.pct}%`, animationDelay: ".4s" }} />
          </div>
          <p className="text-[13px] text-muted">
            {d.level.toNext} XP avant le niveau {d.level.level + 1}.
          </p>
          <dl className="mt-auto grid grid-cols-2 gap-3 border-t border-line pt-4">
            <div>
              <dt className="kicker">Précision</dt>
              <dd className="font-brand mt-1 text-[26px] leading-none tabular-nums">{d.globalAccuracy !== null ? `${d.globalAccuracy}%` : "—"}</dd>
              <dd className="mt-1 text-[12px] text-muted">sur toutes tes sessions</dd>
            </div>
            <div>
              <dt className="kicker">Examen</dt>
              <dd className="font-brand mt-1 text-[26px] leading-none">
                {d.examDaysLeft === null ? "—" : d.examDaysLeft > 0 ? `J-${d.examDaysLeft}` : d.examDaysLeft === 0 ? "Jour J" : "Passé"}
              </dd>
              <dd className="mt-1 text-[12px] text-muted">
                {d.examDateLabel ?? (
                  <Link href="/settings" className="underline underline-offset-2">
                    fixer la date
                  </Link>
                )}
              </dd>
            </div>
          </dl>
        </section>
        <section className="card rl-lift flex min-w-0 flex-col gap-4 p-[22px] lg:col-span-7" aria-label="Activité sur 5 semaines">
          <CardLabel icon={<CalendarClock size={15} />}>Activité · 5 semaines</CardLabel>
          <div className="flex flex-wrap items-start gap-x-10 gap-y-4">
            <ActivityHeatmap days={d.xpDays} />
            <dl className="grid gap-3">
              <div>
                <dt className="kicker">Série</dt>
                <dd className="font-brand mt-1 text-[26px] leading-none">{d.streak > 0 ? `${d.streak} j` : "—"}</dd>
              </div>
              <div>
                <dt className="kicker">XP sur 30 jours</dt>
                <dd className="font-brand mt-1 text-[26px] leading-none tabular-nums">{xp30}</dd>
              </div>
              <div>
                <dt className="kicker">Jours actifs</dt>
                <dd className="font-brand mt-1 text-[26px] leading-none tabular-nums">{activeDays}/30</dd>
              </div>
            </dl>
          </div>
        </section>
      </div>
      {historySlot}
    </section>
  );
}
