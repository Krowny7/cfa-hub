"use client";

import { useEffect, useState } from "react";
import { signalerLeonard } from "@/lib/leonard/signal";

// Les réglages de Léonard, sur cet appareil : ses apparitions (oui / non)
// et ses animations (animé, ou image fixe). Le mode discret le fait taire
// d'office, sans toucher à ces réglages. L'hôte écoute `rl:leonard-reglages`
// pour suivre un changement fait ailleurs (page Moi).

const CLE_ACTIF = "rl_leonard";
const CLE_ANIME = "rl_leonard_anime";
export const CLE_TUTO = "rl_leonard_tuto";
export const EVENEMENT_REGLAGES = "rl:leonard-reglages";

export type ReglagesLeonard = { actif: boolean; anime: boolean };

export function lireReglages(): ReglagesLeonard {
  try {
    return { actif: localStorage.getItem(CLE_ACTIF) !== "off", anime: localStorage.getItem(CLE_ANIME) !== "off" };
  } catch {
    return { actif: true, anime: true };
  }
}

function ecrire(cle: string, on: boolean) {
  try {
    if (on) localStorage.removeItem(cle);
    else localStorage.setItem(cle, "off");
  } catch {
    // stockage indisponible
  }
  window.dispatchEvent(new Event(EVENEMENT_REGLAGES));
}

/** Les deux interrupteurs de la page Moi. */
export function useReglagesLeonard() {
  const [r, setR] = useState<ReglagesLeonard>({ actif: true, anime: true });
  useEffect(() => {
    const maj = () => setR(lireReglages());
    maj();
    window.addEventListener(EVENEMENT_REGLAGES, maj);
    return () => window.removeEventListener(EVENEMENT_REGLAGES, maj);
  }, []);
  return {
    ...r,
    basculerActif: () => ecrire(CLE_ACTIF, !r.actif),
    basculerAnime: () => ecrire(CLE_ANIME, !r.anime),
    /** relance la visite guidée, tout de suite (elle repart de l'accueil) */
    revoirTuto: () => {
      try {
        localStorage.removeItem(CLE_TUTO);
      } catch {
        // stockage indisponible
      }
      signalerLeonard({ evt: "tuto" });
    },
  };
}
