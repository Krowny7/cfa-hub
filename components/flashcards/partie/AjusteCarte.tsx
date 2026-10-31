"use client";

import { useLayoutEffect, useRef } from "react";

// Le contenu d'une face de carte, réglé pour tenir : la boîte a une hauteur
// fixe (celle de la carte), la taille du texte part de `base` et descend,
// par petits pas, jusqu'à ce que tout rentre (sans jamais passer sous `min`).
// Le verso compact (components/flashcards/Verso.tsx) et KaTeX suivent la
// taille du texte autour (unités em) : régler le font-size de la boîte règle
// tout. Mesures de mise en page, pas de rendu : les transformations 3D de la
// carte n'y changent rien.

export function AjusteCarte({ base, min, className, children, cle }: { base: number; min: number; className?: string; children: React.ReactNode; /** change quand le contenu change (carte suivante) */ cle: string }) {
  const boite = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = boite.current;
    if (!el) return;
    // Les formules trop larges (KaTeX) sont réduites pour tenir dans la largeur de la carte, sans barre de
    // défilement : la carte capte les clics (la retourner), la barre ne servait à rien. KaTeX suit le
    // font-size (em) : un facteur posé à la taille de départ reste juste quand la boîte rapetisse ensuite.
    const ajusterFormules = () => {
      const largeur = el.clientWidth;
      el.querySelectorAll<HTMLElement>(".katex-display, .katex").forEach((k) => {
        const bloc = k.classList.contains("katex-display");
        if (!bloc && k.closest(".katex-display")) return; // déjà réglée par son bloc
        k.style.fontSize = "";
        if (bloc) k.style.overflow = "hidden";
        const dispo = bloc ? k.clientWidth : largeur;
        const w = k.scrollWidth;
        if (dispo > 0 && w > dispo + 1) k.style.fontSize = `${Math.max(0.45, Math.floor((dispo / w) * 100) / 100)}em`;
      });
    };
    const regler = () => {
      let f = base;
      el.style.fontSize = `${f}px`;
      ajusterFormules();
      let garde = 0;
      while (el.scrollHeight > el.clientHeight + 1 && f > min && garde++ < 60) {
        f = Math.max(min, f - 0.5);
        el.style.fontSize = `${f}px`;
      }
    };
    regler();
    // les polices du site arrivent parfois après le premier rendu
    let vivant = true;
    document.fonts?.ready.then(() => {
      if (vivant) regler();
    });
    return () => {
      vivant = false;
    };
  }, [base, min, cle]);
  return (
    <div ref={boite} className={className} data-min={min} style={{ fontSize: base }}>
      {children}
    </div>
  );
}
