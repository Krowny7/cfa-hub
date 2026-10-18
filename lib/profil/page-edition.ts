// Les opérations de l'éditeur de la page du profil (Personnaliser · Ta
// page, components/profil/EditeurPage.tsx) sur la liste ordonnée de blocs
// (lib/profil/disposition.ts) : changer le format d'un bloc, le déplacer,
// échanger deux places, mettre un autre bloc à sa place, remplir une place
// libre, ajouter, masquer ou retirer, fermer une place libre.
// Chaque opération est pure : elle rend une NOUVELLE liste, passée par
// normaliser (la forme propre que la validation rend à l'identique), ou la
// liste d'entrée inchangée (même référence) quand elle est impossible
// (format refusé, bloc déjà posé, médias en trop, page pleine). Une
// insertion qui ferait passer la liste au-delà de 20 éléments retire
// d'abord la dernière place libre ; s'il n'y en a pas, elle est refusée.
// Module neutre (client et serveur).

import { EDITEUR_PAGE } from "@/lib/voice-editeur";
import {
  BLOCS,
  CARTES_MAX,
  ELEMENTS_MAX,
  IMAGES_HAUT_MAX,
  FORMATS_PERMIS,
  FORMAT_DEFAUT,
  MEDIAS_MAX,
  VIDEOS_MAX,
  estBloc,
  estCarte,
  estFixe,
  estLibre,
  estMedia,
  imagesHaut,
  videosDe,
  formatPermis,
  formatsDe,
  genreDe,
  hauteur,
  normaliser,
  portee,
  rangees,
  type Bloc,
  type CleBloc,
  type Disposition,
  type ElementPage,
  type Format,
  type FormePlace,
  type GenreBloc,
  type PlaceVide,
} from "@/lib/profil/disposition";

const dans = (d: Disposition, i: number) => Number.isInteger(i) && i >= 0 && i < d.length;

/** Le bloc à un format permis (le plus proche s'il ne l'est pas). */
const auFormat = (b: Bloc, f: Format): Bloc => ({ ...b, f: formatPermis(genreDe(b), f) }) as Bloc;

/**
 * Le bloc peut-il entrer sur la page ? Un bloc fixe une fois seulement ; un
 * média : id nouveau, 6 médias au plus, dont une vidéo ; une carte : id
 * nouveau, 3 cartes au plus.
 */
function peutEntrer(d: Disposition, b: Bloc): boolean {
  if (estCarte(b)) return !d.some((e) => estCarte(e) && e.id === b.id) && peutAjouterCarte(d).ok;
  if (!estMedia(b)) return !d.some((e) => e.k === b.k);
  if (d.some((e) => estMedia(e) && e.id === b.id)) return false;
  return peutAjouterMedia(d, b.type === "video").ok;
}

/**
 * Insère `es` à l'index `a` (0 à d.length). Au-delà de 20 éléments, les
 * dernières places libres partent d'abord (l'index suit) ; sans place
 * libre, null : refusé.
 */
function inserer(d: Disposition, a: number, ...es: ElementPage[]): Disposition | null {
  let l = d;
  let ou = a;
  while (l.length + es.length > ELEMENTS_MAX) {
    let j = l.length - 1;
    while (j >= 0 && !estLibre(l[j])) j--;
    if (j < 0) return null;
    l = [...l.slice(0, j), ...l.slice(j + 1)];
    if (j < ou) ou--;
  }
  return [...l.slice(0, ou), ...es, ...l.slice(ou)];
}

/** Change le format du bloc `i` ; refusé si le format n'est pas permis (ou si `i` est une place libre). */
export function changerFormat(d: Disposition, i: number, f: Format): Disposition {
  const e = d[i];
  if (!dans(d, i) || !estBloc(e) || e.f === f || !formatsDe(e).includes(f)) return d;
  return normaliser(d.map((x, j) => (j === i ? ({ ...e, f } as Bloc) : x)));
}

