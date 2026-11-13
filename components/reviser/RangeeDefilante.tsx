"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { CLE_VU_RAYONS } from "@/lib/voice-reviser-b";

// La rangée d'une vitrine de Réviser B (carnets de /fiches, livrets de /courses), côté navigateur :
// - au téléphone (≤ 900 px, la rangée défile à plat), l'objet conseillé est centré dès le montage,
//   sans animation : le cercle « conseillé » et l'action à l'encre parlent du même objet visible ;
// - un fondu au bord indique que la rangée continue (data-suite / data-avant, lus au défilement) ;
// - l'arrivée un à un (keyframes « poser ») ne se joue qu'une fois par session : à la visite
//   suivante, une animation qui n'a pas encore commencé est terminée d'office (une arrivée déjà en
//   cours, au rechargement, va à son terme : pas de coupe au milieu).
// Rien n'est lu au rendu : tout passe par les effets (pas d'écart d'hydratation).

const useAvantPeinture = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function RangeeDefilante({
  className,
  label,
  legende,
  cle,
  children,
}: {
  className: string;
  label: string;
  /** la rangée porte une légende sous un objet (le mur des one-pagers) */
  legende?: boolean;
  /** l'objet conseillé (le centrage se refait quand il change) */
  cle?: string | null;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLUListElement>(null);

  // l'arrivée, une fois par session
  useAvantPeinture(() => {
    const ul = ref.current;
    if (!ul) return;
    let vu = false;
    try {
      vu = sessionStorage.getItem(CLE_VU_RAYONS) === "1";
    } catch {
      vu = false;
    }
    if (vu && typeof ul.getAnimations === "function") {
      for (const a of ul.getAnimations({ subtree: true })) {
        const nom = (a as Animation & { animationName?: string }).animationName ?? "";
        if (nom.includes("poser") && (Number(a.currentTime) || 0) < 60) a.finish();
      }
    }
    try {
      sessionStorage.setItem(CLE_VU_RAYONS, "1");
    } catch {
      // stockage bloqué : l'arrivée se rejoue, rien de plus
    }
  }, []);

  // au téléphone : l'objet conseillé au centre, et les fondus de bord
  useEffect(() => {
    const ul = ref.current;
    if (!ul) return;
    const bords = () => {
      const fin = ul.scrollLeft + ul.clientWidth >= ul.scrollWidth - 4;
      ul.dataset.suite = fin ? "" : "1";
      ul.dataset.avant = ul.scrollLeft > 4 ? "1" : "";
    };
    if (window.matchMedia("(max-width: 900px)").matches) {
      const cible = ul.querySelector<HTMLElement>("[data-conseil]");
      if (cible) ul.scrollLeft = Math.max(0, cible.offsetLeft - (ul.clientWidth - cible.clientWidth) / 2);
    }
    bords();
    ul.addEventListener("scroll", bords, { passive: true });
    window.addEventListener("resize", bords);
    return () => {
      ul.removeEventListener("scroll", bords);
      window.removeEventListener("resize", bords);
    };
  }, [cle]);

  return (
    <ul ref={ref} className={className} aria-label={label} data-legende={legende ? "1" : undefined}>
      {children}
    </ul>
  );
}
