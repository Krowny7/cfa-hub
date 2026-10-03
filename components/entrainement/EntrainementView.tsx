import Link from "next/link";
import { ArrowRight, CalendarDays, Check, ChevronRight, Crosshair, FileStack, ListChecks, Shuffle, Swords, TriangleAlert } from "lucide-react";
import { InkProgressRing } from "@/components/ui/InkRings";
import { DomainSpace } from "@/components/reviser/DomainSpace";
import { FormatRow } from "@/components/reviser/ReviserView";
import { MasteryLine, TwoColumnRows } from "@/components/reviser/SubjectRows";
import { subjectByKey } from "@/components/reviser/catalog";
import { agoLabel, countdown, durationLabel, hourLabel, longDay } from "@/components/accueil/format";
import type { MockExamCard } from "@/components/accueil/types";
import { PLACEMENT_GAMES } from "@/lib/ranks";
import { DUEL_MINUTES, DUEL_QUESTIONS } from "@/lib/duels";

// Espace « S'entraîner », même langage que Réviser. Un seul choix mis en
// avant (la matière la plus faible, sinon reprendre l'entraînement ciblé) ;
// à côté, les autres façons de s'entraîner seul ; puis, plus calmes, ce qui
// fait bouger le rang (examen blanc, duel) et une session par matière.
// Sans requête : app/entrainement charge les données, l'aperçu en fournit.

export type EntrainementData = {
  practice: { sessions: number; last: { score: number; total: number; at: string; topics?: string[] } | null };
  mockExam: MockExamCard | null;
  rating: { elo: number; gamesPlayed: number };
  incomingDuels: number;
  subjects: { key: string; name: string; pct: number | null }[];
};

const WEAK_BELOW = 50;
const pctOf = (score: number, total: number) => (total > 0 ? Math.round((score / total) * 100) : null);

function topicsLabel(keys: string[] | undefined) {
  if (!keys || keys.length === 0) return null;
  const first = subjectByKey(keys[0])?.name ?? keys[0];
  return keys.length > 1 ? `${first} + ${keys.length - 1}` : first;
}

/** Le point focal : la session à lancer maintenant. */
function FocusSession({ d, now }: { d: EntrainementData; now?: number }) {
  const measured = d.subjects.filter((s) => s.pct !== null) as { key: string; name: string; pct: number }[];
  const weakest = measured.length ? measured.reduce((a, b) => (b.pct < a.pct ? b : a)) : null;
  const last = d.practice.last;
  const lastPct = last ? pctOf(last.score, last.total) : null;
  const lastLine = last
    ? `Dernière session${topicsLabel(last.topics) ? ` · ${topicsLabel(last.topics)}` : ""}${lastPct !== null ? ` · ${lastPct} %` : ""} · ${agoLabel(last.at, now)}`
    : null;

  const focus = weakest
    ? {
        kicker: "Ta prochaine session",
        title: weakest.name,
        text: "Ta matière la plus faible : une session ciblée, pondérée comme l'examen.",
        href: `/practice?topic=${weakest.key}`,
        cta: "Lancer la session",
        ring: { pct: weakest.pct, label: "maîtrise" },
      }
    : last
      ? {
          kicker: `Reprendre · dernière session ${agoLabel(last.at, now)}`,
          title: topicsLabel(last.topics) ?? "Entraînement ciblé",
          text: "Enchaîne avec une nouvelle série, pondérée comme l'examen.",
          href: last.topics?.length === 1 ? `/practice?topic=${last.topics[0]}` : "/practice",
          cta: "Nouvelle session",
          ring: lastPct !== null ? { pct: lastPct, label: "dernière" } : null,
        }
      : {
          kicker: "Pour commencer",
          title: "Ta première session",
          text: "Choisis tes matières : le nombre de questions suit le poids réel de l'examen.",
          href: "/practice",
          cta: "Commencer",
          ring: null,
        };

  return (
    <section className="card-hero rl-in flex min-h-[260px] flex-col gap-4 p-6 md:p-8 lg:col-span-7" aria-label="Session conseillée">
      {focus.ring && (
        <div className="absolute right-4 top-4 md:right-8 md:top-8" title={`${focus.ring.pct} % · ${focus.ring.label}`}>
          <span className="block sm:hidden">
            <InkProgressRing pct={focus.ring.pct} size={80}>
              <span className="t-num text-[13px]">{focus.ring.pct}%</span>
            </InkProgressRing>
          </span>
          <span className="hidden sm:block">
            <InkProgressRing pct={focus.ring.pct} size={124}>
              <span className="flex flex-col items-center gap-0.5">
                <span className="t-num text-[20px]">{focus.ring.pct}%</span>
                <span className="t-micro">{focus.ring.label}</span>
              </span>
            </InkProgressRing>
          </span>
        </div>
      )}
      <div className={"flex min-w-0 flex-col gap-2 " + (focus.ring ? "pr-24 sm:pr-36" : "")}>
        <p className="t-eyebrow">{focus.kicker}</p>
        <h2 className="t-h1 m-0 [overflow-wrap:anywhere]">{focus.title}</h2>
      </div>
      <p className="t-body max-w-[440px] text-muted">{focus.text}</p>
      <div className="mt-auto flex flex-col gap-3 pt-2">
        <Link href={focus.href} className="btn btn-primary rl-press w-fit">
          {focus.cta} <ArrowRight size={16} aria-hidden />
        </Link>
        {weakest && lastLine && <p className="t-micro">{lastLine}</p>}
      </div>
    </section>
  );
}

