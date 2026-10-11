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
  "classement-grande-salle": {
    src: "/illustrations/classement-grande-salle.webp",
    alt: "La Grande Salle : un cabinet d'étude, la veille de l'examen",
    credit: "Vittore Carpaccio, La Vision de saint Augustin (vers 1502), cabinet d'étude. Domaine public (commons.wikimedia.org, Vittore_carpaccio,_visione_di_sant'agostino_01).",
    emplacement: "Classement : carte « lieu » La Grande Salle (examen classé), image 16:10 en tête de carte sur ordinateur (environ 365 px de large) ; sur téléphone, la même image en vignette portrait 88×110 px à droite du titre.",
    prompt:
      STYLE +
      "Sujet : la Salle des Cinq-Cents du Palazzo Vecchio à Florence, vide, la veille d'un examen : de longues tables de bois alignées avec encriers, plumes et feuilles posées, un sablier au premier plan sur la table la plus proche, plafond à caissons dorés, grandes fenêtres à droite par où entre le soleil couchant en longs rayons poussiéreux. Sans personnage. Lumière dorée et rasante de fin de journée, palette chaude : ocre jaune, terre de Sienne brûlée, brun Van Dyck, vieil or, quelques accents vermillon et bleu-gris dans les ombres. Aucun texte, aucune lettre, aucun logo, aucun cadre, pas de vignettage noir. Format paysage 16:10 (1600×1000 px), sujet centré, qui reste lisible recadré en vignette verticale 4:5 au centre.",
  },
  "classement-lice": {
    src: "/illustrations/classement-lice.webp",
    alt: "La lice d'un tournoi florentin : oriflammes et lances",
    credit: "Paolo Uccello, La Bataille de San Romano (panneau des Offices, vers 1438), recadrée sur les lances et les étendards. Domaine public (commons.wikimedia.org, Battle_of_San_Romano,_by_Paolo_Uccello_(Uffizi_Gallery,_Florence)).",
    emplacement: "Classement : bandeau étroit pleine largeur au-dessus du classement général (88 px de haut sur ordinateur, 64 px sur téléphone).",
    prompt:
      STYLE +
      "Sujet : la lice d'un tournoi florentin sur la place Santa Croce, vue de loin et de côté ; la barrière de bois de la joute court sur toute la largeur, avec oriflammes et pennons rouge et or, tribunes de bois et lances appuyées contre la barrière. Pas de cavalier, aucune figure au premier plan ; composition horizontale régulière, sans point focal unique, pour un bandeau décoratif. Haut et bas de l'image calmes (ciel, pavés), sans détail important. Lumière dorée de fin de journée, palette chaude : ocre, terre de Sienne brûlée, brun Van Dyck, vieil or, accents vermillon. Aucun texte, aucun logo, aucun cadre, pas de vignettage. Format panoramique 21:9 (2520×1080 px), avec toute l'information utile dans une bande horizontale au tiers central de la hauteur (l'image sera recadrée en frise très étroite, environ 12:1 sur ordinateur et 6:1 sur téléphone).",
  },
  "classement-duels": {
    src: "/illustrations/classement-duels.webp",
    alt: "Un cavalier de San Romano",
    credit: "Paolo Uccello, La Bataille de San Romano (panneau de Londres, détail). Domaine public (commons.wikimedia.org, San_Romano_Battle_(Paolo_Uccello,_London)_02).",
    emplacement: "Classement : médaillon rond de 52 px dans la tuile « Duels en cours » (livrer en 512×512 px).",
    prompt:
      STYLE +
      "Sujet : un heaume de joute de la Renaissance posé de trois quarts sur une table de bois, panache rouge, deux lances croisées derrière ; gros plan, silhouette très lisible même à 50 px. Sans personnage. Lumière dorée de fin de journée venant de la gauche, palette chaude : ocre, terre de Sienne brûlée, brun Van Dyck, vieil or, accent vermillon. Aucun texte, aucun logo, aucun cadre. Format carré 1:1 (1024×1024 px), sujet centré qui tient dans un cercle inscrit, fond simple et sombre-chaud.",
  },
  "joueurs-seigneurie": {
    src: "/illustrations/joueurs-seigneurie.webp",
    alt: "La place de la Seigneurie à Florence, où l'on croise tout le monde",
    credit: "Giuseppe Zocchi, La place de la Seigneurie à Florence (détail recadré). Domaine public (commons.wikimedia.org, Giuseppe_Zocchi_-_The_Piazza_della_Signoria_in_Florence_-_WGA25992_(cropped)).",
    emplacement: "Joueurs : bandeau en tête du héros de l'annuaire, pleine largeur de la carte (112 px de haut sur ordinateur, 84 px sur téléphone).",
    prompt:
      STYLE +
      "Sujet : la place de la Seigneurie à Florence au soir, en vue large : le Palazzo Vecchio à gauche, la Loggia dei Lanzi à droite, la fontaine de Neptune au centre, une foule lointaine de silhouettes minuscules et indistinctes qui se croisent (le lieu où l'on rencontre tout le monde), sans aucun visage. Haut et bas de l'image calmes. Lumière dorée et rasante de fin de journée, longues ombres, palette chaude : ocre, terre de Sienne brûlée, brun Van Dyck, vieil or, ciel orangé et bleu-gris. Aucun texte, aucun logo, aucun cadre, pas de vignettage. Format panoramique 21:9 (2520×1080 px), avec toute l'information utile dans une bande horizontale au tiers central de la hauteur (l'image sera recadrée en environ 11:1 sur ordinateur et 4:1 sur téléphone).",
  },
} as const satisfies Record<string, Illustration>;

export type IllustrationNom = keyof typeof ILLUSTRATIONS;
