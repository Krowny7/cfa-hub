import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { daysUntil, fmtDay, fmtDuration, fmtHour, fmtShortDate, signed } from "@/components/classement/format";
import type { NextExam, PastExam } from "@/components/classement/types";

/** « J-7 », « ouvert » ou rien : repère court pour l'onglet et la carte. */
export function examTag(exam: NextExam | null): string | null {
  if (!exam) return null;
  const d = daysUntil(exam.scheduledAt);
  if (exam.windowOpen) return "ouvert";
  return d > 0 && d <= 14 ? `J-${d}` : null;
}

function NextExamBlock({ exam }: { exam: NextExam | null }) {
  if (!exam) {
    return (
      <div className="card-quiet flex flex-col gap-2 p-6 md:p-7">
        <p className="t-eyebrow">Prochain examen classé</p>
        <p className="t-h3">Aucun de prévu pour l&apos;instant</p>
        <p className="t-small">Il s&apos;affichera ici dès qu&apos;il sera planifié. Il fait bouger ton ELO comme un duel.</p>
      </div>
    );
  }

  const day = fmtDay(exam.scheduledAt);
  const draft = exam.status === "draft";
  const tag = examTag(exam);
  const registrants =
    exam.registrants === null ? (draft ? "inscriptions bientôt ouvertes" : null) : exam.registrants === 0 ? "aucun inscrit" : `${exam.registrants} inscrit${exam.registrants > 1 ? "s" : ""}`;

  return (
    <div className="card-quiet flex flex-col gap-4 p-6 md:p-7">
      <div className="flex items-center justify-between gap-3">
        <p className="t-eyebrow">Prochain examen classé</p>
        {tag && <span className="rounded-[8px] border border-line-2 px-2 py-px font-mono text-[12px] font-semibold">{tag}</span>}
      </div>
      <div>
        <p className="t-h2">
          <span className="capitalize">{day.split(" ")[0]}</span> {day.split(" ").slice(1).join(" ")} · {fmtHour(exam.scheduledAt)}
        </p>
        <p className="t-small mt-1 truncate">{exam.title}</p>
      </div>
      <p className="t-micro">
        {exam.questionCount} questions · {fmtDuration(exam.durationMinutes)}
        {registrants ? ` · ${registrants}` : ""}
        {exam.windowOpen ? ` · ouvert jusqu'au ${fmtShortDate(exam.windowEnd)}` : ""}
      </p>
      <div>
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
    </div>
  );
}

// Onglet « Examens classés » : le prochain (inscription sur la page de
// l'examen, /mock-exams/<id>) et les derniers passés, avec ton score et
// l'ELO reçu à la clôture.
export function ExamsPanel({ exam, past }: { exam: NextExam | null; past: PastExam[] }) {
  return (
    <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-14">
      <div className="lg:col-span-5">
        <NextExamBlock exam={exam} />
      </div>

      <section className="flex min-w-0 flex-col gap-2 lg:col-span-7" aria-label="Examens classés passés">
        <p className="t-eyebrow px-2">Passés</p>
        {past.length ? (
          <ul className="flex flex-col gap-0.5">
            {past.map((e) => (
              <li key={e.id}>
                <Link href={`/mock-exams/${e.id}`} className="rl-row grid grid-cols-[minmax(0,1fr)_auto_44px] items-center gap-3 rounded-[12px] px-2 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate text-[14.5px] font-semibold">{e.title}</span>
                    <span className="t-micro block">{fmtShortDate(e.scheduledAt)}{e.score === null ? " · pas passé" : ""}</span>
                  </span>
                  <span className="font-mono text-[13px] tabular-nums text-muted">{e.score !== null ? `${e.score}/${e.total ?? e.questionCount}` : ""}</span>
                  <span className={"text-right font-mono text-[13px] font-semibold tabular-nums " + (e.delta !== null && e.delta < 0 ? "text-muted" : "")}>
                    {e.delta !== null ? signed(e.delta) : "—"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="t-small px-2">Pas encore d&apos;examen classé terminé.</p>
        )}
        <Link href="/mock-exams" className="mt-2 inline-flex w-fit items-center gap-1.5 px-2 text-[13px] font-semibold text-muted hover:text-white">
          Tous les examens blancs <ArrowRight size={14} aria-hidden />
        </Link>
      </section>
    </div>
  );
}