/** Avance (1) ou recule (-1) l'élément `i` d'un cran dans la liste : chacun garde son format, les rangées se recomposent. */
export function deplacer(d: Disposition, i: number, sens: -1 | 1): Disposition {
  const k = i + sens;
  // deux places libres pareilles : rien ne bouge
  if (!dans(d, i) || !dans(d, k) || (estLibre(d[i]) && estLibre(d[k]) && d[i].f === d[k].f)) return d;
  const l = [...d];
  [l[i], l[k]] = [l[k], l[i]];
  return normaliser(l);
}

/**
 * Échange les places `a` et `b` : chacun prend la place de l'autre et le
 * format de cette place (le plus proche s'il ne lui va pas). Une place
 * libre ne prend pas une bande : l'échange est alors refusé.
 */
export function echanger(d: Disposition, a: number, b: number): Disposition {
  // deux places libres échangées : rien ne bouge
  if (!dans(d, a) || !dans(d, b) || a === b || (estLibre(d[a]) && estLibre(d[b]))) return d;
  const vers = (e: ElementPage, f: Format): ElementPage | null => {
    if (estBloc(e)) return auFormat(e, f);
    return f === "bande" ? null : { k: "libre", f };
  };
  const x = vers(d[a], d[b].f);
  const y = vers(d[b], d[a].f);
  if (!x || !y) return d;
  return normaliser(d.map((e, j) => (j === a ? y : j === b ? x : e)));
}

/**
 * Met le bloc fixe `k` à la place `i` : déjà posé ailleurs, les deux
 * échangent leur place ; sinon il remplace l'élément `i`, au format de la
 * place (le plus proche s'il ne lui va pas). Le bloc remplacé est masqué
 * (un média remplacé est retiré).
 */
export function mettreALaPlace(d: Disposition, i: number, k: CleBloc): Disposition {
  if (!dans(d, i) || d[i].k === k || !BLOCS.some((b) => b.k === k)) return d;
  const ailleurs = d.findIndex((e) => e.k === k);
  if (ailleurs >= 0) return echanger(d, i, ailleurs);
  return normaliser(d.map((e, j) => (j === i ? { k, f: formatPermis(k, e.f) } : e)));
}

/** Le format qui remplit une place (tuile, héros ou colonne), s'il va au bloc ; sinon son format par défaut. */
export function pourPlace(g: GenreBloc, f: FormePlace): Format {
  return FORMATS_PERMIS[g].includes(f) ? f : FORMAT_DEFAUT[g];
}

/**
 * Pose le bloc `b` dans la place vide `p` : un élément « libre » est
 * remplacé ; la fin d'une ligne reçoit le bloc juste après `p.apres` (une
 * fin de 2e ligne à `combler` reçoit d'abord la place libre qui garde le
 * reste de la 1re). Le format est celui de la place (pourPlace). Refusé si
 * le bloc est déjà posé, si les médias ou les cartes sont au complet, ou si
 * la place n'existe plus.
 */
export function remplirPlace(d: Disposition, p: PlaceVide, b: Bloc): Disposition {
  if (!peutEntrer(d, b)) return d;
  const nouveau = { ...b, f: pourPlace(genreDe(b), p.f) } as Bloc;
  // une moitié ne prend qu'une mini-tuile (la progression, qui n'en a pas, est refusée)
  if (p.moitie && nouveau.f !== "tuile") return d;
  const libreTuile: ElementPage = { k: "libre", f: "tuile" };
  if (p.i !== null) {
    // un élément « libre » ne s'élargit pas : un bloc qui ne tient pas dans sa place (la progression dans une tuile ou une colonne) est refusé
    if (!dans(d, p.i) || !estLibre(d[p.i]) || portee(nouveau.f) > portee(p.f) || hauteur(nouveau.f) > hauteur(p.f)) return d;
    // la moitié d'un élément « libre » de 2/3 : le bloc dans la moitié choisie, l'autre moitié libre (rien ne bouge autour)
    if (p.moitie) {
      if (d[p.i].f !== "heros") return d;
      const l = inserer(
        d.map((e, j) => (j === p.i ? (p.cote === 1 ? libreTuile : nouveau) : e)),
        p.i + 1,
        p.cote === 1 ? nouveau : libreTuile,
      );
      return l ? normaliser(l) : d;
    }
    return normaliser(d.map((e, j) => (j === p.i ? nouveau : e)));
  }
  if (p.apres < -1 || p.apres >= d.length) return d;
  // la moitié droite d'une fin de ligne : la gauche reste libre d'abord
  const avant: ElementPage[] = [...(p.combler ? [{ k: "libre" as const, f: p.combler }] : []), ...(p.moitie && p.cote === 1 ? [libreTuile] : [])];
  const l = inserer(d, p.apres + 1, ...avant, nouveau);
  return l ? normaliser(l) : d;
}

