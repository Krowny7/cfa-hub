// La boucle « À revoir » des flashcards, sans React (testée par
// scripts/flashcards/test-boucle.ts).
//
// Tour 1 : toutes les cartes du paquet. Chaque carte est marquée « Je
// maîtrise » (true) ou « À revoir » (false). Fin de tour avec des « À revoir » :
// entracte, puis tour suivant avec seulement ces cartes, mélangées. Et ainsi
// de suite jusqu'à zéro : « Tout est maîtrisé ».
//
// L'état est un objet sérialisable (localStorage, une boucle par paquet ou
// par matière) ; chaque fonction rend un nouvel état sans modifier l'ancien.
// La répétition espacée (lib/srs.ts) reste à part : elle planifie la
// prochaine fois, la boucle ne gère que la séance en cours.

export type EtatBoucle = {
  v: 1;
  /** 1, 2, 3… */
  tour: number;
  /** les cartes du tour, dans l'ordre de passage */
  file: string[];
  /** la carte à l'écran (index dans la file) ; file.length une fois le tour bouclé */
  pos: number;
  /** marques du tour en cours : true maîtrisée, false à revoir */
  marques: Record<string, boolean>;
  /** marques du tour 1 (le bilan final : « au premier tour, 9 sur 15 ») */
  premier: Record<string, boolean>;
  /** taille de la file de chaque tour : [15, 6, 2] */
  parcours: number[];
  /** dernière carte marquée (le tour suivant évite de commencer par elle) */
  derniere: string | null;
  /** cartes marquées en tout, tous tours confondus */
  vues: number;
  /** début de la boucle (ms) */
  debut: number;
  /** dernier geste (ms) : sert à compter le temps actif */
  dernier: number;
  /** temps actif cumulé (ms), pauses longues plafonnées */
  actif: number;
  /** fin de la boucle (ms), null tant qu'il reste des cartes à revoir */
  fin: number | null;
};

export type Phase = "carte" | "entracte" | "fin";

/** Au-delà, un silence entre deux gestes est une pause : on n'en compte que ce plafond. */
export const PAUSE_MAX = 3 * 60_000;

type Rng = () => number;

const a = (o: Record<string, boolean>, id: string) => Object.prototype.hasOwnProperty.call(o, id);

/** Mélange de Fisher-Yates (copie). */
export function melanger<T>(xs: readonly T[], rng: Rng = Math.random): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Une nouvelle boucle sur ces cartes (dans cet ordre, ou mélangées). */
export function demarrer(ids: readonly string[], opts: { melanger?: boolean; rng?: Rng; maintenant?: number } = {}): EtatBoucle {
  const uniques = [...new Set(ids)];
  const now = opts.maintenant ?? Date.now();
  const file = opts.melanger ? melanger(uniques, opts.rng) : uniques;
  return { v: 1, tour: 1, file, pos: 0, marques: {}, premier: {}, parcours: [file.length], derniere: null, vues: 0, debut: now, dernier: now, actif: 0, fin: null };
}

/** Tour en cours (« carte »), tour bouclé avec des cartes à revoir (« entracte »), plus rien à revoir (« fin »). */
export function phase(e: EtatBoucle): Phase {
  if (!e.file.every((id) => a(e.marques, id))) return "carte";
  return e.file.some((id) => e.marques[id] === false) ? "entracte" : "fin";
}

/** La prochaine carte sans marque après `depuis` (en revenant au début), sinon file.length. */
function prochaine(file: string[], marques: Record<string, boolean>, depuis: number): number {
  for (let k = 1; k <= file.length; k++) {
    const j = (depuis + k) % file.length;
    if (!a(marques, file[j])) return j;
  }
  return file.length;
}

/** La carte à l'écran, null hors d'un tour. */
export function carteCourante(e: EtatBoucle): string | null {
  return phase(e) === "carte" ? (e.file[e.pos] ?? null) : null;
}

/**
 * Marque la carte à l'écran et passe à la suivante sans marque (une carte
 * sautée avec → revient en fin de tour). Sans effet hors d'un tour.
 */
export function marquer(e: EtatBoucle, su: boolean, maintenant: number = Date.now()): EtatBoucle {
  if (phase(e) !== "carte") return e;
  const id = e.file[e.pos];
  if (id === undefined) return e;
  const marques = { ...e.marques, [id]: su };
  const premier = e.tour === 1 ? { ...e.premier, [id]: su } : e.premier;
  const pos = prochaine(e.file, marques, e.pos);
  const pause = Math.max(0, Math.min(PAUSE_MAX, maintenant - e.dernier));
  const fini = pos >= e.file.length && !e.file.some((x) => marques[x] === false);
  return { ...e, marques, premier, pos, derniere: id, vues: e.vues + 1, dernier: maintenant, actif: e.actif + pause, fin: fini ? maintenant : null };
}

/** ← / → : se déplacer dans le tour (les marques restent). */
export function aller(e: EtatBoucle, delta: number): EtatBoucle {
  if (phase(e) !== "carte" || e.file.length === 0) return e;
  const pos = Math.min(e.file.length - 1, Math.max(0, e.pos + delta));
  return pos === e.pos ? e : { ...e, pos };
}

