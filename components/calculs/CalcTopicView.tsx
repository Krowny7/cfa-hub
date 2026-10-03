"use client";

import Link from "next/link";
import { SectionTitle } from "@/components/ui/Titles";
import { SubjectGlyph } from "@/components/ui/SubjectGlyph";
import { recentPrecision, type AllProgress, type TypeProgress } from "@/lib/calc/engine";
import type { CalcTopic } from "@/lib/calc/types";
import { nombre, precision } from "@/lib/voice";
import { BackLink, FocusCard, LevelMarks } from "./parts";
import { roundHref, suggest } from "./suggest";
import { useCalcProgress, useLocalImport } from "./useCalc";
import { CALC, NIVEAU, nbQuestions } from "./voice";

export type CalcTopicType = { key: string; name: string; tier: "essentiel" | "annexe"; source: string | null; questions: number };

/**
 * /calculs/[matiere] : les types de calcul d'une matière, Essentiels puis
 * Annexes, dans l'ordre du programme. Pour chacun : le nom, la référence,
 * les niveaux tenus (F · M · D) et la précision récente. Le point focal :
 * le prochain calcul.
 *
 * Props : `subject` ({topic, slug, name}), `types`, `progress` (base, null =
 * repli local), `db`, `owner`.
 */
export function CalcTopicView({
  subject,
  types,
  progress: server,
  db,
  owner,
}: {
  subject: { topic: CalcTopic; slug: string; name: string };
  types: CalcTopicType[];
  progress: AllProgress | null;
  db: boolean;
  owner: string;
}) {
  useLocalImport(db, owner);
  const { progress } = useCalcProgress(server, owner);
  const mine = progress[subject.topic];
  const sug = suggest([{ ...subject, types }], progress);
  const essentiels = types.filter((t) => t.tier === "essentiel");
  const annexes = types.filter((t) => t.tier === "annexe");
  const totalQ = types.reduce((n, t) => n + t.questions, 0);

  return (
    <div className="rl-page">
      <header>
        <BackLink href="/calculs">{CALC.hubTitre}</BackLink>
        <div className="mt-4 flex items-center gap-3.5">
          <SubjectGlyph subject={subject.topic} size={34} />
          <h1 className="t-h1 min-w-0">{subject.name}</h1>
        </div>
        <p className="t-small mt-3">
          {nombre(essentiels.length)} {essentiels.length > 1 ? "essentiels" : "essentiel"} · {nombre(annexes.length)} {annexes.length > 1 ? "annexes" : "annexe"} · {nbQuestions(totalQ)}
        </p>
      </header>

      {sug ? (
        <FocusCard
          kicker={sug.reprise ? CALC.reprendre : CALC.prochain}
          title={sug.typeName}
          meta={`${types.find((t) => t.key === sug.typeKey)?.tier === "annexe" ? "Annexe" : "Essentiel"} · ${NIVEAU[sug.level].label}`}
          href={roundHref(subject.slug, sug.typeKey, sug.level)}
          action={CALC.lancer}
          progress={mine?.[sug.typeKey] ?? null}
        />
      ) : (
        <section className="card-hero p-6 sm:p-7 md:p-9">
          <p className="t-eyebrow">{CALC.prochain}</p>
          <h2 className="t-h1 mt-3">{CALC.toutTenu}</h2>
        </section>
      )}

      {[
        { num: "01", title: CALC.essentiels, sub: CALC.essentielsSous, list: essentiels },
        { num: "02", title: CALC.annexes, sub: CALC.annexesSous, list: annexes },
      ]
        .filter((g) => g.list.length > 0)
        .map((g) => (
          <section key={g.num} className="rl-section">
            <SectionTitle num={g.num} title={g.title} sub={g.sub} />
            <ul className="grid gap-2.5 md:grid-cols-2 md:gap-3">
              {g.list.map((t) => (
                <li key={t.key} className="min-w-0">
                  <TypeRow href={`/calculs/${subject.slug}/${t.key}`} t={t} p={mine?.[t.key]} />
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}

function TypeRow({ href, t, p }: { href: string; t: CalcTopicType; p: TypeProgress | undefined }) {
  const prec = recentPrecision(p);
  return (
    <Link href={href} className="card-quiet rl-row group flex min-h-[78px] items-center gap-4 px-5 py-4">
      <div className="min-w-0 flex-1">
        <div className="text-[15.5px] font-semibold leading-snug tracking-[-0.012em] [overflow-wrap:anywhere]">{t.name}</div>
        {t.source && <div className="t-micro mt-1 truncate">{t.source}</div>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <LevelMarks progress={p} />
        <span className="t-micro whitespace-nowrap tabular-nums">{prec !== null ? precision(prec) : CALC.aEntamer}</span>
      </div>
    </Link>
  );
}