/**
 * Le bloc `i` quitte sa place et va dans la place vide `p` (un élément
 * « libre », ou la fin d'une ligne), au format de cette place. Hors bande,
 * il laisse d'abord sa place libre (comme retirer) : rien ne remonte, la
 * place visée (calculée sur la page affichée, avec son `combler` et le côté
 * de sa colonne) reste exacte ; une place libre qui finit la page, ou une
 * rangée faite seulement d'elles, part ensuite (normaliser). Une bande, qui
 * ne laisse pas de place, est retirée et les index suivent. Refusé si `i`
 * n'est pas un bloc, si c'est la place elle-même, ou si c'est la fin de sa
 * propre ligne, juste après lui (une colonne : la fin de l'une de ses lignes).
 */
export function deplacerVers(d: Disposition, i: number, p: PlaceVide): Disposition {
  if (!dans(d, i) || !estBloc(d[i])) return d;
  const b = d[i] as Bloc;
  if (p.i === i) return d;
  if (p.i === null && p.apres === i && (b.f === "colonne" || rangees(d)[p.rangee]?.cases.find((c) => c.i === i)?.ligne === p.ligne)) return d;
  let base: Disposition;
  let place: PlaceVide = p;
  if (b.f !== "bande") base = d.map((x, j) => (j === i ? ({ k: "libre", f: b.f } as ElementPage) : x));
  else {
    if (p.i === null && p.apres === i) return d;
    const apres = (x: number) => (x > i ? x - 1 : x);
    base = d.filter((_, j) => j !== i);
    place = p.i !== null ? { ...p, i: apres(p.i), apres: apres(p.i) } : { ...p, apres: apres(p.apres) };
  }
  const l = remplirPlace(base, place, b);
  // refusé, ou rien n'a bougé (un bloc qui ne va pas à la place retombe où il était) : même liste
  return l === base || JSON.stringify(l) === JSON.stringify(d) ? d : l;
}

/** Inverse les couleurs du bloc `i` (ou les remet) : fond sombre et texte clair le jour, l'inverse la nuit. */
export function inverser(d: Disposition, i: number): Disposition {
  const e = d[i];
  if (!dans(d, i) || !estBloc(e)) return d;
  if (e.inv) {
    const sans = { ...e };
    delete sans.inv;
    return d.map((x, j) => (j === i ? sans : x));
  }
  return d.map((x, j) => (j === i ? ({ ...e, inv: true } as Bloc) : x));
}

/** Ajoute le bloc `b` à la fin de la page, à son format (le plus proche s'il n'est pas permis). */
export function ajouter(d: Disposition, b: Bloc): Disposition {
  if (!peutEntrer(d, b)) return d;
  const l = inserer(d, d.length, auFormat(b, b.f));
  return l ? normaliser(l) : d;
}

/**
 * Retire le bloc `i` : un bloc fixe est masqué (il garde ses réglages), un
 * média ou une carte est retiré (son fichier part à l'enregistrement). En
 * tuile, en colonne ou en héros, sa place reste, libre : le reste de la page ne bouge pas (une
 * place libre de fin de page ou une rangée toute libre part, normaliser).
 * Une bande part avec sa rangée.
 */
export function retirer(d: Disposition, i: number): Disposition {
  const e = d[i];
  if (!dans(d, i) || !estBloc(e)) return d;
  const f = e.f;
  if (f === "bande") return normaliser(d.filter((_, j) => j !== i));
  const place: ElementPage = { k: "libre", f };
  return normaliser(d.map((x, j) => (j === i ? place : x)));
}

