"use client";

import { useEffect, useRef } from "react";
import { couleurArc } from "@/components/ui/ArcElectrique";
import { ARC_LIGNE, animerArcCoin } from "@/components/ui/arc-coin-anim";
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

// L'arc en ligne (2026-11-13, demande de Théo : « l'effet des 5 du jour, il est
// beaucoup mieux ») : le même courant, tiré d'un bord à l'autre de la toile à
// mi-hauteur (le face-à-face du duel, d'une bannière à l'autre). Le parent
// place et dimensionne la toile (className). Sur le papier clair, le cœur prend
// un ton sombre ; la nuit, la lumière s'additionne comme sur la carte des 5.
export function ArcLigne({ couleur, className = "" }: { couleur: string; className?: string }) {
  const toile = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const el = toile.current;
    if (!el) return;
    return animerArcCoin(el, couleur, ARC_LIGNE, { forme: "ligne", surPapier: true });
  }, [couleur]);
  return <canvas ref={toile} aria-hidden data-arc="ligne" className={className} />;
}
