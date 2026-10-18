// La disposition d'un profil : la page sous l'en-tête, une LISTE ORDONNÉE
// de blocs (chiffres clés, radar, amis…, et les médias du joueur : ses
// images et sa vidéo, un edit court enregistré sur son téléphone, ou des GIF
// choisis dans la banque KLIPY, affichés depuis son serveur ; et ses cartes,
// une image en haut puis un titre et quelques lignes à lui). Chaque bloc a
// l'un des 4 formats du site (Réviser) : tuile (1/3), héros (2/3), bande
// (pleine largeur) ou colonne (1/3 sur deux lignes, comme la Bibliothèque),
// sur la grille de 12 colonnes. Un module ou une carte peut porter une image
// en haut (img). Les rangées se forment
// toutes seules, dans l'ordre (rangees) ; aucun bloc ne change de format
// tout seul : une rangée incomplète garde sa place libre, et une case vide
// choisie par le joueur reste une place libre (élément « libre »), vide en
// vue publique, « + Choisir un module » en Personnaliser. Un bloc absent de
// la liste est masqué.
// La liste s'enregistre telle quelle dans profile_style.layout (jsonb ; la
// base borne : 20 éléments, 16 000 octets). Les anciennes formes (rangées à
// modèles « plein », « deux »… ; avant elles, une liste de blocs pleins ou
// en demi-largeur) sont converties à la lecture, sans rien perdre
// (depuisAncienne). L'ancien code relit la forme nouvelle sans casse (une
// rangée pleine par bloc ; journal, saisons et places libres sautés).
// Images et vidéos sont envoyées par le navigateur dans deux buckets
// publics (`profil-medias`, `profil-videos`), dans le dossier du joueur ;
// la base borne le poids de chaque fichier, les types permis et le nombre
// de fichiers par joueur (migration_profil_medias.sql). Le serveur revalide
// tout à l'écriture et supprime les fichiers qui ne servent plus.
// Module neutre (client et serveur).

import { URL_KLIPY } from "@/lib/profil/gifs";

// ── Les blocs fixes : les 7 d'avant, et deux nouveaux ──────────────────
export const BLOCS = [
  { k: "vitrine", nom: "Chiffres clés" },
  { k: "radar", nom: "Radar des matières" },
  { k: "amis", nom: "Amis" },
  { k: "reponses", nom: "Questions répondues" },
  { k: "trophees", nom: "Trophées" },
  { k: "progression", nom: "Progression" },
  // le folio porté (Moi › Mes pièces) et son anecdote
  { k: "folio", nom: "Folio" },
  // un extrait du Journal (courbe d'ELO, derniers événements) et les saisons
  { k: "journal", nom: "Journal", neuf: true },
  { k: "saisons", nom: "Saisons", neuf: true },
  // la grille des 52 semaines du Journal (elle suit sa visibilité)
  { k: "carnet", nom: "Carnet de jours", neuf: true },
] as const;
export type CleBloc = (typeof BLOCS)[number]["k"];

// ── Les 4 formats du site (Réviser) ────────────────────────────────────
/** demi : la demi-bande, pleine largeur et moitié de hauteur (une ligne compacte) */
export type Format = "tuile" | "heros" | "bande" | "colonne" | "demi";
export type Portee = 4 | 8 | 12;
export const FORMATS: { key: Format; nom: string; part: string; portee: Portee }[] = [
  { key: "tuile", nom: "Mini-tuile", part: "1/3", portee: 4 },
  { key: "colonne", nom: "Colonne", part: "1/3 · 2 lignes", portee: 4 },
  { key: "heros", nom: "Héros", part: "2/3", portee: 8 },
  { key: "bande", nom: "Bande", part: "1/1", portee: 12 },
  { key: "demi", nom: "Demi-bande", part: "1/1 · ½ hauteur", portee: 12 },
];
/** Le nombre de colonnes (sur 12) d'un format. */
export const portee = (f: Format): Portee => (f === "tuile" || f === "colonne" ? 4 : f === "heros" ? 8 : 12);
/** Le nombre de lignes d'un format : 2 pour la colonne, 1 sinon. */
export const hauteur = (f: Format): 1 | 2 => (f === "colonne" ? 2 : 1);
export const nomFormat = (f: Format) => FORMATS.find((x) => x.key === f)!.nom;
const estFormat = (f: unknown): f is Format => f === "tuile" || f === "heros" || f === "bande" || f === "colonne" || f === "demi";
/** pleine largeur : la bande et la demi-bande (seules sur leur rangée, jamais une place libre) */
export const pleineLargeur = (f: Format) => f === "bande" || f === "demi";

export type GenreMedia = "image" | "gif" | "video";
/** ce qui décide des formats permis : la clé d'un bloc fixe, le genre d'un média, ou la carte */
export type GenreBloc = CleBloc | GenreMedia | "carte";

/**
 * Le média en haut d'un module ou d'une carte (la moitié haute, comme la
 * Bibliothèque) : une image ou une vidéo envoyée par le joueur dans ses
 * dossiers, sous le même nom exact qu'un média (`<id>.<ext>`), ou un GIF de
 * la banque KLIPY. Mêmes champs qu'un bloc média, sans légende ni format.
 * (Lue sans `type` : une image, comme les premières, posées sans.)
 */
