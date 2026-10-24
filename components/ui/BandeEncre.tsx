import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FormatRow } from "@/components/ui/FormatRow";

// Deux briques de mise en page partagées par les pages refaites (accueil,
// S'entraîner…) : la bande d'encre pleine largeur et la rangée de liens.
// Sans état.

/** La bande d'encre : une .card-ink pleine largeur, une icône (ou une vignette), un titre, une ligne, un bouton clair. */
export function BandeEncre({
  icone,
  titre,
  ligne,
  action,
  vignette,
  dataLeonard,
  lueur,
}: {
  icone: React.ReactNode;
  titre: React.ReactNode;
  ligne: React.ReactNode;
  action: { href: string; label: string };
  vignette?: React.ReactNode;
  dataLeonard?: string;
  /** couleur de la lueur du palier (--tier-glow) */
  lueur?: string;
}) {
  return (
    <section data-leonard={dataLeonard} className="card-ink rl-in flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6 sm:px-7 sm:py-6" style={{ animationDelay: ".1s", ...(lueur ? { "--tier-glow": lueur } : {}) } as React.CSSProperties}>
      <div className="flex min-w-0 flex-1 items-center gap-4">
        {vignette ? (
          <span aria-hidden className="block h-14 w-[76px] shrink-0 overflow-hidden rounded-[12px] sm:h-[68px] sm:w-[104px]">
            {vignette}
          </span>
        ) : (
          <span aria-hidden className="bande-encre-icone grid h-12 w-12 shrink-0 place-items-center rounded-[14px]">
            {icone}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="m-0 text-[19px] font-bold leading-tight tracking-[-0.015em] md:text-[21px]">{titre}</h2>
          <p className="m-0 mt-1 text-[13.5px] leading-snug opacity-75 md:text-[14.5px]">{ligne}</p>
        </div>
      </div>
      <Link href={action.href} className="btn btn-lg btn-on-ink rl-press w-full shrink-0 sm:w-auto">
        {action.label} <ArrowRight size={17} aria-hidden />
      </Link>
    </section>
  );
}

/** Les liens restants, en une rangée à séparateurs verticaux (une colonne sur téléphone). */
export function RangeeLiens({
  label,
  liens,
}: {
  label: string;
  liens: { href: string; icon: React.ReactNode; title: string; desc: string; meta?: string | null }[];
}) {
  return (
    <nav aria-label={label} className="card rl-in overflow-hidden px-1 py-1" style={{ animationDelay: ".14s" }}>
      <ul className="m-0 grid list-none grid-cols-1 divide-y divide-line p-0 xl:grid-cols-3 xl:divide-x xl:divide-y-0">
        {liens.map((f) => (
          <li key={f.title} className="min-w-0">
            <FormatRow href={f.href} icon={f.icon} title={f.title} desc={f.desc} meta={f.meta} entier />
          </li>
        ))}
      </ul>
    </nav>
  );
}
