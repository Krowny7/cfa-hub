"use client";

import { useEffect, useRef } from "react";
import { couleurArc } from "@/components/ui/ArcElectrique";
import { animerArcCoin } from "@/components/ui/arc-coin-anim";
import s from "./ArcCoin.module.css";

// L'arc du coin : un courant électrique qui longe le coin bas droit d'une
// carte, de la couleur de l'aura du palier (comme ArcElectrique), plein près du
// coin et effilé vers les deux bouts. Animé en continu au canvas
// (arc-coin-anim.ts), en pause hors écran, posé en mouvement réduit et avec
// ?mouvement=off, coupé en mode discret. Le parent est en position: relative et
// donne son arrondi ; aria-hidden et pointer-events: none.

export function ArcCoin({ palier, className = "" }: { palier: number; className?: string }) {
  const toile = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const el = toile.current;
    if (!el) return;
    return animerArcCoin(el, couleurArc(palier));
  }, [palier]);
  return <canvas ref={toile} aria-hidden data-arc="coin" className={`${s.coin} ${className}`} />;
}
