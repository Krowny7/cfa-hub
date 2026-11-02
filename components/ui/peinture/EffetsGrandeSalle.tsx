import { boite, recopie } from "@/components/ui/peinture/geometrie";
import p from "@/components/ui/peinture/ScenePeinte.module.css";
import e from "./EffetsGrandeSalle.module.css";

// Les effets de la Grande Salle (classement-grande-salle.webp, 1312 × 816 : la
// forteresse au-dessus des nuages, le pont blanc, la porte de bronze) : les
// flammes des deux braseros vacillent (la flamme peinte, recopiée, se déforme ;
// une lueur chaude la double), leur halo respire sur la façade, la lumière
// palpite dans la fente de la porte et dessous, le reflet sur le pont suit.
// Repère : les pixels de l'image.
export const SALLE = { src: "/illustrations/classement-grande-salle.webp", largeur: 1312, hauteur: 816 } as const;

const b = boite(SALLE.largeur, SALLE.hauteur);
const r = recopie(SALLE.largeur, SALLE.hauteur, SALLE.src);

export function EffetsGrandeSalle() {
  return (
    <>
      {/* le halo des flammes, sur la façade */}
      <div className={e.halo} style={b(280, 120, 620, 520)} />
      <div className={`${e.halo} ${e.haloD}`} style={b(700, 120, 1040, 520)} />
      {/* la lumière de la porte : fente, seuil, reflet sur le pont (même souffle, le pont à peine en retard) */}
      <div className={`${e.palpite} ${e.fente}`} style={b(628, 90, 690, 445)} />
      <div className={`${e.palpite} ${e.seuil}`} style={b(560, 425, 760, 490)} />
      <div className={`${e.palpite} ${e.sol}`} style={b(580, 460, 740, 580)} />
      {/* les flammes : l'image recopiée, déformée, fondue sur la peinture */}
      <div className={`${p.copie} ${e.flamme}`} style={{ ...b(395, 195, 492, 345), ...r(395, 195, 492, 345) }} />
      <div className={`${p.copie} ${e.flamme} ${e.flD}`} style={{ ...b(828, 195, 925, 345), ...r(828, 195, 925, 345) }} />
      <div className={e.langue} style={b(408, 205, 478, 335)} />
      <div className={`${e.langue} ${e.lgD}`} style={b(842, 205, 912, 335)} />
    </>
  );
}
