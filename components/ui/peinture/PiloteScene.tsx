"use client";

import { useEffect, useRef } from "react";

// Quand les effets d'une peinture ont-ils le droit de tourner ? Seulement si
// la scène est à l'écran, l'onglet visible, le mouvement non réduit, le mode
// discret du site éteint et hors capture (data-rl-motion="off").

/** Observe la scène et appelle `quand(true|false)` à chaque changement. Retourne le nettoyage. */
export function observerScene(scene: HTMLElement, quand: (actif: boolean) => void): () => void {
  const html = document.documentElement;
  const rm = matchMedia("(prefers-reduced-motion: reduce)");
  let vu = false;
  let dernier: boolean | null = null;
  const maj = () => {
    const a = vu && !document.hidden && !rm.matches && html.dataset.discreet !== "1" && html.dataset.rlMotion !== "off";
    if (a !== dernier) {
      dernier = a;
      quand(a);
    }
  };
  const io = new IntersectionObserver((es) => {
    vu = es[es.length - 1].isIntersecting;
    maj();
  });
  io.observe(scene);
  const mo = new MutationObserver(maj);
  mo.observe(html, { attributes: true, attributeFilter: ["data-discreet", "data-rl-motion"] });
  document.addEventListener("visibilitychange", maj);
  rm.addEventListener?.("change", maj);
  maj();
  return () => {
    io.disconnect();
    mo.disconnect();
    document.removeEventListener("visibilitychange", maj);
    rm.removeEventListener?.("change", maj);
  };
}

/** Pose data-arret sur la scène quand les effets doivent se figer (la feuille de style met alors les animations en pause). */
export function PiloteScene() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const scene = ref.current?.parentElement;
    if (!scene) return;
    return observerScene(scene, (a) => {
      if (a) delete scene.dataset.arret;
      else scene.dataset.arret = "1";
    });
  }, []);
  return <span ref={ref} hidden aria-hidden />;
}
