// Le moment de rang d'un résultat classé (duel, examen blanc classé), en
// module neutre : les pages serveur peuvent l'appeler pour décider s'il y a
// une cérémonie à poser, sans passer par un module « use client ».
// Même règle que changementDeRang (components/adn/RankCeremony), plus le
// placement et la garde « dernier mouvement ».

import type { VarianteRang } from "@/components/adn/RankCeremony";
import { PLACEMENT_GAMES, rankFor } from "@/lib/ranks";

const DIVISIONS = ["III", "II", "I"];

/** Le changement de rang entre deux ELO (null : rien ne bouge). */
export function changementRang(avant: number, apres: number, maitrise: number | null = null, place: number | null = null): VarianteRang | null {
  const a = rankFor(avant, maitrise, place);
  const b = rankFor(apres, maitrise, place);
  if (b.tierIndex > a.tierIndex) return "montee";
  if (b.tierIndex < a.tierIndex) return "descente";
  if (b.division !== a.division) return DIVISIONS.indexOf(b.division ?? "") > DIVISIONS.indexOf(a.division ?? "") ? "division" : "descente";
  if (b.lockedBy && !a.lockedBy) return "verrou";
  return null;
}

/**
 * Le moment à jouer pour un résultat (null : rien).
 * - rien si ce n'est pas le dernier mouvement d'ELO du joueur (le rang a pu
 *   bouger depuis : la cérémonie serait fausse) ;
 * - rien pendant le placement ; la 5e partie révèle la place ;
 * - sinon le changement de palier, de division ou le verrou.
 */
export function momentDeRang({
  avant,
  apres,
  maitrise = null,
  place = null,
  joues = null,
  dernier = false,
}: {
  avant: number;
  apres: number;
  maitrise?: number | null;
  place?: number | null;
  joues?: number | null;
  dernier?: boolean;
}): VarianteRang | null {
  if (!dernier) return null;
  if (joues !== null && joues < PLACEMENT_GAMES) return null;
  if (joues === PLACEMENT_GAMES) return "placement";
  return changementRang(avant, apres, maitrise, place);
}
