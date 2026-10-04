"use client";

import { useSyncExternalStore } from "react";
import { OBJECTIF_DU_JOUR, abonnerObjectif, lireObjectifCourant } from "@/components/adn/AnneauDuJourEvents";

/**
 * L'objectif du jour vu par un écran client : celui du plan du joueur, publié
 * par le logo de la barre du haut (40 au rendu serveur, puis la vraie valeur).
 */
export function useObjectifDuJour(): number {
  return useSyncExternalStore(abonnerObjectif, lireObjectifCourant, () => OBJECTIF_DU_JOUR);
}
