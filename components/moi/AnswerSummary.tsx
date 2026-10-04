import Link from "next/link";
import { ArrowRight, PenLine } from "lucide-react";
import { CardLabel } from "@/components/ui/Titles";
import { fmtInt } from "@/components/classement/format";
import { LEXIQUE } from "@/lib/voice";
import { ANSWER_SOURCES, SOURCE_LABELS, tallyOf, type AnswerStats } from "@/lib/answer-stats";

// Résumé des questions répondues sur un profil (/people/<id>) : le total
// (« traits tracés ») en grand, la précision, la part de chaque source et
// les matières les plus travaillées. Composant de présentation (serveur) ;
// les données viennent de getAnswerStats(…, { detail: false }).
//
// Props : `stats`, `name` (pseudo du joueur), `isMe` (son propre profil :
// lien vers le détail dans Moi › Stats).

const TITLE = LEXIQUE.traitsTraces.charAt(0).toUpperCase() + LEXIQUE.traitsTraces.slice(1);
const TOP = 5;

export function AnswerSummary({ stats, name, isMe = false }: { stats: AnswerStats; name: string; isMe?: boolean }) {
  const all = tallyOf(stats.by);
  const sources = ANSWER_SOURCES.map((k) => ({ key: k, t: tallyOf(stats.by, k) }))
    .filter((x) => x.t.n > 0)
    .sort((a, b) => b.t.n - a.t.n);
  const subjects = stats.subjects
    .filter((s) => !s.pseudo)
    .map((s) => ({ s, t: tallyOf(s.by) }))
    .filter((x) => x.t.n > 0)
    .sort((a, b) => b.t.n - a.t.n);
  const top = subjects.slice(0, TOP);
  const max = Math.max(1, ...top.map((x) => x.t.n));

  return (
    // la mise en page suit la largeur du bloc, pas celle de l'écran (une case du profil peut être étroite)
    <div className="@container min-w-0">
    <section className="card grid min-w-0 gap-7 p-6 @3xl:grid-cols-[minmax(0,230px)_minmax(0,1fr)] @3xl:gap-10 @lg:p-7" aria-label={`Questions répondues par ${name}`}>
      <div className="flex min-w-0 flex-col">
        <CardLabel icon={<PenLine size={15} aria-hidden />}>{TITLE}</CardLabel>
        <p className="t-num m-0 mt-5 text-[52px] @lg:text-[60px]">{fmtInt(all.n)}</p>
        <p className="t-small mt-3">
          {all.n === 0 ? (
            isMe ? "Pas encore de trait : ta première réponse comptera ici." : "Pas encore de question répondue."
          ) : (
            <>
              question{all.n > 1 ? "s" : ""} répondue{all.n > 1 ? "s" : ""}
              <br />
              précision <span className="font-semibold text-white">{all.pct} %</span>
            </>
          )}
        </p>
        {isMe && all.n > 0 && (
          <Link href="/moi?onglet=stats" className="ink-link mt-5 inline-flex w-fit items-center gap-1.5 text-[13.5px] font-semibold">
            Le détail par matière <ArrowRight size={14} aria-hidden />
          </Link>
        )}
      </div>

      {all.n > 0 && (
        <div className="grid min-w-0 gap-7 border-t border-line pt-6 @xl:grid-cols-2 @xl:gap-10 @3xl:border-l @3xl:border-t-0 @3xl:pl-10 @3xl:pt-0">
          <div className="min-w-0">
            <p className="t-eyebrow">Par source</p>
            <dl className="m-0 mt-1 flex flex-col">
              {sources.map(({ key, t }) => (
                <div key={key} className="flex items-baseline justify-between gap-3 border-b border-line py-2 last:border-b-0">
                  <dt className="text-[13.5px] font-medium">{SOURCE_LABELS[key]}</dt>
                  <dd className="m-0 font-mono text-[13px] tabular-nums">
                    <span className="font-semibold">{fmtInt(t.n)}</span>
                    <span className="text-muted"> · {t.pct} %</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="min-w-0">
            <p className="t-eyebrow">Matières les plus travaillées</p>
            <ul className="m-0 mt-3 flex flex-col gap-3">
              {top.map(({ s, t }) => (
                <li key={s.key} className="min-w-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-[13.5px] font-medium">{s.name}</span>
                    <span className="shrink-0 font-mono text-[13px] tabular-nums">
                      <span className="font-semibold">{fmtInt(t.n)}</span>
                      <span className="text-muted"> · {t.pct} %</span>
                    </span>
                  </div>
                  {/* longueur : part des réponses (le volume tracé), pas la précision */}
                  <span aria-hidden className="ink-bar mt-1 block">
                    <span style={{ width: `${Math.max(4, Math.round((t.n / max) * 100))}%` }} />
                  </span>
                </li>
              ))}
            </ul>
            {subjects.length > TOP && <p className="t-micro mt-3">et {subjects.length - TOP} autre{subjects.length - TOP > 1 ? "s" : ""} matière{subjects.length - TOP > 1 ? "s" : ""}</p>}
          </div>
        </div>
      )}
    </section>
    </div>
  );
}