export type ImageHaut = {
  id: string;
  type: "image" | "video";
  url: string;
  /** largeur / hauteur */
  ratio: number;
  /** « klipy » : un GIF de la banque, servi par KLIPY */
  source?: "klipy";
  /** GIF de la banque : sa largeur réelle en pixels (jamais agrandi) */
  px?: number;
  /** image : le point focal vertical, 0 (haut) à 100 (bas) ; absent : 50 */
  y?: number;
  /** vidéo : sa durée lue à l'envoi (s, au dixième) */
  duree?: number;
  /** vidéo : l'image de couverture (s, au demi) */
  couverture?: number;
};
/** `inv` : les couleurs inversées (fond sombre et texte clair le jour, l'inverse la nuit : .rl-inverse) */
export type BlocFixe = { k: CleBloc; f: Format; img?: ImageHaut; inv?: true };
/** Une carte : une image en haut (facultative), un titre et quelques lignes écrits par le joueur. */
export type BlocCarte = { k: "carte"; id: string; titre: string; texte: string | null; img?: ImageHaut; inv?: true; f: Format };
export type BlocMedia = {
  k: "media";
  id: string;
  type: "image" | "video";
  /** propre : jamais de « #t= » dedans (la validation refuse « # ») */
  url: string;
  /** largeur / hauteur, pour réserver la place avant le chargement */
  ratio: number;
  legende: string | null;
  /** « klipy » : un GIF de la banque, servi par KLIPY (sinon : envoyé par le joueur) */
  source?: "klipy";
  /** largeur réelle en pixels (GIF de la banque, souvent petits : jamais agrandis) */
  px?: number;
  /** image : le point focal vertical, 0 (haut) à 100 (bas), en object-position ; absent : 50 */
  y?: number;
  /** vidéo : sa durée lue à l'envoi (s, au dixième) ; absente pour les vidéos d'avant */
  duree?: number;
  /** vidéo : l'image de couverture (s, au demi) ; absente : duree / 2, sinon 1 */
  couverture?: number;
  /** les couleurs inversées (BlocFixe) */
  inv?: true;
  f: Format;
};
export type Bloc = BlocFixe | BlocMedia | BlocCarte;
/** les formats d'une place libre (une bande ne reste jamais vide) */
export type FormePlace = "tuile" | "heros" | "colonne";
/** Une place gardée libre (venue d'une case vide d'avant) : rien en vue publique, « + Choisir un module » en Personnaliser. */
export type PlaceLibre = { k: "libre"; f: FormePlace };
export type ElementPage = Bloc | PlaceLibre;
/** La page sous l'en-tête : une liste ordonnée ; les rangées se forment seules (rangees). */
export type Disposition = ElementPage[];
/** la limite de la base (profile_style_layout_check : 20 éléments, 16 000 octets) */
export const ELEMENTS_MAX = 20;

export const BUCKET_MEDIAS = "profil-medias";
export const BUCKET_VIDEOS = "profil-videos";
/** médias sur la page (images, GIF, vidéo) */
export const MEDIAS_MAX = 6;
/** poids d'une image envoyée (la base refuse au-delà) */
export const MEDIA_MAX_OCTETS = 8 * 1024 * 1024;
/** la vidéo : une par page, une minute et 30 Mo au plus (la base refuse au-delà de 30 Mo) */
export const VIDEOS_MAX = 1;
export const VIDEO_MAX_SECONDES = 60;
export const VIDEO_MAX_OCTETS = 30 * 1024 * 1024;
export const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
export const LEGENDE_MAX = 80;
/** les cartes : 3 par page, un titre d'une ligne, quelques lignes de texte */
export const CARTES_MAX = 3;
export const TITRE_CARTE_MAX = 60;
export const TEXTE_CARTE_MAX = 280;
/**
 * les images en haut des modules et des cartes (le dossier d'images en tient
 * 12 : 6 médias, 4 images en haut, et 2 envois en attente ; au-delà, l'éditeur
 * fait ranger le dossier par le serveur, rangerFichiersEnAttente, puis renvoie)
 */
export const IMAGES_HAUT_MAX = 4;
/** côté le plus long d'une image, après réduction dans le navigateur */
export const IMAGE_MAX_PX = 2400;

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const EXT_IMAGE = /[.](jpe?g|png|webp|gif)$/i;
const EXT_VIDEO = /[.](mp4|mov|webm)$/i;
/**
 * Le nom exact d'un fichier envoyé par le joueur : `<id>.<ext>`
 * (envoyerMedia, depuis le premier média). Rien d'autre après le dossier :
 * ni « .. » ni « %2e%2e », que le navigateur ramènerait chez un autre joueur.
 */
const nomFichier = (id: string, video: boolean) => new RegExp(`^${id}[.](${video ? "mp4|mov|webm" : "jpe?g|png|webp|gif"})$`, "i");
/** Relu de la base : le bucket, un dossier de joueur (son uuid), puis ce nom exact. */
const adresseRelue = (bucket: string) => new RegExp(`^https:[/][/][A-Za-z0-9.:-]+[/]storage[/]v1[/]object[/]public[/]${bucket}[/][0-9a-f-]{36}[/]([^/]+)$`);

export const estMedia = (e: ElementPage): e is BlocMedia => e.k === "media";
export const estCarte = (e: ElementPage): e is BlocCarte => e.k === "carte";
/** un module (bloc fixe) : ni média, ni carte, ni place libre */
export const estFixe = (e: ElementPage): e is BlocFixe => e.k !== "media" && e.k !== "carte" && e.k !== "libre";
export const estLibre = (e: ElementPage): e is PlaceLibre => e.k === "libre";
export const estBloc = (e: ElementPage): e is Bloc => e.k !== "libre";
export const estGif = (b: Pick<BlocMedia, "source" | "url">) => b.source === "klipy" || /[.]gif$/i.test(b.url);
export const estVideo = (b: ElementPage) => estMedia(b) && b.type === "video";
export const infoBloc = (k: CleBloc) => BLOCS.find((b) => b.k === k)!;
export const genreMedia = (b: Pick<BlocMedia, "type" | "source" | "url">): GenreMedia => (b.type === "video" ? "video" : estGif(b) ? "gif" : "image");
export const genreDe = (b: Bloc): GenreBloc => (estMedia(b) ? genreMedia(b) : b.k);
/** la clé React d'un élément : l'id d'un média ou d'une carte, la clé d'un bloc, « libre-<index> » */
export const cleDe = (e: ElementPage, i: number) => (estMedia(e) || estCarte(e) ? e.id : estLibre(e) ? `libre-${i}` : e.k);
export const nomBloc = (b: Bloc) => (estMedia(b) ? { image: "Image", gif: "GIF", video: "Vidéo" }[genreMedia(b)] : estCarte(b) ? b.titre || "Carte" : infoBloc(b.k).nom);
/** Peut-il porter une image en haut ? Les modules (sauf la courbe de progression, qui a sa propre carte) et les cartes. */
export const peutAvoirImage = (b: Bloc) => estCarte(b) || (estFixe(b) && b.k !== "progression");
/** Les images en haut posées sur la page. */
export const imagesHaut = (d: Disposition): ImageHaut[] => d.flatMap((e) => ((estFixe(e) || estCarte(e)) && e.img ? [e.img] : []));
/** Les vidéos de la page : celles des blocs média et celles posées en haut d'un bloc (une par page). */
export const videosDe = (d: Disposition) => d.filter((e) => estMedia(e) && e.type === "video").length + imagesHaut(d).filter((m) => m.type === "video").length;
/** Les fichiers du joueur dont la page se sert (médias envoyés et images en haut) : le ménage garde ceux-là. */
export const fichiersGardes = (d: Disposition): Set<string> =>
  new Set([...blocsDe(d).filter(estMedia).map((b) => b.url), ...imagesHaut(d).map((x) => x.url)].map((u) => u.split("/").pop() ?? ""));