function TileHead({ icon, title, right }: { icon: React.ReactNode; title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-surface">{icon}</span>
      <h3 className="m-0 flex-1 text-[16px] font-bold tracking-[-0.01em]">{title}</h3>
      {right}
    </div>
  );
}

function MockExamTile({ exam }: { exam: MockExamCard | null }) {
  const when = exam ? new Date(exam.scheduledAt) : null;
  return (
    <section className="card-quiet flex flex-col gap-3 p-6" aria-label="Examen blanc">
      <TileHead
        icon={<CalendarDays size={17} />}
        title="Examen blanc"
        right={exam && <span className="t-micro rounded-lg bg-surface px-2 py-1 font-mono font-semibold">{countdown(exam.daysLeft)}</span>}
      />
      {exam && when ? (
        <>
          <p className="t-small">
            {longDay(when)} · {hourLabel(when)} · {exam.questionCount} questions · {durationLabel(exam.durationMinutes)}
          </p>
          <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
            <Link href={`/mock-exams/${exam.id}`} className="btn btn-secondary rl-press min-h-[38px] px-3.5 text-[13.5px]">
              {exam.registered ? "Voir l'examen" : "Je m'inscris"} <ArrowRight size={15} aria-hidden />
            </Link>
            {exam.registered ? (
              <span className="t-micro inline-flex items-center gap-1 font-semibold">
                <Check size={13} aria-hidden /> Inscrit{exam.registrantCount > 1 ? ` · ${exam.registrantCount} participants` : ""}
              </span>
            ) : (
              exam.registrantCount > 0 && <span className="t-micro">{exam.registrantCount} inscrit{exam.registrantCount > 1 ? "s" : ""}</span>
            )}
            <Link href="/mock-exams" className="ink-link ml-auto">
              Tous les examens
            </Link>
          </div>
        </>
      ) : (
        <>
          <p className="t-small">Aucun examen blanc programmé pour l&apos;instant.</p>
          <Link href="/mock-exams" className="ink-link mt-auto w-fit">
            Tous les examens
          </Link>
        </>
      )}
    </section>
  );
}

