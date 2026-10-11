"use client";

import { useEffect, useId, useRef } from "react";
import { INSIGNES } from "@/lib/rank-badge";
import { TIERS } from "@/lib/ranks";
import { animerArc } from "@/components/ui/arc-electrique-anim";
import s from "./ArcElectrique.module.css";

// L'arc électrique de la compétition, repris de l'aura des insignes de rang
// (RankBadge) : même couleur que l'aura du palier, même bruit qui change de
// graine par à-coups. Deux formes, une seule boucle d'animation :
//   <ArcElectrique palier={rank.tierIndex} />     le contour d'une carte
//   <EclairLiaison palier={…} className="…" />    un petit éclair entre deux lignes
// À réserver aux moments où il y a de l'enjeu : un défi qui attend, le palier
// suivant tout proche, un rival à portée. Sinon, rien.
//
// Léger : du SVG (feTurbulence + feDisplacementMap), pas de canvas ; en pause
// hors écran ; posé en mouvement réduit et avec ?mouvement=off ; coupé en mode
// discret ; pointer-events: none et aria-hidden (aucune gêne pour le texte
// ni pour les clics). Le contour se pose dans un parent en position: relative
// (card-hero, card-quiet…) et suit son arrondi.

/** Couleur de l'aura du palier ; Bronze, Argent et Or, qui n'en ont pas, prennent leur métal. */
export function couleurArc(palier: number): string {
  const i = Math.max(0, Math.min(TIERS.length - 1, palier));
  const d = INSIGNES[i];
  return d.elec?.c ?? d.metal[1];
}

const sansSymboles = (id: string) => "arc" + id.replace(/[^a-zA-Z0-9]/g, "");

export function ArcElectrique({ palier, rayon = 22, className = "" }: { palier: number; /** arrondi de la carte, en px (card-hero : 22, card : 18) */ rayon?: number; className?: string }) {
  const uid = sansSymboles(useId());
  const racine = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    const el = racine.current;
    if (!el) return;
    return animerArc(el, el.querySelector("[data-bruit]"), { freq: [0.03, 0.05], tour: 9000 });
  }, []);
  const rect = { x: 0, y: 0, width: "100%", height: "100%", rx: rayon, pathLength: 100 } as const;
  return (
    <span ref={racine} aria-hidden data-arc="contour" className={`${s.arc} ${s.contour} ${className}`} style={{ ["--arc-c" as string]: couleurArc(palier) }}>
      <svg>
        <defs>
          <filter id={`${uid}f`} x="-4%" y="-14%" width="108%" height="128%">
            <feTurbulence data-bruit="" type="fractalNoise" baseFrequency=".04" numOctaves={1} seed={11} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={8} xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id={`${uid}b`} x="-4%" y="-14%" width="108%" height="128%">
            <feGaussianBlur stdDeviation="3.2" />
          </filter>
        </defs>
        <rect className={s.fil} {...rect} />
        <g filter={`url(#${uid}b)`}>
          <rect className={`${s.trait} ${s.lueur}`} {...rect} />
        </g>
        <g filter={`url(#${uid}f)`}>
          <rect className={`${s.trait} ${s.coeur}`} {...rect} />
          <rect className={`${s.trait} ${s.blanc}`} {...rect} />
        </g>
      </svg>
    </span>
  );
}

/**
 * Un petit éclair vertical, 22 × 30 px, pour relier deux lignes d'une liste.
 * Se place en absolu sur la jonction (le parent est en position: relative).
 */
export function EclairLiaison({ palier, className = "" }: { palier: number; className?: string }) {
  const uid = sansSymboles(useId());
  const racine = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    const el = racine.current;
    if (!el) return;
    return animerArc(el, el.querySelector("[data-bruit]"), { freq: [0.1, 0.2], tour: 0 });
  }, []);
  const zig = "M11 1 L7.5 9 L13.5 14 L8.5 21 L11 29";
  return (
    <span ref={racine} aria-hidden data-arc="eclair" className={`${s.arc} ${s.eclair} ${className}`} style={{ ["--arc-c" as string]: couleurArc(palier), width: 22, height: 30 }}>
      <svg viewBox="0 0 22 30">
        <defs>
          <filter id={`${uid}f`} x="-60%" y="-20%" width="220%" height="140%">
            <feTurbulence data-bruit="" type="fractalNoise" baseFrequency=".14" numOctaves={1} seed={5} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={3.4} xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <filter id={`${uid}b`} x="-100%" y="-20%" width="300%" height="140%">
            <feGaussianBlur stdDeviation="1.6" />
          </filter>
        </defs>
        <g filter={`url(#${uid}b)`}>
          <path className={`${s.zig} ${s.lueur}`} d={zig} style={{ strokeWidth: 3.6 }} />
        </g>
        <g filter={`url(#${uid}f)`}>
          <path className={`${s.zig} ${s.coeur}`} d={zig} style={{ strokeWidth: 1.5 }} />
          <path className={`${s.zig} ${s.blanc}`} d={zig} style={{ strokeWidth: 0.7 }} />
        </g>
      </svg>
    </span>
  );
}