/** Tous les blocs (sans les places libres), dans l'ordre de lecture. */
export const blocsDe = (d: Disposition): Bloc[] => d.filter(estBloc);

// ── Formats permis, format par défaut, refus ───────────────────────────
/** Les formats proposés pour chaque genre de bloc (ceux où il est beau). */
export const FORMATS_PERMIS: Record<GenreBloc, Format[]> = {
  vitrine: ["tuile", "colonne", "heros", "bande", "demi"],
  radar: ["tuile", "colonne", "heros", "bande"],
  amis: ["tuile", "colonne", "heros", "bande", "demi"],
  reponses: ["tuile", "colonne", "heros", "bande", "demi"],
  trophees: ["tuile", "colonne", "heros", "bande", "demi"],
  progression: ["tuile", "colonne", "heros", "bande", "demi"],
  folio: ["tuile", "colonne", "heros", "demi"],
  journal: ["tuile", "colonne", "heros", "demi"],
  saisons: ["tuile", "colonne", "bande", "demi"],
  carnet: ["tuile", "colonne", "heros", "bande", "demi"],
  image: ["tuile", "colonne", "heros", "bande", "demi"],
  gif: ["tuile", "colonne", "heros"],
  video: ["tuile", "colonne", "heros"],
  carte: ["tuile", "colonne", "heros", "demi"],
};
/** Le format d'un bloc qu'on ajoute : le plus naturel pour lui. */
export const FORMAT_DEFAUT: Record<GenreBloc, Format> = {
  vitrine: "demi",
  radar: "heros",
  amis: "tuile",
  reponses: "tuile",
  trophees: "tuile",
  progression: "heros",
  folio: "tuile",
  journal: "tuile",
  saisons: "tuile",
  carnet: "demi",
  image: "heros",
  gif: "tuile",
  video: "tuile",
  carte: "colonne",
};
/**
 * Le format permis par le média en haut d'un bloc : une vidéo ne va ni en
 * bande ni en demi-bande ; une image non plus en demi-bande sur un module
 * (une carte la montre alors en vignette).
 */
const permisParHaut = (b: Bloc, f: Format) => {
  if (!(estFixe(b) || estCarte(b)) || !b.img) return true;
  if (b.img.type === "video") return !pleineLargeur(f);
  return f !== "demi" || estCarte(b);
};
/** Les formats permis d'un bloc : ceux de son genre, moins ceux que son média en haut refuse. */
export const formatsDe = (b: Bloc): Format[] => FORMATS_PERMIS[genreDe(b)].filter((f) => permisParHaut(b, f));

/**
 * `voulu` s'il est permis ; sinon le format permis le plus proche en portée
 * (à égalité, le plus large). La demi-bande n'est jamais un repli : un bloc
 * qui refuse la demi-bande passe à la bande, sinon au héros ; un bloc qui
 * refuse la bande ne passe pas en demi-bande tout seul.
 */
export function formatPermis(g: GenreBloc, voulu: Format): Format {
  return lePlusProche(FORMATS_PERMIS[g], voulu);
}
/** Le format d'un bloc posé : comme formatPermis, en tenant compte de son média en haut (formatsDe). */
export function formatDuBloc(b: Bloc, voulu: Format): Format {
  return lePlusProche(formatsDe(b), voulu);
}
function lePlusProche(permis: readonly Format[], voulu: Format): Format {
  if (permis.includes(voulu)) return voulu;
  const p = portee(voulu);
  return [...permis.filter((f) => f !== "demi")].sort((a, b) => Math.abs(portee(a) - p) - Math.abs(portee(b) - p) || portee(b) - portee(a))[0];
}

/** Pourquoi un format est refusé à un bloc (l'infobulle du format grisé). */
export function raisonRefus(b: Bloc, f: Format): string {
  const g = genreDe(b);
  // les refus du genre d'abord (le radar refuse la demi-bande, image en haut ou pas)
  if (f === "demi" && FORMATS_PERMIS[g].includes("demi") && (estFixe(b) || estCarte(b)) && b.img && !permisParHaut(b, f))
    return b.img.type === "video" ? "En demi-bande, pas de place pour une vidéo en haut." : "En demi-bande, pas de place pour une image en haut.";
  if (f === "bande" && FORMATS_PERMIS[g].includes("bande") && (estFixe(b) || estCarte(b)) && b.img?.type === "video") return "Avec sa vidéo en haut, ce bloc ne va pas en bande : elle serait recadrée trop bas.";
  if (f === "demi") {
    if (g === "video") return "La vidéo ne va pas en demi-bande : elle serait recadrée en un mince ruban.";
    if (g === "gif") return "Le GIF ne va pas en demi-bande : il serait recadré en un mince ruban.";
    if (g === "radar") return "Le radar ne va pas en demi-bande : il lui faut de la hauteur.";
  }
  if (g === "video") return "La vidéo ne va pas en bande : elle serait recadrée trop bas.";
  if (g === "gif") return "Le GIF ne va pas en bande : il serait recadré trop bas.";
  if (g === "folio" || g === "journal") return `${nomBloc(b)} ne va pas en bande : trop peu de contenu pour toute la largeur.`;
  if (g === "saisons") return "Les saisons vont en mini-tuile, en colonne, en bande ou en demi-bande (le palmarès en ligne).";
  if (g === "carte") return "La carte ne va pas en bande : son image serait recadrée trop bas.";
  return `${nomFormat(f)} : pas pour ce bloc.`;
}

