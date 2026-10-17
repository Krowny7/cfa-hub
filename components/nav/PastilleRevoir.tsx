"use client";

import { chiffrePastille } from "@/lib/nav";
import { useEtatNav } from "@/components/nav/DevoileContext";

// « 14 à revoir » : la pastille de l'onglet Réviser (barre du haut et barre du
// bas). Elle a quitté le sceau des quêtes (Codex simplifié) ; le compte vient
// de son panneau (DevoileContext, poserRevoir). Calme, à l'encre : la seule
// pastille rouge du site reste celle du sceau (« à récupérer »). Le nombre est
// lu dans le nom de l'onglet (lib/nav `libelleOnglet`), la pastille elle-même est muette.
export function PastilleRevoir({ className = "" }: { className?: string }) {
  const { revoir } = useEtatNav();
  const chiffre = chiffrePastille(revoir, 99);
  if (!chiffre) return null;
  return (
    <span
      aria-hidden
      className={
        "t-num pointer-events-none absolute min-w-[18px] rounded-full bg-[var(--surface)] px-[5px] text-center text-[10.5px] font-bold leading-[18px] text-[var(--ink)] shadow-[inset_0_0_0_1px_var(--line-2),0_0_0_2px_var(--paper)] " +
        className
      }
    >
      {chiffre}
    </span>
  );
}
