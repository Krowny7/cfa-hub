import fixedIncome from "./memos/fixed-income.json";

// Les zones des mémos de flashcards (Fixed Income d'abord) : pour chaque
// paquet (1 à 4) et chaque carte (position 1 à 15), les rectangles [x, y,
// largeur, hauteur] en % de l'image du mémo, mesurés sur la fiche HTML
// (attributs data-carte) par l'outil de cfa-work/onepagers. Le mémo les
// surligne pour la carte à l'écran (components/flashcards/Memo).

/** largeur / hauteur des images : mémo d'un paquet (A5), mémo de toutes les cartes (A4) */
export const RATIO_PAQUET = 1260 / 1785;
export const RATIO_CARTES = 1428 / 2021;

type Zones = Record<string, Record<string, number[][]>>;
const ZONES: Record<string, Zones> = { "fixed-income": fixedIncome as Zones };

/** Les zones des cartes d'un paquet ({} : pas de mémo mesuré pour cette matière). */
export function boitesMemo(slug: string, paquet: number): Record<string, number[][]> {
  return ZONES[slug]?.[String(paquet)] ?? {};
}
