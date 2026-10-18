// Voix « Le Trait », morceau Personnaliser · Ta page : l'éditeur de la
// grille du profil (components/profil/EditeurPage.tsx) et les refus de ses
// opérations (lib/profil/page-edition.ts). Même esprit que lib/voice.ts : un
// mot par chose, toujours le chiffre, pas d'emphase. Module neutre (ni
// « use client » ni serveur).

import { pluriel } from "@/lib/voice";
import { CARTES_MAX, ELEMENTS_MAX, IMAGES_HAUT_MAX, MEDIAS_MAX, VIDEO_MAX_SECONDES, type FormePlace } from "@/lib/profil/disposition";

const UN_FORMAT: Record<FormePlace, string> = { tuile: "une mini-tuile", heros: "un héros", colonne: "une colonne" };

export const EDITEUR_PAGE = {
  /** sous « Ta page », en tête de la section */
  aide: "Choisis le format de chaque bloc, range-les dans l'ordre que tu veux, masque ceux que tu ne veux pas.",
  // ── « Partir d'un modèle » (components/profil/ModelesPage.tsx, lib/profil/modeles-page.ts) ──
  modeles: "Partir d'un modèle",
  modelesCompte: "Partir d'un modèle · 3 modèles",
  modelesAide: "Trois pages toutes faites, adaptées à ce que ta page a à montrer. Tu peux tout changer ensuite.",
  modelesPied: "Tes médias restent ; un bloc retiré garde ses réglages. Rien n'est enregistré avant « Enregistrer ».",
  MODELES: {
    competiteur: { nom: "Compétiteur", phrase: "Ta courbe d'ELO et tes victoires en tête, tes saisons en bande : la page d'un joueur de duels." },
    etudiant: { nom: "Étudiant", phrase: "Tes chiffres, puis tes matières, tes réponses et ta progression : la page de quelqu'un qui révise." },
    collection: { nom: "Collectionneur", phrase: "Ton image en grand, ton folio, tes trophées et tes saisons : ce que tu as gagné et ce que tu aimes montrer." },
  },
  appliquer: "Appliquer",
  appliquerModele: (nom: string) => `Appliquer le modèle ${nom}`,
  pageActuelle: "Ta page actuelle",
  /** « Plan du modèle Compétiteur, tel que ta page l'aura » */
  planModele: (nom: string) => `Plan du modèle ${nom}, tel que ta page l'aura`,
  /** le point médian reste collé au chiffre d'avant : une ligne ne commence jamais par « · » */
  chiffresModele: (noms: string[]) => `Chiffres clés : ${noms.join(" · ")}`,
  /** le média voulu par une case du modèle */
  tonImage: "ton image",
  adapte: (mis: string, voulu: string, autres: boolean) => `Adapté : ${mis} au lieu de ${voulu}${autres ? "…" : ""}`,
  dansLOrdre: (noms: string[]) => `Dans l'ordre : ${noms.join(", ")}`,
  remplacerQuestion: "Remplacer ta page ? Tes médias restent, et tu peux revenir en arrière jusqu'à l'enregistrement.",
  /** un modèle déjà appliqué : les retouches faites depuis se perdent, « Revenir à ta page » ramène la page d'avant le premier */
  remplacerApresModele: "Remplacer cette page ? Tes retouches depuis le dernier modèle seront perdues ; « Revenir à ta page » ramène celle d'avant.",
  remplacer: "Remplacer",
  garderPage: "Garder ma page",
  applique: (nom: string) => `Modèle « ${nom} » appliqué. Rien n'est enregistré.`,
  departApplique: "Page de départ rétablie. Rien n'est enregistré.",
  revenir: "Revenir à ta page",
  pageDepart: "Revenir à la page de départ",
  // ── la carte du plan, sous « Ta page » ──
  /** « 5 blocs, 3 rangées. Chaque bloc a l'un des 5 formats : mini-tuile, colonne, héros, bande ou demi-bande. » */
  compte: (blocs: number, rangees: number) =>
    `${pluriel(blocs, "bloc", "blocs")}, ${pluriel(rangees, "rangée", "rangées")}. Chaque bloc a l'un des 5 formats : mini-tuile, colonne, héros, bande ou demi-bande.`,
  aideOrdinateur:
    "L'ordre est libre ; les rangées se forment seules et leurs bas s'alignent. Une colonne tient deux lignes, à gauche en début de rangée, à droite après un héros. Une place libre reste libre : choisis-y un module, ou laisse-la vide.",
  aideTelephone: "Les formats s'appliquent sur ordinateur. Ici, tout est sur une colonne : tu règles l'ordre, le contenu et ce qui est masqué.",
  plan: "Plan de la page",
  /** l'infobulle d'une case du plan : « Amis · Tuile » */
  planCase: (nom: string, format: string) => `${nom} · ${format}`,
  planLibre: "Place libre",
  grille: "Les blocs de ta page",
  // ── la barre d'un bloc ──
  deplacer: (nom: string) => `Déplacer : ${nom}`,
  deplacerAide: "Appui long, puis glisse sur une autre place",
  formatDe: (nom: string, format: string) => `Format de ${nom} : ${format}`,
  formatTitre: "Format sur ordinateur",
  /** l'infobulle d'un format permis : « Héros · 2/3 de la largeur » */
  formatPart: (nom: string, part: string) => (part.includes("lignes") ? `${nom} · 1/3 de la largeur, sur deux lignes` : `${nom} · ${part} de la largeur`),
  reglages: "Réglages du bloc",
  plus: "Plus d'actions",
  plusAide: "Déplacer, changer, masquer",
  avant: "Avant",
  apres: "Après",
  mettreALaPlace: "Mettre à la place",
  pose: "posé · échanger",
  remplacerMediaAide: "un bloc pas encore posé remplace ce média : son fichier part à l'enregistrement",
  nouveau: "nouveau",
  masquer: "Masquer ce bloc",
  masquerAide: "garde ses réglages",
  masquerImageAide: "garde ses réglages, sauf son média en haut et ses couleurs inversées (partis à l'enregistrement)",
  remplacerCarteAide: "un bloc mis à la place remplace cette carte : son titre, son texte et son média en haut partent à l'enregistrement",
  remplacerImageAide: "le bloc mis à la place ne reprend pas le média en haut de celui-ci : il part à l'enregistrement",
  retirerMedia: "Retirer ce média",
  retirerMediaAide: "le fichier part à l'enregistrement",
  retirerCarte: "Retirer cette carte",
  retirerCarteAide: "son média en haut part à l'enregistrement",
  // ── les réglages ──
  vitrineAide: "3 chiffres au plus, dans l'ordre",
  legende: "Légende",
  legendeAide: "Une légende (facultatif)",
  cadrage: "Cadrage : la partie de l'image qui reste visible",
  CADRAGES: [
    { nom: "Haut", y: 15 },
    { nom: "Centre", y: 50 },
    { nom: "Bas", y: 88 },
  ],
  couverture: (s: number) => `Image de couverture : à ${String(s).replace(".", ",")} s`,
  couvertureAide: "Celle qu'on voit avant la lecture, ou si la lecture automatique est bloquée.",
  folio: "Changer de folio",
  folioAide: "Dans Moi › Mes pièces",
  journal: (qui: string) => `Qui voit ton Journal : ${qui}`,
  journalAide: "Dans Moi › Réglages",
  /** qui voit le Journal (la visibilité enregistrée) */
  VISIBILITE: { public: "tous", friends: "tes amis", private: "toi seul" },
  // ── l'image en haut (modules et cartes) ──
  imageHaut: "En haut du bloc : une image, un GIF ou une vidéo",
  imageHautAide: "La moitié haute du bloc, comme la Bibliothèque.",
  hautMettre: "Mettre en haut :",
  hautRemplacer: "Remplacer par :",
  hautImage: "Image",
  hautGif: "GIF",
  hautVideo: "Vidéo",
  imageHautRetirer: "Retirer",
  imagesHautCompte: (n: number) => `${n}/${IMAGES_HAUT_MAX} médias en haut sur ta page`,
  // ── la carte ──
  carte: "Une carte",
  carteAide: "Ton image, ton GIF ou ta vidéo en haut, un titre et quelques lignes à toi.",
  carteTitre: "Titre",
  carteTitreAide: "Objectif Level I",
  carteTexte: "Texte",
  carteTexteAide: "Quelques lignes (facultatif)",
  /** le titre d'une carte toute neuve */
  carteNeuve: "Ma carte",
  cartesCompte: (n: number) => `${n}/${CARTES_MAX} cartes`,
  // ── les couleurs inversées ──
  inverse: "Couleurs inversées",
  inverseAide: "Fond sombre et texte clair (en mode nuit : fond clair et texte sombre).",
  oui: "oui",
  non: "non",
  // ── les places libres ──
  choisirModule: "Choisir un module",
  /** une place de 2/3 : la couper en deux places de mini-tuile */
  deuxMini: "2 mini-tuiles",
  deuxMiniAide: "Coupe cette place en deux petites places",
  unePlace: "Une seule place",
  /** « Place libre · une tuile. Vue par les autres, elle reste vide. » */
  placeLibre: (f: FormePlace) => `Place libre · ${UN_FORMAT[f]}. Vue par les autres, elle reste vide.`,
  fermerPlace: "Fermer la place",
  // ── la feuille « Choisir un module » et « Ajouter à ta page » ──
  ajouter: "Ajouter à ta page",
  masques: "Tes blocs masqués",
  aucunMasque: "Tous tes blocs sont sur ta page.",
  unMedia: "Un média",
  image: "Une image",
  gif: "Un GIF",
  gifBanque: "Un GIF (KLIPY)",
  video: "Une vidéo",
  videoPrise: "Une vidéo par page",
  /** la ligne sous « Ajouter à ta page » */
  medias: (n: number) => `${n}/${MEDIAS_MAX} médias · images de 8 Mo, GIF de la banque KLIPY, une vidéo de ${VIDEO_MAX_SECONDES} s. Un bloc masqué garde ses réglages.`,
  // ── les envois ──
  envoiImage: "Envoi de l'image…",
  envoiVideo: "Envoi de la vidéo… (quelques secondes à une minute)",
  envoiRate: "Le fichier n'a pas pu être envoyé. Réessaie dans un instant.",
  // ── les refus des opérations ──
  refusMedias: `${MEDIAS_MAX} médias au plus sur ta page.`,
  refusVideo: "Une vidéo par page : retire l'actuelle pour en mettre une autre.",
  refusPlein: `Ta page est pleine : ${ELEMENTS_MAX} éléments au plus. Ferme une place libre ou masque un bloc.`,
  refusCartes: `${CARTES_MAX} cartes au plus sur ta page.`,
  refusVideoBande: "Pas de vidéo en haut d'un bloc en bande : elle serait recadrée trop bas. Mets-le en mini-tuile, en colonne ou en héros.",
  refusVideoDemi: "En demi-bande, pas de place pour une vidéo en haut.",
  refusImageDemi: "En demi-bande, pas de place pour une image en haut : mets le bloc dans un autre format.",
  refusImagesHaut: `${IMAGES_HAUT_MAX} médias en haut au plus sur ta page : retire-en un pour en mettre un autre.`,
};
