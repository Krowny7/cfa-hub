"use client";

import { useEffect, useState } from "react";

// L'arrivée une fois par session (principe 7) : la rangée se pose au premier affichage ; au retour sur
// la page (navigation dans le site), elle est déjà en place. Le rendu serveur et l'hydratation posent
// toujours l'arrivée (même attribut des deux côtés : pas d'erreur #418) ; une page rouverte par le
// site, elle, la saute. Le drapeau vit dans le module (et dans sessionStorage pour les autres onglets
// du même site, lu dans un effet).
let dejaPose = false;
const CLE = "rl-arrivee-rangees";

export function ArriveeUneFois({ className, children }: { className?: string; children: React.ReactNode }) {
  const [arrivee] = useState(() => !dejaPose);
  useEffect(() => {
    dejaPose = true;
    try {
      window.sessionStorage.setItem(CLE, "1");
    } catch {
      /* stockage indisponible : l'arrivée se rejouera au prochain chargement complet */
    }
  }, []);
  return (
    <div className={className} data-arrivee={arrivee ? "1" : undefined}>
      {children}
    </div>
  );
}
