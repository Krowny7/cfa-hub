"use client";

import { useEffect, useState } from "react";
import { SceauJour } from "@/components/adn/Sceau";
import { DEFI } from "@/lib/voice-z2c";

const VU_KEY = "rl-defi-sceau";

// Le sceau du jour sur une copie rendue du défi : « DÉFI · TENU · 4·10 », la
// main du correcteur qui valide (règle 3). Le coup de tampon ne se joue qu'à
// la première apparition de la copie de ce jour ; ensuite le sceau est déjà
// posé. Son coupé par défaut (moment fréquent : « micro »). Mouvement
// réduit : posé d'emblée (géré par Sceau).
//
//   <SceauDefi day="2026-10-04" taille={78} angle={-6} />
export function SceauDefi({ day, taille = 78, angle, className = "" }: { day: string; taille?: number; angle?: number; className?: string }) {
  // null : pas encore décidé (avant l'hydratation) ; le sceau reste caché
  const [pose, setPose] = useState<boolean | null>(null);

  useEffect(() => {
    let vu = false;
    try {
      const l = JSON.parse(localStorage.getItem(VU_KEY) || "[]") as string[];
      vu = Array.isArray(l) && l.includes(day);
      if (!vu) localStorage.setItem(VU_KEY, JSON.stringify([day, ...(Array.isArray(l) ? l : [])].slice(0, 40)));
    } catch {
      // stockage bloqué : on tamponne
    }
    setPose(!vu);
  }, [day]);

  const [, m, d] = day.split("-").map(Number);
  const jm = d && m ? `${d}/${m}` : day;

  return (
    <span className={"inline-block leading-none " + className} style={pose === null ? { visibility: "hidden" } : undefined}>
      <SceauJour date={`${day}T12:00:00`} sur={DEFI.sceauSur} title={DEFI.sceauTitre(jm)} taille={taille} angle={angle} pose={pose ? "vue" : false} delai={0.35} />
    </span>
  );
}