// ── Les rangées ─────────────────────────────────────────────────────────
/** Une case : son élément, son index, son format, et sa place dès 1 024 px (colonne de départ 1 à 12, ligne 1 ou 2 de sa rangée). */
export type CaseGrille = { e: ElementPage; i: number; f: Format; col: number; ligne: 1 | 2 };
/**
 * La fin incomplète d'une ligne : la place qui suit son dernier élément.
 * `combler` : la 2e ligne d'une rangée double dont la 1re n'est pas pleine ;
 * on y pose en gardant d'abord le reste de la 1re libre (une place libre de
 * ce format), sinon le bloc monterait dans la 1re ligne.
 */
export type FinLigne = { ligne: 1 | 2; col: number; portee: 4 | 8; apres: number; combler?: "tuile" | "heros" };
export type RangeeGrille = {
  cases: CaseGrille[];
  /** 2 : une rangée double, où une colonne tient deux lignes, à gauche ou à droite */
  lignes: 1 | 2;
  /** les fins de ligne incomplètes, au plus une par ligne */
  fins: FinLigne[];
};

/**
 * Les rangées : les éléments dans l'ordre, sur 12 colonnes. Un élément qui
 * ne tient plus dans la rangée en ouvre une nouvelle. Avec 4 / 8 / 12, une
 * rangée est pleine (12) ou laisse 4 ou 8 colonnes libres. Personne ne
 * s'élargit.
 * La colonne (4 colonnes, deux lignes) fait une rangée double : en tête de
 * rangée, elle se met à gauche et les éléments suivants remplissent les 8
 * colonnes à sa droite, sur deux lignes ; après un héros ou deux tuiles (ou
 * une tuile, sa place à côté restant libre), elle se met à droite et les
 * éléments suivants font la 2e ligne. Une bande, une autre colonne, ou un
 * élément qui ne tient plus ferme la rangée double.
 */
export function rangees(d: Disposition): RangeeGrille[] {
  const out: RangeeGrille[] = [];
  let cases: CaseGrille[] = [];
  // rangée double : la colonne (son index) et la première colonne des 8 à côté d'elle
  let double: { i: number; zone: number } | null = null;
  let ligne: 1 | 2 = 1;
  // colonnes prises : sur 12 (rangée simple), ou sur 8 par ligne (rangée double)
  const pris = [0, 0];
  const fermer = () => {
    if (cases.length) {
      const fins: FinLigne[] = [];
      const dernier = cases[cases.length - 1].i;
      if (!double) {
        if (pris[0] < 12) fins.push({ ligne: 1, col: 1 + pris[0], portee: (12 - pris[0]) as 4 | 8, apres: dernier });
      } else {
        const dbl = double;
        const fin = (l: 1 | 2) => cases.filter((c) => c.ligne === l && c.i !== dbl.i).pop()?.i ?? null;
        const un = fin(1);
        const deux = fin(2);
        if (pris[0] < 8) fins.push({ ligne: 1, col: dbl.zone + pris[0], portee: (8 - pris[0]) as 4 | 8, apres: un ?? dbl.i });
        if (pris[1] < 8) {
          // colonne à droite : la 2e ligne suit la colonne ; à gauche, elle suit la 1re ligne, qu'il faut d'abord combler
          const combler = deux === null && dbl.zone === 5 && pris[0] < 8 ? (pris[0] === 0 ? "heros" : "tuile") : undefined;
          fins.push({ ligne: 2, col: dbl.zone + pris[1], portee: (8 - pris[1]) as 4 | 8, apres: deux ?? dernier, ...(combler ? { combler } : {}) });
        }
      }
      out.push({ cases, lignes: double ? 2 : 1, fins });
    }
    cases = [];
    double = null;
    ligne = 1;
    pris[0] = pris[1] = 0;
  };
  d.forEach((e, i) => {
    const p = portee(e.f);
    if (e.f === "colonne") {
      if (double) fermer();
      // en tête de rangée : à gauche ; après ce qui est déjà posé : à droite, la suite fait la 2e ligne
      double = pris[0] === 0 ? { i, zone: 5 } : { i, zone: 1 };
      cases.push({ e, i, f: e.f, col: pris[0] === 0 ? 1 : 9, ligne: 1 });
      if (pris[0] > 0) ligne = 2;
      return;
    }
    if (double) {
      if (p <= 8 && ligne === 1) {
        if (pris[0] + p <= 8) {
          cases.push({ e, i, f: e.f, col: double.zone + pris[0], ligne: 1 });
          pris[0] += p;
          if (pris[0] === 8) ligne = 2;
          return;
        }
        ligne = 2;
      }
      if (p <= 8 && pris[1] + p <= 8) {
        cases.push({ e, i, f: e.f, col: double.zone + pris[1], ligne: 2 });
        pris[1] += p;
        if (pris[1] === 8) fermer();
        return;
      }
      fermer();
    }
    if (pris[0] + p > 12) fermer();
    cases.push({ e, i, f: e.f, col: 1 + pris[0], ligne: 1 });
    pris[0] += p;
    if (pris[0] === 12) fermer();
  });
  fermer();
  return out;
}

