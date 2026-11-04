import type { PersoVainqueur as Donnees } from "./types";
import s from "./EnDirect.module.css";

// Le personnage de la bannière du dernier vainqueur : l'image que ce joueur a
// envoyée pour sa bannière de profil (un PNG détouré). À poser comme ENFANT DIRECT
// de l'enveloppe relative de la bande (la classe « vqw » de LobbyView), à côté de
// la bande, pas dedans : la bande couperait le haut. Son cadre s'arrête au bas de
// la bande et dépasse un peu au-dessus : le haut du personnage sort de la bande, le
// bas est coupé. Cadrage fixe, le même pour tous : il ne suit pas les réglages de
// la bannière verticale. Décoratif (alt vide), chargé à la demande, sans clic.

export function PersoVainqueur({ perso, className }: { perso: Donnees; className?: string }) {
  return (
    <span className={[s.persoCadre, className].filter(Boolean).join(" ")} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={s.perso} src={perso.src} alt="" loading="lazy" decoding="async" draggable={false} />
    </span>
  );
}
