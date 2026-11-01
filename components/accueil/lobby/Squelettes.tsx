import type { ReactNode } from "react";
import { LOBBY } from "@/lib/voice-accueil-lobby";
import l from "./Lobby.module.css";
import q from "./Squelettes.module.css";

// Les squelettes des cinq cartes lentes de l'accueil « Le lobby » (carte du
// jour, rival, lobby en direct, déblocage, quête), posés par LobbyView à la
// place EXACTE de la carte pendant que le serveur la lit (en continu, dans un
// <Suspense>) : la même carte (cadre, marges, ombre du socle), la même hauteur
// minimale que la vraie, des barres en aplats gris pâles. Chacun est un repère
// de place, pas une animation. `aria-busy` : les lecteurs d'écran savent que la
// carte arrive, et un texte réservé leur dit laquelle ; les barres sont
// décoratives. `className` : le placement donné par LobbyView (colonne de la
// rangée), comme pour la vraie carte. Composants serveur, sans état ni donnée.

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/** Une barre de texte (`largeur` : l30, l45, l60, l75 ou l90) ; `grosse` : un titre. */
function Barre({ largeur, grosse }: { largeur: "l30" | "l45" | "l60" | "l75" | "l90"; grosse?: boolean }) {
  return <i className={cx(q.barre, q[largeur], grosse && q.barreGrosse)} aria-hidden="true" />;
}

/** L'en-tête de la plupart des cartes : le sceau rond, le surtitre, le titre. */
function Tete() {
  return (
    <div className={q.tete} aria-hidden="true">
      <i className={q.rond} />
      <div className={q.teteTexte}>
        <Barre largeur="l30" />
        <Barre largeur="l60" grosse />
      </div>
    </div>
  );
}

/** Le socle des cinq : la carte du lobby, son état occupé et le texte réservé aux lecteurs d'écran. */
function Socle({ nom, texte, className, children }: { nom: "carteDuJour" | "rival" | "enDirect" | "deblocage" | "quete"; texte: string; className?: string; children: ReactNode }) {
  return (
    <div className={cx(l.carte, q.sq, q[nom], className)} aria-busy="true" data-squelette={nom}>
      <span className="sr-only">{texte}</span>
      {children}
    </div>
  );
}

export function SqCarteDuJour({ className }: { className?: string }) {
  return (
    <Socle nom="carteDuJour" texte={LOBBY.chargement.carteDuJour} className={className}>
      <Tete />
      <i className={q.bloc} aria-hidden="true" />
      <Barre largeur="l45" />
    </Socle>
  );
}

export function SqRival({ className }: { className?: string }) {
  return (
    <Socle nom="rival" texte={LOBBY.chargement.rival} className={className}>
      <Tete />
      {[0, 1, 2, 3, 4].map((i) => (
        <i key={i} className={q.bloc} aria-hidden="true" />
      ))}
      <Barre largeur="l90" />
      <Barre largeur="l60" />
    </Socle>
  );
}

export function SqEnDirect({ className }: { className?: string }) {
  return (
    <Socle nom="enDirect" texte={LOBBY.chargement.enDirect} className={className}>
      <Barre largeur="l30" />
      {[0, 1, 2, 3].map((i) => (
        <i key={i} className={q.bloc} aria-hidden="true" />
      ))}
      <div className={q.visages} aria-hidden="true">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <i key={i} className={q.rond} />
        ))}
      </div>
    </Socle>
  );
}

export function SqDeblocage({ className }: { className?: string }) {
  return (
    <Socle nom="deblocage" texte={LOBBY.chargement.deblocage} className={className}>
      <Tete />
      <Barre largeur="l75" />
      <i className={q.bloc} aria-hidden="true" />
      <Barre largeur="l45" />
    </Socle>
  );
}

export function SqQuete({ className }: { className?: string }) {
  return (
    <Socle nom="quete" texte={LOBBY.chargement.quete} className={className}>
      <Tete />
      <Barre largeur="l75" />
      <i className={q.bloc} aria-hidden="true" />
    </Socle>
  );
}
