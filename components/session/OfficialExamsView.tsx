import Link from "next/link";
import { ArrowRight, ChevronRight, FileStack, Sparkles } from "lucide-react";
import { PageHead, SectionHead } from "@/components/session/ui";

// Examens officiels : les vrais mocks de l'utilisateur, rejoués en entier ou
// matière par matière (avec, quand elles existent, leurs variantes). Vue sans
// état : app/official-exams regroupe les sets, l'aperçu en fournit d'exemple.

export type OfficialTopic = { id: string; label: string; count: number; variant: { id: string; count: number } | null };
export type OfficialExamGroup = {
  exam: string;
  sessions: Record<string, { topics: OfficialTopic[]; complete: { id: string; count: number } | null }>;
};

function SessionBlock({
  label,
  topics,
  complete,
  focal,
}: {
  label: string;
  topics: OfficialTopic[];
  complete: { id: string; count: number } | null;
  focal: boolean;
}) {
  const total = complete?.count ?? topics.reduce((s, t) => s + t.count, 0);
  return (
    <section className={(focal ? "card-hero" : "card") + " rl-in overflow-hidden"} aria-label={label}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 p-5 md:p-7">
        <div className="min-w-0">
          <p className="t-eyebrow m-0">{label}</p>
          <p className="m-0 mt-2 flex items-baseline gap-2">
            <span className={focal ? "t-num text-[44px]" : "t-num text-[32px]"}>{total}</span>
            <span className="text-[15px] font-semibold">questions officielles</span>
          </p>
          <p className="t-micro m-0 mt-1.5">
            {topics.length} matière{topics.length > 1 ? "s" : ""}
            {topics.some((t) => t.variant) ? " · variantes pour t'entraîner autrement" : ""}
          </p>
        </div>
        {complete && (
          <Link href={`/qcm/${complete.id}`} className={"btn rl-press " + (focal ? "btn-primary btn-lg" : "btn-secondary")}>
            Session complète <ArrowRight size={16} aria-hidden />
          </Link>
        )}
      </div>

      {topics.length > 0 && (
        <ul className="m-0 grid list-none grid-cols-1 border-t border-line p-1.5 md:grid-cols-2 md:p-2">
          {topics.map((t) => (
            <li key={t.id} className="flex min-w-0 items-center gap-1">
              <Link href={`/qcm/${t.id}`} className="rl-row group flex min-w-0 flex-1 items-center gap-3 rounded-[12px] px-3 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-semibold">{t.label}</span>
                  <span className="t-micro block tabular-nums">{t.count} questions</span>
                </span>
                <ChevronRight size={15} aria-hidden className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
              </Link>
              {t.variant && (
                <Link
                  href={`/qcm/${t.variant.id}`}
                  title="Variantes des mêmes questions (énoncés et chiffres différents)"
                  className="chip chip-quiet chip-sm mr-1.5 shrink-0"
                >
                  <Sparkles size={12} aria-hidden />
                  <span className="hidden sm:inline">Variantes ·</span> {t.variant.count}
                  <span className="sr-only sm:hidden">variantes</span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function OfficialExamsView({ exams }: { exams: OfficialExamGroup[] }) {
  let first = true;
  return (
    <div className="rl-page">
      <PageHead
        back={{ href: "/entrainement", label: "S'entraîner" }}
        title="Examens officiels"
        sub="Tes examens blancs officiels, aux questions près : en entier, ou une matière à la fois pour retravailler un point faible."
      />

      {exams.length === 0 ? (
        <section className="card-quiet rl-in grid place-items-center gap-2 px-6 py-12 text-center">
          <FileStack size={22} aria-hidden className="text-muted" />
          <p className="t-h3 m-0">Aucun examen officiel importé</p>
          <p className="t-small m-0">Ils apparaîtront ici dès qu&apos;ils seront ajoutés.</p>
        </section>
      ) : (
        exams.map((group) => {
          const sessions = Object.entries(group.sessions).sort(([a], [b]) => a.localeCompare(b));
          return (
            <section key={group.exam} className="rl-section" aria-label={group.exam}>
              <SectionHead title={group.exam} meta={`${sessions.length} session${sessions.length > 1 ? "s" : ""}`} />
              <div className="grid grid-cols-1 gap-4 md:gap-[18px]">
                {sessions.map(([label, { topics, complete }]) => {
                  const focal = first;
                  first = false;
                  return <SessionBlock key={label} label={label} topics={topics} complete={complete} focal={focal} />;
                })}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
