// La bannière composée du joueur : ce que le joueur règle lui-même, comme il
// veut, dans une taille de bannière qu'il ne change pas.
//   - La BANNIÈRE a une taille fixe (référence 360 × 850 px, mise à l'échelle
//     selon l'endroit où elle se dessine) ; le FOND la remplit, sans autre
//     réglage qu'un point de cadrage. Autour, une ZONE DE DÉBORDEMENT fixe (la
//     marge transparente : 25 % de la largeur de chaque côté, 20 % de la
//     hauteur au-dessus, 10 % au-dessous) où le personnage et les pièces
//     peuvent dépasser ; rien ne sort de cette zone (bornerCalque).
//   - Trois CALQUES libres : le personnage (`perso`), la pièce du haut
//     (`haut`) et la pièce du bas (`bas`). Chacun : une image (envoyée par le
//     joueur dans son dossier de profil-medias, ou un préréglage du site),
//     une position (x, y, en % de la bannière), une largeur et une hauteur
//     (en % de la bannière ; la hauteur `null` suit les proportions de
//     l'image : c'est le verrou de proportions). L'ORDRE d'empilement est une
//     liste du fond vers l'avant des quatre éléments « perso, haut, bas,
//     cadre » : devant ou derrière les autres, devant ou derrière le cadre.
//   - Le CADRE de la bannière est dessiné par le site (le filet d'encre ou
//     l'ornement gagné : profile_style.ornement) ; il n'est pas réglable ici,
//     sauf sa place dans l'ordre.
//   - Le PANNEAU de gauche (la « carte » du joueur) est dessiné par le site ;
//     le joueur choisit seulement ce qu'il y met : 3 badges parmi ce qu'il a
//     gagné (sceaux, trophées, titres) et 3 statistiques dans une liste.
// Tout vit dans UNE colonne jsonb, profile_style.banniere
// (migration_bannieres_composees.sql). Ce module est neutre (client et
// serveur) : types, bornes, valeurs par défaut, lecture tolérante de la base
// (compositionDepuis), validation stricte à l'enregistrement
// (validerComposition), sérialisation (serialiserComposition), noms de
// fichiers, préréglages, valeurs du panneau. Ce que le joueur a gagné (la
// liste de badges proposée) se calcule côté serveur : lib/profil/banniere-badges.ts.
// Pour dessiner : compositionDe(style) (un style sans composition enregistrée
// reprend l'ancien personnage : compositionDepuisAncien).

import type { ProfilStats } from "@/lib/profil/catalogue";
import { BUCKET_MEDIAS } from "@/lib/profil/disposition";
import { estPalierTrophee, estSourceTrophee } from "@/lib/trophees";

// ── La taille de la bannière et sa zone de débordement ───────────────────
/**
 * la bannière, en pixels de référence (le fond la remplit ; tout se met à l'échelle).
 * Elle faisait 360 × 1000 : 15 % de moins en hauteur (850). Tout ce qui est écrit en %
 * de la bannière (positions, largeurs, hauteurs libres) reste valide tel quel ; la hauteur
 * d'une image aux proportions verrouillées suit son rapport (K ci-dessous).
 */
export const BANNIERE_L = 360;
export const BANNIERE_H = 850;
/** la marge transparente autour de la bannière : % de sa largeur (gauche, droite) et de sa hauteur (haut, bas) */
export const DEBORD = { gauche: 25, droite: 25, haut: 20, bas: 10 } as const;
/**
 * La scène : la bannière et sa zone de débordement, en % de la bannière
 * (x : 0 est son bord gauche, 100 son bord droit ; y : 0 son bord haut, 100
 * son bord bas). Un calque tient tout entier dans la scène.
 */
export const SCENE = { x0: -DEBORD.gauche, x1: 100 + DEBORD.droite, y0: -DEBORD.haut, y1: 100 + DEBORD.bas } as const;
export const SCENE_L = SCENE.x1 - SCENE.x0;
export const SCENE_H = SCENE.y1 - SCENE.y0;
/** la scène en pixels de référence (540 × 1105) */
export const SCENE_PX = { l: Math.round((BANNIERE_L * SCENE_L) / 100), h: Math.round((BANNIERE_H * SCENE_H) / 100) } as const;
/** 1 % de largeur de bannière vaut K % de sa hauteur, à ratio 1 : la hauteur d'une image proportionnelle est l × K / ratio */
const K = BANNIERE_L / BANNIERE_H;

