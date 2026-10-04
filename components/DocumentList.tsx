import Link from "next/link";
import { ArrowRight, ChevronRight, ExternalLink, FileText } from "lucide-react";
import { Icone } from "@/components/adn/icons";
import { cleanFolderName, plural, visibilityLabel } from "@/components/ContentDetailHeader";

// La Bibliothèque : l'entrée vers les trois fonds de révision (fiches,
// flashcards, cours complets) et, s'il y en a, les liens PDF ajoutés par le
// joueur. Composants sans requête ni état : app/library charge les données,
// l'aperçu en fournit d'exemple.

export type LibraryDoc = {
  id: string;
  title: string;
  visibility: "private" | "group" | "groups" | "public";
  created_at: string;
  external_url: string;
  preview_url: string | null;
  library_folders?: { name: string } | null;
};

/** Les liens PDF d'un joueur : une ligne chacun, ouverte dans la bibliothèque ou dans un nouvel onglet. */
export function DocumentList({ docs }: { docs: LibraryDoc[] }) {
  if (docs.length === 0) {
    return (
      <div className="card-quiet grid place-items-center px-6 py-12 text-center">
        <p className="t-small">Aucun document pour l&apos;instant.</p>
      </div>
    );
  }
  return (
    <div className="card divide-y divide-line overflow-hidden">
      {docs.map((d) => (
        <div key={d.id} className="rl-row flex items-center gap-2 pr-3 md:pr-4">
          <Link href={`/library/${d.id}`} className="group flex min-w-0 flex-1 items-center gap-4 py-4 pl-5 md:pl-6">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-surface-2">
              <FileText size={18} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold leading-tight tracking-[-0.01em]">{d.title}</span>
              <span className="t-micro mt-1 block truncate">
                {[
                  visibilityLabel(d.visibility),
                  cleanFolderName(d.library_folders?.name),
                  new Date(d.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
            <ChevronRight size={16} aria-hidden className="hidden shrink-0 text-muted transition-transform group-hover:translate-x-0.5 sm:block" />
          </Link>
          {d.external_url && (
            <a href={d.external_url} target="_blank" rel="noreferrer" className="icon-btn h-9 w-9 rounded-[11px]" aria-label={`Ouvrir « ${d.title} » dans un nouvel onglet`} title="Nouvel onglet">
              <ExternalLink size={15} aria-hidden />
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

/** Une ligne de fonds secondaire (flashcards, cours). */
function FundCard({ href, index, icon, title, desc, meta }: { href: string; index: string; icon: React.ReactNode; title: string; desc: string; meta?: string | null }) {
  return (
    <Link href={href} className="card rl-lift group flex items-center gap-5 p-6 md:p-7 lg:col-span-5">
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

export function LibraryView({
  fiches,
  courses,
  flashcardSets,
  docs,
}: {
  /** matières qui ont une fiche */
  fiches: number;
  /** matières qui ont un cours complet */
  courses: number;
  /** sets de flashcards Système (null : inconnu) */
  flashcardSets: number | null;
  docs: LibraryDoc[];
}) {
  return (
    <div className="rl-wide rl-page">
      <div className="flex flex-col gap-7 md:gap-10">
        <header className="flex flex-col gap-3">
          <p className="t-small font-semibold">Réviser · CFA Niveau I</p>
          <h1 className="t-hero rl-in m-0">Bibliothèque</h1>
        </header>

        <div className="grid gap-4 md:gap-[18px] lg:grid-cols-12">
          <Link
            href="/fiches"
            className="card-hero rl-lift rl-in group flex min-h-[280px] flex-col gap-4 p-7 md:p-9 lg:col-span-7 lg:row-span-2"
            aria-label="Ouvrir les fiches de révision"
          >
            <span className="flex items-center justify-between gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-[14px] bg-surface-2">
                <Icone nom="fiche" size={24} />
              </span>
              <span className="t-micro font-semibold">{fiches ? plural(fiches, "matière", "matières") : "bientôt"}</span>
            </span>
            <span className="mt-auto flex flex-col gap-2">
              <span className="t-eyebrow">Fonds 01</span>
              <span className="t-h1">Fiches de révision</span>
              <span className="t-body max-w-[460px] text-muted">Une synthèse par thème, les formules clés, puis son quiz corrigé.</span>
            </span>
            <span className="btn btn-primary rl-press mt-2 w-fit">
              Ouvrir les fiches <ArrowRight size={16} aria-hidden />
            </span>
          </Link>

          <FundCard
            href="/flashcards"
            index="Fonds 02"
            icon={<Icone nom="flashcards" size={22} />}
            title="Flashcards"
            desc="Répétition espacée : termes, formules, pièges."
            meta={flashcardSets ? plural(flashcardSets, "set", "sets") : null}
          />
          <FundCard
            href="/courses"
            index="Fonds 03"
            icon={<Icone nom="cours" size={22} />}
            title="Cours complets"
            desc="Le cours intégral par matière, à lire ou à écouter."
            meta={courses ? plural(courses, "matière", "matières") : null}
          />
        </div>
      </div>

      {docs.length > 0 && (
        <section className="rl-section" aria-labelledby="bib-docs">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="bib-docs" className="t-h2 m-0">
              Tes documents
            </h2>
            <span className="t-micro font-mono tabular-nums">{docs.length}</span>
          </div>
          <DocumentList docs={docs} />
        </section>
      )}
    </div>
  );
}
