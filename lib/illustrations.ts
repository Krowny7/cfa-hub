// Les illustrations du site, un emplacement = une entrée. Le fichier est une
// image provisoire du domaine public (colonne `credit`) ; l'image définitive,
// peinte avec le `prompt` (Gemini, l'illustration de l'Atelier jointe comme
// référence de style), la remplace en écrasant simplement le fichier de
// public/illustrations/ (même nom, même format) : rien d'autre à toucher.
// Affichage : components/ui/Illustration.tsx.

export type Illustration = {
  /** chemin public du fichier (public/illustrations/…) */
  src: string;
  /** description de l'image (vide à l'usage si l'image est décorative) */
  alt: string;
  /** crédit de l'image provisoire (domaine public) */
  credit: string;
  /** prompt de l'image définitive */
  prompt: string;
  /** emplacement et cadrage attendus */
  emplacement: string;
};

const STYLE = "Utilise l'image jointe (l'illustration de l'Atelier de Ranked Lobby) comme référence stricte de style, de touche et de palette. Peinture à l'huile au couteau, empâtements épais, touches de matière bien visibles. ";

export const ILLUSTRATIONS = {
  "accueil-bandeau": {
    src: "/illustrations/accueil-bandeau.webp",
    alt: "Florence et l'Arno",
    credit: "Giuseppe Zocchi, Vue de l'Arno à Florence (XVIIIe siècle), recadrée sur la ligne de la ville, sans les barques. Domaine public.",
    emplacement: "Accueil : bandeau étroit à fond perdu en tête du héros de la journée, environ 830×100 px sur ordinateur, 390×64 px sur téléphone.",
    prompt:
      STYLE +
      "Sujet : un panorama très large de Florence vu depuis la rive de l'Arno : le fleuve calme au premier plan, le Ponte Vecchio, les toits de tuiles, le palais de la Seigneurie et sa tour, au loin les collines dans une brume dorée. Lumière rasante de fin de journée, palette chaude de la série (ocre, terre de Sienne, rose de tuile, brun, touches d'or pâle), ciel crème. Ne montre pas la coupole du Duomo (elle est déjà dans l'Atelier). Aucun personnage, aucune barque, aucun texte, aucune lettre, aucun logo. Format 21:9 très large ; la ville occupe une bande horizontale au milieu de la hauteur, avec ciel et eau calmes au-dessus et au-dessous, pour qu'on puisse recadrer en 8:1 sans rien perdre ; rien d'important dans les 15 % de chaque bord.",
  },
  "accueil-trente-du-jour": {
    src: "/illustrations/accueil-trente-du-jour.webp",
    alt: "La salle des épreuves : un cabinet de marqueterie",
    credit: "Studiolo du palais ducal de Gubbio (marqueterie, vers 1478-1482), Metropolitan Museum of Art, CC0 (commons.wikimedia.org, Studiolo_from_the_Ducal_Palace_in_Gubbio_MET_DT2954).",
    emplacement: "Accueil : carte « lieu » Les 30 du jour, image 16:10 en tête de carte sur ordinateur (environ 400×250 px) ; sur téléphone, la même image en vignette portrait 88×110 px à droite du titre.",
    prompt:
      STYLE +
      "Sujet : la salle des épreuves de l'atelier, vers 1500, en cadrage serré : un pupitre de bois sombre ; dessus, une pile de trente feuillets de papier vergé noués d'un ruban et scellés d'un cachet de cire rouge, un encrier, une plume d'oie et un sablier dont le sable s'écoule. Fond : un mur de boiseries sombres et une étagère, sans fenêtre ni vue de ville. Lumière dorée de fin de journée venant de la gauche, poussière dans le rayon, ombres brunes profondes. Palette chaude : ocre, terre de Sienne brûlée, brun, rouge brique, touches d'or. Aucun personnage, aucun texte lisible, aucune lettre, aucun logo. Format 16:10 ; feuillets scellés et sablier au centre, un peu à droite, pour qu'un recadrage portrait 4:5 les garde ; haut de l'image plus calme.",
  },
  "accueil-duel": {
    src: "/illustrations/accueil-duel.webp",
    alt: "Une balance de Léonard de Vinci",
    credit: "Léonard de Vinci, Codex Atlanticus, folio 30v (une balance), recadré en carré. Domaine public (commons.wikimedia.org, Leonardo_da_Vinci_Codex_Altanticus_folio_30v).",
    emplacement: "Accueil : médaillon rond de 52 px sur la tuile calme « Duel à revoir » (source carrée, 512×512 px conseillés).",
    prompt:
      STYLE +
      "Sujet : une balance de bronze à deux plateaux, dans l'esprit des carnets de Léonard, posée sur une table de bois sombre ; un plateau légèrement plus bas que l'autre. Lumière chaude de fin de journée venant de la gauche, fond brun chaud, uni et sombre. Aucun personnage, aucun texte, aucune lettre. Format carré 1:1, objet centré occupant environ 70 % de l'image, silhouette très lisible, car l'image sera affichée dans un médaillon rond de 52 pixels ; rien d'important dans les coins.",
  },
} as const satisfies Record<string, Illustration>;

export type IllustrationNom = keyof typeof ILLUSTRATIONS;
