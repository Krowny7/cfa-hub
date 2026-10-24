"use client";

import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";

// La formule en bloc d'un verso, réduite pour tenir dans la case à toutes les
// largeurs (0,7 au moins, au-delà elle défile) : on mesure la largeur réelle
// rendue par KaTeX plutôt que de l'estimer. Sans JS, l'estimation `echelle`
// (téléphone seulement, Verso.module.css) sert de repli.
const MIN = 0.7;

export function FormuleAjustee({ className, echelle, children }: { className: string; echelle: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ajuster = () => {
      // c'est le bloc KaTeX (overflow-x: auto) qui défile, pas le conteneur
      const boite = el.querySelector<HTMLElement>(".katex-formula") ?? el;
      const avant = Number(el.style.getPropertyValue("--ajuste")) || 1;
      const naturelle = boite.scrollWidth / avant;
      const dispo = boite.clientWidth;
      if (!naturelle || !dispo) return;
      const k = Math.max(MIN, Math.min(1, dispo / naturelle));
      if (Math.abs(k - avant) > 0.01) el.style.setProperty("--ajuste", k.toFixed(3));
    };
    ajuster();
    // les polices KaTeX arrivent parfois après le premier rendu : on remesure
    document.fonts?.ready.then(ajuster).catch(() => undefined);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(ajuster);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} style={echelle < 1 ? ({ "--echelle": echelle } as CSSProperties) : undefined}>
      {children}
    </div>
  );
}
