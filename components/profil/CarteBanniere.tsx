import type { ReactNode } from "react";
import { BanniereComposee } from "@/components/profil/BanniereComposee";
import { PanneauJoueur } from "@/components/profil/PanneauJoueur";
import type { Composition } from "@/lib/profil/banniere";
import type { PanneauVue } from "@/lib/profil/panneau-vue";
import c from "./CarteBanniere.module.css";

// La CARTE COMPLÈTE du joueur, comme dans Apex : le panneau de gauche (pseudo,
// rang, trois badges, trois chiffres : PanneauJoueur, dessiné par le site) et,
// devant lui, la bannière que le joueur a composée (BanniereComposee : son
// fond, son cadre, son personnage et ses deux pièces, qui peuvent déborder
// sur la plaque). Les proportions sont fixes (860 × 1105 : la scène de la
// bannière, 540 × 1105, et la plaque qui passe derrière) ; tout se met à
// l'échelle de la largeur que donne la page, qui choisit aussi où la poser
// (en tête du profil : components/profil/EnteteJoueur.tsx). Sans état :
// serveur comme client. `fond` : le fond du profil du joueur (sa bannière),
// que la composition reprend quand il n'a pas envoyé le sien.

export function CarteBanniere({ composition, panneau, fond, charge = "lazy", className = "" }: { composition: Composition; panneau: PanneauVue; fond?: ReactNode; charge?: "lazy" | "eager"; className?: string }) {
  return (
    <div className={`${c.carte} ${className}`} role="group" aria-label={`Carte de ${panneau.nom}`} data-carte-banniere="">
      <div className={c.cartePlaque}>
        <PanneauJoueur v={panneau} />
      </div>
      <div className={c.carteBanniere}>
        <BanniereComposee composition={composition} fond={fond} metal={panneau.metal} charge={charge} />
      </div>
    </div>
  );
}
