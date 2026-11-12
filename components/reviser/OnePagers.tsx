import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { pad2 } from "@/components/reviser/rail";
import type { OnePagerItem } from "@/components/reviser/shelves";
import { OP } from "@/lib/voice-reviser";
import { Presentoir, type Piece } from "@/components/ui/Presentoir";
import s from "./OnePagers.module.css";

// Les one-pagers (une page A4 PDF par matière) : la grille de vignettes de
// /fiches/one-pagers et la carte d'accès posée sous l'index de
// /fiches. Les PDF vivent dans le bucket privé « fiches » : la page reçoit
// leurs URL signées, générées côté serveur. Sans état ni requête.

/**
 * Les one-pagers sur le présentoir (components/ui/Presentoir) : la vignette A4 de chaque matière,
 * rang et code, poids à l'examen ; le PDF s'ouvre dans un nouvel onglet. `url` null : PDF
 * indisponible (feuille en filigrane, sans lien).
 */
export function OnePagersGrille({ items }: { items: (OnePagerItem & { url: string | null })[] }) {
  const pieces: Piece[] = items.map((it) => ({
    cle: it.key,
    href: it.url,
    externe: true,
    numero: pad2(it.index),
    code: it.code,
    titre: it.name,
    ligne: (it.url ? it.weight : OP.indisponible) ?? undefined,
    image: it.thumb,
    aria: OP.ouvrir(it.name),
  }));
  return <Presentoir pieces={pieces} label={OP.titre} />;
}

/** L'accès depuis /fiches : une petite pile de feuilles, un titre, une ligne, vers /fiches/one-pagers. */
export function OnePagersAcces({ items }: { items: OnePagerItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="rl-section" aria-label={OP.titre}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="t-h2 m-0">{OP.titre}</h2>
        <span className="t-micro">{OP.accesAide}</span>
      </div>
      <Link href="/fiches/one-pagers" className={"card rl-lift group " + s.acces}>
        <span aria-hidden className={s.pile}>
          {items.slice(0, 4).map((it) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={it.key} src={it.mini} alt="" width={144} height={204} loading="lazy" decoding="async" className={s.feuille} />
          ))}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-bold leading-tight tracking-[-0.01em]">{OP.accesTitre}</span>
          <span className="t-micro mt-1 block">{OP.accesLigne}</span>
        </span>
        <span className="t-micro hidden shrink-0 font-semibold sm:inline">{items.length} PDF</span>
        <ChevronRight size={16} aria-hidden className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
      </Link>
    </section>
  );
}
