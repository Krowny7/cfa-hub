import Link from "next/link";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { PracticeHistory } from "@/components/PracticeHistory";
import { InkBar } from "@/components/ink/InkBar";
import { TopicMap, TopicMapLegend, type TopicMastery } from "@/components/TopicMap";

export type DashboardData = {
  greeting: string;
  kicker: string;
  streak: number;
  elo: number;
  gamesPlayed: number;
  level: number;
  levelPct: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  xpToNextLevel: number;
  xpTotal: number;
  examLabel: string | null;
  examDateLabel: string | null;
  globalAccuracy: number | null;
  topics: TopicMastery[];
  weakTopics: { key: string; label: string; pct: number }[];
  xpDays: { day: string; xp: number }[];
};

// Accueil « encre » : présentation pure (aucune requête) pour pouvoir être
// rendue telle quelle par la page et prévisualisée avec des données d'exemple.
export function DashboardView({ d }: { d: DashboardData }) {
  const explored = d.topics.filter((t) => t.pct !== null);
  const held = explored.filter((t) => (t.pct ?? 0) >= 70).length;
  const xp30 = d.xpDays.reduce((s, x) => s + (Number(x.xp) || 0), 0);
  const activeDays = d.xpDays.filter((x) => Number(x.xp) > 0).length;

  return (
    <div className="grid gap-7 md:ml-[calc((100%-min(1120px,calc(100vw-19rem)))/2)] md:w-[min(1120px,calc(100vw-19rem))]">
      {/* En-tête */}
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <div className="kicker mb-2">{d.kicker}</div>
          <h1 className="font-display text-[34px] leading-[1.05] md:text-[42px]">{d.greeting}</h1>
          <p className="note rl-deco mt-2 -rotate-1 text-white/75">
            {d.streak > 0 ? `${d.streak} jour${d.streak > 1 ? "s" : ""} d'affilée !` : "la série commence aujourd'hui."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link href="/entrainement" className="btn btn-primary px-6 py-3 text-[15px]">
            Continuer l&apos;entraînement
          </Link>
          <Link href="/library" className="ink-link">
            la bibliothèque →
          </Link>
        </div>
      </header>

      <div className="grid gap-7 lg:grid-cols-12">
        {/* La carte */}
        <section className="card grid content-start gap-4 p-5 md:p-6 lg:col-span-7" aria-label="Carte des matières">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="panel-label">La carte · CFA niveau I</span>
            <span className="note text-white/70">
              {explored.length === 0 ? "une session par matière pour révéler la carte" : `${held}/10 matières tenues`}
            </span>
          </div>
          <TopicMap topics={d.topics} />
          <TopicMapLegend />
        </section>

        <div className="grid content-start gap-7 lg:col-span-5">
          {/* Rang */}
          <section className="card grid gap-4 p-5" aria-label="Rang">
            <span className="panel-label w-fit">Ton rang</span>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="font-display text-[58px] leading-none tabular-nums">{d.elo}</div>
                <div className="mt-1.5 text-xs font-bold text-muted">
                  ELO · {d.gamesPlayed} partie{d.gamesPlayed > 1 ? "s" : ""} classée{d.gamesPlayed > 1 ? "s" : ""}
                </div>
              </div>
              <Link href="/people" className="ink-link text-[1.15rem]">
                le classement →
              </Link>
            </div>
            <div className="grid gap-1.5 border-t-2 border-white pt-3">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-black">Niveau {d.level}</span>
                <span className="text-muted tabular-nums">
                  {d.xpIntoLevel}/{d.xpForNextLevel} XP
                </span>
              </div>
              <InkBar value={d.levelPct} label="Progression du niveau" />
              <div className="text-xs text-muted">
                {d.xpToNextLevel} XP avant le niveau {d.level + 1} · {d.xpTotal} XP au total
              </div>
            </div>
          </section>

          {/* Examen + précision */}
          <section className="card grid grid-cols-2 divide-x-2 divide-white" aria-label="Examen et précision">
            <div className="p-5">
              <div className="kicker">Examen</div>
              <div className="font-display mt-2 text-[36px] leading-none">{d.examLabel ?? "—"}</div>
              <div className="mt-1.5 text-xs text-muted">
                {d.examDateLabel ?? (
                  <Link href="/settings" className="underline underline-offset-2">
                    fixer la date
                  </Link>
                )}
              </div>
            </div>
            <div className="p-5">
              <div className="kicker">Précision</div>
              <div className="font-display mt-2 text-[36px] leading-none tabular-nums">
                {d.globalAccuracy !== null ? `${d.globalAccuracy}%` : "—"}
              </div>
              <div className="mt-1.5 text-xs text-muted">sur toutes tes sessions</div>
            </div>
          </section>
        </div>
      </div>

      <div className="grid gap-7 lg:grid-cols-12">
        {/* À travailler */}
        <section className="card grid content-start gap-4 p-5 lg:col-span-5" aria-label="À travailler">
          <span className="panel-label w-fit">À travailler</span>
          {d.weakTopics.length === 0 ? (
            <p className="note text-white/70">pas encore assez de sessions sur une seule matière pour repérer tes points faibles.</p>
          ) : (
            <>
              <div className="grid gap-3">
                {d.weakTopics.map((t) => (
                  <div key={t.key}>
                    <div className="mb-0.5 flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-bold">{t.label}</span>
                      <span className={"font-display tabular-nums " + (t.pct < 70 ? "text-red-500" : "")}>{t.pct}%</span>
                    </div>
                    <InkBar value={t.pct} pen={t.pct < 70} label={t.label} />
                  </div>
                ))}
              </div>
              <Link href={`/practice?topic=${d.weakTopics[0].key}`} className="ink-link w-fit text-[1.15rem]">
                s&apos;entraîner sur {d.weakTopics[0].label} →
              </Link>
            </>
          )}
        </section>

        {/* Activité */}
        <section className="card grid gap-4 p-5 lg:col-span-7" aria-label="Activité">
          <span className="panel-label w-fit">Activité · 5 semaines</span>
          <div className="flex flex-wrap items-start gap-x-10 gap-y-4">
            <ActivityHeatmap days={d.xpDays} />
            <dl className="grid gap-3">
              <div>
                <dt className="kicker">Série</dt>
                <dd className="font-display mt-1 text-[28px] leading-none">{d.streak > 0 ? `${d.streak} j` : "—"}</dd>
              </div>
              <div>
                <dt className="kicker">XP sur 30 jours</dt>
                <dd className="font-display mt-1 text-[28px] leading-none tabular-nums">{xp30}</dd>
              </div>
              <div>
                <dt className="kicker">Jours actifs</dt>
                <dd className="font-display mt-1 text-[28px] leading-none tabular-nums">{activeDays}/30</dd>
              </div>
            </dl>
          </div>
        </section>
      </div>

      <PracticeHistory />
    </div>
  );
}
