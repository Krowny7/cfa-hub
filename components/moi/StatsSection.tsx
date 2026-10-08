import Link from "next/link";
import { Activity, BarChart3 } from "lucide-react";
import { Radar, RadarLegend } from "@/components/ui/Radar";
import { CardLabel } from "@/components/ui/Titles";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { TopicRail } from "@/components/ui/TopicRail";
import { reviserHref, subjectRail } from "@/components/reviser/rail";
import { subjectByKey } from "@/components/reviser/catalog";
import { ViewSwitch } from "@/components/moi/ViewSwitch";
import { SessionHistory } from "@/components/moi/SessionHistory";
import { AnswerStatsCard } from "@/components/moi/AnswerStatsCard";
import { TrajectoirePanel } from "@/components/objectif/TrajectoirePanel";
import { fmtInt } from "@/components/classement/format";
import { CURRENT_PROGRAM } from "@/lib/domains";
import { tallyOf } from "@/lib/answer-stats";
import { Batons } from "@/components/adn/Batons";
import { LEXIQUE, VIDE, serie } from "@/lib/voice";
import { MOI } from "@/lib/voice-z1";
import type { MoiData } from "@/components/moi/types";
import { PointsFaiblesCarte, type RepliMatiere } from "@/components/moi/PointsFaibles";

/** La matière la plus fragile (maîtrise mesurée), pour le repli de « Tes points faibles ». */
function matiereFragile(d: MoiData): RepliMatiere {
  const mesurees = d.topics.filter((t) => t.pct !== null);
  if (!mesurees.length) return null;
  const t = mesurees.reduce((a, b) => ((b.pct as number) < (a.pct as number) ? b : a));
  return { nom: subjectByKey(t.key)?.name ?? t.label, href: `/practice?topic=${t.key}` };
}

/** Les matières en rangée horizontale et, en second, le radar (toi contre la moyenne). */
function SubjectsCard({ d }: { d: MoiData }) {
  const axes = d.topics.map((t) => ({ label: t.short, nom: t.label, me: t.pct, avg: t.avg }));
  const known = d.topics.filter((t) => t.pct !== null).sort((a, b) => (b.pct as number) - (a.pct as number));
  const top = known.slice(0, Math.min(3, Math.floor(known.length / 2) || known.length));
  const low = known.length >= 2 ? known.slice(-Math.min(3, Math.floor(known.length / 2))).reverse() : [];

  const nameOf = (key: string) => subjectByKey(key)?.name ?? key;

  // Radar à gauche, lecture à droite : forces, matières à travailler (liens vers Réviser).
  const radar = (
    <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_280px] md:gap-10">
      <Radar axes={axes} size={320} title="Ta précision par matière, face à la moyenne des joueurs" />
      <div className="flex min-w-0 flex-col gap-5 border-t border-line pt-5 md:border-l md:border-t-0 md:py-2 md:pl-8 md:pt-2">
        {known.length === 0 ? (
          <p className="t-small">
            {VIDE.radar}{" "}
            <Link href="/entrainement" className="ink-link">
              S&apos;entraîner
            </Link>
          </p>
        ) : (
          <>
            <div>
              <p className="t-eyebrow">Forces</p>
              <p className="t-small mt-1.5">{top.map((t) => nameOf(t.key)).join(" · ")}</p>
            </div>
            {low.length > 0 && (
              <div>
                <p className="t-eyebrow">À travailler</p>
                <p className="t-small mt-1.5">
                  {low.map((t, i) => (
                    <span key={t.key}>
                      {i > 0 && " · "}
                      <Link href={reviserHref(t.key)} className="font-semibold text-white underline-offset-2 hover:underline">
                        {nameOf(t.key)}
                      </Link>
                    </span>
                  ))}
                </p>
              </div>
            )}
          </>
        )}
        <RadarLegend />
      </div>
    </div>
  );

  // Les 10 matières en rangée horizontale : ta maîtrise, le volume de
  // questions (toutes sources, comme « Traits tracés » plus haut), la moyenne
  // des joueurs ; une carte ouvre la matière dans Réviser.
  const answered = (key: string) => {
    const a = d.answers.subjects.find((x) => x.key === key);
    return a ? tallyOf(a.by).n : d.topics.find((x) => x.key === key)?.answered ?? 0;
  };
  const rail = (
    <TopicRail
      label="Tes stats par matière"
      actionLabel="Ouvrir la matière"
      surface="quiet"
      bleed="-mx-6 px-6 scroll-px-6 md:-mx-7 md:px-7 md:scroll-px-7"
      items={subjectRail(d.topics, (key) => {
        const t = d.topics.find((x) => x.key === key);
        if (!t) return { href: reviserHref(key) };
        const n = answered(key);
        const parts = [n > 0 ? `${fmtInt(n)} question${n > 1 ? "s" : ""}` : null, t.avg !== null ? `moy. ${t.avg} %` : null].filter(Boolean);
        return { href: reviserHref(key), note: t.pct === null && n === 0 ? null : parts.join(" · ") || null, mark: t.avg };
      })}
    />
  );

  return (
    <section className="card flex min-w-0 flex-col gap-5 p-6 md:p-7" aria-label="Tes matières">
      <ViewSwitch
        label="Vue des matières"
        title={
          <CardLabel icon={<BarChart3 size={15} aria-hidden />}>
            {CURRENT_PROGRAM.name} · maîtrise {d.me.mastery} %
          </CardLabel>
        }
        views={[
          { key: "matieres", label: "Matières", node: rail },
          { key: "radar", label: "Radar", node: radar },
        ]}
      />
    </section>
  );
}

