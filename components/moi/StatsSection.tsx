import Link from "next/link";
import { Activity, BarChart3, TriangleAlert } from "lucide-react";
import { Radar, RadarLegend } from "@/components/ui/Radar";
import { CardLabel, SectionTitle } from "@/components/ui/Titles";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { fmtInt } from "@/components/classement/format";
import { CURRENT_DOMAIN, CURRENT_PROGRAM } from "@/lib/domains";
import type { MoiData } from "@/components/moi/types";

/** Radar des 10 matières (toi contre la moyenne) et carte d'activité. */
export function StatsSection({ d }: { d: MoiData }) {
  const axes = d.topics.map((t) => ({ label: t.short, me: t.pct, avg: t.avg }));
  const known = d.topics.filter((t) => t.pct !== null).sort((a, b) => (b.pct as number) - (a.pct as number));
  const top = known.slice(0, Math.min(3, Math.floor(known.length / 2) || known.length));
  const low = known.length >= 2 ? known.slice(-Math.min(3, Math.floor(known.length / 2))).reverse() : [];

  return (
    <section className="flex flex-col gap-5" aria-label="Tes stats">
      <SectionTitle title="Tes stats" sub="toi face à la moyenne des joueurs" />
      <div className="grid gap-[18px] lg:grid-cols-12">
        <div className="card rl-rv flex min-w-0 flex-col gap-4 p-[22px] lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardLabel icon={<BarChart3 size={15} aria-hidden />}>
              {CURRENT_DOMAIN.name} · {CURRENT_PROGRAM.name}
            </CardLabel>
            <RadarLegend />
          </div>
          <Radar axes={axes} size={340} title="Ta précision par matière, face à la moyenne des joueurs" />
          {known.length === 0 ? (
            <p className="note text-center text-[13px]">
              Ton tracé apparaît dès 5 questions répondues dans une matière, en session d&apos;entraînement sur un seul thème.{" "}
              <Link href="/entrainement" className="ink-link">
                S&apos;entraîner
              </Link>
            </p>
          ) : (
            <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 text-[13px]">
              <span>
                <b>Forces :</b> <span className="text-muted">{top.map((t) => t.label).join(", ")}</span>
              </span>
              {low.length > 0 && (
                <span>
                  <b>À travailler :</b> <span className="text-muted">{low.map((t) => t.label).join(", ")}</span>
                </span>
              )}
            </div>
          )}
        </div>

        <div className="card rl-rv flex min-w-0 flex-col gap-5 p-[22px] lg:col-span-5">
          <CardLabel icon={<Activity size={15} aria-hidden />} right={<span className="font-mono text-[12px] tabular-nums">{fmtInt(d.xpWeek)} XP cette semaine</span>}>
            Activité · 5 semaines
          </CardLabel>
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="rl-count font-brand text-[52px] leading-none" style={{ "--rl-to": Math.max(0, d.streak) } as React.CSSProperties} aria-label={`${d.streak}`} />
                <span className="text-[14px] font-semibold text-muted">jour{d.streak > 1 ? "s" : ""} d&apos;affilée</span>
              </div>
              <p className="mt-1 max-w-[220px] text-[12.5px] text-muted">
                {d.streak > 0 ? "Une question par jour suffit à garder la série." : "Réponds à une question aujourd'hui pour lancer une série."}
              </p>
            </div>
            <ActivityHeatmap days={d.xpDays} />
          </div>
          <div className="mt-auto">
            <div className="mb-2 flex items-baseline justify-between text-[13px]">
              <span className="font-semibold">Niveau {d.level}</span>
              <span className="font-mono text-[12px] tabular-nums text-muted">encore {fmtInt(d.xpToNextLevel)} XP</span>
            </div>
            <div className="ink-bar" role="progressbar" aria-valuenow={d.levelPct} aria-valuemin={0} aria-valuemax={100} aria-label={`Niveau ${d.level}, ${d.levelPct} %`}>
              <span className="rl-grow" style={{ width: `${d.levelPct}%` }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Progression matière par matière (barres d'encre). */
export function ProgressSection({ d }: { d: MoiData }) {
  const program = d.me.mastery;
  return (
    <section className="flex flex-col gap-5" aria-label="Ta progression">
      <SectionTitle title="Ta progression" sub={`${CURRENT_DOMAIN.name} · ${CURRENT_PROGRAM.name}`} />
      <div className="card rl-rv flex flex-col gap-4 p-[22px]">
        <CardLabel icon={<BarChart3 size={15} aria-hidden />} right={<span className="whitespace-nowrap text-[13px]" title="Maîtrise du programme : moyenne des 10 matières">maîtrise {program} %</span>}>
          Tes 10 matières
        </CardLabel>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {d.topics.map((t, i) => {
            const weak = t.pct !== null && t.pct < 50;
            if (t.pct === null) {
              return (
                <li key={t.key} className="flex flex-col gap-2 rounded-[14px] border border-dashed border-line-2 p-3.5">
                  <span className="text-[14px] font-semibold">{t.label}</span>
                  <span className="text-[12.5px] text-muted">
                    {t.answered > 0 ? `${t.answered} question${t.answered > 1 ? "s" : ""} — encore un peu pour mesurer` : "pas commencé"}
                  </span>
                </li>
              );
            }
            return (
              <li key={t.key} className="flex flex-col gap-2.5 rounded-[14px] border border-line bg-surface p-3.5">
                <span className="flex items-start justify-between gap-2">
                  <span className="text-[14px] font-semibold leading-snug">{t.label}</span>
                  {weak && <TriangleAlert size={14} className="mt-0.5 shrink-0 text-muted" aria-label="à renforcer" />}
                </span>
                <span className="flex items-center gap-3">
                  <span className="ink-bar flex-1" role="progressbar" aria-valuenow={t.pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${t.label} : ${t.pct} %`}>
                    <span className="rl-grow" style={{ width: `${t.pct}%`, animationDelay: `${0.05 * i}s` }} />
                  </span>
                  <span className="w-[38px] text-right font-mono text-[12.5px] font-semibold tabular-nums">{t.pct}%</span>
                </span>
                <span className="text-[12px] text-muted">
                  {t.answered} questions{t.avg !== null ? ` · moyenne des joueurs ${t.avg} %` : ""}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
