import Link from "next/link";
import { ArrowRight, CalendarDays, Check, Shuffle, Swords, Trophy } from "lucide-react";
import { InkRing } from "@/components/ink/InkRing";
import { RankBadge } from "@/components/ui/RankBadge";
import { CardLabel } from "@/components/ui/Titles";
import { rankFor } from "@/lib/ranks";
import { DUEL_QUESTIONS } from "@/lib/duels";
import { countdown, durationLabel, hourLabel, longDay } from "@/components/accueil/format";
import type { AccueilData, BoardRow, MockExamCard } from "@/components/accueil/types";

// Cartes « compétition » de l'accueil : prochain examen blanc classé, duel,
// mini classement. Sans état.

export function MockExamCardView({ exam }: { exam: MockExamCard | null }) {
  if (!exam) {
    return (
      <section className="card rl-lift flex h-full flex-col gap-4 p-[22px]" aria-label="Examen blanc classé">
        <CardLabel icon={<CalendarDays size={15} />}>Examen blanc classé</CardLabel>
        <div>
          <div className="text-[20px] font-extrabold tracking-[-.02em]">Pas encore programmé</div>
          <p className="mt-1 text-[13.5px] leading-[1.45] text-muted">Le prochain examen blanc s&apos;affichera ici, avec les inscrits et le compte à rebours.</p>
        </div>
        <div className="mt-auto">
          <Link href="/mock-exams" className="btn btn-secondary rl-press">
            Voir les examens <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    );
  }

  const when = new Date(exam.scheduledAt);
  const shown = exam.registrants.slice(0, 4);
  const more = Math.max(0, exam.registrantCount - shown.length);
  const cta = exam.open && exam.daysLeft <= 0 ? (exam.registered ? "Passer l'examen" : "Je m'inscris") : exam.registered ? "Voir l'examen" : "Je m'inscris";

  return (
    <section className="card rl-lift flex h-full flex-col gap-4 p-[22px]" aria-label="Examen blanc classé">
      <CardLabel icon={<CalendarDays size={15} />}>Examen blanc classé</CardLabel>
      <div>
        <div className="text-[20px] font-extrabold tracking-[-.02em]">{longDay(when)}</div>
        <div className="mt-0.5 text-[13.5px] text-muted">
          {hourLabel(when)} · {exam.questionCount} questions · {durationLabel(exam.durationMinutes)}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {exam.registrantCount > 0 ? (
          <div className="flex items-center" aria-label={`${exam.registrantCount} inscrit${exam.registrantCount > 1 ? "s" : ""}`}>
            {shown.map((ini, i) => (
              <span
                key={i}
                aria-hidden
                className={"grid h-7 w-7 place-items-center rounded-full border-2 border-surface bg-surface-2 text-[10px] font-bold " + (i ? "-ml-2" : "")}
              >
                {ini}
              </span>
            ))}
            {more > 0 && <span className="ml-2 text-[13px] text-muted">+{more}</span>}
          </div>
        ) : (
          <span className="text-[13px] text-muted">Sois le premier inscrit</span>
        )}
        <span className="rounded-lg bg-surface-2 px-2 py-1 font-mono text-[12px]">{countdown(exam.daysLeft)}</span>
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-2">
        <Link href={`/mock-exams/${exam.id}`} className={"btn rl-press " + (exam.registered && !(exam.open && exam.daysLeft <= 0) ? "btn-secondary" : "btn-primary")}>
          {cta} <ArrowRight size={16} />
        </Link>
        {exam.registered && (
          <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-muted">
            <Check size={14} /> Inscrit
          </span>
        )}
      </div>
    </section>
  );
}

const DARK_BTN = "rl-press inline-flex h-10 items-center gap-1.5 rounded-[12px] px-3.5 text-[13.5px]";

