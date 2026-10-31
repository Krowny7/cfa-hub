import { Forces } from "@/components/moi/synthese/Forces";
import { Gagner } from "@/components/moi/synthese/Gagner";
import { Lacunes } from "@/components/moi/synthese/Lacunes";
import { cartesBilan } from "@/components/moi/synthese/modele-bilan";
import type { MatiereSynthese, NoteSynthese, NotionSynthese } from "@/components/moi/synthese/types";
import b from "@/components/moi/synthese/Bilan.module.css";

// La rangée « Tes lacunes | Tes forces | Où gagner des points » (5 | 4 | 3
// colonnes) de la page Moi « La synthèse ». Une carte dont la source manque
// se masque et le reste se recompose (data-n : 2 cartes à parts égales, 1
// carte sur toute la largeur) : Lacunes et Forces suivent les notions, Où
// gagner suit les matières. Rien du tout si les deux manquent. Composant
// serveur : les cartes sont rendues côté serveur, aucun îlot client.

export function RangeeBilan({
  matieres,
  notions,
  note,
}: {
  /** les 10 matières (types.ts) ; null : « Où gagner » se masque */
  matieres: MatiereSynthese[] | null;
  /** les 93 notions ; null : « Tes lacunes » et « Tes forces » se masquent */
  notions: NotionSynthese[] | null;
  /** la note estimée (types.ts) : sert à masquer les paliers de note sous 50 % du programme mesuré */
  note: NoteSynthese | null;
}) {
  const c = cartesBilan({ matieres, notions });
  if (c.n === 0) return null;
  // sans « Tes lacunes », les liens « Tes points faibles » du site (#points-faibles) arrivent sur la rangée, pas en haut de la page
  return (
    <div className={b.rangee} data-n={c.n} id={c.lacunes ? undefined : "points-faibles"}>
      {c.lacunes && notions && <Lacunes notions={notions} matieres={matieres} className={b.c5} />}
      {c.forces && notions && <Forces notions={notions} matieres={matieres} className={b.c4} />}
      {c.gagner && matieres && <Gagner matieres={matieres} note={note} className={b.c3} />}
    </div>
  );
}
