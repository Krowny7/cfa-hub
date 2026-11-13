"use client";

import { useEffect, useRef } from "react";

// Le disque d'une platine (direction du 2026-11-13) : il tourne quand la souris survole son parent (ou
// quand il a le focus au clavier), en ACCÉLÉRANT jusqu'à 33 tours, puis il RALENTIT et s'arrête là
// où il est : jamais de retour sec à 0°, jamais de boucle sans survol. Un seul requestAnimationFrame,
// coupé dès que le disque est immobile. Mouvement réduit : le disque reste immobile. Rien de lu au
// rendu (ni Date ni hasard) : l'angle de départ est 0, le même au serveur et au client.

/** tours par seconde à pleine vitesse (33 tours/min ≈ 0,55 ; un peu plus vif pour qu'on le voie) */
const VITESSE = 0.7;

export function DisqueTournant({
  className,
  children,
  hote: quelHote = "parent",
}: {
  className?: string;
  children?: React.ReactNode;
  /** qui déclenche la rotation : le parent direct (défaut), ou le lien, le bouton ou l'élément [data-hote-disque] qui contient le disque (toute la carte) */
  hote?: "parent" | "lien";
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    const hote = (quelHote === "lien" ? el?.closest<HTMLElement>("a,button,[data-hote-disque]") : null) ?? el?.parentElement;
    if (!el || !hote) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let angle = 0;
    let v = 0;
    let cible = 0;
    let raf = 0;
    let avant = 0;
    const pas = (t: number) => {
      const dt = Math.min(0.05, (t - avant) / 1000);
      avant = t;
      // accélère en ~0,8 s, ralentit en ~1,4 s : une inertie de vrai plateau
      const k = cible > v ? 2.4 : 1.5;
      v += (cible - v) * Math.min(1, k * dt);
      if (cible === 0 && v < 0.004) v = 0;
      angle = (angle + v * 360 * dt) % 360;
      el.style.transform = `rotate(${angle.toFixed(2)}deg)`;
      raf = v > 0 || cible > 0 ? requestAnimationFrame(pas) : 0;
    };
    const lancer = (x: number) => {
      cible = x;
      if (!raf) {
        avant = performance.now();
        raf = requestAnimationFrame(pas);
      }
    };
    const entrer = () => lancer(VITESSE);
    const sortir = () => lancer(0);
    hote.addEventListener("pointerenter", entrer);
    hote.addEventListener("pointerleave", sortir);
    hote.addEventListener("focusin", entrer);
    hote.addEventListener("focusout", sortir);
    return () => {
      hote.removeEventListener("pointerenter", entrer);
      hote.removeEventListener("pointerleave", sortir);
      hote.removeEventListener("focusin", entrer);
      hote.removeEventListener("focusout", sortir);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [quelHote]);
  return (
    <span ref={ref} className={className} aria-hidden>
      {children}
    </span>
  );
}