/** largeur et hauteur d'un calque, en % de la bannière */
export const CALQUE_L_MIN = 8;
export const CALQUE_L_MAX = SCENE_L;
export const CALQUE_H_MIN = 4;
export const CALQUE_H_MAX = SCENE_H;
/** le rapport largeur / hauteur d'une image envoyée, borné (une image absurde ne casse rien) */
export const RATIO_MIN = 0.05;
export const RATIO_MAX = 12;
export const RATIO_DEFAUT = 1;

// ── Les images : quatre fichiers, un par élément ────────────────────────
export type CleCalque = "perso" | "haut" | "bas";
/** les quatre images que le joueur envoie ; leur clé commence le nom du fichier (`perso-<instant>.png`) */
export type CleImage = "fond" | CleCalque;
export const CLES_IMAGE: readonly CleImage[] = ["fond", "perso", "haut", "bas"];
export const CALQUES: readonly CleCalque[] = ["perso", "haut", "bas"];
/** ce qui s'empile : les trois calques et le cadre dessiné par le site */
export type CleOrdre = CleCalque | "cadre";
/** du fond vers l'avant : le cadre derrière le personnage, la pièce du bas devant ses pieds, celle du haut devant tout */
export const ORDRE_DEFAUT: readonly CleOrdre[] = ["cadre", "perso", "bas", "haut"];
export const NOMS_ELEMENTS: Record<CleImage | "cadre", string> = { fond: "Fond", perso: "Personnage", haut: "Pièce du haut", bas: "Pièce du bas", cadre: "Cadre" };

/** poids d'une image envoyée (après réduction éventuelle dans le navigateur), et avant */
export const IMAGE_MAX_OCTETS = 4 * 1024 * 1024;
export const IMAGE_BRUT_MAX_OCTETS = 20 * 1024 * 1024;
/** côté le plus long, après réduction : le fond tient dans 360 × 850 (dense : ×3), les pièces débordent un peu */
export const IMAGE_MAX_PX = 1800;
/** PNG ou WebP (la transparence), JPG accepté (fond plein) */
export const IMAGE_TYPES = ["image/png", "image/webp", "image/jpeg"];
/** combien d'images la bannière fait vivre au plus dans le dossier du joueur (migration_bannieres_composees.sql compte les remplaçantes en attente) */
export const IMAGES_MAX = CLES_IMAGE.length;
/** la taille de la colonne jsonb au plus (la base la borne aussi) */
export const COMPOSITION_MAX_CAR = 4000;

// ── Les préréglages : des pièces haut / bas toutes prêtes ───────────────
/** là où le site sert ses pièces (public/bannieres/pieces/) */
export const DOSSIER_PIECES = "/bannieres/pieces";
export type Prereglage = {
  id: string;
  nom: string;
  /** les deux pièces de la paire : fichier (WebP détouré) et dimensions en pixels */
  haut: { fichier: string; px: [number, number] };
  bas: { fichier: string; px: [number, number] };
};
/** Quatre paires dessinées ; le joueur prend le haut d'une et le bas d'une autre s'il veut. */
export const PREREGLAGES: readonly Prereglage[] = [
  { id: "meca", nom: "Mécanique", haut: { fichier: "meca-haut.webp", px: [966, 334] }, bas: { fichier: "meca-base.webp", px: [942, 377] } },
  { id: "royal", nom: "Royale", haut: { fichier: "royal-haut.webp", px: [977, 387] }, bas: { fichier: "royal-base.webp", px: [923, 369] } },
  { id: "epines", nom: "Épines", haut: { fichier: "epines-haut.webp", px: [852, 424] }, bas: { fichier: "epines-base.webp", px: [852, 411] } },
  { id: "hexa", nom: "Hexagones", haut: { fichier: "hexa-haut.webp", px: [895, 417] }, bas: { fichier: "hexa-base.webp", px: [824, 425] } },
];
const PREFIXE_PIECE = "piece:";
/** La valeur de `image` d'un calque qui prend un préréglage : « piece:meca ». */
export const imagePrereglage = (id: string) => `${PREFIXE_PIECE}${id}`;
/** Le préréglage nommé par une valeur de `image` (« piece:meca »), s'il existe. */
export const prereglageDe = (image: string | null | undefined): Prereglage | null => (typeof image === "string" && image.startsWith(PREFIXE_PIECE) ? (PREREGLAGES.find((p) => p.id === image.slice(PREFIXE_PIECE.length)) ?? null) : null);
/** Le rapport largeur / hauteur de la pièce (haut ou bas) d'un préréglage : connu, donc jamais celui qu'envoie le navigateur. */
export const ratioPrereglage = (cle: CleCalque, p: Prereglage) => (cle === "haut" ? p.haut.px[0] / p.haut.px[1] : p.bas.px[0] / p.bas.px[1]);

