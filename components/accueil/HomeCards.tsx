import Link from "next/link";
import { ArrowRight, BookOpen, FileText, Headphones, Layers, ListChecks, Target, TriangleAlert } from "lucide-react";
import { InkRing } from "@/components/ink/InkRing";
import { InkProgressRing } from "@/components/ui/InkRings";
import { CardLabel } from "@/components/ui/Titles";
import { agoLabel, plural } from "@/components/accueil/format";
import type { ErrorsSummary, ResumeItem } from "@/components/accueil/types";

// Cartes « révision » de l'accueil : reprendre, objectif du jour, erreurs à
// revoir (+ leurs tuiles compactes sur téléphone). Sans état.

const KIND_ICON = { fiche: FileText, qcm: ListChecks, flashcards: Layers, practice: Target } as const;

/** Pastille claire (sous le titre d'accueil, chips de matières). */
export const PILL = "inline-flex h-[30px] items-center gap-1.5 rounded-[10px] border border-line bg-surface px-[11px] text-[13px] font-semibold";

export function ResumeCard({ resume, now }: { resume: ResumeItem | null; now?: number }) {
  if (!resume) {
    return (
      <section className="card rl-lift flex h-full flex-col gap-4 p-[22px]" aria-label="Reprendre">
        <CardLabel icon={<BookOpen size={15} />}>Reprendre</CardLabel>
        <div className="flex flex-col gap-1.5">
          <span className="text-[22px] font-extrabold leading-tight tracking-[-.025em] sm:text-[26px]">Rien à reprendre pour l&apos;instant</span>
          <span className="text-[14px] leading-[1.45] text-muted">
            Ouvre une fiche et son quiz, ou lance un QCM : ta dernière série t&apos;attendra ici.
          </span>
        </div>
        <div className="mt-auto flex flex-wrap gap-2.5">
          <Link href="/reviser" className="btn btn-primary rl-press w-full sm:w-auto">
            Choisir une fiche <ArrowRight size={16} />
          </Link>
          <Link href="/entrainement" className="btn btn-secondary rl-press w-full sm:w-auto">
            S&apos;entraîner
          </Link>
        </div>
      </section>
    );
  }

  const Icon = KIND_ICON[resume.kind];
  const pct = resume.total ? Math.min(100, Math.round(((resume.done ?? 0) / resume.total) * 100)) : null;

  return (
    <section className="card rl-lift flex h-full flex-col gap-4 p-[22px]" aria-label="Reprendre">
      <CardLabel icon={<BookOpen size={15} />} right={<span className="text-[12px]">{agoLabel(resume.at, now)}</span>}>
        Reprendre
      </CardLabel>
      <div className="flex flex-wrap items-center gap-[18px]">
        <span className="relative hidden h-[92px] w-[92px] flex-none place-items-center overflow-hidden rounded-2xl bg-white text-black sm:grid">
          <span aria-hidden className="absolute -inset-3.5 opacity-[.14]">
            <InkRing size={120} />
          </span>
          <Icon size={30} strokeWidth={1.8} />
        </span>
        <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-muted">{resume.context}</span>
          <span className="text-[22px] font-extrabold leading-[1.1] tracking-[-.025em] [overflow-wrap:anywhere] sm:text-[26px]">{resume.title}</span>
          {pct !== null && (
            <div className="mt-1 flex items-center gap-2.5">
              <div className="ink-bar flex-1" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={resume.progressLabel}>
                <span className="rl-grow" style={{ width: `${pct}%`, animationDelay: ".6s" }} />
              </div>
              <span className="font-mono text-[13px] font-semibold tabular-nums" title={resume.progressLabel}>
                {resume.done}/{resume.total}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="mt-auto flex flex-wrap gap-2.5">
        <Link href={resume.href} className="btn btn-primary rl-press w-full sm:w-auto">
          {resume.cta} <ArrowRight size={16} />
        </Link>
        {resume.audio && (
          <Link href={resume.audio.href} className="btn btn-secondary rl-press hidden sm:inline-flex" title={resume.audio.title}>
            {resume.audio.label} <Headphones size={16} />
          </Link>
        )}
      </div>
    </section>
  );
}

function goalText(answered: number, goal: number, streak: number) {
  const left = Math.max(0, goal - answered);
  if (left === 0) {
    return {
      head: "Objectif atteint",
      sub: answered > goal ? `${answered} questions aujourd'hui : tu as dépassé l'objectif, bravo.` : "Journée bouclée, bravo. Tout le reste est du bonus.",
    };
  }
  return {
    head: `Encore ${left} ${plural(left, "question")}`,
    sub:
      streak > 0
        ? `pour boucler la journée et garder ta série de ${streak} ${plural(streak, "jour")}.`
        : "pour boucler la journée et lancer ta série.",
  };
}

export function GoalCard({ answered, goal, streak }: { answered: number; goal: number; streak: number }) {
  const { head, sub } = goalText(answered, goal, streak);
  return (
    <section className="card rl-lift hidden h-full flex-col gap-4 p-[22px] sm:flex" aria-label="Objectif du jour">
      <CardLabel icon={<Target size={15} />}>Objectif du jour</CardLabel>
      <div className="flex flex-1 flex-wrap items-center gap-[18px]">
        <InkProgressRing pct={(answered / goal) * 100} size={150}>
          <div>
            <span className="font-brand text-[32px] leading-none">{answered}</span>
            <span className="text-[15px] font-semibold text-muted">/{goal}</span>
            <div className="mt-0.5 text-[12px] text-muted">questions</div>
          </div>
        </InkProgressRing>
        <div className="flex flex-[1_1_140px] flex-col gap-2">
          <span className="text-[16px] font-bold">{head}</span>
          <span className="text-[14px] leading-[1.45] text-muted">{sub}</span>
          {answered < goal && (
            <Link href="/entrainement" className="ink-link mt-1 w-fit">
              S&apos;entraîner →
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

function errorsHref(errors: ErrorsSummary) {
  return errors.bySubject[0]?.href ?? "/fiches";
}

export function ErrorsCard({ errors }: { errors: ErrorsSummary }) {
  return (
    <section className="card rl-lift hidden h-full flex-col gap-4 p-[22px] sm:flex" aria-label="À revoir">
      <CardLabel icon={<TriangleAlert size={15} />}>À revoir</CardLabel>
      {errors.total > 0 ? (
        <>
          <div className="flex items-baseline gap-2.5">
            <span className="font-brand text-[52px] leading-none">{errors.total}</span>
            <span className="text-[15px] text-muted">{plural(errors.total, "erreur")}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {errors.bySubject.slice(0, 3).map((s) => (
              <Link key={s.key} href={s.href} className={PILL + " rl-press"}>
                {s.short} · {s.count}
              </Link>
            ))}
          </div>
          <div className="mt-auto">
            <Link href={errorsHref(errors)} className="btn btn-secondary rl-press">
              Revoir <ArrowRight size={16} />
            </Link>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-baseline gap-2.5">
            <span className="font-brand text-[52px] leading-none">0</span>
            <span className="text-[15px] text-muted">erreur</span>
          </div>
          <p className="text-[13.5px] leading-[1.45] text-muted">
            Les questions que tu rates dans les quiz des fiches arrivent ici, jusqu&apos;à ce que tu les réussisses deux fois d&apos;affilée.
          </p>
          <div className="mt-auto">
            <Link href="/fiches" className="btn btn-secondary rl-press">
              Faire un quiz <ArrowRight size={16} />
            </Link>
          </div>
        </>
      )}
    </section>
  );
}

/** Téléphone : objectif du jour et erreurs en deux tuiles côte à côte. */
export function MobileTiles({ answered, goal, errors }: { answered: number; goal: number; errors: ErrorsSummary }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:hidden">
      <Link href="/entrainement" className="card rl-press flex items-center gap-3 p-4" aria-label={`Objectif du jour : ${answered} sur ${goal} questions`}>
        <InkProgressRing pct={(answered / goal) * 100} size={48} />
        <span className="min-w-0">
          <span className="block text-[17px] font-extrabold tabular-nums">
            {answered}/{goal}
          </span>
          <span className="block text-[12px] leading-tight text-muted">objectif du jour</span>
        </span>
      </Link>
      <Link href={errorsHref(errors)} className="card rl-press flex flex-col justify-center p-4" aria-label={`${errors.total} erreurs à revoir`}>
        <span className="font-brand text-[24px] leading-none">{errors.total}</span>
        <span className="mt-1 block text-[12px] leading-tight text-muted">{plural(errors.total, "erreur")} à revoir</span>
      </Link>
    </div>
  );
}
