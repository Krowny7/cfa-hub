// La disposition d'un profil : la page sous l'en-tête, une LISTE ORDONNÉE
// de blocs (chiffres clés, radar, amis…, et les médias du joueur : ses
// images et sa vidéo, un edit court enregistré sur son téléphone, ou des GIF
// choisis dans la banque KLIPY, affichés depuis son serveur). Chaque bloc a
// l'un des 3 formats du site (Réviser) : tuile (1/3), héros (2/3) ou bande
// (pleine largeur), sur la grille de 12 colonnes. Les rangées se forment
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
] as const;
export type CleBloc = (typeof BLOCS)[number]["k"];

// ── Les 3 formats du site (Réviser) ────────────────────────────────────
export type Format = "tuile" | "heros" | "bande";
export type Portee = 4 | 8 | 12;
export const FORMATS: { key: Format; nom: string; part: string; portee: Portee }[] = [
  { key: "tuile", nom: "Tuile", part: "1/3", portee: 4 },
  { key: "heros", nom: "Héros", part: "2/3", portee: 8 },
  { key: "bande", nom: "Bande", part: "1/1", portee: 12 },
];
/** Le nombre de colonnes (sur 12) d'un format. */
export const portee = (f: Format): Portee => (f === "tuile" ? 4 : f === "heros" ? 8 : 12);
export const nomFormat = (f: Format) => FORMATS.find((x) => x.key === f)!.nom;
const estFormat = (f: unknown): f is Format => f === "tuile" || f === "heros" || f === "bande";

export type GenreMedia = "image" | "gif" | "video";
/** ce qui décide des formats permis : la clé d'un bloc fixe, ou le genre d'un média */
export type GenreBloc = CleBloc | GenreMedia;

export type BlocFixe = { k: CleBloc; f: Format };
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
  f: Format;
};
export type Bloc = BlocFixe | BlocMedia;
/** Une place gardée libre (venue d'une case vide d'avant) : rien en vue publique, « + Choisir un module » en Personnaliser. */
export type PlaceLibre = { k: "libre"; f: "tuile" | "heros" };
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
export const estLibre = (e: ElementPage): e is PlaceLibre => e.k === "libre";
export const estBloc = (e: ElementPage): e is Bloc => e.k !== "libre";
export const estGif = (b: BlocMedia) => b.source === "klipy" || /[.]gif$/i.test(b.url);
export const estVideo = (b: ElementPage) => estMedia(b) && b.type === "video";
export const infoBloc = (k: CleBloc) => BLOCS.find((b) => b.k === k)!;
export const genreMedia = (b: BlocMedia): GenreMedia => (b.type === "video" ? "video" : estGif(b) ? "gif" : "image");
export const genreDe = (b: Bloc): GenreBloc => (estMedia(b) ? genreMedia(b) : b.k);
/** la clé React d'un élément : l'id d'un média, la clé d'un bloc, « libre-<index> » */
export const cleDe = (e: ElementPage, i: number) => (estMedia(e) ? e.id : estLibre(e) ? `libre-${i}` : e.k);
export const nomBloc = (b: Bloc) => (estMedia(b) ? { image: "Image", gif: "GIF", video: "Vidéo" }[genreMedia(b)] : infoBloc(b.k).nom);
/** Tous les blocs (sans les places libres), dans l'ordre de lecture. */
export const blocsDe = (d: Disposition): Bloc[] => d.filter(estBloc);

// ── Formats permis, format par défaut, refus ───────────────────────────
/** Les formats proposés pour chaque genre de bloc (ceux où il est beau). */
export const FORMATS_PERMIS: Record<GenreBloc, Format[]> = {
  vitrine: ["tuile", "heros", "bande"],
  radar: ["tuile", "heros", "bande"],
  amis: ["tuile", "heros", "bande"],
  reponses: ["tuile", "heros", "bande"],
  trophees: ["tuile", "heros", "bande"],
  progression: ["heros", "bande"],
  folio: ["tuile", "heros"],
  journal: ["tuile", "heros"],
  saisons: ["tuile", "bande"],
  image: ["tuile", "heros", "bande"],
  gif: ["tuile", "heros"],
  video: ["tuile", "heros"],
};
/** Le format d'un bloc qu'on ajoute : le plus naturel pour lui. */
export const FORMAT_DEFAUT: Record<GenreBloc, Format> = {
  vitrine: "bande",
  radar: "heros",
  amis: "tuile",
  reponses: "tuile",
  trophees: "tuile",
  progression: "heros",
  folio: "tuile",
  journal: "tuile",
  saisons: "tuile",
  image: "heros",
  gif: "tuile",
  video: "tuile",
};
export const formatsDe = (b: Bloc): Format[] => FORMATS_PERMIS[genreDe(b)];

