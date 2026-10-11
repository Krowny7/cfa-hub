"use client";

import { useEffect, type RefObject } from "react";

// Met en pause les animations CSS d'un élément quand il n'est plus à l'écran :
// pose data-hors="1" dessus (puis "0" au retour), que les feuilles de style
// lisent (animation-play-state: paused). Léger : un IntersectionObserver par
// élément, rien tant que l'élément est visible. Sans IntersectionObserver,
// l'élément reste « à l'écran ».
export function useHorsEcran(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver((list) => {
      for (const it of list) el.dataset.hors = it.isIntersecting ? "0" : "1";
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref]);
}
