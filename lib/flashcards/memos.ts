import fixedIncome from "./memos/fixed-income.json";
import ethics from "./memos/ethics.json";
import quant from "./memos/quant.json";
import economics from "./memos/economics.json";
import corporateIssuers from "./memos/corporate-issuers.json";
import fsa from "./memos/fsa.json";
import equity from "./memos/equity.json";
import derivatives from "./memos/derivatives.json";
import alternatives from "./memos/alternatives.json";
import portfolioManagement from "./memos/portfolio-management.json";

// Les zones des mémos de flashcards (les 10 matières) : pour chaque
// paquet (1 à 4) et chaque carte (position 1 à 15), les rectangles [x, y,
// largeur, hauteur] en % de l'image du mémo, mesurés sur la fiche HTML
// (attributs data-carte) par l'outil de cfa-work/onepagers. Le mémo les
// surligne pour la carte à l'écran (components/flashcards/Memo).

/** largeur / hauteur des images : mémo d'un paquet (A5), mémo de toutes les cartes (A4) */
export const RATIO_PAQUET = 1260 / 1785;
export const RATIO_CARTES = 1428 / 2021;

type Zones = Record<string, Record<string, number[][]>>;
const ZONES: Record<string, Zones> = {
  "fixed-income": fixedIncome as Zones,
  "ethics": ethics as Zones,
  "quant": quant as Zones,
  "economics": economics as Zones,
  "corporate-issuers": corporateIssuers as Zones,
  "fsa": fsa as Zones,
  "equity": equity as Zones,
  "derivatives": derivatives as Zones,
  "alternatives": alternatives as Zones,
  "portfolio-management": portfolioManagement as Zones,
};

/** Les zones des cartes d'un paquet ({} : pas de mémo mesuré pour cette matière). */
export function boitesMemo(slug: string, paquet: number): Record<string, number[][]> {
  return ZONES[slug]?.[String(paquet)] ?? {};
}
