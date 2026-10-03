"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHero, SectionTitle } from "@/components/ui/Titles";
import { SubjectGlyph } from "@/components/ui/SubjectGlyph";
import { levelState, topicSummary, type AllProgress, type TopicProgress } from "@/lib/calc/engine";
import { CALC_LEVELS } from "@/lib/calc/types";
import { precision } from "@/lib/voice";
import { FocusCard } from "./parts";
import { roundHref, suggest, type SubjectLite } from "./suggest";
import { useCalcProgress, useLocalImport } from "./useCalc";
import { CALC, NIVEAU, ligneTypes, nbQuestions, niveauxTenus } from "./voice";

export type CalcHubSubject = SubjectLite & { short: string; open: boolean; questions: number };

/**
 * /calculs : les 10 matières. Les matières ouvertes en grandes cartes (types,
 * niveaux tenus, précision récente), les autres « bientôt » sur une ligne.
 * Le point focal : le prochain calcul (reprendre, ou le premier essentiel).
 *
 * Props : `subjects` (lib/calc/index → calcSubjectCards), `progress` (base,
 * null = repli local), `db` (migration appliquée), `owner` (id du compte,
 * clé du repli local).
 */
export function CalcHub({ subjects, progress: server, db, owner }: { subjects: CalcHubSubject[]; progress: AllProgress | null; db: boolean; owner: string }) {
  useLocalImport(db, owner);
  const { progress } = useCalcProgress(server, owner);
  const open = subjects.filter((s) => s.open);
  const soon = subjects.filter((s) => !s.open);
  const sug = suggest(open, progress);

  return (
    <div className="rl-page">
      <header>
        <PageHero kicker={CALC.hubKicker} title={CALC.hubTitre} />
        <p className="t-body mt-5 max-w-[540px] text-muted">{CALC.hubLigne}</p>
      </header>

      {sug ? (
        <FocusCard
          kicker={sug.reprise ? CALC.reprendre : CALC.prochain}
          title={sug.typeName}
          meta={`${sug.subject} · ${NIVEAU[sug.level].label}`}
          href={roundHref(sug.slug, sug.typeKey, sug.level)}
          action={CALC.lancer}
          progress={progress[sug.topic]?.[sug.typeKey] ?? null}
        />
      ) : open.length ? (
        <section className="card-hero p-6 sm:p-7 md:p-9">
          <p className="t-eyebrow">{CALC.prochain}</p>
          <h2 className="t-h1 mt-3">{CALC.toutTenu}</h2>
        </section>
      ) : null}

      <section className="rl-section">
        <SectionTitle title={CALC.ouvertes} sub={`${open.length} ${open.length > 1 ? "ouvertes" : "ouverte"} sur ${subjects.length}`} />
        {open.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {open.map((s) => (
              <SubjectCard key={s.topic} s={s} progress={progress[s.topic]} />
            ))}
          </div>
        ) : (
          <p className="card-quiet t-small p-6">Les premiers calculs arrivent : Equity, puis Portfolio Management.</p>
        )}
        {soon.length > 0 && (
          <div className="card-quiet p-5 md:p-6">
            <p className="t-eyebrow">{CALC.bientot}</p>
            <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 min-[420px]:grid-cols-2 md:grid-cols-4">
              {soon.map((s) => (
                <li key={s.topic} className="flex min-w-0 items-center gap-2.5 text-[14px] text-muted">
                  <SubjectGlyph subject={s.topic} size={18} className="opacity-55" />
                  <span className="truncate">{s.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

function SubjectCard({ s, progress }: { s: CalcHubSubject; progress: TopicProgress | undefined }) {
  const keys = s.types.map((t) => t.key);
  const sum = topicSummary(progress, keys);
  let tenus = 0;
  for (const k of keys) for (const l of CALC_LEVELS) if (levelState(progress?.[k]?.levels[l]) === "tenu") tenus += 1;
  const total = keys.length * CALC_LEVELS.length;
  const essentiels = s.types.filter((t) => t.tier === "essentiel").length;
  return (
    <Link href={`/calculs/${s.slug}`} className="card rl-lift group grid gap-6 p-6 md:p-7">
      <div className="flex items-center gap-3">
        <SubjectGlyph subject={s.topic} size={28} />
        <h3 className="t-h2 min-w-0 flex-1">{s.name}</h3>
        <ArrowRight size={18} aria-hidden className="shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-0.5" />
      </div>
      <p className="t-small -mt-3">
        {ligneTypes(keys.length, essentiels)} · {nbQuestions(s.questions)}
      </p>
      <div className="grid gap-2.5">
        <div className="ink-bar" aria-hidden>
          <span style={{ width: `${total ? Math.round((tenus / total) * 100) : 0}%` }} />
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="t-micro tabular-nums">{niveauxTenus(tenus, total)}</span>
          <span className="t-micro tabular-nums">{sum.precision !== null ? precision(sum.precision) : CALC.aEntamer}</span>
        </div>
      </div>
    </Link>
  );
}