function DuelTile({ rating, incoming }: { rating: EntrainementData["rating"]; incoming: number }) {
  const placement = rating.gamesPlayed < PLACEMENT_GAMES;
  return (
    <section className="card-quiet flex flex-col gap-3 p-6" aria-label="Duel">
      <TileHead
        icon={<Swords size={17} />}
        title="Duel"
        right={<span className="t-micro font-mono">{placement ? `placement ${rating.gamesPlayed}/${PLACEMENT_GAMES}` : `${rating.elo} ELO`}</span>}
      />
      <p className="t-small">
        {DUEL_QUESTIONS} questions en {DUEL_MINUTES} min, les mêmes pour vous deux. Le meilleur score gagne.
      </p>
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
        <Link href="/duel" className="btn btn-secondary rl-press min-h-[38px] px-3.5 text-[13.5px]">
          <Shuffle size={15} aria-hidden /> Au hasard
        </Link>
        <Link href="/duel" className="ink-link">
          {incoming > 0 ? `${incoming} défi${incoming > 1 ? "s" : ""} en attente` : "Défier quelqu'un"}
        </Link>
      </div>
    </section>
  );
}

export function EntrainementView({ d, now }: { d: EntrainementData; now?: number }) {
  const practiceMeta = d.practice.sessions > 0 ? `${d.practice.sessions} session${d.practice.sessions > 1 ? "s" : ""}` : null;

  const lead = (
    <div className="grid gap-4 md:gap-[18px] lg:grid-cols-12">
      <FocusSession d={d} now={now} />
      <nav aria-label="S'entraîner seul" className="card rl-in flex flex-col justify-center divide-y divide-line overflow-hidden py-1 lg:col-span-5" style={{ animationDelay: ".08s" }}>
        <FormatRow href="/practice" icon={<Crosshair size={18} />} title="Entraînement ciblé" desc="Tes matières, au poids réel de l'examen." meta={practiceMeta} />
        <FormatRow href="/qcm" icon={<ListChecks size={18} />} title="QCM par thème" desc="Toutes les banques, classées par matière." />
        <FormatRow href="/official-exams" icon={<FileStack size={18} />} title="Examens officiels" desc="Les sessions officielles, rejouées question par question." />
      </nav>
    </div>
  );

  return (
    <DomainSpace kicker="S'entraîner" title="Pratiquer, comme le jour J" lead={lead}>
      <section className="rl-section" aria-labelledby="ent-contre">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="ent-contre" className="t-h2 m-0">
            Contre les autres
          </h2>
          <span className="t-micro">ce qui fait bouger ton rang</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 md:gap-[18px]">
          <MockExamTile exam={d.mockExam} />
          <DuelTile rating={d.rating} incoming={d.incomingDuels} />
        </div>
      </section>

      <section className="rl-section" aria-labelledby="ent-matieres">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="ent-matieres" className="t-h2 m-0">
            Une session par matière
          </h2>
          <span className="t-micro">ta maîtrise · un clic pour une session ciblée</span>
        </div>
        <div className="card px-3 py-1.5 md:px-4">
          <TwoColumnRows
            items={d.subjects}
            keyOf={(s) => s.key}
            render={(s, i) => (
              <Link href={`/practice?topic=${s.key}`} className="rl-row group -mx-1 flex items-center gap-4 rounded-[14px] px-3 py-3.5" aria-label={`Session ciblée : ${s.name}`}>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-1.5 text-[15px] font-semibold leading-tight">
                      <span className="truncate">{s.name}</span>
                      {s.pct !== null && s.pct < WEAK_BELOW && <TriangleAlert size={13} className="shrink-0 text-muted" aria-label="point faible" />}
                    </span>
                    <span className="t-micro shrink-0 font-mono tabular-nums">{s.pct === null ? "—" : `${s.pct} %`}</span>
                  </span>
                  <span className="mt-2.5 block">
                    <MasteryLine pct={s.pct} label={`Maîtrise ${s.name}`} delay={0.3 + i * 0.03} />
                  </span>
                </span>
                <ChevronRight size={16} aria-hidden className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}
          />
        </div>
      </section>
    </DomainSpace>
  );
}