/**
 * L'adresse à mettre dans un <img> pour la valeur `image` d'un calque : celle
 * de son fichier envoyé, ou le fichier du site d'un préréglage (haut ou bas) ;
 * rien : null.
 */
export function adresseImage(cle: CleImage, image: string | null | undefined): string | null {
  if (typeof image !== "string" || !image) return null;
  const p = prereglageDe(image);
  if (p) return cle === "haut" ? `${DOSSIER_PIECES}/${p.haut.fichier}` : cle === "bas" ? `${DOSSIER_PIECES}/${p.bas.fichier}` : null;
  return image;
}

// ── Les types de la composition ─────────────────────────────────────────
/** Le fond : une image qui remplit la bannière (null : le fond du profil, motif ou image de bannière) ; seul réglage, le point de cadrage (0 à 100 ; 50 : centré). */
export type Fond = { image: string | null; px: number; py: number };
/**
 * Un calque libre. `image` : l'adresse d'un fichier du dossier du joueur
 * (`perso-<instant>.<ext>`), ou « piece:<id> » (un préréglage, haut et bas
 * seulement) ; null : le calque est absent. `x`, `y` : son coin haut gauche,
 * en % de la bannière (voir SCENE). `l` : sa largeur en % de la largeur de la
 * bannière ; `h` : sa hauteur en % de la hauteur de la bannière, ou null :
 * proportionnelle (verrou de proportions). `r` : largeur / hauteur de l'image.
 */
export type Calque = { image: string | null; x: number; y: number; l: number; h: number | null; r: number };

/** Les statistiques que le joueur peut mettre dans son panneau. */
export const STATS_PANNEAU = [
  { cle: "elo", nom: "ELO", etiquette: "ELO" },
  { cle: "duels", nom: "Duels gagnés", etiquette: "DUELS GAGNÉS" },
  { cle: "taux-duels", nom: "Victoires en duel", etiquette: "VICTOIRES" },
  { cle: "sceaux", nom: "Sceaux", etiquette: "SCEAUX" },
  { cle: "trophees", nom: "Trophées", etiquette: "TROPHÉES" },
  { cle: "questions", nom: "Questions répondues", etiquette: "QUESTIONS" },
  { cle: "serie", nom: "Série d'encre", etiquette: "SÉRIE D'ENCRE" },
  { cle: "meilleure-serie", nom: "Meilleure série", etiquette: "MEILLEURE SÉRIE" },
  { cle: "heures", nom: "Heures sur le site", etiquette: "HEURES" },
  { cle: "place", nom: "Place au classement", etiquette: "CLASSEMENT" },
  { cle: "niveau", nom: "Niveau", etiquette: "NIVEAU" },
  { cle: "maitrise", nom: "Maîtrise", etiquette: "MAÎTRISE" },
  { cle: "calculs", nom: "Calculs justes", etiquette: "CALCULS" },
  { cle: "examens", nom: "Examens blancs", etiquette: "EXAMENS" },
  { cle: "defis", nom: "Défis rendus", etiquette: "DÉFIS" },
] as const;
export type CleStat = (typeof STATS_PANNEAU)[number]["cle"];
const estStat = (v: unknown): v is CleStat => typeof v === "string" && STATS_PANNEAU.some((s) => s.cle === v);
export const statPanneau = (cle: CleStat) => STATS_PANNEAU.find((s) => s.cle === cle)!;
export const BADGES_MAX = 3;
export const STATS_MAX = 3;
/** les trois statistiques d'un panneau neuf (celles de la maquette) */
export const STATS_DEFAUT: readonly CleStat[] = ["elo", "duels", "sceaux"];