/** Une place à remplir dans Personnaliser. */
export type PlaceVide = {
  rangee: number;
  /** la ligne de la rangée (2 : la 2e ligne d'une rangée double) */
  ligne: 1 | 2;
  /** le format de la place : celui de l'élément « libre », ou tuile / héros pour une fin de ligne */
  f: FormePlace;
  portee: 4 | 8;
  /** l'index de l'élément « libre » ; null : la fin d'une ligne incomplète */
  i: number | null;
  /** l'index après lequel insérer (l'élément « libre » lui-même, ou le dernier de la ligne) */
  apres: number;
  /** une fin de 2e ligne : la place libre qui garde d'abord le reste de la 1re (FinLigne) */
  combler?: "tuile" | "heros";
  /** la moitié d'une place de 2/3 coupée en deux mini-tuiles (Personnaliser) : le bloc y va en mini-tuile, l'autre moitié reste libre */
  moitie?: true;
  /** laquelle des deux moitiés : 0, la gauche (par défaut) ; 1, la droite */
  cote?: 0 | 1;
};

/** Le JSON d'une valeur, ses clés triées : deux pages pareilles s'écrivent pareil, quel que soit l'ordre de leurs champs. */
export function jsonStable(x: unknown): string {
  return JSON.stringify(x, (_, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, (v as Record<string, unknown>)[k]])) : v));
}

/** Les places vides d'une rangée : ses éléments « libre », puis ses fins de ligne incomplètes. */
export function placesVides(r: RangeeGrille, rangee: number): PlaceVide[] {
  const out: PlaceVide[] = r.cases
    .filter((c) => estLibre(c.e))
    .map((c) => ({ rangee, ligne: c.ligne, f: c.f as FormePlace, portee: portee(c.f) as 4 | 8, i: c.i, apres: c.i }));
  for (const fin of r.fins)
    out.push({ rangee, ligne: fin.ligne, f: fin.portee === 8 ? "heros" : "tuile", portee: fin.portee, i: null, apres: fin.apres, ...(fin.combler ? { combler: fin.combler } : {}) });
  return out;
}

/**
 * La forme propre d'une liste : sans place libre en fin de liste, sans
 * rangée faite seulement de places libres, 20 éléments au plus (les places
 * libres partent d'abord, en partant de la fin ; un bloc ne part jamais : il
 * y en a 15 au plus). Utilisée par la validation et par chaque opération
 * de l'éditeur. Une liste déjà propre est rendue telle quelle (même
 * référence).
 */
export function normaliser(d: Disposition): Disposition {
  let out = d;
  for (;;) {
    let l = out;
    // les places libres de fin
    let fin = l.length;
    while (fin > 0 && estLibre(l[fin - 1])) fin--;
    if (fin < l.length) l = l.slice(0, fin);
    // les rangées faites seulement de places libres
    const vides = new Set(
      rangees(l)
        .filter((r) => r.cases.every((c) => estLibre(c.e)))
        .flatMap((r) => r.cases.map((c) => c.i)),
    );
    if (vides.size) l = l.filter((_, i) => !vides.has(i));
    // 20 éléments au plus : la dernière place libre part d'abord
    if (l.length > ELEMENTS_MAX) {
      let j = l.length - 1;
      while (j >= 0 && !estLibre(l[j])) j--;
      l = j >= 0 ? [...l.slice(0, j), ...l.slice(j + 1)] : l.slice(0, ELEMENTS_MAX);
    }
    if (l === out) return out;
    out = l;
  }
}

// ── La page par défaut ──────────────────────────────────────────────────
// La page d'un joueur qui n'a rien composé : chiffres clés en bande, puis
// le radar et les amis sur une rangée pleine. Sans radar (masqué par le
// joueur, comme avant), les amis en héros : la place libre de 4 à côté
// reçoit, pour le propriétaire seulement, l'invitation à ajouter une image.
// Les trophées vivent dans les Sceaux : la clé reste lisible dans les
// dispositions enregistrées, mais n'est plus dans celle-ci.
export const DISPOSITION_DEFAUT: Disposition = [
  { k: "vitrine", f: "bande" },
  { k: "radar", f: "heros" },
  { k: "amis", f: "tuile" },
];
export const DEFAUT_SANS_RADAR: Disposition = [
  { k: "vitrine", f: "bande" },
  { k: "amis", f: "heros" },
];

/** La page n'a jamais été composée : c'est la disposition par défaut (avec ou sans radar). */
export const estDispositionDefaut = (d: Disposition) => d === DISPOSITION_DEFAUT || d === DEFAUT_SANS_RADAR;

/**
 * La disposition avec le bloc du folio : inchangée s'il y est déjà ; sinon
 * à la place de la première place libre (à son format), ou en tuile juste
 * après le dernier élément de la première rangée incomplète, ou en tuile à
 * la fin s'il reste de la place (rien, sinon).
 */
export function avecBlocFolio(d: Disposition): Disposition {
  if (d.some((e) => e.k === "folio")) return d;
  const i = d.findIndex(estLibre);
  if (i >= 0) return normaliser(d.map((e, j) => (j === i ? { k: "folio" as const, f: e.f } : e)));
  const fin = rangees(d).flatMap((r) => r.fins)[0];
  if (fin) {
    const avant: ElementPage[] = fin.combler ? [{ k: "libre", f: fin.combler }] : [];
    return normaliser([...d.slice(0, fin.apres + 1), ...avant, { k: "folio", f: "tuile" }, ...d.slice(fin.apres + 1)]);
  }
  return d.length < ELEMENTS_MAX ? normaliser([...d, { k: "folio", f: "tuile" }]) : d;
}

// ── Les médias ──────────────────────────────────────────────────────────
/** Une légende : une ligne, sans caractères de contrôle, 80 caractères. */
export function nettoyerLegende(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, LEGENDE_MAX);
  return s || null;
}

const bornerRatio = (r: unknown) => {
  const n = Number(r);
  return Number.isFinite(n) && n > 0 ? Math.max(0.25, Math.min(4, Math.round(n * 1000) / 1000)) : 1.778;
};

/** Un nombre venu de la base ou du navigateur (jamais une chaîne, null ou NaN). */
const nombre = (x: unknown): number | null => (typeof x === "number" && Number.isFinite(x) ? x : null);

