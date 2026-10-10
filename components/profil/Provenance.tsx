"use client";

import { useState } from "react";
import { PERSO } from "@/lib/voice-profil";

// D'où vient une pièce gagnée (cadre ou bannière qui bouge) : au survol
// (souris) ou au toucher, une bulle « Liquide Diamant, gagné le 12 oct. ».
// La pièce elle-même est le bouton : rien de plus à l'écran au repos (une
// bannière : `plein`, toute sa surface, la bulle en haut à droite).

export function Provenance({
  texte,
  children,
  className = "",
  classeBulle = "",
  plein = false,
}: {
  texte: string;
  /** la pièce (rien avec `plein` : la surface du conteneur) */
  children?: React.ReactNode;
  className?: string;
  /** la bulle (sous un conteneur réduit par zoom : le compenser) */
  classeBulle?: string;
  /** couvre tout son conteneur (une bannière) */
  plein?: boolean;
}) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <span className={`${plein ? "absolute inset-0 flex" : "relative inline-flex"} ${className}`}>
      <button
        type="button"
        aria-label={`${PERSO.provenance} : ${texte}`}
        aria-expanded={ouvert}
        onClick={() => setOuvert((o) => !o)}
        onPointerEnter={(e) => e.pointerType === "mouse" && setOuvert(true)}
        onPointerLeave={(e) => e.pointerType === "mouse" && setOuvert(false)}
        onBlur={() => setOuvert(false)}
        className={plein ? "block h-full w-full outline-offset-[-4px]" : "inline-flex rounded-[30%] outline-offset-4"}
      >
        {children}
      </button>
      {ouvert && (
        <span
          role="status"
          className={
            "pointer-events-none absolute z-30 w-max max-w-[260px] rounded-[12px] border border-line-2 bg-[var(--surface)] px-3 py-1.5 text-[12.5px] font-semibold leading-snug text-white shadow-[var(--shadow-3)] " +
            (plein ? "right-4 top-14 sm:top-16 md:right-[calc((100%_-_min(1240px,100%_-_3.5rem))/2)] " : "left-0 top-[calc(100%+8px)] ") +
            classeBulle
          }
        >
          {texte}
        </span>
      )}
    </span>
  );
}