/**
 * Le panneau de gauche : `badges`, au plus 3 identifiants d'un acquis du
 * joueur (« sceau:assiduite », « trophee:ciblee:3 », « titre:maitre:fsa » ;
 * liste vide : le site pose d'office ses trois sceaux les plus rares,
 * posesDe) ; `stats`, au plus 3 clés de STATS_PANNEAU, dans l'ordre d'affichage.
 */
export type Panneau = { badges: string[]; stats: CleStat[] };

/** La composition entière : le fond, les trois calques, l'ordre d'empilement et le panneau. */
export type Composition = { fond: Fond; perso: Calque; haut: Calque; bas: Calque; ordre: CleOrdre[]; panneau: Panneau };

// ── Nombres ────────────────────────────────────────────────────────────
const dixieme = (n: number) => Math.round(n * 10) / 10;
const entre = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
/** Un nombre lu d'une valeur brute (un nombre fini ; une chaîne numérique de l'éditeur aussi) ; sinon `defaut`. */
const nombre = (v: unknown, defaut: number): number => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : defaut;
};

/** Le rapport largeur / hauteur d'une image, ramené dans ses bornes (au millième). */
export const bornerRatio = (v: unknown): number => Math.round(entre(nombre(v, RATIO_DEFAUT), RATIO_MIN, RATIO_MAX) * 1000) / 1000;

/** La hauteur d'un calque en % de la bannière : la sienne, ou celle que ses proportions donnent. */
export const hauteurCalque = (c: Pick<Calque, "l" | "h" | "r">): number => c.h ?? dixieme((c.l * K) / (c.r || RATIO_DEFAUT));

/**
 * Ramène un calque dans ses bornes : largeur et hauteur dans leurs limites
 * (proportionnel : la largeur cède pour que la hauteur reste dans les siennes),
 * puis la position pour que tout le calque tienne dans la scène (la zone de
 * débordement). Arrondi au dixième. Un calque sans image garde ses valeurs.
 */
export function bornerCalque(c: Calque): Calque {
  const r = bornerRatio(c.r);
  let l = entre(nombre(c.l, 100), CALQUE_L_MIN, CALQUE_L_MAX);
  let h: number | null = null;
  if (c.h === null || c.h === undefined) {
    // proportionnel : la hauteur suit la largeur ; si elle sort de ses bornes, c'est la largeur qui cède
    l = entre(l, Math.ceil(((CALQUE_H_MIN * r) / K) * 10) / 10, Math.floor(((CALQUE_H_MAX * r) / K) * 10) / 10);
    l = entre(l, CALQUE_L_MIN, CALQUE_L_MAX);
  } else {
    h = dixieme(entre(nombre(c.h, CALQUE_H_MIN), CALQUE_H_MIN, CALQUE_H_MAX));
  }
  l = dixieme(l);
  const hh = h ?? dixieme((l * K) / r);
  const x = dixieme(entre(nombre(c.x, 0), SCENE.x0, SCENE.x1 - l));
  const y = dixieme(entre(nombre(c.y, 0), SCENE.y0, SCENE.y1 - hh));
  return { image: c.image, x, y, l, h, r };
}

/**
 * Où poser un calque que le joueur vient de remplir (image de ratio `r`) :
 * la pièce du haut centrée, son bas qui mord sur le haut de la bannière ; la
 * pièce du bas centrée, son bas un peu sous la bannière ; le personnage un
 * peu plus large que la bannière, les pieds près du bas. Toujours dans les bornes.
 */
export function poserCalque(cle: CleCalque, image: string | null, r: number = RATIO_DEFAUT): Calque {
  const ratio = bornerRatio(r);
  const l = cle === "perso" ? 110 : 140;
  const h = (l * K) / ratio;
  const bas = cle === "haut" ? 6 : cle === "bas" ? 104 : 94;
  return bornerCalque({ image, x: (100 - l) / 2, y: bas - h, l, h: null, r: ratio });
}

