import Link from "next/link";
import { ArrowRight, Check, Eye } from "lucide-react";
import { QuestionPrompt } from "@/components/QuestionPrompt";
import { InkRing } from "@/components/ink/InkRing";
import { plural, splitTitle, subjectOfTitle } from "@/components/ContentDetailHeader";
import { PARTAGE } from "@/lib/voice-z3c";

// Pages de partage public (lecture seule) d'un QCM ou d'un set de
// flashcards : présentation seule, les pages /share/** chargent les données
// (et l’aperçu fournit des exemples). Module neutre, hors route. La vue
// des cartes, qui charge KaTeX, est à part : deck-view.tsx.

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export type SharedQuestion = { id: string; prompt: string; choices: string[]; correct_index: number; explanation: string | null; position: number };

export function ShareHeader({ kind, title, meta }: { kind: string; title: string; meta: string }) {
  const parts = splitTitle(title);
  const subject = subjectOfTitle(title);
  return (
    <header className="flex flex-col gap-3">
      <p className="t-eyebrow flex items-center gap-2">
        <Eye size={14} aria-hidden /> {kind} partagé · lecture seule
      </p>
      <h1 className="t-h1 rl-in m-0 break-words">{parts.main}</h1>
      <p className="t-micro">{[subject?.name, parts.lead, meta].filter(Boolean).join(" · ")}</p>
    </header>
  );
}

export function ShareFooter({ line }: { line: string }) {
  return (
    <aside className="card-quiet flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center sm:justify-between md:p-7">
      <div className="flex items-center gap-4">
        <InkRing size={40} className="shrink-0" />
        <div>
          <p className="t-h3 m-0">Ranked Lobby</p>
          <p className="t-small mt-1">{line}</p>
        </div>
      </div>
      <Link href="/" className="btn btn-primary rl-press w-full shrink-0 sm:w-auto">
        {PARTAGE.action} <ArrowRight size={16} aria-hidden />
      </Link>
    </aside>
  );
}

export function SharedQuizView({ title, questions }: { title: string; questions: SharedQuestion[] }) {
  return (
    <div className="mx-auto flex w-full max-w-[780px] flex-col gap-8 md:gap-10">
      <ShareHeader kind="QCM" title={title} meta={`${plural(questions.length, "question", "questions")} · bonnes réponses indiquées`} />

      {questions.length === 0 ? (
        <div className="card-quiet grid place-items-center px-6 py-14 text-center">
          <p className="t-small">{PARTAGE.videQcm}</p>
        </div>
      ) : (
        <ol className="card m-0 list-none divide-y divide-line overflow-hidden p-0">
          {questions.map((q, idx) => (
            <li key={q.id} className="flex flex-col gap-4 px-5 py-6 md:px-8 md:py-7">
              <p className="t-micro font-mono font-semibold">Question {idx + 1}</p>
              <QuestionPrompt text={q.prompt} className="text-[16px] font-semibold leading-relaxed tracking-[-0.008em]" />
              <ul className="m-0 grid list-none gap-2 p-0">
                {(Array.isArray(q.choices) ? q.choices : []).map((choice, ci) => {
                  const ok = ci === q.correct_index;
                  return (
                    <li
                      key={ci}
                      className={
                        "flex items-start gap-3 rounded-[12px] border px-3.5 py-2.5 text-[14.5px] leading-snug " +
                        (ok ? "border-white font-semibold shadow-[inset_0_0_0_1px_var(--ink)]" : "text-body border-line")
                      }
                    >
                      <span className={"grid h-6 w-6 shrink-0 place-items-center rounded-[8px] text-[12px] font-semibold " + (ok ? "bg-white text-black" : "bg-surface-2 text-muted")}>
                        {ok ? <Check size={13} strokeWidth={2.6} aria-hidden /> : LETTERS[ci]}
                      </span>
                      <span className="min-w-0 flex-1 break-words pt-px [overflow-wrap:anywhere]">{choice}</span>
                      {ok && <span className="sr-only"> (bonne réponse)</span>}
                    </li>
                  );
                })}
              </ul>
              {q.explanation && (
                <div className="rounded-[12px] bg-surface-2/70 px-4 py-3.5">
                  <p className="t-eyebrow">Explication</p>
                  <p className="t-small text-body mt-1.5 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{q.explanation}</p>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      <ShareFooter line={PARTAGE.qcm} />
    </div>
  );
}