export function DuelCard({ incoming }: { incoming: AccueilData["incomingDuel"] }) {
  return (
    <section className="card-ink rl-lift flex h-full flex-col gap-4 p-6" aria-label="Duel">
      <span aria-hidden className="pointer-events-none absolute -bottom-10 -right-[30px] text-[#fff] opacity-[.08]">
        <InkRing size={170} />
      </span>
      <div className="relative flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[13px] font-semibold text-[rgba(255,255,255,.7)]">
          <Swords size={15} /> Duel
        </span>
        <span className="font-mono text-[11px] text-[rgba(255,255,255,.6)]">{DUEL_QUESTIONS} questions</span>
      </div>
      {incoming ? (
        <>
          <div className="relative text-[20px] font-extrabold leading-[1.2] tracking-[-.02em]">
            {incoming.kind === "active" ? `Duel en cours${incoming.from ? ` contre ${incoming.from}` : ""}` : `${incoming.from ?? "Un joueur"} te défie`}
          </div>
          <div className="relative text-[13px] leading-[1.45] text-[rgba(255,255,255,.65)]">
            Mêmes questions, format examen CFA I. Le meilleur score gagne ; à égalité, le plus rapide.
          </div>
          <div className="relative mt-auto flex flex-wrap gap-2">
            <Link href={`/duel/${incoming.id}`} className={DARK_BTN + " bg-[#fff] font-bold text-[#111]"}>
              {incoming.kind === "active" ? "Voir le duel" : "Relever le défi"} <ArrowRight size={15} />
            </Link>
          </div>
        </>
      ) : (
        <>
          <div className="relative text-[20px] font-extrabold leading-[1.2] tracking-[-.02em]">
            Affronte quelqu&apos;un,
            <br />
            comme aux échecs
          </div>
          <div className="relative text-[13px] leading-[1.45] text-[rgba(255,255,255,.65)]">
            Format examen CFA I. Meilleur score gagne : ±ELO selon l&apos;écart de niveau.
          </div>
          <div className="relative mt-auto flex flex-wrap gap-2">
            <Link href="/duel" className={DARK_BTN + " bg-[#fff] font-bold text-[#111]"}>
              <Shuffle size={15} /> Au hasard
            </Link>
            <Link href="/duel" className={DARK_BTN + " border border-[rgba(255,255,255,.25)] font-[650] text-[#fff]"}>
              Défier…
            </Link>
          </div>
        </>
      )}
    </section>
  );
}

export function BoardCard({ board, mastery }: { board: BoardRow[]; mastery: number }) {
  return (
    <section className="card rl-lift flex h-full flex-col gap-4 p-[22px]" aria-label="Classement">
      <CardLabel
        icon={<Trophy size={15} />}
        right={
          <Link href="/classement" className="text-[13px] font-semibold text-muted hover:text-white">
            Tout voir
          </Link>
        }
      >
        Classement
      </CardLabel>
      {board.length === 0 ? (
        <div className="flex flex-1 flex-col gap-3">
          <p className="text-[13.5px] leading-[1.45] text-muted">Le classement se remplit avec les premiers duels et examens blancs classés.</p>
          <Link href="/classement" className="ink-link mt-auto w-fit">
            Voir le classement →
          </Link>
        </div>
      ) : (
        <ol className="flex flex-col gap-0.5">
          {board.map((r) => {
            const tier = rankFor(r.elo, r.me ? mastery : null, r.rank).tierIndex;
            return (
              <li key={r.userId}>
                <Link
                  href={r.me ? "/classement" : `/people/${r.userId}`}
                  className={"rl-row grid grid-cols-[22px_26px_minmax(0,1fr)_auto] items-center gap-2 rounded-[10px] px-2 py-[7px] " + (r.me ? "bg-surface-2" : "")}
                >
                  <span className="font-mono text-[12px] text-muted tabular-nums">{r.rank}</span>
                  <RankBadge tier={tier} size={24} glow={false} />
                  <span className={"truncate text-[13.5px] " + (r.me ? "font-extrabold" : "font-semibold")}>{r.me ? "Toi" : r.name}</span>
                  <span className="font-mono text-[12.5px] font-semibold tabular-nums">{r.elo}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
