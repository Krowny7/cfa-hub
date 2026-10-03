"use client";

import { useId } from "react";
import { INK } from "@/components/ui/InkDefs";
import { RING_FULL_AXIS } from "@/components/ink/paths";

// Les anneaux à l'encre (même tracé que le logo) : la signature du site,
// réservée à quelques endroits — grand anneau de fond (enso) derrière un titre,
// anneau de progression (objectif du jour). L'enso apparaît en fondu ; seul
// l'anneau de progression se dessine au pinceau.

/** Grand anneau d'encre décoratif, presque transparent, à poser derrière un titre. */
export function Enso({
  size = 460,
  opacity = 0.05,
  rotate = -18,
  extent = 86,
  className = "",
}: {
  size?: number;
  opacity?: number;
  rotate?: number;
  /** part de l'anneau tracée, 0–100 */
  extent?: number;
  className?: string;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg
      viewBox="-12 -12 264 264"
      width={size}
      height={size}
      aria-hidden
      className={"rl-deco pointer-events-none " + className}
      style={{ opacity, transform: `rotate(${rotate}deg)`, color: "var(--ink)" }}
    >
      <mask id={`${id}m`} maskUnits="userSpaceOnUse" x="-20" y="-20" width="280" height="280">
        <path d={RING_FULL_AXIS} pathLength={100} className="rl-enso" fill="none" stroke="#fff" strokeWidth={60} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${extent} 140`} />
      </mask>
      <g mask={`url(#${id}m)`}>
        <use href={INK.ring} filter="url(#rl-ink)" fill="currentColor" />
      </g>
      <use href={INK.logoSplat} fill="currentColor" />
    </svg>
  );
}

/** Anneau de progression au pinceau (ex. objectif du jour). Contenu centré dans l'anneau. */
export function InkProgressRing({
  pct,
  size = 150,
  delay = 0.4,
  children,
}: {
  pct: number;
  size?: number;
  delay?: number;
  children?: React.ReactNode;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const p = Math.max(0, Math.min(100, pct));
  return (
    <div style={{ position: "relative", width: size, height: size, flex: "none" }}>
      <svg viewBox="-12 -12 264 264" width={size} height={size} aria-hidden style={{ display: "block", color: "var(--ink)" }}>
        {/* Le tracé animé du masque reste un vrai <path> : animé à travers un
            <use>, Chrome ne repeint pas toujours le masque. À 0 %, rien n'est
            tracé (le bout rond laisserait un point). */}
        <mask id={`${id}m`} maskUnits="userSpaceOnUse" x="-20" y="-20" width="280" height="280">
          {p > 0 && <path
            d={RING_FULL_AXIS}
            pathLength={100}
            className="rl-halo"
            style={{ animationDelay: `${delay}s` }}
            fill="none"
            stroke="#fff"
            strokeWidth={60}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${p} 140`}
          />}
        </mask>
        {/* piste : le tracé complet en filigrane, à peine plus marqué que le papier */}
        <use href={INK.logoTrack} fill="none" stroke="currentColor" strokeOpacity={0.08} strokeWidth={12} strokeLinejoin="round" />
        <g mask={`url(#${id}m)`}>
          <use href={INK.ring} filter="url(#rl-ink)" fill="currentColor" />
        </g>
      </svg>
      {children && <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>{children}</div>}
    </div>
  );
}