/**
 * Déplace l'élément `i` à l'index `j` (il prend la place de `j`, qui recule
 * ou avance d'un cran avec ceux d'entre les deux) ; chacun garde son format.
 * Le glisser au téléphone, où l'on ne règle que l'ordre.
 */
export function deplacerA(d: Disposition, i: number, j: number): Disposition {
  if (!dans(d, i) || !dans(d, j) || i === j || !estBloc(d[i])) return d;
  const l = d.filter((_, k) => k !== i);
  l.splice(j, 0, d[i]);
  return normaliser(l);
}

/** Ferme la place libre `i` : les éléments suivants remontent. */
export function fermerPlace(d: Disposition, i: number): Disposition {
  if (!dans(d, i) || !estLibre(d[i])) return d;
  return normaliser(d.filter((_, j) => j !== i));
}

/** Les blocs fixes absents de la page (masqués), dans l'ordre du catalogue. */
export const blocsMasques = (d: Disposition) => BLOCS.filter((x) => !d.some((e) => e.k === x.k));

/** Peut-on ajouter une carte ? 3 au plus, et 20 éléments. */
export function peutAjouterCarte(d: Disposition): { ok: boolean; raison: string | null } {
  if (d.filter(estCarte).length >= CARTES_MAX) return { ok: false, raison: EDITEUR_PAGE.refusCartes };
  if (d.length >= ELEMENTS_MAX && !d.some(estLibre)) return { ok: false, raison: EDITEUR_PAGE.refusPlein };
  return { ok: true, raison: null };
}

/**
 * Peut-on poser un média en haut du bloc `i` (une vidéo si `video`) ? 4
 * médias en haut au plus sur la page, et une vidéo par page, blocs média
 * compris ; changer celui que le bloc porte déjà reste permis (sa vidéo
 * contre une autre aussi). Sans `i` : un bloc qui n'en porte pas.
 */
export function peutAjouterImageHaut(d: Disposition, video = false, i: number | null = null): { ok: boolean; raison: string | null } {
  const e = i !== null && dans(d, i) ? d[i] : null;
  const sien = e && (estFixe(e) || estCarte(e)) ? e.img : undefined;
  if (!sien && imagesHaut(d).length >= IMAGES_HAUT_MAX) return { ok: false, raison: EDITEUR_PAGE.refusImagesHaut };
  // pas de vidéo en haut d'une bande : elle y serait recadrée trop bas
  if (video && e && e.f === "bande") return { ok: false, raison: EDITEUR_PAGE.refusVideoBande };
  if (video && sien?.type !== "video" && videosDe(d) >= VIDEOS_MAX) return { ok: false, raison: EDITEUR_PAGE.refusVideo };
  return { ok: true, raison: null };
}

/** La page sans le média en haut du bloc `i` (même liste s'il n'en porte pas). Son fichier part à l'enregistrement. */
export function sansMediaHaut(d: Disposition, i: number): Disposition {
  const e = d[i];
  if (!dans(d, i) || !(estFixe(e) || estCarte(e)) || !e.img) return d;
  const sans = { ...e };
  delete sans.img;
  return d.map((x, j) => (j === i ? sans : x));
}

/** Peut-on ajouter un média (une vidéo si `video`) ? 6 médias au plus, dont une vidéo, et 20 éléments. */
export function peutAjouterMedia(d: Disposition, video: boolean): { ok: boolean; raison: string | null } {
  const medias = d.filter(estMedia);
  if (medias.length >= MEDIAS_MAX) return { ok: false, raison: EDITEUR_PAGE.refusMedias };
  // une vidéo par page : celle d'un bloc média ou celle posée en haut d'un bloc
  if (video && videosDe(d) >= VIDEOS_MAX) return { ok: false, raison: EDITEUR_PAGE.refusVideo };
  if (d.length >= ELEMENTS_MAX && !d.some(estLibre)) return { ok: false, raison: EDITEUR_PAGE.refusPlein };
  return { ok: true, raison: null };
}
