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
  "reviser-bibliotheque": {
    src: "/illustrations/reviser-bibliotheque.webp",
    alt: "La bibliothèque-cabinet d'étude : un studiolo de marqueterie",
    credit: "Studiolo du palais ducal de Gubbio (Giuliano da Maiano, atelier), Metropolitan Museum of Art, CC0 (commons.wikimedia.org, Studiolo_from_the_Ducal_Palace_in_Gubbio_MET_DT213911).",
    emplacement: "Réviser : carte « lieu » La Bibliothèque, image carrée en tête de carte sur ordinateur (environ 365 px de large) ; sur téléphone, la même image en vignette portrait 88×110 px à droite du titre.",
    prompt:
      STYLE +
      "Sujet : la bibliothèque-cabinet d'étude de l'atelier de Léonard vers 1500. Hautes étagères de bois sombre chargées de livres reliés de cuir et de rouleaux, un lutrin avec un grand livre ouvert, une table couverte de carnets, un compas et un globe, une fenêtre en plein cintre à gauche d'où entre une lumière dorée et rasante de fin de journée, poussière qui flotte dans le rayon. Palette chaude : ocre, terre de Sienne brûlée, brun, or, quelques bleus froids dans les ombres. Aucun personnage, aucun texte lisible, pas de cadre. Format carré 1:1, sujet principal centré, avec assez d'air en haut et en bas pour un recadrage en portrait 4:5.",
  },
  "reviser-casier-medaillon": {
    src: "/illustrations/reviser-casier-medaillon.webp",
    alt: "Un casier de cartes en marqueterie",
    credit: "Recadrage des casiers à claire-voie du studiolo de Gubbio, Metropolitan Museum of Art, CC0 (commons.wikimedia.org, Studiolo_from_the_Ducal_Palace_in_Gubbio_MET_DT213911).",
    emplacement: "Réviser : médaillon rond de 60 px dans la tuile Flashcards (livrer en 512×512 px).",
    prompt:
      STYLE +
      "Sujet : gros plan d'un petit casier de bois sombre aux portes à claire-voie, rempli de cartes de papier vergé jauni, quelques cartes sorties en éventail, une ficelle. Lumière dorée de fin de journée venant de la gauche, contraste franc entre le bois sombre et le papier clair. Palette chaude : ocre, Sienne, brun, or. Aucun personnage, aucun texte lisible. Format carré 1:1, sujet centré et lisible en tout petit dans un cercle.",
  },
  "reviser-carnets": {
    src: "/illustrations/reviser-carnets.webp",
    alt: "Une double page des carnets de Léonard",
    credit: "Léonard de Vinci, Codex Arundel 263 ff. 174v-175r, British Library. Domaine public (commons.wikimedia.org, Codex_Arundel_263_ff.174v-175r).",
    emplacement: "/fiches : carte horizontale du lieu « Les carnets » sous l'en-tête, image 16:9 de 300×169 px sur ordinateur, 112×84 px sur téléphone.",
    prompt:
      STYLE +
      "Sujet : sur une table de bois patinée, plusieurs carnets de Léonard ouverts : pages couvertes de croquis sépia (engrenages, études de mains, schémas), écriture en miroir illisible, un fusain, une règle et un compas posés dessus. Lumière dorée de fin de journée rasant le papier depuis la gauche. Palette chaude : ocre, Sienne, brun, or. Aucun personnage, aucun texte lisible. Format 16:9, sujet au centre pour permettre un recadrage en 4:3.",
  },
  "reviser-pupitre": {
    src: "/illustrations/reviser-pupitre.webp",
    alt: "Un cabinet d'étude, ses étagères et son pupitre",
    credit: "Antonello da Messina, Saint Jérôme dans son étude (vers 1475), recadré sans le personnage. Domaine public (commons.wikimedia.org, Antonello_da_Messina_-_St_Jerome_in_his_study).",
    emplacement: "/courses : carte horizontale du lieu « Le pupitre » sous l'en-tête, image 16:9 de 300×169 px sur ordinateur, 112×84 px sur téléphone.",
    prompt:
      STYLE +
      "Sujet : un lutrin de bois sculpté près d'une fenêtre en plein cintre, un grand livre ouvert dessus, une bougie, des étagères de livres derrière, quelques feuillets sur un tabouret. Lumière dorée de fin de journée qui traverse la pièce en diagonale, poussière dans le rayon. Palette chaude : ocre, Sienne, brun, or, ombres bleutées. Aucun personnage, aucun texte lisible. Format 16:9, lutrin légèrement à droite du centre, recadrable en 4:3.",
  },
  "reviser-casier": {
    src: "/illustrations/reviser-casier.webp",
    alt: "Un meuble à casiers en marqueterie",
    credit: "Recadrage des casiers à claire-voie du studiolo de Gubbio, Metropolitan Museum of Art, CC0 (commons.wikimedia.org, Studiolo_from_the_Ducal_Palace_in_Gubbio_MET_DT213911).",
    emplacement: "/flashcards : carte horizontale du lieu « Le casier » sous l'en-tête, image 16:9 de 300×169 px sur ordinateur, 112×84 px sur téléphone.",
    prompt:
      STYLE +
      "Sujet : un meuble à casiers en bois sombre aux portes à claire-voie, des petites cases pleines de cartes de papier vergé jauni ; un tiroir entrouvert, quelques cartes en éventail sur la tablette, une ficelle et un sceau de cire. Lumière dorée de fin de journée venant de la gauche. Palette chaude : ocre, Sienne, brun, or. Aucun personnage, aucun texte lisible. Format 16:9, sujet au centre, recadrable en 4:3.",
  },
  "moi-cabinet": {
    src: "/illustrations/moi-cabinet.webp",
    alt: "Un studiolo de la Renaissance, livres et fioles sur les étagères, lumière de fin de journée",
    credit: "Antonello da Messina, Saint Jérôme dans son cabinet de travail (vers 1475), recadré sur le studiolo. Domaine public (commons.wikimedia.org, Antonello_da_Messina_-_St_Jerome_in_his_Study_-_WGA0759).",
    emplacement: "/moi : carte « lieu » Ton cabinet, image 16:10 en tête de carte sur ordinateur (4 colonnes) ; sur téléphone, la même image en bandeau étroit (environ 16:5, 110 px de haut) en haut de page.",
    prompt: "Peinture à l'huile au couteau, empâtements épais et visibles, palette chaude (ocre, terre de Sienne brûlée, brun Van Dyck, touches de vermillon et de vert-de-gris), lumière dorée de fin de journée, ombres profondes et chaudes, univers de l'atelier de Léonard de Vinci à Florence vers 1500 (même série que l'illustration de l'Atelier jointe en référence). Sujet : le studiolo personnel de Léonard, un petit cabinet de travail lambrissé de bois sombre ; étagères chargées de livres reliés de cuir, de fioles, d'un sablier, d'un compas et d'instruments de mesure en laiton ; une écritoire avec un carnet ouvert, une plume dans l'encrier et une bougie éteinte ; une fenêtre à meneaux à gauche laisse entrer la lumière rasante du soir et laisse voir les collines toscanes. Cadrage horizontal 16:10, point d'intérêt (l'écritoire éclairée) au centre ; l'image doit rester lisible recadrée en bande 16:5 autour de l'écritoire. Aucun personnage, aucun texte lisible, aucune signature, aucun logo, pas de cadre peint.",
  },
  "moi-cabinet-curiosites": {
    src: "/illustrations/moi-cabinet-curiosites.webp",
    alt: "Un cabinet de curiosités : étagères, coquillages, oiseaux naturalisés",
    credit: "Anonyme pour Ferrante Imperato, gravure du musée « Dell’Historia Naturale » (1599), recadrée en bande. Domaine public (commons.wikimedia.org, RitrattoMuseoFerranteImperato). Affichée en sépia, assombrie la nuit, en attendant la peinture.",
    emplacement: "/moi : bandeau étroit pleine largeur en tête de la section « Tes matières » (150 px de haut sur ordinateur, 96 px sur téléphone, environ 8:1), légende en pastille en bas à gauche.",
    prompt: "Peinture à l'huile au couteau, empâtements épais et visibles, palette chaude et plutôt sombre (terre de Sienne, brun Van Dyck, ocre, rares touches de vermillon et de vert-de-gris), lumière dorée de fin de journée, univers de l'atelier de Léonard de Vinci à Florence vers 1500 (même série que l'illustration de l'Atelier jointe en référence). Sujet : un cabinet de curiosités vu en panorama, un long mur d'étagères en bois : coquillages, minéraux, un oiseau naturalisé, une maquette en bois de machine volante, un globe, des herbiers, des bocaux, une rangée de livres, répartis en dix petits compartiments réguliers. Composition très horizontale 4:1 sans point focal unique, peu de détails fins, valeurs sombres dans l'ensemble, coin inférieur gauche plus sombre et uni pour poser une légende ; doit rester lisible recadrée en bande 8:1. Aucun personnage, aucun texte lisible, aucune signature, aucun logo, pas de cadre peint.",
  },
  "moi-carnet": {
    src: "/illustrations/moi-carnet.webp",
    alt: "Une page de carnet de Léonard, notes et croquis",
    credit: "Léonard de Vinci, Études d’embryons (1510-1513), recadré sur les notes, photo Luc Viatour. Domaine public (commons.wikimedia.org, Da_Vinci_Studies_of_Embryos_Luc_Viatour).",
    emplacement: "/moi?onglet=erreurs : carte « Mis au propre » du carnet de ratures, image en tête 16:9 sur ordinateur, vignette 96×112 px sur téléphone.",
    prompt: "Peinture à l'huile au couteau, empâtements épais et visibles, palette chaude (ocre jaune, terre de Sienne brûlée, brun Van Dyck, touches de vermillon), lumière dorée de fin de journée, univers de l'atelier de Léonard de Vinci à Florence vers 1500 (même série que l'illustration de l'Atelier jointe en référence). Sujet : une double page de carnet de Léonard ouverte sur une table de noyer ; sur la page de gauche, des lignes d'écriture en miroir barrées une à une d'un trait d'encre ; sur celle de droite, les mêmes notes recopiées proprement ; une plume d'oie et un petit couteau à gratter posés à côté. Cadrage horizontal 16:9, avec le centre en 4:5 lisible seul pour la version téléphone. Aucun personnage, aucun texte lisible, aucune signature, aucun logo, pas de cadre peint.",
  },
  "moi-marquees": {
    src: "/illustrations/moi-marquees.webp",
    alt: "Léonard, autoportrait à la sanguine",
    credit: "Léonard de Vinci, autoportrait présumé à la sanguine. Domaine public (commons.wikimedia.org, Leonardo_da_Vinci_-_presumed_self-portrait_-_WGA12798).",
    emplacement: "/moi?onglet=marquees : carte « Comment ça marche », image en tête 16:9 sur ordinateur, vignette 96×112 px sur téléphone. Provisoire : l’autoportrait n’a pas de lien avec le sujet, la peinture du livre à signets le corrigera.",
    prompt: "Peinture à l'huile au couteau, empâtements épais et visibles, palette chaude (ocre, terre de Sienne, brun Van Dyck, vermillon), lumière dorée de fin de journée, univers de l'atelier de Léonard de Vinci à Florence vers 1500 (même série que l'illustration de l'Atelier jointe en référence). Sujet : un gros livre relié de cuir posé fermé sur un pupitre, hérissé d'une dizaine de signets de soie rouge et de bandes de papier qui dépassent des pages, à côté d'un petit tas de feuillets pliés. Cadrage horizontal 16:9, avec le centre en 4:5 lisible seul. Aucun personnage, aucun texte lisible, aucune signature, aucun logo, pas de cadre peint.",
  },
  "defi-pupitre": {
    src: "/illustrations/defi-pupitre.webp",
    alt: "Le pupitre d'écriture, un sablier, une copie vierge",
    credit: "Antonello da Messina, Saint Jérôme dans son cabinet de travail (vers 1475), National Gallery, recadré à droite sur les rayonnages. Domaine public (commons.wikimedia.org, Antonello_da_Messina_-_St_Jerome_in_his_study_-_National_Gallery_London). Provisoire : un bout du personnage reste visible.",
    emplacement: "/defi : carte « lieu » Le Pupitre, image 16:10 en tête de carte sur ordinateur (environ 400×250 px) ; sur téléphone, la même image en vignette portrait 88×110 px (cadrage object-position 85% 40%).",
    prompt: "Image de référence jointe : l'illustration de l'Atelier de Ranked Lobby ; reprends exactement sa technique, sa lumière et sa palette. Peinture au couteau, empâtements épais et touches visibles, dans l'univers de l'atelier de Léonard de Vinci à Florence vers 1500. Un pupitre d'écriture en noyer dans un cabinet de travail florentin : une copie vierge sur le plan incliné, une plume d'oie dans un encrier, un sablier en bois et verre dont le sable commence à couler, une chandelle éteinte, des rayonnages de livres reliés de cuir derrière. Lumière dorée de fin de journée par une fenêtre à meneaux à gauche, poussière dans le rayon. Palette chaude : ocre, terre de Sienne brûlée, ambre, brun, touches de bleu-gris dans l'ombre. Aucun personnage, aucun texte lisible. Cadrage horizontal 16:10, le pupitre et le sablier au centre, pour qu'un recadrage vertical en vignette (4:5) garde le sablier et la copie. 1600×1000.",
  },
  "defi-eclair": {
    src: "/illustrations/defi-eclair.webp",
    alt: "Une vallée au loin, avant l'orage",
    credit: "Léonard de Vinci, L'Annonciation (vers 1472-1476), Offices, paysage du fond recadré. Domaine public (commons.wikimedia.org, Annunciation_(Leonardo)_(cropped)).",
    emplacement: "/defi : vignette 72×56 px dans la tuile « Séries éclair » (4:3, 800×600 px conseillés).",
    prompt: "Image de référence jointe : l'illustration de l'Atelier de Ranked Lobby ; reprends exactement sa technique, sa lumière et sa palette. Peinture au couteau, empâtements épais, univers de Léonard de Vinci à Florence vers 1500. Un éclair unique et net qui frappe au-dessus des collines de la vallée de l'Arno, vu depuis l'embrasure d'une fenêtre d'atelier ; ciel d'orage brun-violet, dernière lueur dorée de fin de journée à l'horizon. Palette chaude, avec un éclair blanc doré très lisible. Aucun personnage, aucun texte. Sujet simple et contrasté, lisible en très petit ; format 4:3, 800×600.",
  },
  "duel-echecs": {
    src: "/illustrations/duel-echecs.webp",
    alt: "Deux joueurs d'échecs face à face",
    credit: "Liberale da Verona, Les Joueurs d'échecs (vers 1475), Metropolitan Museum of Art, recadré sur l'échiquier. CC0 (commons.wikimedia.org, The_Chess_Players_MET_DT226950).",
    emplacement: "Médaillon rond de 40 à 52 px (ligne « te défie » sur téléphone, bande d'encre du défi) et vignette 72×56 px dans la tuile « Défier quelqu'un » du lobby des duels (source carrée 512×512 px conseillée).",
    prompt: "Image de référence jointe : l'illustration de l'Atelier de Ranked Lobby ; reprends exactement sa technique, sa lumière et sa palette. Peinture au couteau, empâtements épais, univers de Léonard de Vinci à Florence vers 1500. Deux rois d'échecs en bois tourné, un clair et un sombre, face à face sur un échiquier en marqueterie de noyer et d'érable, très gros plan, lumière dorée de fin de journée venant de côté. Palette chaude : ocre, brun, ambre, ivoire. Aucun personnage, aucun texte. Sujet centré, lisible dans un petit cercle sur fond noir ; format carré 1:1, 512×512.",
  },
  "duel-lice": {
    src: "/illustrations/duel-lice.webp",
    alt: "La lice de joute",
    credit: "Paolo Uccello, La Bataille de San Romano, Offices de Florence. Domaine public (commons.wikimedia.org, Battle_of_San_Romano,_by_Paolo_Uccello_(Uffizi_Gallery,_Florence)).",
    emplacement: "/duel : carte « lieu » La Lice, 16:10 sur ordinateur (1600×1000 px), vignette portrait 88×110 px sur téléphone.",
    prompt: "Image de référence jointe : l'illustration de l'Atelier de Ranked Lobby ; reprends exactement sa technique, sa lumière et sa palette. Peinture au couteau, empâtements épais et touches visibles, dans l'univers de Léonard de Vinci à Florence vers 1500. Une lice de joute vide sur la piazza Santa Croce, au crépuscule : la barrière de bois peinte qui sépare les deux couloirs, deux lances de tournoi croisées appuyées contre elle, deux heaumes posés sur un tréteau, des bannières ocre et bleu nuit qui flottent, la façade de pierre en arrière-plan. Lumière dorée de fin de journée, longues ombres. Palette chaude : ocre, terre de Sienne brûlée, ambre, brun, touches de bleu-gris. Aucun personnage, aucun texte. Cadrage horizontal 16:10, les lances croisées au centre, pour qu'un recadrage vertical 4:5 les garde. 1600×1000.",
  },
  "mock-grande-salle": {
    src: "/illustrations/mock-grande-salle.webp",
    alt: "Une grande salle d'examen : des étudiants penchés sur leurs copies",
    credit: "Laurentius de Voltolina, Henri d'Allemagne donnant un cours à des étudiants de Bologne. Domaine public (commons.wikimedia.org, Henry_of_Germany_delivering_a_lecture_to_university_students_in_Bologna_by_Laurentius_de_Voltolina).",
    emplacement: "/mock-exams : carte « lieu » La Grande Salle, 16:10 sur ordinateur (1600×1000 px), vignette portrait 88×110 px sur téléphone.",
    prompt: "Image de référence jointe : l'illustration de l'Atelier de Ranked Lobby ; reprends exactement sa technique, sa lumière et sa palette. Peinture au couteau, empâtements épais et touches visibles, dans l'univers de Léonard de Vinci à Florence vers 1500. Une grande salle de lecture florentine, vide avant l'épreuve : longues tables de noyer et pupitres alignés en perspective, une copie et une plume à chaque place, une grande horloge à poids au mur du fond, un plafond à caissons, de hautes fenêtres par lesquelles entre une lumière dorée de fin de journée. Palette chaude : ocre, terre de Sienne brûlée, ambre, brun, touches de bleu-gris. Aucun personnage, aucun texte. Cadrage horizontal 16:10, point de fuite au centre, pour qu'un recadrage vertical 4:5 garde l'horloge et l'allée centrale. 1600×1000.",
  },
  "eclair-depart": {
    src: "/illustrations/eclair-depart.webp",
    alt: "La vallée de l'Arno avant l'orage",
    credit: "Léonard de Vinci, L'Annonciation (vers 1472-1476), Offices, paysage du fond recadré (resserré au centre). Domaine public (commons.wikimedia.org, Annunciation_(Leonardo)_(cropped)).",
    emplacement: "/eclair : bandeau en tête de la carte de départ, 4:1 (environ 600×150 px sur ordinateur, 340×96 px sur téléphone), 1600×400 px conseillés.",
    prompt: "Image de référence jointe : l'illustration de l'Atelier de Ranked Lobby ; reprends exactement sa technique, sa lumière et sa palette. Peinture au couteau, empâtements épais et touches visibles, dans l'univers de Léonard de Vinci à Florence vers 1500. Panorama de la vallée de l'Arno vue depuis la fenêtre de l'atelier, au moment où un orage éclate : un éclair net et lumineux fend un ciel brun-violet, la dernière lumière dorée de fin de journée éclaire encore les collines et les toits de Florence au loin. Palette chaude : ocre, terre de Sienne brûlée, ambre, brun, avec l'éclair blanc doré. Aucun personnage, aucun texte. Format panoramique très allongé 4:1, 1600×400, l'éclair un peu à droite du centre.",
  },
  "cinq-depart": {
    src: "/illustrations/cinq-depart.webp",
    alt: "Un sablier sur l'étagère d'un cabinet de travail",
    credit: "Albrecht Dürer, Saint Jérôme dans son cabinet (1514), recadré sur le sablier de l'étagère. Domaine public.",
    emplacement: "/defi/cinq : bandeau en tête de la carte de départ des 5 du jour, 4:1 (1600×400 px conseillés).",
    prompt: "Image de référence jointe : l'illustration de l'Atelier de Ranked Lobby ; reprends exactement sa technique, sa lumière et sa palette. Peinture au couteau, empâtements épais et touches visibles, dans l'univers de Léonard de Vinci à Florence vers 1500. Un sablier de bois et de verre posé sur le rebord d'une fenêtre d'atelier, le sable à moitié écoulé, la ville de Florence floue au loin, une cloche de campanile dans la brume dorée. Lumière dorée de fin de journée. Palette chaude : ocre, terre de Sienne brûlée, ambre, brun. Aucun personnage, aucun texte. Format panoramique très allongé 4:1, 1600×400, le sablier un peu à gauche du centre.",
  },
} as const satisfies Record<string, Illustration>;

export type IllustrationNom = keyof typeof ILLUSTRATIONS;
