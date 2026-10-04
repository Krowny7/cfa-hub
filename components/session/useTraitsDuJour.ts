"use client";

import { useEffect, useState } from "react";
import { EVT_ANNEAU, EVT_TRAIT } from "@/components/adn/AnneauDuJourEvents";

/**
 * Les traits du jour vus par l'écran en cours : la valeur lue par le serveur
 * (traitsDuJour), puis chaque poserTrait() de la page, comme le logo vivant
 * de la barre du haut. null : inconnu (lecture en échec), on ne compte pas.
 * À appeler en haut du composant de session (toujours monté), pour ne
 * manquer aucun trait posé avant l'affichage de la copie.
 */
export function useTraitsDuJour(initial: number | null | undefined): number | null {
  const [n, setN] = useState<number | null>(initial ?? null);

  useEffect(() => {
    setN(initial ?? null);
  }, [initial]);

  useEffect(() => {
    const onTrait = (e: Event) => {
      const k = Number((e as CustomEvent<{ n?: number }>).detail?.n ?? 1);
      if (k > 0) setN((v) => (v === null ? null : v + k));
    };
    const onAnneau = (e: Event) => {
      const r = Number((e as CustomEvent<{ repondues?: number }>).detail?.repondues);
      if (Number.isFinite(r) && r >= 0) setN(r);
    };
    window.addEventListener(EVT_TRAIT, onTrait);
    window.addEventListener(EVT_ANNEAU, onAnneau);
    return () => {
      window.removeEventListener(EVT_TRAIT, onTrait);
      window.removeEventListener(EVT_ANNEAU, onAnneau);
    };
  }, []);

  return n;
}
