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
  ELEMENTS_MAX,
  FORMATS_PERMIS,
  FORMAT_DEFAUT,
  MEDIAS_MAX,
  VIDEOS_MAX,
  estBloc,
  estLibre,
  estMedia,
  formatPermis,
  formatsDe,
  genreDe,
  normaliser,
  type Bloc,
  type CleBloc,
  type Disposition,
  type ElementPage,
  type Format,
  type GenreBloc,
  type PlaceVide,
} from "@/lib/profil/disposition";

const dans = (d: Disposition, i: number) => Number.isInteger(i) && i >= 0 && i < d.length;

/** Le bloc à un format permis (le plus proche s'il ne l'est pas). */
const auFormat = (b: Bloc, f: Format): Bloc => ({ ...b, f: formatPermis(genreDe(b), f) }) as Bloc;

/**
 * Le bloc peut-il entrer sur la page ? Un bloc fixe une fois seulement ; un
 * média : id nouveau, 6 médias au plus, dont une vidéo.
 */
function peutEntrer(d: Disposition, b: Bloc): boolean {
  if (!estMedia(b)) return !d.some((e) => e.k === b.k);
  if (d.some((e) => estMedia(e) && e.id === b.id)) return false;
  return peutAjouterMedia(d, b.type === "video").ok;
}

/**
 * Insère `e` à l'index `a` (0 à d.length). Au-delà de 20 éléments, la
 * dernière place libre part d'abord (l'index suit) ; sans place libre,
 * null : refusé.
 */
function inserer(d: Disposition, a: number, e: ElementPage): Disposition | null {
  let l = d;
  let ou = a;
  if (l.length >= ELEMENTS_MAX) {
    let j = l.length - 1;
    while (j >= 0 && !estLibre(l[j])) j--;
    if (j < 0) return null;
    l = [...l.slice(0, j), ...l.slice(j + 1)];
    if (j < ou) ou--;
  }
  return [...l.slice(0, ou), e, ...l.slice(ou)];
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

/** Le format qui remplit une place de 8 (héros) ou de 4 (tuile), s'il va au bloc ; sinon son format par défaut. */
export function pourPlace(g: GenreBloc, p: 4 | 8): Format {
  const voulu: Format = p === 8 ? "heros" : "tuile";
  return FORMATS_PERMIS[g].includes(voulu) ? voulu : FORMAT_DEFAUT[g];
}

/**
 * Pose le bloc `b` dans la place vide `p` : un élément « libre » est
 * remplacé ; la fin d'une rangée reçoit le bloc juste après `p.apres`. Le
 * format est celui de la place (pourPlace). Refusé si le bloc est déjà
 * posé, si les médias sont au complet, ou si la place n'existe plus.
 */
export function remplirPlace(d: Disposition, p: PlaceVide, b: Bloc): Disposition {
  if (!peutEntrer(d, b)) return d;
  const nouveau = { ...b, f: pourPlace(genreDe(b), p.portee) } as Bloc;
  if (p.i !== null) {
    if (!dans(d, p.i) || !estLibre(d[p.i])) return d;
    return normaliser(d.map((e, j) => (j === p.i ? nouveau : e)));
  }
  if (p.apres < -1 || p.apres >= d.length) return d;
  const l = inserer(d, p.apres + 1, nouveau);
  return l ? normaliser(l) : d;
}

/**
 * Le bloc `i` quitte sa place et va dans la place vide `p` (un élément
 * « libre », ou la fin d'une rangée), au format de cette place. Refusé si
 * `i` n'est pas un bloc, ou s'il est déjà juste avant cette fin de rangée.
 */
export function deplacerVers(d: Disposition, i: number, p: PlaceVide): Disposition {
  if (!dans(d, i) || !estBloc(d[i])) return d;
  const b = d[i] as Bloc;
  if (p.i === i || (p.i === null && p.apres === i)) return d;
  // les index de la place, une fois le bloc retiré
  const apres = (x: number) => (x > i ? x - 1 : x);
  const sans = d.filter((_, j) => j !== i);
  const place: PlaceVide = p.i !== null ? { ...p, i: apres(p.i), apres: apres(p.i) } : { ...p, apres: apres(p.apres) };
  const l = remplirPlace(sans, place, b);
  return l === sans ? d : l;
}

/** Ajoute le bloc `b` à la fin de la page, à son format (le plus proche s'il n'est pas permis). */
export function ajouter(d: Disposition, b: Bloc): Disposition {
  if (!peutEntrer(d, b)) return d;
  const l = inserer(d, d.length, auFormat(b, b.f));
  return l ? normaliser(l) : d;
}

/** Retire le bloc `i` : un bloc fixe est masqué (il garde ses réglages), un média est retiré (son fichier part à l'enregistrement). */
export function retirer(d: Disposition, i: number): Disposition {
  if (!dans(d, i) || !estBloc(d[i])) return d;
  return normaliser(d.filter((_, j) => j !== i));
}

/** Ferme la place libre `i` : les éléments suivants remontent. */
export function fermerPlace(d: Disposition, i: number): Disposition {
  if (!dans(d, i) || !estLibre(d[i])) return d;
  return normaliser(d.filter((_, j) => j !== i));
}

/** Les blocs fixes absents de la page (masqués), dans l'ordre du catalogue. */
export const blocsMasques = (d: Disposition) => BLOCS.filter((x) => !d.some((e) => e.k === x.k));

/** Peut-on ajouter un média (une vidéo si `video`) ? 6 médias au plus, dont une vidéo, et 20 éléments. */
export function peutAjouterMedia(d: Disposition, video: boolean): { ok: boolean; raison: string | null } {
  const medias = d.filter(estMedia);
  if (medias.length >= MEDIAS_MAX) return { ok: false, raison: EDITEUR_PAGE.refusMedias };
  if (video && medias.filter((m) => m.type === "video").length >= VIDEOS_MAX) return { ok: false, raison: EDITEUR_PAGE.refusVideo };
  if (d.length >= ELEMENTS_MAX && !d.some(estLibre)) return { ok: false, raison: EDITEUR_PAGE.refusPlein };
  return { ok: true, raison: null };
}
