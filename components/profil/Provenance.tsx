"use client";

import { useState } from "react";
import { PERSO } from "@/lib/voice-profil";

// D'où vient une pièce gagnée (cadre ou bannière qui bouge) : au survol
// (souris) ou au toucher, une bulle « Liquide Diamant, gagné le 12 oct. ».
// La pièce elle-même est le bouton : rien de plus à l'écran au repos.

export function Provenance({
  texte,
  children,
  className = "",
  classeBulle = "",
  aligne = "gauche",
}: {
  texte: string;
  children: React.ReactNode;
  className?: string;
  /** la bulle (sous un conteneur réduit par zoom : le compenser) */
  classeBulle?: string;
  /** la bulle part du bord gauche de la pièce, ou du bord droit */
  aligne?: "gauche" | "droite";
}) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        type="button"
        aria-label={`${PERSO.provenance} : ${texte}`}
        aria-expanded={ouvert}
        onClick={() => setOuvert((o) => !o)}
        onPointerEnter={(e) => e.pointerType === "mouse" && setOuvert(true)}
        onPointerLeave={(e) => e.pointerType === "mouse" && setOuvert(false)}
        onBlur={() => setOuvert(false)}
        className="inline-flex rounded-[30%] outline-offset-4"
      >
        {children}
      </button>
      {ouvert && (
        <span
          role="status"
          className={
            "pointer-events-none absolute top-[calc(100%+8px)] z-30 w-max max-w-[260px] rounded-[12px] border border-line-2 bg-[var(--surface)] px-3 py-1.5 text-[12.5px] font-semibold leading-snug text-white shadow-[var(--shadow-3)] " +
            (aligne === "droite" ? "right-0 " : "left-0 ") +
            classeBulle
          }
        >
          {texte}
        </span>
      )}
    </span>
  );
}