/** Série, carte des 5 semaines, niveau et quelques repères chiffrés (une bande). La précision vit dans « Traits tracés ». */
function ActivityCard({ d }: { d: MoiData }) {
  const facts: { label: string; value: string }[] = [
    { label: "Semaine", value: `${fmtInt(d.xpWeek)} XP` },
    { label: "30 jours", value: `${fmtInt(d.xp30)} XP` },
    { label: "Jours actifs", value: `${d.activeDays30}/30` },
  ];
  return (
    <section className="card flex min-w-0 flex-col gap-5 p-6 md:p-7" aria-label="Activité">
      <CardLabel icon={<Activity size={15} aria-hidden />} right={<span className="t-micro">5 semaines</span>}>
        Activité
      </CardLabel>

      <div className="grid items-center gap-x-10 gap-y-6 md:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(180px,1fr)_auto_minmax(0,1.6fr)]">
        {/* la série en jours d'encre : le chiffre, et les bâtons au pinceau (le bâton du jour fait, en attente, ou sec le soir) */}
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="t-num rl-count text-[56px]" style={{ "--rl-to": Math.max(0, d.streak) } as React.CSSProperties} aria-label={`${d.streak}`} />
            <span className="t-small font-semibold">{d.streak > 1 ? LEXIQUE.joursEncre : LEXIQUE.jourEncre}</span>
          </div>
          <div className="mt-3">
            <Batons jours={d.streak} jour={d.dayState} height={28} max={4} />
          </div>
          <p className={"t-micro mt-2 max-w-[240px] " + (d.dayState === "sec" ? "font-semibold text-white" : "")}>{d.dayState === "fait" || d.streak === 0 ? MOI.serieAide(d.streak) : serie(d.streak, d.dayState).ligne}</p>
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
          <dl className="m-0 grid grid-cols-3 gap-x-4 gap-y-4">
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

/**
 * Onglet Stats : « Tes points faibles » en tête, puis quatre bandes pleine largeur — les questions répondues
 * (total, filtre par source, détail matière → thème → passage), l'activité,
 * les matières (rangée horizontale ou radar), les dernières sessions.
 */
export function StatsTab({ d }: { d: MoiData }) {
  return (
    <div className="grid gap-4 md:gap-[18px]">
      {d.pointsFaibles && <PointsFaiblesCarte d={d.pointsFaibles} repli={matiereFragile(d)} />}
      <TrajectoirePanel e={d.objectif} />
      <AnswerStatsCard stats={d.answers} />
      <ActivityCard d={d} />
      <SubjectsCard d={d} />
      <SessionHistory sessions={d.sessions} />
    </div>
  );
}
