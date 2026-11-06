"use client";

import { useEffect, useState } from "react";
import { mouvementReduit } from "@/components/salles/anim";
import { PARTIE } from "@/lib/voice-salles";
import p from "./Partie.module.css";

// L'annonce d'un nouveau round, à la place de l'écran VS des premiers instants :
// le mot, le chiffre qui frappe, puis le décompte reprend la main. Rien en
// mouvement réduit : le décompte dit déjà de quel round il s'agit.

const DUREE_MS = 2600;

export function AnnonceRound({ round, rounds }: { round: number; rounds: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (mouvementReduit()) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), DUREE_MS);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  return (
    <div className={p.annonce} role="status">
      <span className={p.annonceMot}>{PARTIE.roundMot}</span>
      <span className={p.annonceChiffre}>{round}</span>
      <span className={p.annonceSur}>{PARTIE.roundSur(rounds)}</span>
    </div>
  );
}
