"use client";

import { useEffect, useState } from "react";
import { EtatPaquet } from "@/components/flashcards/EtatPaquet";
import { EVENEMENT_BOUCLE, afficher, resumer, type DetailBoucle, type EtatAffiche } from "@/lib/flashcards/progression";

// La pastille « où j'en suis » de l'en-tête d'un paquet ou d'une matière :
// l'état lu par le serveur au chargement, puis celui de la révision en cours
// (annoncé par FlashcardReview), pour que l'en-tête ne contredise jamais la
// carte à l'écran. Rien tant que la boucle n'est pas commencée. `total` : le
// nombre de cartes (cartes ajoutées depuis une boucle bouclée : plus
// « Maîtrisé »). `seulementFini` : seulement « Maîtrisé » (ou « N
// nouvelles ») — l'en-tête d'un paquet ne répète pas la barre du tour ni la
// reprise, juste dessous.

const montrer = (e: EtatAffiche | null, seulementFini: boolean) => (e && (!seulementFini || e.genre === "fini" || e.genre === "nouvelles") ? e : null);

export function EtatPaquetVivant({ cle, initial, total, seulementFini = false }: { cle: string; initial: EtatAffiche | null; total?: number; seulementFini?: boolean }) {
  const [etat, setEtat] = useState<EtatAffiche | null>(initial);
  useEffect(() => {
    const ecouter = (ev: Event) => {
      const d = (ev as CustomEvent<DetailBoucle>).detail;
      if (d?.cle === cle) setEtat(afficher(resumer(d.etat, total)));
    };
    window.addEventListener(EVENEMENT_BOUCLE, ecouter);
    return () => window.removeEventListener(EVENEMENT_BOUCLE, ecouter);
  }, [cle, total]);
  const vu = montrer(etat, seulementFini);
  return vu ? <EtatPaquet etat={vu} /> : null;
}
