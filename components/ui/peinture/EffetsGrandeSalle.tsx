import { boite, recopie } from "@/components/ui/peinture/geometrie";
import p from "@/components/ui/peinture/ScenePeinte.module.css";
import e from "./EffetsGrandeSalle.module.css";

// Les effets de la Grande Salle (classement-grande-salle.webp, 1312 × 816) :
// les flammes des deux braseros vacillent (la flamme peinte, recopiée, se
// déforme ; une lueur chaude la double), leur halo respire sur les colonnes,
// la lumière palpite dans la fente de la porte et dessous, le reflet au sol
// suit. Repère : les pixels de l'image.
export const SALLE = { src: "/illustrations/classement-grande-salle.webp", largeur: 1312, hauteur: 816 } as const;

const b = boite(SALLE.largeur, SALLE.hauteur);
const r = recopie(SALLE.largeur, SALLE.hauteur, SALLE.src);

export function EffetsGrandeSalle() {
  return (
    <>
      {/* le halo des flammes, sur les colonnes et le mur */}
      <div className={e.halo} style={b(150, 140, 690, 680)} />
      <div className={`${e.halo} ${e.haloD}`} style={b(620, 140, 1160, 680)} />
      {/* la lumière de la porte : fente, seuil, reflet au sol (même souffle, le sol à peine en retard) */}
      <div className={`${e.palpite} ${e.fente}`} style={b(604, 236, 710, 690)} />
      <div className={`${e.palpite} ${e.seuil}`} style={b(500, 650, 820, 724)} />
      <div className={`${e.palpite} ${e.sol}`} style={b(440, 684, 880, 816)} />
      {/* les flammes : l'image recopiée, déformée, fondue sur la peinture */}
      <div className={`${p.copie} ${e.flamme}`} style={{ ...b(370, 316, 472, 448), ...r(370, 316, 472, 448) }} />
      <div className={`${p.copie} ${e.flamme} ${e.flD}`} style={{ ...b(842, 316, 944, 448), ...r(842, 316, 944, 448) }} />
      <div className={e.langue} style={b(386, 322, 452, 440)} />
      <div className={`${e.langue} ${e.lgD}`} style={b(858, 322, 928, 440)} />
    </>
  );
}
