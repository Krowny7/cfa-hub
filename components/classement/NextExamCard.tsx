import Link from "next/link";
import { ArrowRight, CalendarDays, Check } from "lucide-react";
import { CardLabel } from "@/components/ui/Titles";
import { daysUntil, fmtDay, fmtDuration, fmtHour, fmtShortDate } from "@/components/classement/format";
import type { NextExam } from "@/components/classement/types";

// Prochain examen blanc classé : date, format, inscrits, et le bon bouton
// selon l'état (s'inscrire, passer l'examen, déjà inscrit). L'inscription
// elle-même se fait sur la page de l'examen (/mock-exams/<id>).
export function NextExamCard({ exam }: { exam: NextExam | null }) {
  if (!exam) {
    return (
      <section className="card rl-lift flex flex-col gap-3 p-[22px]">
        <CardLabel icon={<CalendarDays size={15} aria-hidden />}>Prochain examen classé</CardLabel>
        <p className="text-[15px] font-semibold">Aucun examen blanc classé de prévu pour l&apos;instant</p>
        <p className="text-[13.5px] text-muted">Les examens blancs font bouger ton ELO comme les duels. Le prochain s&apos;affichera ici dès qu&apos;il sera planifié.</p>
        <Link href="/mock-exams" className="ink-link w-fit">
          Voir les examens passés
        </Link>
      </section>
    );
  }

  const d = daysUntil(exam.scheduledAt);
  const day = fmtDay(exam.scheduledAt);
  const draft = exam.status === "draft";

  return (
    <section className="card rl-lift flex flex-col gap-3 p-[22px]">
      <CardLabel
        icon={<CalendarDays size={15} aria-hidden />}
        right={
          d > 0 ? (
            <span className="rounded-[8px] border border-line-2 px-2 py-[2px] font-mono text-[12px] text-white">J-{d}</span>
          ) : exam.windowOpen ? (
            <span className="rounded-[8px] bg-white px-2 py-[2px] text-[12px] font-semibold text-black">ouvert</span>
          ) : undefined
        }
      >
        Prochain examen classé
      </CardLabel>
      <div>
        <p className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">
          <span className="capitalize">{day.split(" ")[0]}</span> {day.split(" ").slice(1).join(" ")} · {fmtHour(exam.scheduledAt)}
        </p>
        <p className="mt-1 truncate text-[13.5px] font-medium">{exam.title}</p>
      </div>
      <p className="text-[14px] text-muted">
        {exam.questionCount} questions · {fmtDuration(exam.durationMinutes)} · compte pour ton ELO
      </p>
      {exam.windowOpen && (
        <p className="text-[13px] text-muted">Fenêtre de passage ouverte jusqu&apos;au {fmtShortDate(exam.windowEnd)}.</p>
      )}

      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <span className="text-[13px] text-muted">
          {exam.registrants === null
            ? draft
              ? "inscriptions bientôt ouvertes"
              : ""
            : exam.registrants === 0
              ? "sois le premier inscrit"
              : `${exam.registrants} inscrit${exam.registrants > 1 ? "s" : ""}`}
        </span>
        {exam.registered ? (
          <Link href={`/mock-exams/${exam.id}`} className="btn btn-secondary rl-press">
            <Check size={16} aria-hidden /> {exam.windowOpen ? "Passer l'examen" : "Inscrit · voir"}
          </Link>
        ) : draft ? (
          <Link href={`/mock-exams/${exam.id}`} className="btn btn-secondary rl-press">
            Voir l&apos;examen
          </Link>
        ) : (
          <Link href={`/mock-exams/${exam.id}`} className="btn btn-primary rl-press">
            Je m&apos;inscris <ArrowRight size={16} aria-hidden />
          </Link>
        )}
      </div>
      <Link href="/mock-exams" className="text-[12.5px] font-semibold text-muted hover:text-white">
        Tous les examens blancs →
      </Link>
    </section>
  );
}
