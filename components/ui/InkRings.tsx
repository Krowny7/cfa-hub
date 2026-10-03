"use client";

import { useId } from "react";
import { LOGO_SPLAT, LOGO_TRACK, RING_FULL, RING_FULL_AXIS } from "@/components/ink/paths";

// Les anneaux à l'encre (même tracé que le logo) : la signature du site,
// réservée à quelques endroits — grand anneau de fond (enso) derrière un titre,
// anneau de progression (objectif du jour). Le pinceau se dessine à
// l'apparition.

/** Grand anneau d'encre décoratif, presque transparent, à poser derrière un titre. */
export function Enso({
  size = 460,
  opacity = 0.07,
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
      style={{ display: "block", opacity, transform: `rotate(${rotate}deg)`, color: "var(--ink)" }}
    >
      <mask id={`${id}m`} maskUnits="userSpaceOnUse" x="-20" y="-20" width="280" height="280">
        <path d={RING_FULL_AXIS} pathLength={100} className="rl-enso" fill="none" stroke="#fff" strokeWidth={60} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${extent} 140`} />
      </mask>
      <g mask={`url(#${id}m)`}>
        <path d={RING_FULL} filter="url(#rl-ink)" fill="currentColor" />
      </g>
      <path d={LOGO_SPLAT} fill="currentColor" />
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
        <mask id={`${id}m`} maskUnits="userSpaceOnUse" x="-20" y="-20" width="280" height="280">
          <path
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
          />
        </mask>
        <path d={LOGO_TRACK} fill="none" stroke="currentColor" strokeOpacity={0.1} strokeWidth={10} strokeLinejoin="round" />
        <g mask={`url(#${id}m)`}>
          <path d={RING_FULL} filter="url(#rl-ink)" fill="currentColor" />
        </g>
      </svg>
      {children && <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>{children}</div>}
    </div>
  );
}