/**
 * Le texte d'une carte : sans caractères de contrôle, 5 lignes au plus (la
 * suite rejoint la 5e), une ligne vide au plus entre deux, 280 caractères.
 * Idempotent : un texte nettoyé repasse à l'identique.
 */
export function nettoyerTexte(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const propre = (l: string) => l.replace(/\s+/g, " ").trim();
  const lignes = raw
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ")
    .split("\n")
    .map(propre);
  const cinq = lignes.slice(0, 5);
  if (lignes.length > 5) cinq[4] = propre(lignes.slice(4).join(" "));
  const s = cinq
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, TEXTE_CARTE_MAX)
    .split("\n")
    .map(propre)
    .join("\n")
    .trim();
  return s || null;
}
/** Le titre d'une carte : une ligne, 60 caractères (vide permis). */
export const nettoyerTitre = (raw: unknown): string => (nettoyerLegende(raw) ?? "").slice(0, TITRE_CARTE_MAX).trim();

/** Les adresses publiques des dossiers du joueur (images, vidéos). */
export type Prefixes = { images: string; videos: string };

// ── Les anciennes formes ────────────────────────────────────────────────
type ModeleAncien = "plein" | "deux" | "grand-petit" | "petit-grand" | "trois" | "grand-pile" | "pile-grand" | "quatre";

/**
 * Les modèles de rangée d'avant : les cases lues, dans l'ordre où elles
 * passent dans la liste, et le format de chacune (le grand de « pile-grand »
 * était sa 3e case : il passe en tête).
 */
const MODELES_ANCIENS: Record<ModeleAncien, { cases: number; ordre: number[]; formats: Format[] }> = {
  plein: { cases: 1, ordre: [0], formats: ["bande"] },
  deux: { cases: 2, ordre: [0, 1], formats: ["heros", "tuile"] },
  "grand-petit": { cases: 2, ordre: [0, 1], formats: ["heros", "tuile"] },
  "petit-grand": { cases: 2, ordre: [0, 1], formats: ["tuile", "heros"] },
  trois: { cases: 3, ordre: [0, 1, 2], formats: ["tuile", "tuile", "tuile"] },
  "grand-pile": { cases: 3, ordre: [0, 1, 2], formats: ["tuile", "tuile", "tuile"] },
  "pile-grand": { cases: 3, ordre: [2, 0, 1], formats: ["tuile", "tuile", "tuile"] },
  quatre: { cases: 4, ordre: [0, 1, 2, 3], formats: ["heros", "tuile", "heros", "tuile"] },
};
const modeleAncien = (m: unknown) => (typeof m === "string" && Object.prototype.hasOwnProperty.call(MODELES_ANCIENS, m) ? MODELES_ANCIENS[m as ModeleAncien] : null);

/**
 * L'ancienne forme (une liste de blocs, `w` : plein ou demi) en rangées :
 * un bloc plein, une rangée pleine ; deux demi-blocs qui se suivent, une
 * rangée de deux moitiés (un demi-bloc seul : une moitié vide à côté).
 */
function depuisListe(liste: Record<string, unknown>[]): { m: ModeleAncien; c: unknown[] }[] {
  const out: { m: ModeleAncien; c: unknown[] }[] = [];
  let demi: { m: ModeleAncien; c: unknown[] } | null = null;
  for (const b of liste) {
    if (b.w === "demi") {
      if (demi && demi.c.length < 2) demi.c.push(b);
      else {
        demi = { m: "deux", c: [b] };
        out.push(demi);
      }
    } else {
      demi = null;
      out.push({ m: "plein", c: [b] });
    }
  }
  return out;
}

const estObjet = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
/** Une case d'avant qui montre quelque chose : un bloc connu ou un média (une clé inconnue était une case vide). */
const caseRemplie = (x: unknown): x is Record<string, unknown> => estObjet(x) && (x.k === "media" || BLOCS.some((b) => b.k === x.k));
/** Le genre d'un média encore brut (la validation le recalcule ensuite). */
const genreBrut = (b: Record<string, unknown>): GenreMedia =>
  b.type === "video" ? "video" : b.source === "klipy" || (typeof b.url === "string" && (URL_KLIPY.test(b.url.trim()) || /[.]gif$/i.test(b.url.trim()))) ? "gif" : "image";

/**
 * Les anciennes formes (rangées à modèles ; liste plein/demi d'avant) en
 * éléments bruts de la forme nouvelle, à valider ensuite. Chaque rangée
 * d'avant garde ses cases dans l'ordre, au format de son modèle ; une case
 * vide devient une place libre ; la taille d'un média (petite, moyenne,
 * grande) devient un format : petite ou moyenne, une tuile ; grande, le
 * format de sa case. Un format refusé prend le plus proche. Une place libre
 * s'ajoute avant une ancienne rangée quand, sans elle, sa première case
 * monterait dans la rangée précédente : les rangées d'avant restent des
 * rangées.
 */
export function depuisAncienne(raw: unknown[]): Record<string, unknown>[] {
  const lignes = raw.some((x) => estObjet(x) && "m" in x) ? raw : depuisListe(raw.filter(estObjet));
  const out: Record<string, unknown>[] = [];
  let pris = 0;
  const poser = (e: Record<string, unknown>, f: Format) => {
    const p = portee(f);
    if (pris + p > 12) pris = 0;
    out.push(e);
    pris = (pris + p) % 12;
  };
  for (const x of lignes) {
    if (!estObjet(x)) continue;
    const modele = modeleAncien(x.m);
    if (!modele) continue;
    const c = (Array.isArray(x.c) ? x.c : []).slice(0, modele.cases);
    if (!c.some(caseRemplie)) continue;
    modele.ordre.forEach((j, n) => {
      const cas = c[j];
      const fCase = modele.formats[n];
      let e: Record<string, unknown>;
      let f: Format;
      if (!caseRemplie(cas)) {
        if (fCase === "bande") return;
        f = fCase;
        e = { k: "libre", f };
      } else if (cas.k === "media") {
        const genre = genreBrut(cas);
        const t = cas.t === "s" || cas.t === "m" || cas.t === "l" ? cas.t : cas.type === "video" || cas.source === "klipy" ? "m" : "l";
        f = formatPermis(genre, t === "l" ? fCase : "tuile");
        // le média garde tous ses champs, sauf sa taille d'avant
        e = { ...cas, f };
        delete e.t;
      } else {
        f = formatPermis(cas.k as CleBloc, fCase);
        e = { k: cas.k, f };
      }
      // la première case d'une ancienne rangée ouvre une rangée nouvelle
      if (n === 0 && pris > 0 && pris + portee(f) <= 12) poser({ k: "libre", f: pris === 4 ? "heros" : "tuile" }, pris === 4 ? "heros" : "tuile");
      poser(e, f);
    });
  }
  return out;
}

