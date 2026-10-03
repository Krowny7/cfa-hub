import { stroke } from "@/components/ink/geometry";

// Petits coups de pinceau partagés : les bâtons de la série (4 traits + une
// barre en travers), les coches de questions et la croix du correcteur.
// Calculés une fois (graines fixes), posés une fois dans InkDefs, puis
// réutilisés par <use> : une série de 30 jours ne recopie pas 30 tracés.
//
// Repères : un bâton tient dans 0 0 14 48 (axe x = 7, du haut y = 3 au bas
// y = 45) ; la barre d'une botte dans 0 0 54 48 (bâtons en x = 7, 20, 33, 46) ;
// la croix dans 0 0 14 14.

const SWAY: [number, number, number][] = [
  [0.4, -0.3, 0.2],
  [-0.6, 0.2, 0.7],
  [0.2, 0.7, -0.4],
  [-0.3, -0.5, 0.4],
  [0.7, 0.1, -0.3],
];

/** Cinq variantes de bâton vertical : appui en haut, levée effilée en bas. */
export const TALLY: string[] = SWAY.map(([a, b, c], i) =>
  stroke(
    [
      [7 + a, 3.5 + (i % 3) * 0.6],
      [7 + b, 24],
      [7 + c, 45 - (i % 2) * 1.2],
    ],
    { w: 6.4 + (i % 2) * 0.7, end: 0.4, attack: 0.14, jitter: 0.08, seed: 11 + i * 7 },
  ),
);

/** Deux variantes de la barre en travers (le cinquième jour). */
export const TALLY_BAR: string[] = [
  stroke(
    [
      [0.5, 37.5],
      [27, 25],
      [53.5, 11.5],
    ],
    { w: 5.8, end: 0.32, attack: 0.1, jitter: 0.07, seed: 51 },
  ),
  stroke(
    [
      [1, 36],
      [26, 25.5],
      [53, 13],
    ],
    { w: 6.2, end: 0.3, attack: 0.1, jitter: 0.08, seed: 63 },
  ),
];

/** La croix du correcteur (erreur), deux traits rapides. */
export const CROSS: string =
  stroke(
    [
      [2.2, 2.4],
      [7, 7.2],
      [11.8, 11.8],
    ],
    { w: 2.9, end: 0.35, attack: 0.12, jitter: 0.06, seed: 71, per: 6 },
  ) +
  " " +
  stroke(
    [
      [11.6, 2],
      [7.1, 6.8],
      [2.4, 12],
    ],
    { w: 2.7, end: 0.3, attack: 0.12, jitter: 0.06, seed: 79, per: 6 },
  );
