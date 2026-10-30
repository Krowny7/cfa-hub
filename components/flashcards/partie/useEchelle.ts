"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

// La mise à l'échelle de la scène : la table est dessinée à une taille fixe
// (variables --W × --H de Table.module.css, qui changent entre ordinateur et
// téléphone) ; `k` la ramène à la largeur disponible, et, sur grand écran, à
// la hauteur de la fenêtre pour que la table n'oblige pas à défiler.

const K_MIN = 0.42;
const K_MAX = 1.3;

/**
 * `racine` porte --W et --H ; `scene` est la boîte pleine largeur où la scène
 * se centre. `reserve` : hauteur de ce qui entoure la scène (barre du haut,
 * commandes, en-tête du site), à retirer de la fenêtre sur grand écran.
 */
export function useEchelle(racine: RefObject<HTMLElement | null>, scene: RefObject<HTMLElement | null>, reserve = 250): number {
  const [k, setK] = useState(1);
  useLayoutEffect(() => {
    const el = racine.current;
    const boite = scene.current;
    if (!el || !boite) return;
    const mesurer = () => {
      const cs = getComputedStyle(el);
      const W = parseFloat(cs.getPropertyValue("--W")) || 1040;
      const H = parseFloat(cs.getPropertyValue("--H")) || 560;
      let v = boite.clientWidth / W;
      // grand écran : la scène ne dépasse pas la fenêtre
      if (window.innerWidth >= 768) v = Math.min(v, (window.innerHeight - reserve) / H);
      v = Math.max(K_MIN, Math.min(K_MAX, v));
      setK((x) => (Math.abs(x - v) < 0.004 ? x : v));
    };
    mesurer();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(mesurer) : null;
    ro?.observe(boite);
    window.addEventListener("resize", mesurer);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", mesurer);
    };
  }, [racine, scene, reserve]);
  return k;
}