/** Les cartes marquées « À revoir » dans le tour en cours, dans l'ordre de la file. */
export function aRevoir(e: EtatBoucle): string[] {
  return e.file.filter((id) => e.marques[id] === false);
}

/**
 * Le tour suivant : seulement les « À revoir », mélangées — en évitant de
 * recommencer par la carte qu'on vient de voir. Sans effet hors entracte.
 */
export function tourSuivant(e: EtatBoucle, opts: { rng?: Rng; maintenant?: number } = {}): EtatBoucle {
  if (phase(e) !== "entracte") return e;
  const rng = opts.rng ?? Math.random;
  const file = melanger(aRevoir(e), rng);
  if (file.length > 1 && file[0] === e.derniere) {
    const j = 1 + Math.floor(rng() * (file.length - 1));
    [file[0], file[j]] = [file[j], file[0]];
  }
  return { ...e, tour: e.tour + 1, file, pos: 0, marques: {}, parcours: [...e.parcours, file.length], dernier: opts.maintenant ?? Date.now() };
}

/** Reprise après une absence : le temps passé ailleurs ne compte pas. */
export function reprendre(e: EtatBoucle, maintenant: number = Date.now()): EtatBoucle {
  return { ...e, dernier: maintenant };
}

/**
 * Le compte du tour en cours, pour la barre segmentée. `rang` est
 * l'avancement (cartes marquées + 1), pas la position dans la file : une
 * carte sautée avec → qui revient en fin de tour ne fait pas reculer le
 * compteur, et il dit la même chose que la reprise (repere). La position
 * (e.pos) ne sert qu'à activer ← et →.
 */
export function progression(e: EtatBoucle): { total: number; maitrisees: number; aRevoir: number; restantes: number; rang: number } {
  let m = 0;
  let r = 0;
  for (const id of e.file) {
    if (e.marques[id] === true) m++;
    else if (e.marques[id] === false) r++;
  }
  const total = e.file.length;
  return { total, maitrisees: m, aRevoir: r, restantes: total - m - r, rang: Math.min(m + r + 1, total) };
}

/** Le bilan d'une boucle bouclée (ou en cours). */
export function bilan(e: EtatBoucle): { tours: number; cartes: number; premierSues: number; dureeMs: number; vues: number; parcours: number[] } {
  const cartes = e.parcours[0] ?? e.file.length;
  const premierSues = Object.values(e.premier).filter((x) => x === true).length;
  return { tours: e.tour, cartes, premierSues, dureeMs: e.actif, vues: e.vues, parcours: e.parcours };
}

/** Une boucle qui vaut la peine d'être reprise : entamée et pas finie. */
export function enCours(e: EtatBoucle): boolean {
  return phase(e) !== "fin" && (e.tour > 1 || Object.keys(e.marques).length > 0);
}

/** Où en est la boucle : « tour 2 · carte 4/7 », ou l'entracte. */
export function repere(e: EtatBoucle): { tour: number; rang: number; total: number; entracte: boolean; aRevoir: number } {
  const p = phase(e);
  const total = e.file.length;
  const rang = p === "carte" ? Object.keys(e.marques).filter((id) => e.file.includes(id)).length + 1 : total;
  return { tour: e.tour, rang: Math.min(rang, total), total, entracte: p === "entracte", aRevoir: aRevoir(e).length };
}

// ---------------------------------------------------------------------------
// Validation et réparation (état relu du stockage, cartes changées entre-temps)

const estNombre = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const estMarques = (x: unknown): x is Record<string, boolean> =>
  !!x && typeof x === "object" && !Array.isArray(x) && Object.values(x as Record<string, unknown>).every((v) => typeof v === "boolean");

/** Un état relu tel quel, ou null s'il n'a pas la bonne forme. */
export function valider(x: unknown): EtatBoucle | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  if (o.v !== 1) return null;
  if (!estNombre(o.tour) || o.tour < 1 || !estNombre(o.pos) || !estNombre(o.vues) || !estNombre(o.debut) || !estNombre(o.dernier) || !estNombre(o.actif)) return null;
  if (!Array.isArray(o.file) || !o.file.every((id) => typeof id === "string")) return null;
  if (!estMarques(o.marques) || !estMarques(o.premier)) return null;
  if (!Array.isArray(o.parcours) || !o.parcours.every(estNombre)) return null;
  if (!(o.derniere === null || typeof o.derniere === "string")) return null;
  if (!(o.fin === null || estNombre(o.fin))) return null;
  return o as unknown as EtatBoucle;
}

/**
 * Remet un état relu d'accord avec les cartes actuelles du paquet : les
 * cartes disparues sortent de la file et des marques. null si plus rien
 * à réviser.
 */
