import Link from "next/link";
import { ArrowRight, CalendarDays, Check, Crosshair, FileStack, ListChecks, Shuffle, Swords, TriangleAlert } from "lucide-react";
import { InkRing } from "@/components/ink/InkRing";
import { DomainSpace } from "@/components/reviser/DomainSpace";
import { FormatCard, ProgramChips } from "@/components/reviser/ReviserView";
import { countdown, durationLabel, hourLabel, longDay } from "@/components/accueil/format";
import type { MockExamCard } from "@/components/accueil/types";
import { PLACEMENT_GAMES } from "@/lib/ranks";
import { DUEL_MINUTES, DUEL_QUESTIONS } from "@/lib/duels";

// Espace « S'entraîner » : même langage que Réviser. Seul (entraînement
// ciblé, QCM par thème, examens officiels), contre les autres (examen blanc
// classé, duel), puis une session ciblée par matière. Sans requête :
// app/entrainement charge les données, l'aperçu en fournit d'exemple.

export type EntrainementData = {
  practice: { sessions: number; last: { score: number; total: number; at: string } | null };
  mockExam: MockExamCard | null;
  rating: { elo: number; gamesPlayed: number };
  incomingDuels: number;
  subjects: { key: string; name: string; pct: number | null }[];
};

const WEAK_BELOW = 50;
const DARK_BTN = "rl-press inline-flex h-10 items-center gap-1.5 rounded-[12px] px-3.5 text-[13.5px]";

function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2.5">
      <h2 className="m-0 text-[24px] font-bold leading-tight tracking-[-0.02em]">{title}</h2>
      {sub && <span className="text-[13px] text-muted">{sub}</span>}
    </div>
  );
}