/** Une composition neuve : aucune image (le fond du profil, pas de pièces), le panneau de la maquette. */
export const compositionDefaut = (): Composition => ({
  fond: { image: null, px: 50, py: 50 },
  perso: poserCalque("perso", null, 0.75),
  haut: poserCalque("haut", null, 2.5),
  bas: poserCalque("bas", null, 2.5),
  ordre: [...ORDRE_DEFAUT],
  panneau: { badges: [], stats: [...STATS_DEFAUT] },
});

/** Une composition a-t-elle au moins une image à dessiner (fond, personnage ou pièce) ? */
export const aDesImages = (c: Composition): boolean => !!(c.fond.image || c.perso.image || c.haut.image || c.bas.image);

// ── Les noms de fichiers ───────────────────────────────────────────────
/** Le nom d'un fichier envoyé maintenant : `perso-<instant>.png`. Un seul fichier par élément : l'ancien part au ménage de l'enregistrement. */
export const nomFichierImage = (cle: CleImage, ext: string, quand: number = Date.now()) => `${cle}-${quand}.${ext}`;
const nomExact = (cle: CleImage) => new RegExp(`^${cle}-[0-9]{9,16}[.](?:png|webp|jpe?g)$`, "i");
/** Relu de la base : le bucket, un dossier de joueur (son uuid), puis ce nom exact (ni « .. » ni « %2e »). */
const adresseRelue = (cle: CleImage) => new RegExp(`^https?:[/][/][A-Za-z0-9.:-]+[/]storage[/]v1[/]object[/]public[/]${BUCKET_MEDIAS}[/][0-9a-f-]{36}[/](${cle}-[0-9]{9,16}[.](?:png|webp|jpe?g))$`, "i");

/** Le nom de fichier d'une adresse envoyée (son dernier segment) ; un préréglage ou rien : null. */
export const fichierImage = (image: string | null | undefined): string | null => (image && !image.startsWith(PREFIXE_PIECE) ? (image.split("/").pop() ?? null) : null);

/**
 * L'image d'un élément lue de la base ou d'un brouillon : un préréglage
 * connu (calques haut et bas), ou une adresse du dossier de profil-medias
 * de la bonne forme, sous le nom exact de l'élément ; sinon null.
 */
export function imageRelue(cle: CleImage, raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length > 500) return null;
  const v = raw.trim();
  if (v.startsWith(PREFIXE_PIECE)) return cle !== "fond" && cle !== "perso" && prereglageDe(v) ? v : null;
  return adresseRelue(cle).test(v) ? v : null;
}

/**
 * L'image voulue à l'enregistrement : un préréglage connu, ou un fichier du
 * dossier du joueur (`prefixe`, l'adresse publique de son dossier), sous le
 * nom exact de l'élément ; sinon null.
 */
export function imageValide(cle: CleImage, raw: unknown, prefixe: string | null): string | null {
  const v = typeof raw === "string" ? raw.trim() : "";
  if (!v || v.length > 500) return null;
  if (v.startsWith(PREFIXE_PIECE)) return cle !== "fond" && cle !== "perso" && prereglageDe(v) ? v : null;
  if (!prefixe || !v.startsWith(prefixe)) return null;
  return nomExact(cle).test(v.slice(prefixe.length)) ? v : null;
}

/** Les fichiers du joueur dont sa composition se sert (le ménage de l'enregistrement supprime le reste). */
export function fichiersComposition(c: Composition | null | undefined): Set<string> {
  const out = new Set<string>();
  if (!c) return out;
  for (const i of [c.fond.image, c.perso.image, c.haut.image, c.bas.image]) {
    const nom = fichierImage(i);
    if (nom) out.add(nom);
  }
  return out;
}

