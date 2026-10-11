import { EclairLice } from "@/components/ui/peinture/EclairLice";
import { boite, recopie } from "@/components/ui/peinture/geometrie";
import p from "@/components/ui/peinture/ScenePeinte.module.css";
import type { CSSProperties } from "react";
import e from "./EffetsLice.module.css";

// Les effets de l'étendard (classement-lice.webp, 1584 × 672) : le tissu
// ondule au vent (l'image recopiée en tranches verticales qui montent et
// descendent en décalé, de plus en plus loin du mât), les nuages dérivent (le
// ciel recopié glisse sous un masque qui épargne l'étendard), la lueur de
// l'horizon pulse, et de loin en loin un éclair (EclairLice). Repère : les
// pixels de l'image.
export const LICE = { src: "/illustrations/classement-lice.webp", largeur: 1584, hauteur: 672 } as const;

const b = boite(LICE.largeur, LICE.hauteur);
const r = recopie(LICE.largeur, LICE.hauteur, LICE.src);

// le cadre du tissu (et de la barre qui le porte) ; tranches de 21 px à partir de x = 962
const BOITE = { x0: 950, y0: 130, x1: 1395, y1: 490 };
const LARGEUR = BOITE.x1 - BOITE.x0;
const PAS = 21;
const BANDES = Array.from({ length: 19 }, (_, i) => {
  const x = 962 + i * PAS;
  const fin = x + PAS + 1.5; // un peu de recouvrement : pas de fil clair entre deux tranches
  // amplitude : nulle au mât (x ≈ 975), pleine au bout libre du tissu (x ≈ 1345)
  const k = Math.pow(Math.min(1, Math.max(0, (x + PAS / 2 - 975) / 370)), 1.3);
  return {
    i,
    style: {
      left: ((x - BOITE.x0) / LARGEUR) * 100 + "%",
      width: ((fin - x) / LARGEUR) * 100 + "%",
      top: 0,
      height: "100%",
      ...r(x, BOITE.y0, fin, BOITE.y1),
      "--i": i,
      "--k": k.toFixed(3),
    } as CSSProperties,
  };
});

export function EffetsLice() {
  return (
    <>
      {/* les nuages : le ciel recopié glisse lentement sous un masque fixe qui laisse l'étendard en place */}
      <div className={e.ciel} style={b(0, 0, 1584, 330)}>
        <div className={`${p.copie} ${p.plein} ${e.nuages}`} style={r(0, 0, 1584, 330)} />
      </div>
      {/* la lueur de l'horizon */}
      <div className={e.lueur} style={b(330, 232, 1010, 372)} />
      <div className={e.lueurB} style={b(560, 262, 960, 362)} />
      {/* l'étendard */}
      <div className={e.etendard} style={b(BOITE.x0, BOITE.y0, BOITE.x1, BOITE.y1)}>
        {BANDES.map((t) => (
          <div key={t.i} className={`${p.copie} ${e.bande}`} style={t.style} />
        ))}
      </div>
      <EclairLice />
    </>
  );
}
