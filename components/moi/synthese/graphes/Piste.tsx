import type { Zone } from "@/components/moi/synthese/types";
import s from "@/components/moi/synthese/Synthese.module.css";

// Une piste de zones (rouge sous 50, ambre de 50 à 69, neutre au-dessus) avec la
// barre de la valeur dans la couleur de SA zone (rouge, ambre ou le vert
// « acquis »), le seuil de 70 % en pointillé et, facultatif, un repère (la
// maîtrise d'une autre date). Sert aux barres de « Tes matières », aux
// notions de la fiche et, aux lots suivants, aux autres cartes. Rendu neutre,
// aucun hook : la largeur et la zone viennent de modele.ts.

const REMPLISSAGE: Record<Zone, string> = { r: s.zpR, a: s.zpA, e: s.zpE };

export function Piste({ w, ton, fin = false, vide = false, repere = null, aria }: { w: number; ton: Zone | null; fin?: boolean; vide?: boolean; repere?: number | null; aria?: string }) {
  const classes = [s.zp, fin ? s.zpFin : null, vide ? s.zpVide : null].filter(Boolean).join(" ");
  return (
    <span className={classes} role={aria ? "img" : undefined} aria-label={aria} aria-hidden={aria ? undefined : true}>
      {ton && w > 0 && <i className={REMPLISSAGE[ton]} style={{ width: `${w}%` }} />}
      {repere !== null && <span className={s.rep} style={{ left: `${repere}%` }} />}
      <span className={s.seuil} />
    </span>
  );
}
