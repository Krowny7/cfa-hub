import Link from "next/link";
import { ArrowRight, FileText, Headphones, Layers, ListChecks, Target, TriangleAlert } from "lucide-react";
import { InkProgressRing } from "@/components/ui/InkRings";
import { Tile } from "@/components/accueil/Tile";
import { agoLabel, plural } from "@/components/accueil/format";
import type { ErrorsSummary, ResumeItem } from "@/components/accueil/types";

// Cartes « révision » de l'accueil : la prochaine action (le point focal de
// la page) et les tuiles objectif du jour / à revoir. Sans état.

const KIND_ICON = { fiche: FileText, qcm: ListChecks, flashcards: Layers, practice: Target } as const;

/** La prochaine action : seule card-hero et seul bouton en encre de l'écran. */
export function ResumeHero({ resume, now }: { resume: ResumeItem | null; now?: number }) {
  if (!resume) {
    return (
      <section className="card-hero rl-in p-6 sm:p-8" style={{ animationDelay: ".08s" }} aria-label="Pour commencer">
        <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:gap-10">
          <div className="min-w-0">
            <p className="t-micro font-semibold">Pour commencer</p>
            <h2 className="t-h1 mt-2">Ouvre ta première fiche</h2>
            <p className="t-small mt-2">Ta dernière série t&apos;attendra ici.</p>
          </div>
          <div className="flex flex-col items-stretch gap-3 md:items-end">
            <Link href="/reviser" className="btn btn-primary btn-lg">
              Choisir une fiche <ArrowRight size={17} />
            </Link>
            <Link href="/entrainement" className="t-small text-center font-semibold hover:text-white md:text-right">
              ou lance un QCM
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const Icon = KIND_ICON[resume.kind];
  const pct = resume.total ? Math.min(100, Math.round(((resume.done ?? 0) / resume.total) * 100)) : null;

  return (
    <section className="card-hero rl-in p-6 sm:p-8" style={{ animationDelay: ".08s" }} aria-label="Reprendre">
      <div className="grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:gap-10">
        <div className="flex min-w-0 items-center gap-6">
          <span aria-hidden className="hidden h-[72px] w-[72px] flex-none place-items-center rounded-[18px] bg-surface-2 md:grid">
            <Icon size={28} strokeWidth={1.7} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="t-micro font-semibold">Reprendre · {agoLabel(resume.at, now)}</p>
            <h2 className="t-h1 mt-1.5 [overflow-wrap:anywhere]">{resume.title}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="t-micro">{resume.context}</span>
              {pct !== null && (
                <span className="flex min-w-[180px] max-w-[320px] flex-1 items-center gap-2.5">
                  <span className="ink-bar block h-1.5 flex-1" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={resume.progressLabel}>
                    <span className="rl-grow" style={{ width: `${pct}%`, animationDelay: ".5s" }} />
                  </span>
                  <span className="font-mono text-[12px] font-semibold tabular-nums" title={resume.progressLabel}>
                    {resume.done}/{resume.total}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-3 md:items-end">
          <Link href={resume.href} className="btn btn-primary btn-lg">
            {resume.cta} <ArrowRight size={17} />
          </Link>
          {resume.audio && (
            <Link href={resume.audio.href} title={resume.audio.title} className="t-small inline-flex items-center justify-center gap-1.5 font-semibold hover:text-white">
              <Headphones size={15} aria-hidden /> {resume.audio.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

/** Objectif du jour : l'anneau d'encre et ce qu'il reste à faire. */
export function GoalTile({ answered, goal }: { answered: number; goal: number }) {
  const left = Math.max(0, goal - answered);
  const pct = (answered / goal) * 100;
  return (
    <Tile href="/entrainement" label="Objectif du jour" icon={<Target size={14} aria-hidden />} ariaLabel={`Objectif du jour : ${answered} sur ${goal} questions. S'entraîner`}>
      <span className="flex items-center gap-3 sm:gap-5">
        <span className="sm:hidden">
          <InkProgressRing pct={pct} size={46} />
        </span>
        <span className="hidden sm:block">
          <InkProgressRing pct={pct} size={64} />
        </span>
        <span className="min-w-0">
          <span className="block whitespace-nowrap">
            <span className="t-num text-[26px] sm:text-[34px]">{answered}</span>
            <span className="text-[14px] font-semibold text-muted">/{goal}</span>
          </span>
          <span className="t-micro mt-1 block whitespace-nowrap">
            {left === 0 ? (
              "objectif atteint"
            ) : (
              <>
                encore {left}
                <span className="hidden sm:inline"> {plural(left, "question")}</span>
              </>
            )}
          </span>
        </span>
      </span>
    </Tile>
  );
}

/** Erreurs à revoir : le nombre, la répartition sur une ligne. */
export function ErrorsTile({ errors }: { errors: ErrorsSummary }) {
  const href = errors.total > 0 ? (errors.bySubject[0]?.href ?? "/fiches") : "/fiches";
  const detail = errors.total > 0 ? errors.bySubject.slice(0, 3).map((s) => `${s.short} ${s.count}`).join(" · ") : "rien à revoir";
  return (
    <Tile href={href} label="À revoir" icon={<TriangleAlert size={14} aria-hidden />} ariaLabel={`${errors.total} ${plural(errors.total, "erreur")} à revoir`}>
      <span className="min-w-0">
        <span className="flex items-baseline gap-2">
          <span className="t-num text-[26px] sm:text-[34px]">{errors.total}</span>
          <span className="text-[14px] font-semibold text-muted">{plural(errors.total, "erreur")}</span>
        </span>
        <span className="t-micro mt-1 block truncate">{detail}</span>
      </span>
    </Tile>
  );
}
