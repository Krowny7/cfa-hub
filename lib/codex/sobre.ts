// Le mode sobre (V3 §11.5) : user_metadata.rl_sobre, posé par l'interrupteur
// de Moi › Réglages (app/moi/actions-sobre.ts). Ce module le lit et dit ce
// qu'il range : les « +n XP », les pièces gagnées, les fêtes au-delà d'une
// ligne, les apparitions furtives de Léonard (lib/leonard/apparitions). Il
// garde la séance, le panneau, le cap, les contrats : rien de la révision ne
// change, seul le bruit s'en va. Sans la clé (interrupteur pas encore là,
// compte d'avant) : le mode normal. Module neutre (serveur et navigateur).

import type { TailleFete } from "@/components/fete/Fete";

/** La clé du compte (user_metadata), fixée par V3 §13.2. */
export const CLE_SOBRE = "rl_sobre";

type Compte = { user_metadata?: Record<string, unknown> | null } | null | undefined;

/** Le mode sobre du compte : vrai seulement si rl_sobre vaut true (absent ou illisible : faux). */
export function lireSobre(user: Compte): boolean {
  return user?.user_metadata?.[CLE_SOBRE] === true;
}

/** Ce qu'une fête montre : sa taille, l'XP gagnée, la pièce gagnée (clé de PIECES). */
export type HabitFete = { taille: TailleFete; xp?: number; piece?: string };

/** En mode sobre, une fête tient en une ligne, sans XP ni pièce ; sinon elle reste telle quelle. */
export function feteSobre(f: HabitFete, sobre: boolean): HabitFete {
  return sobre ? { taille: "ligne" } : f;
}
