"use client";

import { useLayoutEffect, useRef } from "react";

// Le contenu d'une face de carte, réglé pour tenir : la boîte a une hauteur
// fixe (celle de la carte), la taille du texte part de `base` et descend,
// par petits pas, jusqu'à ce que tout rentre (sans jamais passer sous `min`).
// Le verso compact (components/flashcards/Verso.tsx) et KaTeX suivent la
// taille du texte autour (unités em) : régler le font-size de la boîte règle
// tout. Mesures de mise en page, pas de rendu : les transformations 3D de la
// carte n'y changent rien.

/** La largeur de contenu de la boîte de bloc qui contient `n` (les boîtes en ligne, KaTeX compris, ne comptent pas), sans sortir de `racine`. */
function placeDuBloc(n: HTMLElement, racine: HTMLElement) {
  let p = n.parentElement;
  while (p && p !== racine && /^(inline|contents)/.test(getComputedStyle(p).display)) p = p.parentElement;
  const boite = p && racine.contains(p) ? p : racine;
  const cs = getComputedStyle(boite);
  return { boite, largeur: boite.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) };
}

export function AjusteCarte({ base, min, className, children, cle }: { base: number; min: number; className?: string; children: React.ReactNode; /** change quand le contenu change (carte suivante) */ cle: string }) {
  const boite = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = boite.current;
    if (!el) return;
    // Les formules trop larges (KaTeX) sont réduites pour tenir dans la largeur de la carte, sans barre de
    // défilement : la carte capte les clics (la retourner), la barre ne servait à rien. KaTeX suit le
    // font-size (em) : un facteur posé à la taille de départ reste juste quand la boîte rapetisse ensuite.
    // La place se mesure sur la boîte de bloc qui contient la formule, pas sur la formule : dans le verso
    // compact, le bloc KaTeX est en inline-block (sa largeur suit la formule, il ne déborde jamais de
    // lui-même), et une formule en ligne a un scrollWidth nul.
    const ajusterFormules = () => {
      el.querySelectorAll<HTMLElement>(".katex-display, .katex").forEach((k) => {
        const bloc = k.classList.contains("katex-display");
        if (!bloc && k.closest(".katex-display")) return; // déjà réglée par son bloc
        k.style.fontSize = "";
        const { boite: conteneur, largeur } = placeDuBloc(k, el);
        let marge = 0;
        let w: number;
        if (bloc) {
          const cs = getComputedStyle(k);
          marge = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight); // en px : ne suit pas le facteur
          w = Math.max(k.offsetWidth, k.scrollWidth) - marge;
          // son conteneur (.katex-formula) défile : ce qui dépasse encore sous 0,45 est coupé (le fondu du verso le signale)
          if (conteneur.classList.contains("katex-formula")) conteneur.style.overflowX = "clip";
        } else {
          // en ligne, le texte passe à la ligne entre deux morceaux (.base) : c'est le plus large qui doit tenir
          w = Math.max(0, ...Array.from(k.querySelectorAll<HTMLElement>(".katex-html > .base"), (b) => b.offsetWidth));
        }
        const dispo = largeur - marge;
        if (dispo <= 0 || w <= dispo + 1) return;
        // en em du parent : .katex a déjà sa propre taille (1.21em), le facteur s'y applique
        const parent = k.parentElement ?? el;
        const rapport = parseFloat(getComputedStyle(k).fontSize) / parseFloat(getComputedStyle(parent).fontSize) || 1;
        const f = Math.max(0.45, Math.floor((dispo / w) * 100) / 100);
        k.style.fontSize = `${(rapport * f).toFixed(3)}em`;
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
