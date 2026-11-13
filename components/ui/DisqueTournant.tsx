"use client";

import { useEffect, useRef } from "react";

// Le disque d'une platine (direction du 2026-11-13) : il tourne quand la souris survole son parent (ou
// quand il a le focus au clavier), en ACCÉLÉRANT jusqu'à 33 tours, puis il RALENTIT et s'arrête là
// où il est : jamais de retour sec à 0°, jamais de boucle sans survol. Un seul requestAnimationFrame,
// coupé dès que le disque est immobile. Mouvement réduit : le disque reste immobile. Rien de lu au
// rendu (ni Date ni hasard) : l'angle de départ est 0, le même au serveur et au client.
// `tourne` (la platine de /courses, qui joue l'audio) : le disque tourne tant que la lecture dure, avec
// la même inertie (il prend sa vitesse au départ, ralentit à la pause) ; avec `hote="aucun"`, le survol
// n'y change rien (le disque de la platine est un bouton : le survoler ne doit pas faire croire qu'il joue).

/** tours par seconde à pleine vitesse (33 tours/min ≈ 0,55 ; un peu plus vif pour qu'on le voie) */
const VITESSE = 0.7;

export function DisqueTournant({
  className,
  children,
  hote: quelHote = "parent",
  tourne = false,
}: {
  className?: string;
  children?: React.ReactNode;
  /** qui déclenche la rotation : le parent direct (défaut), ou le lien, le bouton ou l'élément [data-hote-disque] qui contient le disque (toute la carte) */
  hote?: "parent" | "lien" | "aucun";
  /** le disque tourne sans survol (une lecture en cours) */
  tourne?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  // l'état partagé entre le survol et la lecture ; `pousser` relance la boucle quand l'un des deux change
  const etat = useRef({ survol: false, tourne });
  const pousser = useRef<() => void>(() => {});
  useEffect(() => {
    const el = ref.current;
    const hote = quelHote === "aucun" ? null : ((quelHote === "lien" ? el?.closest<HTMLElement>("a,button,[data-hote-disque]") : null) ?? el?.parentElement);
    if (!el || (!hote && quelHote !== "aucun")) return;
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
    const lancer = () => {
      cible = etat.current.survol || etat.current.tourne ? VITESSE : 0;
      if (!raf && (cible > 0 || v > 0)) {
        avant = performance.now();
        raf = requestAnimationFrame(pas);
      }
    };
    pousser.current = lancer;
    const entrer = () => {
      etat.current.survol = true;
      lancer();
    };
    const sortir = () => {
      etat.current.survol = false;
      lancer();
    };
    hote?.addEventListener("pointerenter", entrer);
    hote?.addEventListener("pointerleave", sortir);
    hote?.addEventListener("focusin", entrer);
    hote?.addEventListener("focusout", sortir);
    lancer();
    return () => {
      pousser.current = () => {};
      hote?.removeEventListener("pointerenter", entrer);
      hote?.removeEventListener("pointerleave", sortir);
      hote?.removeEventListener("focusin", entrer);
      hote?.removeEventListener("focusout", sortir);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [quelHote]);
  useEffect(() => {
    etat.current.tourne = tourne;
    pousser.current();
  }, [tourne]);
  return (
    <span ref={ref} className={className} aria-hidden>
      {children}
    </span>
  );
}
