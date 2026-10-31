import { CalculTheorie } from "@/components/moi/synthese/CalculTheorie";
import { Progression } from "@/components/moi/synthese/Progression";
import { Rythme } from "@/components/moi/synthese/Rythme";
import type { CalculSynthese, ProgressionSynthese, RythmeSynthese } from "@/components/moi/synthese/types";
import m from "@/components/moi/synthese/Examen.module.css";

// La rangée « Calcul ou théorie | Ton rythme d'examen | Ta progression » (3 |
// 4 | 5 colonnes). Une carte dont la source manque (calcul, rythme ou
// progression à null) est masquée et la rangée se recompose : deux cartes se
// partagent la largeur (6 | 6), une seule la prend (12) ; aucune : rien.
// Composant serveur : les cartes à état (Rythme, Progression) sont des îlots.

export function RangeeExamen({
  calcul,
  rythme,
  progression,
  aujourdhui,
  examen,
  ilYa30 = null,
}: {
  calcul: CalculSynthese | null;
  rythme: RythmeSynthese | null;
  progression: ProgressionSynthese | null;
  /** le jour d'aujourd'hui (AAAA-MM-JJ, Paris) : dater la projection de la courbe */
  aujourdhui: string | null;
  /** le jour de l'examen (AAAA-MM-JJ) ; null sans date ou une fois passé */
  examen: string | null;
  /** la maîtrise globale il y a 30 jours (`globale.ilYa[30]`), ou null */
  ilYa30?: number | null;
}) {
  const n = (calcul ? 1 : 0) + (rythme ? 1 : 0) + (progression ? 1 : 0);
  if (n === 0) return null;
  return (
    <div className={m.rangee} data-n={n}>
      {calcul && <CalculTheorie calcul={calcul} className={m.c3} />}
      {rythme && <Rythme rythme={rythme} className={m.c4} />}
      {progression && <Progression progression={progression} aujourdhui={aujourdhui} examen={examen} ilYa30={ilYa30} className={m.c5} />}
    </div>
  );
}
