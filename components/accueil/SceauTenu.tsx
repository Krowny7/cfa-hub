"use client";

import { useEffect, useState } from "react";
import { SceauJour } from "@/components/adn/Sceau";

const KEY = "rl_sceau_tenu";

/**
 * Le sceau « TENU · 3·10 » dans l'ouverture de l'anneau du jour (slot
 * `sceau` d'AnneauDuJour). Le coup de tampon ne joue qu'une fois par jour,
 * à son arrivée à l'écran ; ensuite, il est simplement posé.
 * Props : `day` (jour de Paris, « AAAA-MM-JJ »).
 */
export function SceauTenu({ day }: { day: string }) {
  // décidé dès le premier rendu client (le balisage ne dépend pas de `pose`)
  const [pose] = useState<"vue" | false>(() => {
    if (typeof window === "undefined") return "vue";
    try {
      return localStorage.getItem(KEY) === day ? false : "vue";
    } catch {
      return "vue";
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(KEY, day);
    } catch {
      // stockage bloqué : le tampon rejouera à la prochaine visite
    }
  }, [day]);
  return <SceauJour date={day + "T12:00:00"} taille="remplir" pose={pose} delai={pose ? 0.9 : 0} />;
}
