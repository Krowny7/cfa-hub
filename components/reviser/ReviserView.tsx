import Link from "next/link";
import { ArrowRight, ChevronRight, Copy, FileText, Headphones, Library } from "lucide-react";
import { DomainSpace } from "@/components/reviser/DomainSpace";
import { SubjectExplorer } from "@/components/reviser/SubjectExplorer";
import { SubjectPanel } from "@/components/reviser/SubjectPanel";
import { subjectRail } from "@/components/reviser/rail";
import { SUBJECTS, type SubjectAvailability } from "@/components/reviser/catalog";

// Espace « Réviser ». Le point focal : les fiches (seule surface héros, seul
// bouton plein) ; à côté, les autres formats en lignes calmes ; puis les 10
// matières en rangée horizontale (maîtrise, formats disponibles) : choisir
// une matière montre sa fiche, son cours et ses cartes. Sans requête :
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

/**
 * Matière ouverte au départ : celle demandée (?matiere=), sinon ta plus
 * faible parmi celles qui ont déjà un contenu, sinon la première qui a une fiche.
 */
function initialSubject(subjects: SubjectAvailability[], requested?: string | null) {
  if (requested && subjects.some((s) => s.key === requested)) return requested;
  const withContent = subjects.filter((s) => s.fiche || s.course || s.flashcards);
  const measured = withContent.filter((s) => s.pct !== null) as (SubjectAvailability & { pct: number })[];
  if (measured.length) return measured.reduce((a, b) => (b.pct < a.pct ? b : a)).key;
  return (withContent[0] ?? subjects[0])?.key ?? "";
}

export function ReviserView({ subjects, matiere }: { subjects: SubjectAvailability[]; matiere?: string | null }) {
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
          <span className="t-micro">choisis une matière : sa fiche, son cours et ses cartes</span>
        </div>
        <SubjectExplorer
          initial={initialSubject(subjects, matiere)}
          items={subjectRail(subjects, (key) => {
            const s = subjects.find((x) => x.key === key);
            return { formats: { fiche: !!s?.fiche, course: !!s?.course, cards: !!s?.flashcards } };
          })}
          panels={Object.fromEntries(
            subjects.map((s) => {
              const i = SUBJECTS.findIndex((x) => x.key === s.key);
              return [s.key, <SubjectPanel key={s.key} s={s} index={i + 1} code={SUBJECTS[i]?.code ?? ""} />];
            }),
          )}
        />
      </section>
    </DomainSpace>
  );
}