// ── Les badges du panneau ──────────────────────────────────────────────
/** « sceau:assiduite », « sceau:matiere:fsa » */
const BADGE_SCEAU = /^sceau:[a-z0-9][a-z0-9:-]{1,58}$/;
/** « trophee:ciblee:3 » (source, palier) */
const BADGE_TROPHEE = /^trophee:([a-z]+):([1-4])$/;
/** « titre:maitre:fsa » (clé nue d'une pièce « titre ») */
const BADGE_TITRE = /^titre:[a-z0-9][a-z0-9:_-]{1,58}$/;
export type GenreBadge = "sceau" | "trophee" | "titre";
export const idBadgeSceau = (cle: string) => `sceau:${cle}`;
export const idBadgeTrophee = (source: string, palier: number) => `trophee:${source}:${palier}`;
export const idBadgeTitre = (nue: string) => `titre:${nue}`;
/** Le genre d'un identifiant de badge bien formé ; sinon null. */
export function genreBadge(id: unknown): GenreBadge | null {
  if (typeof id !== "string") return null;
  if (BADGE_SCEAU.test(id)) return "sceau";
  const t = BADGE_TROPHEE.exec(id);
  if (t) return estSourceTrophee(t[1]) && estPalierTrophee(Number(t[2])) ? "trophee" : null;
  return BADGE_TITRE.test(id) ? "titre" : null;
}

// ── Lire, valider, sérialiser ───────────────────────────────────────────
/** Ce que la validation demande : le dossier du joueur, ce qu'il a gagné et ce qu'il porte déjà. */
export type ContexteComposition = {
  /** l'adresse publique du dossier du joueur dans profil-medias ; null : aucune image envoyée n'est acceptée */
  prefixe: string | null;
  /** les identifiants de badges qu'il a gagnés ; null : pas lus, aucun badge n'est accepté (sauf ceux déjà portés) */
  gagnes: ReadonlySet<string> | null;
  /** la composition qu'il porte déjà : ses badges restent acceptés même si l'acquis ne les confirme plus, rien de gagné n'est repris */
  porte?: Composition | null;
};

/** Un objet simple, sinon null (une chaîne JSON est lue : la base peut rendre l'un ou l'autre). */
function objet(v: unknown): Record<string, unknown> | null {
  let x = v;
  if (typeof x === "string") {
    if (x.length > COMPOSITION_MAX_CAR * 2) return null;
    try {
      x = JSON.parse(x);
    } catch {
      return null;
    }
  }
  return x && typeof x === "object" && !Array.isArray(x) ? (x as Record<string, unknown>) : null;
}

/** Les mots d'une validation : ce que le joueur voulait et qui est refusé. */
type Lecture = { composition: Composition; refus: string[] };

/**
 * Le cœur de la lecture : `ctx` absent, c'est une lecture de la base (forme
 * seulement : une adresse de la bonne forme, un badge bien formé) ; `ctx`
 * donné, c'est la validation stricte de l'enregistrement.
 */