// ── La validation ───────────────────────────────────────────────────────
/**
 * Valide une disposition : blocs connus (une fois chacun), à un format
 * permis (un format refusé prend le plus proche, un format inconnu celui
 * par défaut), places libres en tuile ou en héros, médias venus des
 * dossiers du joueur, sous leur nom exact `<id>.<ext>` (`prefixes` ; null :
 * aucun envoi accepté ; « lecture » : relu de la base, déjà vérifié à
 * l'écriture, le bucket et un dossier de joueur sont contrôlés)
 * ou GIF de la banque KLIPY (adresse en klipy.com) ; six médias au plus,
 * dont une vidéo ; trois cartes au plus ; quatre images en haut au plus,
 * venues du dossier d'images du joueur (une image refusée part seule : le
 * module ou la carte reste). Puis la forme propre (normaliser). Les anciennes formes
 * (rangées à modèles, liste de blocs) sont acceptées et converties.
 * Idempotente : une liste validée repasse à l'identique.
 */
export function validerDisposition(raw: unknown, prefixes: Prefixes | null | "lecture"): { disposition: Disposition; refus: string[] } {
  if (!Array.isArray(raw)) return { disposition: [], refus: [] };
  const refus: string[] = [];
  const vus = new Set<string>();
  let medias = 0;
  let videos = 0;
  let cartes = 0;
  let images = 0;
  let mediaRefuse = false;
  let imageRefusee = false;

  /** l'adresse d'un fichier du joueur : son dossier (ou, relue, un dossier de joueur du bon bucket) et le nom exact `<id>.<ext>` */
  const fichierDuJoueur = (id: string, url: string, video: boolean) => {
    const bucket = video ? BUCKET_VIDEOS : BUCKET_MEDIAS;
    const prefixe = prefixes && prefixes !== "lecture" ? (video ? prefixes.videos : prefixes.images) : null;
    const fichier = prefixes === "lecture" ? (adresseRelue(bucket).exec(url)?.[1] ?? null) : prefixe && url.startsWith(prefixe) ? url.slice(prefixe.length) : null;
    return fichier !== null && nomFichier(id, video).test(fichier);
  };

  /**
   * Les champs d'un média, d'un bloc ou en haut d'un bloc (rien n'est compté
   * ici) : id, type, adresse (un dossier du joueur sous son nom exact, ou un
   * GIF de KLIPY), ratio, et selon le genre la taille du GIF, le cadrage, la
   * durée et la couverture de la vidéo. null : refusé. `type` absent : celui
   * par défaut (null : refusé).
   */
  const champsMedia = (b: Record<string, unknown>, typeDefaut: "image" | null, cadrageVideo = false) => {
    const id = typeof b.id === "string" && /^[a-z0-9]{6,24}$/.test(b.id) ? b.id : null;
    const type = b.type === "image" ? "image" : b.type === "video" ? "video" : typeDefaut;
    const url = typeof b.url === "string" ? b.url.trim() : "";
    const klipy = type === "image" && URL_KLIPY.test(url);
    const dossierOk = klipy || (!!id && fichierDuJoueur(id, url, type === "video"));
    const ok =
      id && type && dossierOk && url.length <= 500 && /^[A-Za-z0-9:/._%-]+$/.test(url) && (type === "video" ? EXT_VIDEO : EXT_IMAGE).test(url) && !vus.has("m:" + id);
    if (!ok || !id || !type) return null;
    const px = Math.round(Number(b.px));
    const y = nombre(b.y);
    const duree = nombre(b.duree) !== null ? Math.round(nombre(b.duree)! * 10) / 10 : null;
    const dureeOk = type === "video" && duree !== null && duree >= 0.5 && duree <= 61 ? duree : null;
    const couv = nombre(b.couverture);
    const max = dureeOk ?? 60;
    const couverture = type === "video" && couv !== null && couv >= 0 ? Math.min(Math.round(couv * 2) / 2, Math.floor(max * 2) / 2) : null;
    return {
      id,
      type: type as ImageHaut["type"],
      url,
      ratio: bornerRatio(b.ratio),
      suite: {
        ...(klipy ? { source: "klipy" as const, ...(px >= 16 && px <= 4000 ? { px } : {}) } : {}),
        ...((type === "image" || cadrageVideo) && y !== null ? { y: Math.max(0, Math.min(100, Math.round(y))) } : {}),
        ...(dureeOk !== null ? { duree: dureeOk } : {}),
        ...(couverture !== null ? { couverture } : {}),
      },
    };
  };

  /** les couleurs inversées : seulement `true` (rien d'autre n'est gardé) */
  const inverse = (x: Record<string, unknown>): { inv?: true } => (x.inv === true ? { inv: true } : {});

  /** le média en haut d'un bloc (image, GIF ou vidéo) : quatre au plus, la vidéo comptée avec celles des blocs (une par page) ; refusé, il part seul */
  const imageHaut = (x: unknown): ImageHaut | null => {
    if (x === undefined || x === null) return null;
    // en haut, la vidéo se cadre aussi (une vidéo verticale dans une place large)
    const c = champsMedia(estObjet(x) ? x : {}, "image", true);
    if (!c || images >= IMAGES_HAUT_MAX || (c.type === "video" && videos >= VIDEOS_MAX)) {
      imageRefusee = true;
      return null;
    }
    vus.add("m:" + c.id);
    images++;
    if (c.type === "video") videos++;
    return { id: c.id, type: c.type, url: c.url, ratio: c.ratio, ...c.suite };
  };

  const media = (b: Record<string, unknown>): BlocMedia | null => {
    const c = champsMedia(b, null);
    if (!c || medias >= MEDIAS_MAX || (c.type === "video" && videos >= VIDEOS_MAX)) {
      mediaRefuse = true;
      return null;
    }
    vus.add("m:" + c.id);
    medias++;
    if (c.type === "video") videos++;
    const sans: Omit<BlocMedia, "f"> = { k: "media", id: c.id, type: c.type, url: c.url, ratio: c.ratio, legende: nettoyerLegende(b.legende), ...c.suite, ...inverse(b) };
    const genre = genreMedia(sans);
    return { ...sans, f: estFormat(b.f) ? formatPermis(genre, b.f) : FORMAT_DEFAUT[genre] };
  };

  const carte = (x: Record<string, unknown>): BlocCarte | null => {
    const id = typeof x.id === "string" && /^[a-z0-9]{6,24}$/.test(x.id) ? x.id : null;
    // l'id d'une carte sert de clé : ni celui d'un média ou d'une image, ni la clé d'un module
    if (!id || vus.has("m:" + id) || BLOCS.some((b) => b.k === id) || cartes >= CARTES_MAX) return null;
    vus.add("m:" + id);
    cartes++;
    const f = estFormat(x.f) ? formatPermis("carte", x.f) : FORMAT_DEFAUT.carte;
    // une vidéo en haut d'une carte en demi-bande : refusée (la carte garde son format, sans elle)
    const videoEnDemi = f === "demi" && estObjet(x.img) && x.img.type === "video";
    if (videoEnDemi) imageRefusee = true;
    const img = videoEnDemi ? null : imageHaut(x.img);
    return { k: "carte", id, titre: nettoyerTitre(x.titre), texte: nettoyerTexte(x.texte), ...(img ? { img } : {}), ...inverse(x), f };
  };

  const element = (x: unknown): ElementPage | null => {
    if (!estObjet(x)) return null;
    if (x.k === "libre") return x.f === "tuile" || x.f === "heros" || x.f === "colonne" ? { k: "libre", f: x.f } : null;
    if (x.k === "media") return media(x);
    if (x.k === "carte") return carte(x);
    const info = BLOCS.find((i) => i.k === x.k);
    if (!info || vus.has(info.k)) return null;
    vus.add(info.k);
    const f = estFormat(x.f) ? formatPermis(info.k, x.f) : FORMAT_DEFAUT[info.k];
    // une vidéo en haut d'une bande : refusée (le bloc garde son format, sans elle)
    // une vidéo en haut d'une bande, un média en haut d'une demi-bande : refusés (le bloc garde son format, sans eux)
    const refuse = estObjet(x.img) && ((f === "bande" && x.img.type === "video") || f === "demi");
    if (refuse) imageRefusee = true;
    const img = info.k !== "progression" && !refuse ? imageHaut(x.img) : null;
    return { k: info.k, f, ...(img ? { img } : {}), ...inverse(x) };
  };

  let liste: unknown[] = raw.slice(0, 60);
  // les anciennes formes : rangées à modèles, ou liste de blocs pleins ou en demi-largeur
  const nouvelle = !liste.some((x) => estObjet(x) && "m" in x) && liste.some((x) => estObjet(x) && "f" in x);
  if (!nouvelle) liste = depuisAncienne(liste);

  const out: Disposition = [];
  for (const x of liste) {
    const e = element(x);
    if (e) out.push(e);
  }
  if (mediaRefuse) refus.push("un ou plusieurs médias");
  if (imageRefusee) refus.push("un ou plusieurs médias en haut");
  return { disposition: normaliser(out), refus };
}

