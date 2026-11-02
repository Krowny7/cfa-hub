import { PorteeEncre, Sceau } from "@/components/classement/Encre";
import s from "./Salles.module.css";

// Les deux pièces communes de la peau des Salles : la scène (la carte d'encre
// noire des pages de salle, posée dans la portée d'encre de S'affronter pour que
// les boutons et les sceaux y aient leur palette) et l'en-tête d'un panneau (le
// sceau d'encre, le titre en Dela Gothic One, un compteur ou une action à droite).

// sobre : une partie en chrono global, posée sur le papier du site, sans la carte d'encre noire
export function Stage({ children, salon, sobre = false }: { children: React.ReactNode; salon?: "attente" | "partie"; sobre?: boolean }) {
  return (
    <PorteeEncre>
      <div className={[s.jetons, s.racine].join(" ")} data-salon={salon} data-sobre={sobre ? "1" : undefined}>
        {children}
      </div>
    </PorteeEncre>
  );
}

export function TetePanneau({ id, icone, droite, children }: { id?: string; icone: React.ReactNode; droite?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={s.panneauTete}>
      <div className={s.titreBloc}>
        <Sceau className={s.sceauPetit}>{icone}</Sceau>
        <h2 id={id} className={s.titrePanneau}>
          {children}
        </h2>
      </div>
      {droite}
    </div>
  );
}
