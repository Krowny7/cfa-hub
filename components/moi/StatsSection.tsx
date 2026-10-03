import Link from "next/link";
import { Activity, BarChart3, TriangleAlert } from "lucide-react";
import { Radar, RadarLegend } from "@/components/ui/Radar";
import { CardLabel } from "@/components/ui/Titles";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { MasteryLine, TwoColumnRows } from "@/components/reviser/SubjectRows";
import { ViewSwitch } from "@/components/moi/ViewSwitch";
import { SessionHistory } from "@/components/moi/SessionHistory";
import { fmtInt } from "@/components/classement/format";
import { CURRENT_PROGRAM } from "@/lib/domains";
import type { MoiData } from "@/components/moi/types";

const WEAK_BELOW = 50;

/** Radar (toi contre la moyenne) et, en second, le détail matière par matière. */
function SubjectsCard({ d }: { d: MoiData }) {
  const axes = d.topics.map((t) => ({ label: t.short, me: t.pct, avg: t.avg }));
  const known = d.topics.filter((t) => t.pct !== null).sort((a, b) => (b.pct as number) - (a.pct as number));
  const top = known.slice(0, Math.min(3, Math.floor(known.length / 2) || known.length));
  const low = known.length >= 2 ? known.slice(-Math.min(3, Math.floor(known.length / 2))).reverse() : [];

  const radar = (
    <div className="flex flex-col gap-4">
      <Radar axes={axes} size={320} title="Ta précision par matière, face à la moyenne des joueurs" />
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-t border-line pt-4">
        {known.length === 0 ? (
          <p className="t-small min-w-0 flex-[1_1_260px]">
            Ton tracé apparaît dès 5 questions répondues dans une matière.{" "}
            <Link href="/entrainement" className="ink-link">
              S&apos;entraîner
            </Link>
          </p>
        ) : (
          <div className="t-small flex min-w-0 flex-[1_1_300px] flex-col gap-1">
            <span>
              <b className="font-semibold text-white">Forces</b> · {top.map((t) => t.label).join(", ")}
            </span>
            {low.length > 0 && (
              <span>
                <b className="font-semibold text-white">À travailler</b> · {low.map((t) => t.label).join(", ")}
              </span>
            )}
          </div>
        )}
        <RadarLegend />
      </div>
    </div>
  );

  const list = (
    <TwoColumnRows
      items={d.topics}
      keyOf={(t) => t.key}
      render={(t, i) => (
        <div className="flex flex-col gap-2 py-3">
          <span className="flex items-baseline justify-between gap-3">
            <span className="flex min-w-0 items-center gap-1.5 text-[14px] font-semibold leading-snug">
              <span className="truncate">{t.label}</span>
              {t.pct !== null && t.pct < WEAK_BELOW && <TriangleAlert size={13} className="shrink-0 text-muted" aria-label="à renforcer" />}
            </span>
            <span className="t-micro shrink-0 font-mono font-semibold tabular-nums">{t.pct === null ? "—" : `${t.pct} %`}</span>
          </span>
          <MasteryLine pct={t.pct} label={t.label} delay={0.05 * i} />
          <span className="t-micro">
            {t.pct === null
              ? t.answered > 0
                ? `${t.answered} question${t.answered > 1 ? "s" : ""} : encore un peu pour mesurer`
                : "pas commencé"
              : `${t.answered} questions${t.avg !== null ? ` · moyenne ${t.avg} %` : ""}`}
          </span>
        </div>
      )}
    />
  );

  return (
    <section className="card flex min-w-0 flex-col gap-5 p-6 md:p-7 lg:col-span-7" aria-label="Tes matières">
      <ViewSwitch
        label="Vue des matières"
        title={
          <CardLabel icon={<BarChart3 size={15} aria-hidden />}>
            {CURRENT_PROGRAM.name} · maîtrise {d.me.mastery} %
          </CardLabel>
        }
        views={[
          { key: "radar", label: "Radar", node: radar },
          { key: "detail", label: "Détail", node: list },
        ]}
      />
    </section>
  );
}

/** Série, carte des 5 semaines, niveau et quelques repères chiffrés (une bande). */
function ActivityCard({ d }: { d: MoiData }) {
  const facts: { label: string; value: string }[] = [
    { label: "Cette semaine", value: `${fmtInt(d.xpWeek)} XP` },
    { label: "30 jours", value: `${fmtInt(d.xp30)} XP` },
    { label: "Jours actifs", value: `${d.activeDays30}/30` },
    { label: "Précision", value: d.accuracy === null ? "—" : `${d.accuracy} %` },
  ];
  return (
    <section className="card flex min-w-0 flex-col gap-5 p-6 md:p-7 lg:col-span-12" aria-label="Activité">
      <CardLabel icon={<Activity size={15} aria-hidden />} right={<span className="t-micro">5 semaines</span>}>
        Activité
      </CardLabel>

      <div className="grid items-center gap-x-10 gap-y-6 md:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(180px,1fr)_auto_minmax(0,1.6fr)]">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="t-num rl-count text-[56px]" style={{ "--rl-to": Math.max(0, d.streak) } as React.CSSProperties} aria-label={`${d.streak}`} />
            <span className="t-small font-semibold">jour{d.streak > 1 ? "s" : ""} d&apos;affilée</span>
          </div>
          <p className="t-micro mt-2 max-w-[220px]">{d.streak > 0 ? "Une question par jour suffit à garder la série." : "Réponds à une question aujourd'hui pour lancer ta série."}</p>
        </div>

        <ActivityHeatmap days={d.xpDays} />

        <div className="flex min-w-0 flex-col gap-5 border-t border-line pt-5 md:col-span-2 lg:col-span-1 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
          <div>
            <div className="mb-2.5 flex items-baseline justify-between gap-3">
              <span className="text-[14px] font-semibold">Niveau {d.level}</span>
              <span className="t-micro font-mono tabular-nums">
                {fmtInt(d.xpTotal)} XP · encore {fmtInt(d.xpToNextLevel)}
              </span>
            </div>
            <div className="ink-bar h-1.5" role="progressbar" aria-valuenow={d.levelPct} aria-valuemin={0} aria-valuemax={100} aria-label={`Niveau ${d.level}, ${d.levelPct} %`}>
              <span className="rl-grow" style={{ width: `${d.levelPct}%` }} />
            </div>
          </div>
          <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
            {facts.map((f) => (
              <div key={f.label} className="min-w-0">
                <dt className="t-eyebrow">{f.label}</dt>
                <dd className="m-0 mt-1 whitespace-nowrap text-[16px] font-bold tracking-[-0.01em] tabular-nums">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

/** Onglet Stats : l'activité en bande, puis les matières et les dernières sessions. */
export function StatsTab({ d }: { d: MoiData }) {
  return (
    <div className="grid gap-4 md:gap-[18px] lg:grid-cols-12">
      <ActivityCard d={d} />
      <SubjectsCard d={d} />
      <div className="min-w-0 lg:col-span-5">
        <SessionHistory sessions={d.sessions} />
      </div>
    </div>
  );
}