function lire(raw: unknown, ctx: ContexteComposition | null): Lecture | null {
  const o = objet(raw);
  if (!o) return null;
  const refus: string[] = [];
  const image = (cle: CleImage, v: unknown): string | null => {
    if (v === undefined || v === null || v === "") return null;
    const ok = ctx ? imageValide(cle, v, ctx.prefixe) : imageRelue(cle, v);
    if (!ok) refus.push(`l'image de ${NOMS_ELEMENTS[cle].toLowerCase()}`);
    return ok;
  };
  const f = objet(o.fond);
  const fond: Fond = { image: image("fond", f?.image), px: dixieme(entre(nombre(f?.px, 50), 0, 100)), py: dixieme(entre(nombre(f?.py, 50), 0, 100)) };
  const calque = (cle: CleCalque): Calque => {
    const c = objet(o[cle]);
    const img = image(cle, c?.image);
    if (!img) return poserCalque(cle, null, c ? bornerRatio(c.r) : undefined);
    // la proportion d'un préréglage est connue : on ne se fie pas à celle qu'envoie le navigateur
    const p = prereglageDe(img);
    const r = p ? ratioPrereglage(cle, p) : bornerRatio(c?.r);
    const base = poserCalque(cle, img, r);
    const h = c?.h === null || c?.h === undefined ? null : nombre(c.h, NaN);
    return bornerCalque({ image: img, x: nombre(c?.x, base.x), y: nombre(c?.y, base.y), l: nombre(c?.l, base.l), h: h === null || Number.isNaN(h) ? null : h, r });
  };
  const perso = calque("perso");
  const haut = calque("haut");
  const bas = calque("bas");
  // l'ordre : une permutation des quatre éléments, sinon l'ordre par défaut
  let ordre: CleOrdre[] = [...ORDRE_DEFAUT];
  if (Array.isArray(o.ordre)) {
    const voulu = o.ordre as unknown[];
    const permutation = voulu.length === ORDRE_DEFAUT.length && ORDRE_DEFAUT.every((k) => voulu.filter((x) => x === k).length === 1);
    if (permutation) ordre = voulu as CleOrdre[];
    else refus.push("l'ordre des éléments");
  }
  // le panneau
  const p = objet(o.panneau);
  const badges: string[] = [];
  for (const b of Array.isArray(p?.badges) ? (p.badges as unknown[]) : []) {
    if (typeof b !== "string" || badges.includes(b)) continue;
    const bien = genreBadge(b) !== null;
    const permis = ctx ? bien && ((ctx.gagnes?.has(b) ?? false) || (ctx.porte?.panneau.badges.includes(b) ?? false)) : bien;
    if (!permis) {
      refus.push("un badge du panneau");
      continue;
    }
    badges.push(b);
  }
  if (badges.length > BADGES_MAX) refus.push(`les badges au-delà de ${BADGES_MAX}`);
  const stats: CleStat[] = [];
  if (Array.isArray(p?.stats)) {
    for (const s of p.stats as unknown[]) {
      if (!estStat(s)) {
        refus.push("une statistique du panneau");
        continue;
      }
      if (!stats.includes(s)) stats.push(s);
    }
    if (stats.length > STATS_MAX) refus.push(`les statistiques au-delà de ${STATS_MAX}`);
  }
  const panneau: Panneau = { badges: badges.slice(0, BADGES_MAX), stats: Array.isArray(p?.stats) ? stats.slice(0, STATS_MAX) : [...STATS_DEFAUT] };
  return { composition: { fond, perso, haut, bas, ordre, panneau }, refus };
}

/**
 * La composition lue de profile_style.banniere (objet jsonb, ou sa chaîne) :
 * ce qui est de la bonne forme, le reste revient au défaut ; absente ou
 * illisible : null (le style n'a pas de composition enregistrée).
 */
export function compositionDepuis(raw: unknown): Composition | null {
  return lire(raw, null)?.composition ?? null;
}

/**
 * Valide la composition voulue à l'enregistrement (côté serveur : le
 * navigateur n'est jamais cru). Strict : une image qui n'est pas un fichier
 * du dossier du joueur sous le nom exact de son élément (ni un préréglage
 * connu), un badge que le joueur n'a pas gagné, une statistique inconnue, un
 * ordre qui n'est pas une permutation : refusés (listés dans `refus`) et
 * remis au défaut. Les nombres sont ramenés dans leurs bornes (rien ne sort
 * de la scène). `raw` absent ou null : composition null (rien à enregistrer).
 */
export function validerComposition(raw: unknown, ctx: ContexteComposition): { composition: Composition | null; refus: string[] } {
  const l = lire(raw, ctx);
  return l ? l : { composition: null, refus: raw === undefined || raw === null ? [] : ["la bannière composée"] };
}

/** La forme que la base enregistre : les calques sans image sont omis, la hauteur proportionnelle aussi. */
export function serialiserComposition(c: Composition): Record<string, unknown> {
  const calque = (k: CleCalque) => {
    const x = c[k];
    return x.image ? { [k]: { image: x.image, x: x.x, y: x.y, l: x.l, ...(x.h === null ? {} : { h: x.h }), r: x.r } } : {};
  };
  return {
    v: 1,
    fond: c.fond.image ? { image: c.fond.image, px: c.fond.px, py: c.fond.py } : { px: c.fond.px, py: c.fond.py },
    ...calque("perso"),
    ...calque("haut"),
    ...calque("bas"),
    ordre: c.ordre,
    panneau: { badges: c.panneau.badges, stats: c.panneau.stats },
  };
}

/** Les deux compositions disent-elles la même chose ? (comparaison de leur forme enregistrée) */
export const memeComposition = (a: Composition | null | undefined, b: Composition | null | undefined): boolean => (!a || !b ? !a && !b : JSON.stringify(serialiserComposition(a)) === JSON.stringify(serialiserComposition(b)));