/** `voulu` s'il est permis ; sinon le format permis le plus proche en portée (à égalité, le plus large). */
export function formatPermis(g: GenreBloc, voulu: Format): Format {
  const permis = FORMATS_PERMIS[g];
  if (permis.includes(voulu)) return voulu;
  const p = portee(voulu);
  return [...permis].sort((a, b) => Math.abs(portee(a) - p) - Math.abs(portee(b) - p) || portee(b) - portee(a))[0];
}

/** Pourquoi un format est refusé à un bloc (l'infobulle du format grisé). */
export function raisonRefus(b: Bloc, f: Format): string {
  const g = genreDe(b);
  if (g === "video") return "La vidéo ne va pas en bande : elle serait recadrée trop bas.";
  if (g === "gif") return "Le GIF ne va pas en bande : il serait recadré trop bas.";
  if (g === "progression") return "La courbe de progression a besoin d'au moins deux tiers de la largeur.";
  if (g === "folio" || g === "journal") return `${nomBloc(b)} ne va pas en bande : trop peu de contenu pour toute la largeur.`;
  if (g === "saisons") return "Les saisons vont en tuile ou en bande (le palmarès en ligne).";
  return `${nomFormat(f)} : pas pour ce bloc.`;
}

// ── Les rangées ─────────────────────────────────────────────────────────
export type CaseGrille = { e: ElementPage; i: number; f: Format };
export type RangeeGrille = {
  cases: CaseGrille[];
  /** colonnes libres à droite : 0, 4 ou 8 */
  libre: 0 | 4 | 8;
};

/**
 * Les rangées : les éléments dans l'ordre, sur 12 colonnes. Un élément qui
 * ne tient plus dans la rangée en ouvre une nouvelle. Avec 4 / 8 / 12, une
 * rangée est pleine (12) ou laisse 4 ou 8 colonnes libres : `libre` le dit.
 * Personne ne s'élargit.
 */
export function rangees(d: Disposition): RangeeGrille[] {
  const out: RangeeGrille[] = [];
  let cases: CaseGrille[] = [];
  let pris = 0;
  const fermer = () => {
    if (!cases.length) return;
    out.push({ cases, libre: (12 - pris) as 0 | 4 | 8 });
    cases = [];
    pris = 0;
  };
  d.forEach((e, i) => {
    const p = portee(e.f);
    if (pris + p > 12) fermer();
    cases.push({ e, i, f: e.f });
    pris += p;
    if (pris === 12) fermer();
  });
  fermer();
  return out;
}

/** Une place à remplir dans Personnaliser. */
export type PlaceVide = {
  rangee: number;
  portee: 4 | 8;
  /** l'index de l'élément « libre » ; null : la fin d'une rangée incomplète */
  i: number | null;
  /** l'index après lequel insérer (l'élément « libre » lui-même, ou le dernier de la rangée) */
  apres: number;
};

