import Link from "next/link";
import { ArrowRight, ChevronRight, Copy, FileText, Headphones, Library } from "lucide-react";
import { DomainSpace } from "@/components/reviser/DomainSpace";
import { MasteryLine, TwoColumnRows } from "@/components/reviser/SubjectRows";
import type { SubjectAvailability } from "@/components/reviser/catalog";

// Espace « Réviser ». Le point focal : les fiches (seule surface héros, seul
// bouton plein) ; à côté, les autres formats en lignes calmes ; puis les 10
// matières, une ligne chacune : maîtrise en trait fin et une icône par format
// (à l'encre s'il existe, en filigrane s'il est à venir). Sans requête :
// app/reviser charge les données, l'aperçu en fournit d'exemple.

const count = (n: number) => (n ? `${n} matière${n > 1 ? "s" : ""}` : "bientôt");

/** Ligne d'un format secondaire (cours, flashcards, bibliothèque). */
export function FormatRow({ href, icon, title, desc, meta }: { href: string; icon: React.ReactNode; title: string; desc: string; meta?: string | null }) {
  return (
    <Link href={href} className="rl-row group flex items-center gap-4 px-5 py-[18px] md:px-6">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-surface-2">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-bold leading-tight tracking-[-0.01em]">{title}</span>
        <span className="t-micro mt-1 block sm:truncate">{desc}</span>
      </span>
      {meta && <span className="t-micro hidden shrink-0 font-semibold sm:inline">{meta}</span>}
      <ChevronRight size={16} aria-hidden className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function FormatIcon({ href, icon, label, subject }: { href: string | null; icon: React.ReactNode; label: string; subject: string }) {
  const base = "grid h-9 w-9 place-items-center rounded-[10px]";
  if (!href) {
    return (
      <span role="img" aria-label={`${label} ${subject} : à venir`} title={`${label} : à venir`} className={base + " text-muted opacity-35"}>
        {icon}
      </span>
    );
  }
  return (
    <Link href={href} aria-label={`${label} ${subject}`} title={label} className={base + " rl-press hover:bg-surface-2"}>
      {icon}
    </Link>
  );
}

/** Les 10 matières : une ligne chacune, sur deux colonnes. */
export function SubjectList({ subjects }: { subjects: SubjectAvailability[] }) {
  return (
    <TwoColumnRows
      items={subjects}
      keyOf={(s) => s.key}
      render={(s, i) => (
        <div className="flex items-center gap-4 py-3.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="m-0 truncate text-[15px] font-semibold leading-tight">{s.name}</h3>
              <span className="t-micro shrink-0 font-mono tabular-nums" title={s.pct === null ? "pas encore mesuré" : "ta maîtrise"}>
                {s.pct === null ? "—" : `${s.pct} %`}
              </span>
            </div>
            <div className="mt-2.5">
              <MasteryLine pct={s.pct} label={`Maîtrise ${s.name}`} delay={0.3 + i * 0.03} />
            </div>
          </div>
          <div className="-mr-1.5 flex shrink-0 items-center">
            <FormatIcon href={s.fiche ? `/fiches/${s.fiche}` : null} icon={<FileText size={17} />} label="Fiche" subject={s.name} />
            <FormatIcon href={s.course ? `/courses/${s.course}` : null} icon={<Headphones size={17} />} label="Cours" subject={s.name} />
            <FormatIcon href={s.flashcards} icon={<Copy size={17} />} label="Flashcards" subject={s.name} />
          </div>
        </div>
      )}
    />
  );
}

export function ReviserView({ subjects }: { subjects: SubjectAvailability[] }) {
  const fiches = subjects.filter((s) => s.fiche).length;
  const courses = subjects.filter((s) => s.course).length;
  const cards = subjects.filter((s) => s.flashcards).length;

  const lead = (
    <div className="grid gap-4 md:gap-[18px] lg:grid-cols-12">
      <Link href="/fiches" className="card-hero rl-lift rl-in group flex min-h-[260px] flex-col gap-4 p-7 md:p-8 lg:col-span-7" aria-label="Ouvrir les fiches de révision">
        <span className="flex items-center justify-between gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-[14px] bg-surface-2">
            <FileText size={21} />
          </span>
          <span className="t-micro font-semibold">{count(fiches)}</span>
        </span>
        <span className="mt-auto flex flex-col gap-2">
          <span className="t-h1">Fiches de révision</span>
          <span className="t-body max-w-[460px] text-muted">Une page de synthèse par thème, puis son quiz corrigé.</span>
        </span>
        <span className="btn btn-primary rl-press mt-2 w-fit">
          Ouvrir les fiches <ArrowRight size={16} aria-hidden />
        </span>
      </Link>

      <nav aria-label="Autres formats" className="card rl-in flex flex-col justify-center divide-y divide-line overflow-hidden py-1 lg:col-span-5" style={{ animationDelay: ".08s" }}>
        <FormatRow href="/courses" icon={<Headphones size={18} />} title="Cours complets" desc="Le deck intégral et son audio, environ une heure." meta={count(courses)} />
        <FormatRow href="/flashcards" icon={<Copy size={18} />} title="Flashcards" desc="Répétition espacée : termes, formules, pièges." meta={count(cards)} />
        <FormatRow href="/library" icon={<Library size={18} />} title="Bibliothèque" desc="Tous les fonds de révision au même endroit." />
      </nav>
    </div>
  );

  return (
    <DomainSpace kicker="Réviser" title="Apprendre, à ton rythme" lead={lead}>
      <section className="rl-section" aria-labelledby="reviser-matieres">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="reviser-matieres" className="t-h2 m-0">
            Les 10 matières
          </h2>
          <span className="t-micro inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1">
              <FileText size={13} aria-hidden /> fiche
            </span>
            <span className="inline-flex items-center gap-1">
              <Headphones size={13} aria-hidden /> cours
            </span>
            <span className="inline-flex items-center gap-1">
              <Copy size={13} aria-hidden /> cartes
            </span>
            <span className="text-faint">en filigrane : à venir</span>
          </span>
        </div>
        <div className="card px-5 py-1.5 md:px-7">
          <SubjectList subjects={subjects} />
        </div>
      </section>
    </DomainSpace>
  );
}
