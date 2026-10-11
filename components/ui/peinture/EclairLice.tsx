"use client";

import { useEffect, useRef } from "react";
import { observerScene } from "@/components/ui/peinture/PiloteScene";
import { boite } from "@/components/ui/peinture/geometrie";
import e from "./EffetsLice.module.css";

// De loin en loin (toutes les 10 à 20 s), un éclair bref et discret dans les
// nuages de l'étendard : un trait zigzagué et la lueur qu'il jette. Trois
// places au choix, jamais deux fois de suite la même. Rien ne tourne hors
// écran ni en mouvement réduit (observerScene).

const L = 1584;
const H = 672;
const b = boite(L, H);
/** Les trois places (rectangles de l'image, 420 × 300) ; le trait y descend au milieu. */
const PLACES = [b(190, 40, 610, 340), b(560, 20, 980, 320), b(-30, 70, 390, 370)];

/** Trait zigzagué du haut au bas d'une place (repère local 420 × 300), tirage à graine fixe : pareil côté serveur et client. */
function trait(graine: number) {
  let g = graine;
  const alea = () => (g = (g * 16807) % 2147483647) / 2147483647;
  let x = 205 + (alea() - 0.5) * 40;
  let y = 8;
  let d = `M${x.toFixed(0)} ${y}`;
  let branche = "";
  while (y < 258) {
    y += 22 + alea() * 24;
    x += (alea() - 0.5) * 60;
    d += `L${x.toFixed(0)} ${Math.min(y, 262).toFixed(0)}`;
    if (!branche && y > 90 && alea() > 0.5) {
      branche = `M${x.toFixed(0)} ${y.toFixed(0)}L${(x + (alea() - 0.4) * 80).toFixed(0)} ${(y + 34).toFixed(0)}L${(x + (alea() - 0.4) * 90).toFixed(0)} ${(y + 62).toFixed(0)}`;
    }
  }
  return d + branche;
}
const TRAITS = [trait(5), trait(23), trait(41)];

export function EclairLice() {
  const racine = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = racine.current;
    const scene = el?.closest<HTMLElement>("[data-scene]");
    if (!el || !scene) return;
    let minuteur: number | undefined;
    let dernier = -1;
    const attendre = (premier: boolean) => {
      minuteur = window.setTimeout(tirer, premier ? 3500 + Math.random() * 3500 : 10000 + Math.random() * 10000);
    };
    const tirer = () => {
      let v: number;
      do v = Math.floor(Math.random() * PLACES.length);
      while (v === dernier);
      dernier = v;
      const p = el.children[v] as HTMLElement;
      p.classList.remove(e.go);
      void p.offsetWidth; // relance l'animation
      p.classList.add(e.go);
      attendre(false);
    };
    const arreter = observerScene(scene, (actif) => {
      clearTimeout(minuteur);
      if (actif) attendre(true);
    });
    return () => {
      clearTimeout(minuteur);
      arreter();
    };
  }, []);
  return (
    <div ref={racine} className={e.eclairs}>
      {PLACES.map((style, i) => (
        <div key={i} className={e.eclair} style={style}>
          <svg viewBox="0 0 420 300" preserveAspectRatio="none">
            <path d={TRAITS[i]} className={e.halo} />
            <path d={TRAITS[i]} className={e.trait} />
          </svg>
        </div>
      ))}
    </div>
  );
}