/**
 * L'ancienne page par défaut, telle que l'ancien enregistrement l'écrivait
 * même sans que le joueur y touche : [plein vitrine] [plein radar]
 * [grand-petit amis, case vide] (sans la rangée du radar s'il l'avait
 * masqué ; la case vide nulle ou absente). C'est la page par défaut
 * d'aujourd'hui (même référence), pas sa conversion rangée par rangée.
 */
function ancienneParDefaut(raw: unknown[]): Disposition | null {
  const rangee = (x: unknown, m: string, k: string, vide: boolean) => {
    if (!estObjet(x) || x.m !== m || !Array.isArray(x.c)) return false;
    const [b, ...reste] = x.c;
    return estObjet(b) && b.k === k && Object.keys(b).length === 1 && (vide ? reste.length <= 1 && reste.every((c) => c === null) : !reste.length);
  };
  const fin = raw.length - 1;
  if ((raw.length !== 2 && raw.length !== 3) || !rangee(raw[0], "plein", "vitrine", false) || !rangee(raw[fin], "grand-petit", "amis", true)) return null;
  if (raw.length === 2) return DEFAUT_SANS_RADAR;
  return rangee(raw[1], "plein", "radar", false) ? DISPOSITION_DEFAUT : null;
}

/**
 * La disposition lue en base. Sans disposition enregistrée : celle par
 * défaut (sans le radar si le joueur l'avait masqué, comme avant) ; de même
 * pour l'ancienne page par défaut enregistrée telle quelle.
 */
export function dispositionDepuis(raw: unknown, radar: boolean): Disposition {
  if (Array.isArray(raw)) return ancienneParDefaut(raw) ?? validerDisposition(raw, "lecture").disposition;
  return radar ? DISPOSITION_DEFAUT : DEFAUT_SANS_RADAR;
}

/** Un identifiant de média (minuscules et chiffres). */
export const nouvelId = () => (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)).slice(0, 16);