// ── L'ancien personnage ────────────────────────────────────────────────
/**
 * La composition d'un joueur qui n'a que l'ancien personnage (colonnes
 * perso_url, perso_taille, perso_pos de migration_bannieres_perso.sql) : son
 * image devient le calque « perso », posé à peu près où l'ancienne bannière le
 * mettait (centré, posé en bas, agrandi depuis le bas ; on ne connaît pas le
 * rapport de l'image : 0,75 par défaut) ; rien d'autre ne change. null : pas
 * d'ancien personnage.
 */
export function compositionDepuisAncien(a: { perso: string | null | undefined; persoTaille?: number; persoPos?: number }): Composition | null {
  const img = imageRelue("perso", a.perso);
  if (!img) return null;
  const taille = entre(nombre(a.persoTaille, 100), 50, 160);
  const decalage = (entre(nombre(a.persoPos, 50), 0, 100) - 50) / 2;
  const r = 0.75;
  const l = (100 * taille) / 100;
  const h = (l * K) / r;
  const base = compositionDefaut();
  return { ...base, perso: bornerCalque({ image: img, x: (100 - l) / 2, y: 100 - h + (decalage * h) / 100, l, h: null, r }) };
}

/** Ce qu'il faut du style pour dessiner : sa composition enregistrée, sinon son ancien personnage. */
export type StyleAvecBanniere = { banniere?: Composition | null; perso?: string | null; persoTaille?: number; persoPos?: number };

/**
 * La composition à dessiner pour un style : celle qu'il a enregistrée, sinon
 * celle que donne son ancien personnage, sinon null (la bannière reste telle
 * qu'elle était : le fond du profil, le cadre).
 */
export function compositionDe(style: StyleAvecBanniere | null | undefined): Composition | null {
  if (!style) return null;
  return style.banniere ?? compositionDepuisAncien({ perso: style.perso, persoTaille: style.persoTaille, persoPos: style.persoPos });
}

// ── Les valeurs du panneau ──────────────────────────────────────────────
/** Ce que ProfilStats ne sait pas : lu en base par qui dessine le panneau (ratings, classement, temps_site, sceaux, trophées, maîtrise). */
export type ExtrasPanneau = {
  elo: number | null;
  /** sa place au classement (1 : premier) ; null : pas classé */
  place: number | null;
  /** le temps passé sur le site, en secondes ; null : inconnu */
  secondes: number | null;
  sceaux: number;
  trophees: number;
  /** maîtrise moyenne, en % ; null : pas mesurée */
  maitrise: number | null;
};

/** La valeur brute de chaque statistique (null : inconnue, le panneau montre un tiret). */
export function valeursPanneau(s: ProfilStats, e: Partial<ExtrasPanneau> = {}): Record<CleStat, number | null> {
  return {
    elo: e.elo ?? null,
    duels: s.duelsGagnes,
    "taux-duels": s.duelsJoues > 0 ? Math.round((s.duelsGagnes / s.duelsJoues) * 100) : null,
    sceaux: e.sceaux ?? null,
    trophees: e.trophees ?? null,
    questions: s.questions,
    serie: s.serie,
    "meilleure-serie": s.meilleureSerie,
    heures: e.secondes === null || e.secondes === undefined ? null : e.secondes / 3600,
    place: e.place ?? null,
    niveau: s.niveau,
    maitrise: e.maitrise ?? null,
    calculs: s.calculsJustes,
    examens: s.examensBlancs,
    defis: s.defisRendus,
  };
}

/** Un entier groupé par milliers, à la française (« 1 612 »). */
const groupe = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
/** La valeur d'une statistique, telle que le panneau l'écrit (« 1 612 », « 12 j », « 62 % », « 3,5 h », « n° 7 ») ; inconnue : un tiret. */
export function formaterStat(cle: CleStat, v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  switch (cle) {
    case "taux-duels":
    case "maitrise":
      return `${Math.round(v)} %`;
    case "serie":
    case "meilleure-serie":
      return `${Math.round(v)} j`;
    case "heures":
      return v < 10 ? `${(Math.round(v * 10) / 10).toString().replace(".", ",")} h` : `${groupe(v)} h`;
    case "place":
      return `n° ${groupe(v)}`;
    default:
      return groupe(v);
  }
}
