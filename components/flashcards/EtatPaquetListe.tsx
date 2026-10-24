"use client";

import { useEffect, useState } from "react";
import { EtatPaquet } from "@/components/flashcards/EtatPaquet";
import { lireBoucleBrute } from "@/lib/flashcards/boucle";
import { etatLocalAffiche, type EtatAffiche, type EtatListe } from "@/lib/flashcards/progression";

// Où en est une boucle, dans une liste de paquets : l'état lu par le serveur,
// puis, après le montage, celui de l'appareil s'il est plus récent. La liste
// peut dater : resservie par le retour arrière (cache du routeur), ou
// affichée avant que le dernier envoi de la révision n'arrive en base. La
// boucle de l'appareil est écrite à chaque geste : elle dit vrai tout de
// suite. Seulement quand la page passe un état (table créée).

/** L'état à montrer pour une ligne (null : rien). */
export function useEtatListe(e: EtatListe | null | undefined): EtatAffiche | null {
  // undefined : pas de boucle de l'appareil plus récente, celui du serveur vaut
  const [local, setLocal] = useState<EtatAffiche | null | undefined>(undefined);
  const cle = e?.local;
  const maj = e?.maj;
  const total = e?.total;
  const joueur = e?.joueur;
  useEffect(() => {
    if (!cle || !joueur) {
      setLocal(undefined);
      return;
    }
    setLocal(etatLocalAffiche(lireBoucleBrute(cle), { local: cle, affiche: null, maj: maj ?? null, total, joueur }));
  }, [cle, maj, total, joueur]);
  if (!e) return null;
  return local === undefined ? e.affiche : local;
}

export function EtatPaquetListe({ etat, className = "" }: { etat: EtatListe | null | undefined; className?: string }) {
  const vu = useEtatListe(etat);
  return vu ? <EtatPaquet etat={vu} className={className} /> : null;
}