function MockExamPanel({ exam }: { exam: MockExamCard | null }) {
  const when = exam ? new Date(exam.scheduledAt) : null;
  return (
    <section className="card rl-lift rl-in flex h-full flex-col gap-3.5 p-6" aria-label="Examens blancs" style={{ animationDelay: ".1s" }}>
      <span className="flex items-center justify-between gap-3">
        <span className="grid h-[46px] w-[46px] place-items-center rounded-[13px] bg-surface-2">
          <CalendarDays size={20} />
        </span>
        {exam && <span className="rounded-lg bg-surface-2 px-2 py-1 font-mono text-[12px]">{countdown(exam.daysLeft)}</span>}
      </span>
      <span className="text-[24px] font-extrabold tracking-[-0.025em]">Examens blancs</span>
      <span className="text-[15px] leading-[1.5] opacity-75">
        Sessions programmées et chronométrées, avec le classement partagé entre participants. Ils font bouger ton ELO.
      </span>
      {exam && when ? (
        <div className="rounded-[14px] bg-surface-2 px-4 py-3">
          <div className="text-[15px] font-bold">{longDay(when)}</div>
          <div className="mt-0.5 text-[13px] text-muted">
            {hourLabel(when)} · {exam.questionCount} questions · {durationLabel(exam.durationMinutes)}
            {exam.registrantCount > 0 ? ` · ${exam.registrantCount} inscrit${exam.registrantCount > 1 ? "s" : ""}` : ""}
          </div>
        </div>
      ) : (
        <div className="rounded-[14px] border border-dashed border-line-2 px-4 py-3 text-[13px] text-muted">Aucun examen blanc programmé pour l&apos;instant.</div>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-2.5">
        {exam ? (
          <Link href={`/mock-exams/${exam.id}`} className={"btn rl-press " + (exam.registered ? "btn-secondary" : "btn-primary")}>
            {exam.registered ? "Voir l'examen" : "Je m'inscris"} <ArrowRight size={16} />
          </Link>
        ) : null}
        <Link href="/mock-exams" className={exam ? "ink-link" : "btn btn-secondary rl-press"}>
          Tous les examens{exam ? " →" : ""}
        </Link>
        {exam?.registered && (
          <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-muted">
            <Check size={14} /> Inscrit
          </span>
        )}
      </div>
    </section>
  );
}

function DuelPanel({ rating, incoming }: { rating: EntrainementData["rating"]; incoming: number }) {
  const placement = rating.gamesPlayed < PLACEMENT_GAMES;
  return (
    <section className="card-ink rl-lift rl-in flex h-full flex-col gap-3.5 p-6" aria-label="Duels" style={{ animationDelay: ".16s" }}>
      <span aria-hidden className="pointer-events-none absolute -bottom-12 -right-10 text-[#fff] opacity-[.08]">
        <InkRing size={220} />
      </span>
      <span className="relative flex items-center justify-between gap-3">
        <span className="grid h-[46px] w-[46px] place-items-center rounded-[13px] bg-[rgba(255,255,255,.12)]">
          <Swords size={20} />
        </span>
        <span className="font-mono text-[12px] text-[rgba(255,255,255,.6)]">
          {placement ? `placement ${rating.gamesPlayed}/${PLACEMENT_GAMES}` : `${rating.elo} ELO`}
        </span>
      </span>
      <span className="relative text-[24px] font-extrabold tracking-[-0.025em]">Duels</span>
      <span className="relative text-[15px] leading-[1.5] text-[rgba(255,255,255,.75)]">
        {DUEL_QUESTIONS} questions type examen CFA I en {DUEL_MINUTES} min, les mêmes pour vous deux. Meilleur score gagne ; à égalité, le plus rapide. ±ELO selon l&apos;écart de niveau.
      </span>
      {incoming > 0 && (
        <span className="relative text-[13px] font-semibold">
          {incoming} défi{incoming > 1 ? "s" : ""} en attente
        </span>
      )}
      <span className="relative mt-auto flex flex-wrap gap-2">
        <Link href="/duel" className={DARK_BTN + " bg-[#fff] font-bold text-[#111]"}>
          <Shuffle size={15} /> Au hasard
        </Link>
        <Link href="/duel" className={DARK_BTN + " border border-[rgba(255,255,255,.25)] font-[650] text-[#fff]"}>
          {incoming > 0 ? "Voir les défis" : "Défier…"}
        </Link>
      </span>
    </section>
  );
}

export function EntrainementView({ d }: { d: EntrainementData }) {
  const last = d.practice.last;
  const practiceMeta =
    d.practice.sessions > 0
      ? `${d.practice.sessions} session${d.practice.sessions > 1 ? "s" : ""}${last && last.total > 0 ? ` · dernière ${Math.round((last.score / last.total) * 100)} %` : ""}`
      : null;

  return (
    <div className="rl-wide flex flex-col gap-8 md:gap-10">
      <DomainSpace kicker="S'entraîner" title="Pratiquer, comme le jour J">
        <div className="-mt-2 flex flex-col gap-8 md:-mt-4 md:gap-10">
          <ProgramChips />

          <section className="flex flex-col gap-4" aria-label="Seul, à ton rythme">
            <SectionHead title="Seul, à ton rythme" sub="pondéré comme l'examen, corrigé tout de suite" />
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-[18px]">
              <FormatCard
                href="/practice"
                icon={<Crosshair size={20} />}
                title="Entraînement ciblé"
                desc="Choisis tes matières : le nombre de questions suit le poids réel de l'examen, pour viser tes lacunes."
                meta={practiceMeta}
              />
              <FormatCard
                href="/qcm"
                icon={<ListChecks size={20} />}
                title="QCM par thème"
                desc="Toutes les banques de questions, classées par matière du programme."
                delay={0.06}
              />
              <FormatCard
                href="/official-exams"
                icon={<FileStack size={20} />}
                title="Examens officiels"
                desc="Les sessions officielles rejouées question par question, en entier ou une matière à la fois."
                delay={0.12}
              />
            </div>
          </section>

          <section className="flex flex-col gap-4" aria-label="Contre les autres">
            <SectionHead title="Contre les autres" sub="ce qui fait bouger ton rang" />
            <div className="grid gap-[18px] md:grid-cols-2">
              <MockExamPanel exam={d.mockExam} />
              <DuelPanel rating={d.rating} incoming={d.incomingDuels} />
            </div>
          </section>

          <section className="rl-rv flex flex-col gap-4" aria-label="Session ciblée par matière">
            <SectionHead title="Une session par matière" sub="ta maîtrise · un clic pour une session ciblée" />
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(220px,100%),1fr))] gap-3">
              {d.subjects.map((s, i) => (
                <Link
                  key={s.key}
                  href={`/practice?topic=${s.key}`}
                  className={
                    "rl-lift rl-in flex flex-col gap-3 rounded-2xl p-4 " +
                    (s.pct === null ? "border-[1.5px] border-dashed border-line-2" : "card")
                  }
                  style={{ animationDelay: `${i * 0.03}s` }}
                >
                  <span className="flex justify-between gap-2">
                    <span className="flex items-start gap-1.5 text-[15px] font-bold leading-tight">
                      {s.name}
                      {s.pct !== null && s.pct < WEAK_BELOW && (
                        <span className="mt-0.5" title="point faible" aria-label="point faible">
                          <TriangleAlert size={13} />
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-[12px] text-muted tabular-nums">{s.pct === null ? "—" : `${s.pct}%`}</span>
                  </span>
                  {s.pct === null ? (
                    <span className="text-[12px] text-muted">pas commencé</span>
                  ) : (
                    <span className="ink-bar block h-1.5" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={s.pct} aria-label={`Maîtrise ${s.name}`}>
                      <span className="rl-grow" style={{ width: `${s.pct}%`, animationDelay: `${0.4 + i * 0.04}s` }} />
                    </span>
                  )}
                  <span className="mt-auto inline-flex items-center gap-1.5 text-[13px] font-[650]">
                    Session ciblée <ArrowRight size={14} />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </DomainSpace>
    </div>
  );
}