/** Les places vides d'une rangée : ses éléments « libre », puis sa fin incomplète. */
export function placesVides(r: RangeeGrille, rangee: number): PlaceVide[] {
  const out: PlaceVide[] = r.cases.filter((c) => estLibre(c.e)).map((c) => ({ rangee, portee: portee(c.f) as 4 | 8, i: c.i, apres: c.i }));
  if (r.libre > 0 && r.cases.length) out.push({ rangee, portee: r.libre as 4 | 8, i: null, apres: r.cases[r.cases.length - 1].i });
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
const DEFAUT_SANS_RADAR: Disposition = [
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
  const r = rangees(d).find((x) => x.libre > 0);
  if (r) {
    const apres = r.cases[r.cases.length - 1].i;
    return normaliser([...d.slice(0, apres + 1), { k: "folio", f: "tuile" }, ...d.slice(apres + 1)]);
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
  return Number.isFinite(n) && n > 0 ? Math.max(0.25, Math.min(4, Math.round(n * 1000) / 1000)) : 16 / 9;
};

/** Un nombre venu de la base ou du navigateur (jamais une chaîne, null ou NaN). */
const nombre = (x: unknown): number | null => (typeof x === "number" && Number.isFinite(x) ? x : null);

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
 * dont une vidéo. Puis la forme propre (normaliser). Les anciennes formes
 * (rangées à modèles, liste de blocs) sont acceptées et converties.
 * Idempotente : une liste validée repasse à l'identique.
 */
export function validerDisposition(raw: unknown, prefixes: Prefixes | null | "lecture"): { disposition: Disposition; refus: string[] } {
  if (!Array.isArray(raw)) return { disposition: [], refus: [] };
  const refus: string[] = [];
  const vus = new Set<string>();
  let medias = 0;
  let videos = 0;
  let mediaRefuse = false;

  const media = (b: Record<string, unknown>): BlocMedia | null => {
    const id = typeof b.id === "string" && /^[a-z0-9]{6,24}$/.test(b.id) ? b.id : null;
    const type = b.type === "image" ? "image" : b.type === "video" ? "video" : null;
    const url = typeof b.url === "string" ? b.url.trim() : "";
    const klipy = type === "image" && URL_KLIPY.test(url);
    const bucket = type === "video" ? BUCKET_VIDEOS : BUCKET_MEDIAS;
    const prefixe = prefixes && prefixes !== "lecture" ? (type === "video" ? prefixes.videos : prefixes.images) : null;
    const fichier = prefixes === "lecture" ? (adresseRelue(bucket).exec(url)?.[1] ?? null) : prefixe && url.startsWith(prefixe) ? url.slice(prefixe.length) : null;
    const dossierOk = klipy || (!!id && fichier !== null && nomFichier(id, type === "video").test(fichier));
    const ok =
      id && type && dossierOk && url.length <= 500 && /^[A-Za-z0-9:/._%-]+$/.test(url) && (type === "video" ? EXT_VIDEO : EXT_IMAGE).test(url) && !vus.has("m:" + id);
    if (!ok || medias >= MEDIAS_MAX || (type === "video" && videos >= VIDEOS_MAX)) {
      mediaRefuse = true;
      return null;
    }
    vus.add("m:" + id);
    medias++;
    if (type === "video") videos++;
    const px = Math.round(Number(b.px));
    const y = nombre(b.y);
    const duree = nombre(b.duree) !== null ? Math.round(nombre(b.duree)! * 10) / 10 : null;
    const dureeOk = type === "video" && duree !== null && duree >= 0.5 && duree <= 61 ? duree : null;
    const couv = nombre(b.couverture);
    const max = dureeOk ?? 60;
    const couverture = type === "video" && couv !== null && couv >= 0 ? Math.min(Math.round(couv * 2) / 2, Math.floor(max * 2) / 2) : null;
    const sans: Omit<BlocMedia, "f"> = {
      k: "media",
      id,
      type,
      url,
      ratio: bornerRatio(b.ratio),
      legende: nettoyerLegende(b.legende),
      ...(klipy ? { source: "klipy" as const, ...(px >= 16 && px <= 4000 ? { px } : {}) } : {}),
      ...(type === "image" && y !== null ? { y: Math.max(0, Math.min(100, Math.round(y))) } : {}),
      ...(dureeOk !== null ? { duree: dureeOk } : {}),
      ...(couverture !== null ? { couverture } : {}),
    };
    const genre = genreMedia({ ...sans, f: "tuile" });
    return { ...sans, f: estFormat(b.f) ? formatPermis(genre, b.f) : FORMAT_DEFAUT[genre] };
  };

  const element = (x: unknown): ElementPage | null => {
    if (!estObjet(x)) return null;
    if (x.k === "libre") return x.f === "tuile" || x.f === "heros" ? { k: "libre", f: x.f } : null;
    if (x.k === "media") return media(x);
    const info = BLOCS.find((i) => i.k === x.k);
    if (!info || vus.has(info.k)) return null;
    vus.add(info.k);
    return { k: info.k, f: estFormat(x.f) ? formatPermis(info.k, x.f) : FORMAT_DEFAUT[info.k] };
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
  return { disposition: normaliser(out), refus };
}

/**
 * La disposition lue en base. Sans disposition enregistrée : celle par
 * défaut (sans le radar si le joueur l'avait masqué, comme avant).
 */
export function dispositionDepuis(raw: unknown, radar: boolean): Disposition {
  if (Array.isArray(raw)) return validerDisposition(raw, "lecture").disposition;
  return radar ? DISPOSITION_DEFAUT : DEFAUT_SANS_RADAR;
}

/** Un identifiant de média (minuscules et chiffres). */
export const nouvelId = () => (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)).slice(0, 16);
