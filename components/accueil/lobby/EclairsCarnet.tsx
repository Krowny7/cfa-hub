"use client";

import { useEffect, useRef } from "react";
import { couleurArc } from "@/components/ui/ArcElectrique";
import { animerEclairsCases } from "./eclairs-carnet-anim";
import k from "./CarnetJours.module.css";

// Les éclairs autour des cinq meilleurs jours du carnet (les cases [data-eclair]) : une
// toile sur toute la grille, de la couleur de l'arc de la carte des 5. Le parent est en
// position: relative ; aria-hidden et pointer-events: none, coupée en mode discret.

export function EclairsCarnet({ palier }: { palier: number }) {
  const toile = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const el = toile.current;
    return el ? animerEclairsCases(el, couleurArc(palier)) : undefined;
  }, [palier]);
  return <canvas ref={toile} aria-hidden className={k.eclairs} />;
}
