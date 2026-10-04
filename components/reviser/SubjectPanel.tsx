import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Icone } from "@/components/adn/icons";
import { pct } from "@/lib/voice";
import { ESPACES } from "@/lib/voice-z4";
import { COURSES } from "@/lib/courses";
import { ficheInfo } from "@/components/reviser/shelves";
import { SubjectGlyph } from "@/components/ui/SubjectGlyph";
import { pad2, weightLabel } from "@/components/reviser/rail";
import type { SubjectAvailability } from "@/components/reviser/catalog";

// Détail d'une matière dans Réviser : son rang dans le programme, ta
// maîtrise, puis ce qui existe vraiment pour elle (fiche, cours complet,
// flashcards), un format par tuile. Un format pas encore prêt s'affiche en
// filigrane, sans lien. Sans état : rendu par le serveur.

function FormatTile({
  href,
  icon,
  title,
  meta,
  desc,
}: {
  href: string | null;
  icon: React.ReactNode;
  title: string;
  meta: string;
  desc?: string | null;
}) {
  // Téléphone : une ligne (icône, texte, chevron) ; ordinateur : une tuile.
  if (!href) {
    return (
      <div className="flex items-center gap-4 rounded-[18px] border border-dashed border-line-2 p-4 text-muted sm:min-h-[132px] sm:flex-col sm:items-start sm:gap-3 sm:p-5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] border border-line opacity-60">{icon}</span>
        <span className="min-w-0 sm:mt-auto">
          <span className="block text-[15px] font-semibold">{title}</span>
          <span className="t-micro mt-1 block">à venir</span>
        </span>
      </div>
    );
  }
  return (
    <Link href={href} className="card-quiet rl-lift group flex items-center gap-4 p-4 sm:min-h-[132px] sm:flex-col sm:items-stretch sm:gap-3 sm:p-5">
      <span className="flex shrink-0 items-center justify-between gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-surface">{icon}</span>
        <ChevronRight size={16} aria-hidden className="hidden text-muted transition-transform group-hover:translate-x-0.5 sm:block" />
      </span>
      <span className="min-w-0 flex-1 sm:mt-auto sm:flex-none">
        <span className="block text-[16px] font-bold leading-tight tracking-[-0.01em]">{title}</span>
        <span className="t-micro mt-1 block font-semibold">{meta}</span>
        {desc && <span className="t-small mt-1.5 hidden sm:line-clamp-2">{desc}</span>}
      </span>
      <ChevronRight size={16} aria-hidden className="shrink-0 text-muted sm:hidden" />
    </Link>
  );
}

export function SubjectPanel({ s, index, code }: { s: SubjectAvailability; index: number; code: string }) {
  const course = s.course ? COURSES.find((c) => c.slug === s.course) ?? null : null;
  const fiche = s.fiche ? ficheInfo(s.fiche) : null;
  const weight = weightLabel(s.key);
  const nothingYet = !s.fiche && !course && !s.flashcards;
  const firstModules = course ? course.chapters.slice(0, 2).map((c) => c.title).join(", ") + (course.chapters.length > 2 ? "…" : "") : null;

  return (
    <section className="card flex flex-col gap-6 p-5 sm:p-7 md:p-8" aria-label={s.name}>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 items-start gap-4 sm:gap-5">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[16px] bg-surface-2">
            <SubjectGlyph subject={s.key} size={30} />
          </span>
          <div className="min-w-0">
            <p className="t-eyebrow">
              Matière {pad2(index)} · {code}
            </p>
            <h3 className="t-h2 m-0 mt-1.5 [overflow-wrap:anywhere]">{s.name}</h3>
            <p className="t-small mt-1.5">
              {s.pct === null ? (
                ESPACES.maitriseAVenir
              ) : (
                <>
                  <b className="font-semibold text-white">{pct(s.pct)}</b> de maîtrise · il reste {pct(100 - s.pct)}
                </>
              )}
              {weight && <> · {weight}</>}
            </p>
          </div>
        </div>
        <Link href={`/practice?topic=${s.key}`} className="btn btn-secondary rl-press">
          S&apos;entraîner sur la matière <ArrowRight size={16} aria-hidden />
        </Link>
      </header>

      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <FormatTile
          href={s.fiche ? `/fiches/${s.fiche}` : null}
          icon={<Icone nom="fiche" size={20} />}
          title="Fiche de révision"
          meta={fiche?.meta ?? ""}
          desc={fiche?.desc}
        />
        <FormatTile
          href={course ? `/courses/${course.slug}` : null}
          icon={<Icone nom="cours" size={20} />}
          title="Cours complet"
          meta={course ? `${course.chapters.length} modules · ${course.minutes} min d'audio` : ""}
          desc={firstModules}
        />
        <FormatTile
          href={s.flashcards}
          icon={<Icone nom="flashcards" size={20} />}
          title="Flashcards"
          meta={s.flashcardSets ? `${s.flashcardSets} paquet${s.flashcardSets > 1 ? "s" : ""}` : ""}
          desc="Répétition espacée : termes, formules, pièges."
        />
      </div>

      {nothingYet && <p className="t-small -mt-2">Fiche et cours en préparation : en attendant, les sessions ciblées et les QCM couvrent déjà la matière.</p>}
    </section>
  );
}
