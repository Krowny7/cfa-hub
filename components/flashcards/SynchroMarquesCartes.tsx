"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { marquesCartesEnAttente, useMarquesCartes } from "@/lib/marques";

// Les flashcards marquées gardées sur l'appareil (table pas encore créée)
// rejoignent le compte au premier passage où la table répond, côté client,
// après le rendu serveur : la page, rendue sans elles (état vide, entrée
// « Flashcards marquées · N » absente), est alors relue une fois
// (router.refresh). Ne rend rien.
// `joueur` : ne relire les marques que si l'appareil en garde pour lui (lu
// après le montage : rien au rendu serveur), pour ne pas interroger la base à
// chaque visite d'une page qui n'en a pas besoin (/flashcards). Sans `joueur` :
// toujours (Moi › Marquées, l'état vide de /flashcards/marquees).
export function SynchroMarquesCartes({ joueur }: { joueur?: string }) {
  const [suivre, setSuivre] = useState(!joueur);
  useEffect(() => {
    if (joueur && marquesCartesEnAttente(joueur)) setSuivre(true);
  }, [joueur]);
  return suivre ? <Rafraichir /> : null;
}

/** Une seule relecture par ouverture du site. */
let rafraichi = false;

function Rafraichir() {
  const etat = useMarquesCartes({ frais: true });
  const router = useRouter();
  // celles qui avaient déjà rejoint le compte avant cette page : elle les montre
  const deja = useRef(etat.rejointes);
  useEffect(() => {
    if (rafraichi || !etat.pret || etat.local || etat.rejointes <= deja.current) return;
    rafraichi = true;
    router.refresh();
  }, [etat, router]);
  return null;
}
