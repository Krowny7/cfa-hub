"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { BOUCLE } from "@/lib/voice-z3c";

// Les mémos des flashcards (Fixed Income d'abord) : la mini-fiche A5 d'un
// paquet, ou la fiche A4 de toutes les cartes d'une matière, affichées en
// image sous la révision (bucket privé « fiches », URL signée). Sur le mémo
// d'un paquet, la zone de la carte à l'écran est surlignée en jaune : la
// révision annonce la carte courante (EVENEMENT_CARTE), les zones viennent
// de lib/flashcards/memos (boîtes mesurées sur la fiche HTML, en % de l'image).

/** La révision annonce la carte à l'écran : detail = { id } (null : aucune). */
export const EVENEMENT_CARTE = "rl:carte-courante";

export function Memo({
  src,
  pdf,
  titre,
  ratio,
  boites = {},
  positions = {},
}: {
  src: string;
  pdf: string | null;
  titre: string;
  /** largeur / hauteur de l'image */
  ratio: number;
  /** position de la carte (1 à 15) → zones [x, y, l, h] en % */
  boites?: Record<string, number[][]>;
  /** id de carte → position dans le paquet */
  positions?: Record<string, number>;
}) {
  const [pos, setPos] = useState<number | null>(null);
  useEffect(() => {
    const ecouter = (e: Event) => {
      const id = (e as CustomEvent<{ id: string | null }>).detail?.id ?? null;
      setPos(id ? (positions[id] ?? null) : null);
    };
    window.addEventListener(EVENEMENT_CARTE, ecouter);
    return () => window.removeEventListener(EVENEMENT_CARTE, ecouter);
  }, [positions]);
  const zones = pos ? (boites[String(pos)] ?? []) : [];

  return (
    <figure className="m-0 grid gap-2">
      <div className="relative w-full overflow-hidden rounded-[14px] border border-line bg-white shadow-[var(--shadow-1)]" style={{ aspectRatio: String(ratio) }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={titre} className="block h-full w-full" loading="lazy" decoding="async" draggable={false} />
        {zones.map(([x, y, l, h], i) => (
          <span
            key={i}
            aria-hidden
            className="pointer-events-none absolute rounded-[3px] bg-[rgba(255,208,0,.34)] mix-blend-multiply transition-[top,left,width,height] duration-300 motion-reduce:transition-none"
            style={{ left: `${x}%`, top: `${y}%`, width: `${l}%`, height: `${h}%` }}
          />
        ))}
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span className="t-micro">{zones.length ? BOUCLE.memoSurligne : BOUCLE.memoAide}</span>
        {pdf && (
          <a href={pdf} target="_blank" rel="noopener noreferrer" className="ink-link inline-flex min-h-[44px] items-center gap-1 text-[14px] font-semibold">
            {BOUCLE.memoPdf} <ArrowUpRight size={14} aria-hidden />
          </a>
        )}
      </figcaption>
    </figure>
  );
}
