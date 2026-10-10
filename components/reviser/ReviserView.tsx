import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Icone } from "@/components/adn/icons";
import { DomainSpace } from "@/components/reviser/DomainSpace";
import { SubjectExplorer } from "@/components/reviser/SubjectExplorer";
import { SubjectPanel } from "@/components/reviser/SubjectPanel";
import { subjectRail } from "@/components/reviser/rail";
import { SUBJECTS, type SubjectAvailability } from "@/components/reviser/catalog";
import { ESPACES } from "@/lib/voice-z4";

// Espace « Réviser ». Le point focal : les trois fonds de révision, les
// fiches (seule surface héros, seul bouton plein) et, à côté, les flashcards
// et les cours complets en cartes ; puis les 10 matières en rangée
// horizontale (maîtrise, formats disponibles) : choisir une matière montre
// sa fiche, son cours et ses cartes. Sans requête : app/reviser charge les
// données, l'aperçu en fournit d'exemple.

const count = (n: number) => (n ? `${n} matière${n > 1 ? "s" : ""}` : "bientôt");

/** Ligne d'un format secondaire (aussi pour S'entraîner). entier : la description passe à la ligne au lieu d'être coupée (colonnes étroites). */
export function FormatRow({ href, icon, title, desc, meta, entier = false }: { href: string; icon: React.ReactNode; title: string; desc: string; meta?: string | null; entier?: boolean }) {
  return (
    <Link href={href} className="rl-row group flex h-full items-center gap-4 px-5 py-[18px] md:px-6">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-surface-2">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-bold leading-tight tracking-[-0.01em]">{title}</span>
        <span className={"t-micro mt-1 block " + (entier ? "" : "sm:truncate")}>{desc}</span>
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

/** Un fonds secondaire (flashcards, cours complets), en carte à côté des fiches. */
function FundCard({ href, index, icon, title, desc, meta }: { href: string; index: string; icon: React.ReactNode; title: string; desc: string; meta?: string | null }) {
  return (
    <Link href={href} className="card rl-lift group flex items-center gap-5 p-6 md:p-7">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-surface-2">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="t-eyebrow block">{index}</span>
        <span className="t-h3 mt-1.5 block">{title}</span>
        <span className="t-small mt-1 block">{desc}</span>
        {meta && <span className="t-micro mt-2 block font-semibold">{meta}</span>}
      </span>
      <ChevronRight size={18} aria-hidden className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

export function ReviserView({
  subjects,
  matiere,
  flashcardSets = null,
}: {
  subjects: SubjectAvailability[];
  matiere?: string | null;
  /** sets de flashcards officiels publiés (null : inconnu, on compte les matières) */
  flashcardSets?: number | null;
}) {
  const fiches = subjects.filter((s) => s.fiche).length;
  const courses = subjects.filter((s) => s.course).length;
  const cards = subjects.filter((s) => s.flashcards).length;

  const lead = (
    <div className="grid gap-4 md:gap-[18px] lg:grid-cols-12">
      <Link
        href="/fiches"
        className="card-hero rl-lift rl-in group flex min-h-[280px] flex-col gap-4 p-7 md:p-9 lg:col-span-7"
        aria-label="Ouvrir les fiches de révision"
        data-leonard="fiches"
      >
        <span className="flex items-center justify-between gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-[14px] bg-surface-2">
            <Icone nom="fiche" size={24} />
          </span>
          <span className="t-micro font-semibold">{count(fiches)}</span>
        </span>
        <span className="mt-auto flex flex-col gap-2">
          <span className="t-eyebrow">Fonds 01</span>
          <span className="t-h1">Fiches de révision</span>
          <span className="t-body max-w-[460px] text-muted">{ESPACES.fichesTexte}</span>
        </span>
        <span className="btn btn-primary rl-press mt-2 w-fit">
          Ouvrir les fiches <ArrowRight size={16} aria-hidden />
        </span>
      </Link>

      <div className="rl-in grid auto-rows-fr gap-4 md:gap-[18px] lg:col-span-5" style={{ animationDelay: ".08s" }} data-leonard="formats">
        <FundCard
          href="/flashcards"
          index="Fonds 02"
          icon={<Icone nom="flashcards" size={22} />}
          title="Flashcards"
          desc="Répétition espacée : termes, formules, pièges."
          meta={flashcardSets ? `${flashcardSets} set${flashcardSets > 1 ? "s" : ""}` : cards ? count(cards) : null}
        />
        <FundCard
          href="/courses"
          index="Fonds 03"
          icon={<Icone nom="cours" size={22} />}
          title="Cours complets"
          desc="Le cours intégral par matière, à lire ou à écouter."
          meta={courses ? count(courses) : null}
        />
      </div>
    </div>
  );

  return (
    <DomainSpace kicker="Réviser" icon={<Icone nom="reviser" size={18} />} title={ESPACES.reviserTitre} lead={lead}>
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
