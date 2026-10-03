"use client";

import { useState } from "react";

// Contenu qui change en place (question suivante, étape, vue d'une carte) :
// le nouveau contenu entre en glissant, depuis la droite (dir = 1), la
// gauche (dir = -1) ou par un petit fondu montant (dir = 0). Le premier
// affichage ne bouge pas. Les .seg n'en ont pas besoin : le moteur anime
// déjà leurs panneaux.
export function Swap({
  k,
  dir = 0,
  className = "",
  children,
}: {
  /** clé du contenu affiché : quand elle change, le contenu entre */
  k: string | number;
  dir?: -1 | 0 | 1;
  className?: string;
  children: React.ReactNode;
}) {
  const [prev, setPrev] = useState(k);
  const [moved, setMoved] = useState(false);
  if (k !== prev) {
    setPrev(k);
    setMoved(true);
  }
  const vars = { "--rl-dx": `${dir * 14}px`, "--rl-dy": dir ? "0px" : "6px" } as React.CSSProperties;
  return (
    <div key={k} className={(moved ? "rl-swap " : "") + className} style={vars}>
      {children}
    </div>
  );
}
