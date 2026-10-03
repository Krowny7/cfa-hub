"use client";

import { useEffect } from "react";
import { caleAnneau } from "@/components/adn/AnneauDuJourEvents";

/**
 * Recale le logo vivant sur la valeur du jour que la page vient de lire
 * (l'accueil relit la journée à chaque visite, la barre du haut non).
 * Ne rend rien. Props : `repondues` (questions répondues aujourd'hui).
 */
export function AnneauDuJourSync({ repondues }: { repondues: number }) {
  useEffect(() => {
    caleAnneau(repondues);
  }, [repondues]);
  return null;
}
