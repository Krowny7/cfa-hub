"use client";

import { useEffect, useId, useRef } from "react";
import { INSIGNES } from "@/lib/rank-badge";
import { animerInsigne } from "@/components/ui/rank-badge-anim";
import type { Cadre } from "@/lib/profil/catalogue";
import s from "./Profil.module.css";

// Les cadres du sceau qui bougent, gagnés (lib/profil/catalogue.ts) :
// - liquide : le liquide marbré du palier, celui de son insigne ; il coule
//   par la boucle des insignes (components/ui/rank-badge-anim.ts : un seul
//   contexte WebGL pour tout le site, ~15 images/s, rien hors écran), sur
//   l'image figée du même liquide (public/ranks/v2/liquide-<palier>.webp),
//   qui reste seule en mouvement réduit ou sans WebGL ;
// - aura : le liquide de Grand Maître, et l'aura électrique de son insigne
//   autour du cadre (le bruit change de graine par à-coups, même boucle) ;
// - dorure : la dorure à chaud et un reflet lent (CSS, sur le compositeur).
// `fige` : immobile (les vignettes de Personnaliser).

export function CadreVivant({
  cadre,
  cote,
  fige = false,
  className = "",
  style,
  children,
}: {
  cadre: Cadre;
  /** largeur du cadre, en px (sceau et marge) */
  cote: number;
  fige?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const uid = "cv" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const racine = useRef<HTMLSpanElement | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const bruit = useRef<SVGFETurbulenceElement | null>(null);
  const palier = cadre.palier ?? 0;
  const liquide = cadre.anime === "liquide" || cadre.anime === "aura";
  const elec = cadre.anime === "aura" ? INSIGNES[palier].elec : undefined;

  useEffect(() => {
    if (fige || !liquide || !racine.current) return;
    return animerInsigne(racine.current, palier, { canvas: canvas.current, bruit: bruit.current, eclairs: null, arcs: false });
  }, [fige, liquide, palier]);

  // le canevas du liquide : à peu près la taille affichée (la boucle plafonne à 256 px)
  const px = Math.min(256, Math.ceil(cote * 1.5));
  return (
    <span
      ref={racine}
      className={[s.cadre, s.vivant, liquide ? s.liquide : s.dorure, fige ? s.fige : "", className].join(" ")}
      style={{ ...style, ...(liquide ? { backgroundImage: `url(/ranks/v2/liquide-${palier}.webp)` } : {}) }}
    >
      {liquide && !fige && <canvas ref={canvas} width={px} height={px} aria-hidden className={s.couche} />}
      {elec && (
        // l'aura : le contour du cadre, déformé par un bruit qui tremble, et un halo doux
        <svg className={s.aura} viewBox="-22 -22 144 144" aria-hidden>
          <defs>
            <filter id={`${uid}f`} x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence ref={bruit} type="fractalNoise" baseFrequency=".05" numOctaves={2} seed={9} result="n" />
              <feDisplacementMap in="SourceGraphic" in2="n" scale={elec.d * 0.55} xChannelSelector="R" yChannelSelector="G" result="d" />
              <feGaussianBlur in="d" stdDeviation=".8" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="d" />
              </feMerge>
            </filter>
            <filter id={`${uid}b`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" />
            </filter>
          </defs>
          <g className={s.auraDouce}>
            <rect x="-3" y="-3" width="106" height="106" rx="32" fill="none" stroke={elec.c} strokeWidth={elec.l * 1.4} opacity=".4" filter={`url(#${uid}b)`} />
          </g>
          <g className={s.auraElec} style={{ ["--op" as string]: elec.op }} filter={`url(#${uid}f)`}>
            <rect x="-2" y="-2" width="104" height="104" rx="31" fill="none" stroke={elec.c} strokeWidth={elec.l * 0.5} opacity=".85" />
            <rect x="-2" y="-2" width="104" height="104" rx="31" fill="none" stroke="#fff" strokeWidth={Math.max(0.6, elec.l / 6)} />
          </g>
        </svg>
      )}
      {children}
    </span>
  );
}
