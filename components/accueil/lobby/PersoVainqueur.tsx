import type { CSSProperties } from "react";
import { cadragePerso } from "@/lib/profil/perso";
import type { PersoVainqueur as Donnees } from "./types";
import s from "./EnDirect.module.css";

// Le personnage de la bannière du vainqueur des 30 d'hier : l'image que ce
// joueur a envoyée pour sa bannière de profil (un PNG détouré), qui sort du
// haut du cadre de la bande. À poser comme ENFANT DIRECT de l'enveloppe
// relative de la bande (la classe « vqw » de LobbyView), à côté de la bande, pas
// dedans : la bande coupe ce qui dépasse. Décoratif (alt vide), chargé à la
// demande, sans clic. Taille et position suivent la bannière verticale (les
// mêmes mots : taille en % de la base, position de 0 remonté à 100 descendu).

export function PersoVainqueur({ perso, className }: { perso: Donnees; className?: string }) {
  const { echelle, decalageY } = cadragePerso(perso.taille, perso.pos);
  const style = { "--echelle": echelle.toFixed(2), "--decalage": `${decalageY.toFixed(1)}%` } as CSSProperties;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={[s.perso, className].filter(Boolean).join(" ")} src={perso.src} alt="" loading="lazy" decoding="async" draggable={false} style={style} />
  );
}
