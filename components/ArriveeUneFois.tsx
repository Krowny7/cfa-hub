"use client";

import { useEffect, useState } from "react";

// L'arrivée une fois par session (principe 7) : la rangée se pose au premier affichage ; au retour sur
// la page (navigation dans le site), elle est déjà en place. Le rendu serveur et l'hydratation posent
// toujours l'arrivée (même attribut des deux côtés : pas d'erreur #418) ; une page rouverte par le
// site, elle, la saute. Un drapeau par page (`cle`) : la rangée de /mock-exams et celle de /salles
// arrivent chacune à leur première visite. Le drapeau vit dans le module.
const poses = new Set<string>();

export function ArriveeUneFois({ cle, className, children }: { cle: string; className?: string; children: React.ReactNode }) {
  const [arrivee] = useState(() => !poses.has(cle));
  useEffect(() => {
    poses.add(cle);
  }, [cle]);
  return (
    <div className={className} data-arrivee={arrivee ? "1" : undefined}>
      {children}
    </div>
  );
}
