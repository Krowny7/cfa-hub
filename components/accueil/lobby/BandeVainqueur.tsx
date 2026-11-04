import { Trophy } from "lucide-react";
import { Contour, Phrase, SceauUni } from "@/components/accueil/lobby/Encre";
import type { BandeVainqueurLobby } from "@/components/accueil/lobby/types";
import { Illustration } from "@/components/ui/Illustration";
import { LOBBY } from "@/lib/voice-accueil-lobby";
import s from "./Lobby.module.css";

// Le dernier vainqueur des 30 : une bande peinte (sa bannière de profil, sinon
// la peinture du site), son pseudo, son score et son temps, le bouton vers
// son profil. Plus de liseré liquide : l'encre est
// réservée aux boutons. Le personnage qu'il a envoyé (lot 2) sort du haut du
// cadre : `perso` est un nœud posé comme ENFANT DIRECT de l'enveloppe `.vqw`,
// à côté de la bande (elle coupe ce qui dépasse) ; sans personnage, la bande
// n'a pas besoin de la place qu'il prend. Composant serveur, aucun hook.

const ID = "lobby-vainqueur";

export function BandeVainqueur({ v, perso, className }: { v: BandeVainqueurLobby; perso?: React.ReactNode; className?: string }) {
  const V = LOBBY.vainqueur;
  return (
    <div className={[s.vqw, perso ? s.vqAvecPerso : null, className].filter(Boolean).join(" ")}>
      <section className={[s.carte, s.peint, s.g, s.vq].join(" ")} aria-labelledby={ID}>
        <span className={s.fond} aria-hidden>
          {v.fond ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={v.fond} alt="" loading="lazy" decoding="async" draggable={false} />
          ) : (
            <Illustration nom="accueil-bandeau" position="70% 50%" decorative />
          )}
        </span>
        <p className={s.eyebrow + " " + s.eyebrowC}>
          <SceauUni clair>
            <Trophy size={15} aria-hidden />
          </SceauUni>
          {V.surTitre}
        </p>
        <h2 id={ID} className={"font-brand " + s.vqNom}>
          {v.nom}
        </h2>
        <p className={s.vqLigne}>
          <Phrase segments={v.ligne} />
        </p>
        <p className={s.vqPied}>
          <Contour href={v.href} className={s.sm + " " + s.contourC}>
            {V.profil}
          </Contour>
        </p>
      </section>
      {perso}
    </div>
  );
}
