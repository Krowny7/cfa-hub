import Link from "next/link";
import { ArrowLeft, ArrowUpRight, ChevronRight } from "lucide-react";
import { pad2 } from "@/components/reviser/rail";
import type { OnePagerItem } from "@/components/reviser/shelves";
import { OP } from "@/lib/voice-reviser";
import s from "./OnePagers.module.css";

// Les one-pagers (une page A4 PDF par matière) : la page /fiches/one-pagers
// (en-tête, grille de vignettes) et la carte d'accès posée sous l'index de
// /fiches. Les PDF vivent dans le bucket privé « fiches » : la page reçoit
// leurs URL signées, générées côté serveur. Sans état ni requête.

/** En-tête de la page : retour aux fiches, grand titre, une phrase. */
export function OnePagersEntete() {
  return (
    <header className="flex flex-col gap-3">
      <Link href="/fiches" className="t-small inline-flex w-fit items-center gap-1.5 font-semibold hover:text-white">
        <ArrowLeft size={14} aria-hidden /> {OP.retour}
      </Link>
      <h1 className="t-hero rl-in m-0">{OP.titre}</h1>
      <p className="t-body m-0 max-w-[560px] text-muted">{OP.desc}</p>
    </header>
  );
}

/** La grille des one-pagers : vignette A4, rang et code, matière, poids à l'examen. `url` null : PDF indisponible (carte en filigrane, sans lien). */
export function OnePagersGrille({ items }: { items: (OnePagerItem & { url: string | null })[] }) {
  return (
    <ul className={s.grille}>
      {items.map((it) => {
        const inner = (
          <>
            <span className={s.vignette}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.thumb} alt="" width={300} height={425} loading="lazy" decoding="async" />
            </span>
            <span className={s.legende}>
              <span className="min-w-0 flex-1">
                <span className="t-micro block font-mono font-semibold">
                  {pad2(it.index)} · {it.code}
                </span>
                <span className={s.nom + " mt-1"}>{it.name}</span>
                <span className="t-micro mt-1 block">{it.url ? it.weight : OP.indisponible}</span>
              </span>
              {it.url && <ArrowUpRight size={16} aria-hidden className="mt-0.5 shrink-0 text-muted" />}
            </span>
          </>
        );
        return (
          <li key={it.key} className="min-w-0">
            {it.url ? (
              <a href={it.url} target="_blank" rel="noopener noreferrer" aria-label={OP.ouvrir(it.name)} className={"card rl-lift " + s.carte}>
                {inner}
              </a>
            ) : (
              <div aria-disabled className={"card-quiet " + s.carte + " " + s.indispo}>
                {inner}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
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