export function reparer(e: EtatBoucle, ids: readonly string[]): EtatBoucle | null {
  const connues = new Set(ids);
  const file = [...new Set(e.file.filter((id) => connues.has(id)))];
  if (file.length === 0) return null;
  const garder = (m: Record<string, boolean>) => Object.fromEntries(Object.entries(m).filter(([id]) => connues.has(id)));
  const marques = Object.fromEntries(Object.entries(e.marques).filter(([id]) => file.includes(id)));
  // Les tailles des tours suivent : le tour en cours est la file réparée ; le
  // tour 1 perd les cartes disparues (toutes y avaient une marque) ; les
  // tours d'entre-deux restent décroissants, bornés par la file actuelle.
  const parcours = (() => {
    if (e.tour === 1) return [file.length];
    const perdues = Object.keys(e.premier).filter((id) => !connues.has(id)).length;
    const p = [Math.max(file.length, (e.parcours[0] ?? file.length) - perdues), ...e.parcours.slice(1, -1), file.length];
    for (let i = 1; i < p.length; i++) p[i] = Math.max(file.length, Math.min(p[i], p[i - 1]));
    return p;
  })();
  const out: EtatBoucle = { ...e, file, marques, premier: garder(e.premier), parcours, derniere: e.derniere && connues.has(e.derniere) ? e.derniere : null };
  let pos = Math.max(0, Math.min(Math.floor(e.pos), file.length));
  // la carte à l'écran est toujours là : on la garde, marquée ou non (revue avec ←)
  const avant = e.file[e.pos];
  const garde = avant !== undefined && file.includes(avant);
  if (garde) pos = file.indexOf(avant);
  if (phase(out) === "carte") {
    // disparue : la suivante sans marque, jamais une carte déjà marquée
    if (pos >= file.length || (!garde && a(marques, file[pos]))) pos = prochaine(file, marques, Math.min(pos, file.length) - 1);
  } else pos = file.length;
  return { ...out, pos };
}

// ---------------------------------------------------------------------------
// Stockage (localStorage, try/catch partout : rendu correct sans)

export type Stockage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function stockage(s?: Stockage | null): Stockage | null {
  if (s !== undefined) return s;
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/** Clé d'une boucle : un paquet (son id) ou une matière (« matiere:fixed_income »). */
export const cleBoucle = (cle: string) => `rl_fc_boucle:${cle}`;
/** Préférence « Mélanger » du tour 1, commune à tous les paquets. */
export const CLE_MELANGE = "rl_fc_melanger";

export function lireBoucle(cle: string, ids: readonly string[], s?: Stockage | null): EtatBoucle | null {
  const st = stockage(s);
  if (!st) return null;
  try {
    const raw = st.getItem(cleBoucle(cle));
    if (!raw) return null;
    const e = valider(JSON.parse(raw));
    return e ? reparer(e, ids) : null;
  } catch {
    return null;
  }
}

export function ecrireBoucle(cle: string, e: EtatBoucle, s?: Stockage | null): void {
  const st = stockage(s);
  if (!st) return;
  try {
    st.setItem(cleBoucle(cle), JSON.stringify(e));
  } catch {
    // stockage plein ou bloqué : la boucle continue sans être gardée
  }
}

export function effacerBoucle(cle: string, s?: Stockage | null): void {
  const st = stockage(s);
  if (!st) return;
  try {
    st.removeItem(cleBoucle(cle));
  } catch {
    // rien à faire
  }
}

export function lireMelange(s?: Stockage | null): boolean {
  const st = stockage(s);
  if (!st) return false;
  try {
    return st.getItem(CLE_MELANGE) === "1";
  } catch {
    return false;
  }
}

export function ecrireMelange(v: boolean, s?: Stockage | null): void {
  const st = stockage(s);
  if (!st) return;
  try {
    if (v) st.setItem(CLE_MELANGE, "1");
    else st.removeItem(CLE_MELANGE);
  } catch {
    // préférence perdue, sans conséquence
  }
}

/**
 * Un état figé pour les aperçus : le tour, sa file, les marques posées, la
 * carte à l'écran. Les marques couvrent toute la file : entracte ou fin.
 */
export function etatFige(o: {
  ids: readonly string[];
  tour?: number;
  file?: readonly string[];
  marques?: Record<string, boolean>;
  premier?: Record<string, boolean>;
  pos?: number;
  parcours?: number[];
  dureeMs?: number;
  maintenant?: number;
}): EtatBoucle {
  const now = o.maintenant ?? 0;
  const file = [...(o.file ?? o.ids)];
  const marques = Object.fromEntries(Object.entries(o.marques ?? {}).filter(([id]) => file.includes(id)));
  const tour = o.tour ?? 1;
  const base: EtatBoucle = {
    v: 1,
    tour,
    file,
    pos: 0,
    marques,
    premier: o.premier ?? (tour === 1 ? marques : {}),
    parcours: o.parcours ?? (tour === 1 ? [file.length] : [o.ids.length, file.length]),
    derniere: null,
    vues: Object.keys(marques).length,
    debut: now - (o.dureeMs ?? 0),
    dernier: now,
    actif: o.dureeMs ?? 0,
    fin: null,
  };
  const p = phase(base);
  const pos = p === "carte" ? Math.max(0, Math.min(o.pos ?? prochaine(file, marques, file.length - 1), file.length - 1)) : file.length;
  return { ...base, pos, fin: p === "fin" ? now : null };
}
