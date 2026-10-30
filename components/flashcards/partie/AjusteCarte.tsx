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
    const regler = () => {
      let f = base;
      el.style.fontSize = `${f}px`;
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
