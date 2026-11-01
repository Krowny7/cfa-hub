import { passagesInline } from "@/lib/richtext";
import { CARTE_JOUR, SOURCES_CARTE, type SourceCarteVoix } from "@/lib/voice-accueil-lobby-carte";

// Le calcul pur de « La carte du jour » (accueil « Le lobby ») : les réglages
// du joueur, le tirage de la carte, le prompt pour l'IA. Aucune lecture de
// base, aucun React, aucun Intl : le serveur et l'îlot client (qui importe ce
// fichier pour la liste des matières) rendent la même chose. Module léger :
// il n'importe ni le catalogue des cours ni celui des notions (lecture-carte.ts
// s'en charge, côté serveur).

/** D'où viennent les cartes : tout le paquet officiel, les cartes marquées, les points faibles. */
export type SourceCarte = SourceCarteVoix;

/** Ce que le joueur a choisi : les matières (clés de lib/practiceTopics, dans l'ordre du programme) et la source. */
export type ReglagesCarte = { mats: string[]; src: SourceCarte };

/** La carte telle que la page la lit (tranche `carteDuJour` du contrat de la page). */
export type CarteDuJourLobby = {
  /** l'identifiant de la carte : sert de clé à l'îlot, qui repart recto à chaque nouvelle carte */
  id: string;
  matiere: { cle: string; court: string; code: string };
  recto: string;
  verso: string;
  /** la ligne sous le titre : « FSA · tes cartes marquées » */
  resume: string;
  /** le prompt « Copier pour l'IA », construit au serveur */
  prompt: string;
  reglages: ReglagesCarte;
  /** non nul quand la source choisie n'a rien donné : la carte vient alors du paquet entier */
  repli: string | null;
};

/** La clé du compte (user_metadata), fixée par le plan de l'accueil : { m: matières, s: source }. */
export const CLE_CARTE_JOUR = "rl_carte_jour";

export const SOURCES: readonly SourceCarte[] = ["toutes", "marquees", "faibles"];

/** Les dix matières, dans l'ordre du programme, avec leur puce et le code de leurs coins (clés de components/reviser/catalog). */
export const MATIERES_CARTE: readonly { cle: string; libelle: string; code: string }[] = [
  { cle: "ethics", libelle: "Éthique", code: "ETH" },
  { cle: "quant", libelle: "Quant", code: "QM" },
  { cle: "economics", libelle: "Économie", code: "ECO" },
  { cle: "corporate", libelle: "Corporate", code: "CI" },
  { cle: "fsa", libelle: "FSA", code: "FSA" },
  { cle: "equity", libelle: "Equity", code: "EQ" },
  { cle: "fixed_income", libelle: "Fixed Income", code: "FI" },
  { cle: "derivatives", libelle: "Dérivés", code: "DER" },
  { cle: "alternatives", libelle: "Alternatifs", code: "ALT" },
  { cle: "portfolio", libelle: "Portefeuille", code: "PM" },
];

const CLES_MATIERES = new Set(MATIERES_CARTE.map((m) => m.cle));

/** Les dix clés, dans l'ordre du programme : le réglage par défaut. */
export const TOUTES_LES_MATIERES: readonly string[] = MATIERES_CARTE.map((m) => m.cle);

export const REGLAGES_DEFAUT: ReglagesCarte = { mats: [...TOUTES_LES_MATIERES], src: "toutes" };

export function matiereDe(cle: string | null | undefined) {
  return MATIERES_CARTE.find((m) => m.cle === cle) ?? null;
}

/**
 * L'étiquette sous laquelle la carte du jour d'un joueur est gardée côté serveur
 * (lecture-carte.ts) : l'enregistrement de ses réglages la révoque
 * (actions-carte.ts : revalidateTag).
 */
export const tagCarteDuJour = (userId: string): string => `rl-carte-jour:${userId}`;

/** Les clés connues, sans doublon, dans l'ordre du programme. */
export function ordreProgramme(cles: readonly string[]): string[] {
  const voulues = new Set(cles);
  return TOUTES_LES_MATIERES.filter((c) => voulues.has(c));
}

const estObjet = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

/**
 * Ce que le compte garde (user_metadata.rl_carte_jour = { m, s }), relu avec
 * indulgence : une clé de matière inconnue est ignorée, des matières
 * illisibles ou vides redonnent les dix, une source inconnue redonne « toutes ».
 * Rien d'illisible ne casse la carte.
 */
export function reglagesDuCompte(brut: unknown): ReglagesCarte {
  if (!estObjet(brut)) return { mats: [...REGLAGES_DEFAUT.mats], src: REGLAGES_DEFAUT.src };
  const m = Array.isArray(brut.m) ? ordreProgramme(brut.m.filter((x): x is string => typeof x === "string")) : [];
  const s = SOURCES.find((x) => x === brut.s);
  return { mats: m.length ? m : [...REGLAGES_DEFAUT.mats], src: s ?? REGLAGES_DEFAUT.src };
}

type Compte = { user_metadata?: Record<string, unknown> | null } | null | undefined;

/** Les réglages d'un compte (illisibles ou absents : les dix matières, « toutes »). */
export function lireReglages(user: Compte): ReglagesCarte {
  return reglagesDuCompte(user?.user_metadata?.[CLE_CARTE_JOUR]);
}

/** Ce qu'on écrit dans le compte : la forme compacte { m, s }. */
export function versLeCompte(r: ReglagesCarte): { m: string[]; s: SourceCarte } {
  return { m: [...r.mats], s: r.src };
}

/**
 * Valide, avec rigueur, ce que l'îlot envoie à l'action ({ mats, src }) :
 * un objet, des clés de matière TOUTES connues, une matière au moins, une
 * source connue. Sinon null : l'action refuse, rien n'est écrit. Les doublons
 * sont écartés et l'ordre est celui du programme.
 */
export function validerReglages(brut: unknown): ReglagesCarte | null {
  if (!estObjet(brut) || !Array.isArray(brut.mats)) return null;
  if (!brut.mats.every((x): x is string => typeof x === "string" && CLES_MATIERES.has(x))) return null;
  const mats = ordreProgramme(brut.mats);
  const src = SOURCES.find((x) => x === brut.src);
  if (!mats.length || !src) return null;
  return { mats, src };
}

/** La ligne sous le titre : « FSA · Fixed Income · tes cartes marquées », « 10 matières · toutes les flashcards ». */
export function resumeReglages(r: ReglagesCarte): string {
  return CARTE_JOUR.resume(
    r.mats.map((c) => matiereDe(c)?.libelle ?? c),
    r.src,
  );
}

/** « 3 matières cochées · tes cartes marquées » : la note du pied du panneau. */
export function noteReglages(mats: readonly string[], src: SourceCarte): string {
  return CARTE_JOUR.reglages.note(mats.length, SOURCES_CARTE[src].court);
}

// ── le prompt ───────────────────────────────────────────────────────────────

const BLOC = /^\$\$[\s\S]+\$\$$/;

/**
 * Un texte de carte pour l'IA : le balisage d'affichage (==surligné==,
 * **gras**) disparaît, les formules restent en LaTeX, les retours à la ligne
 * deviennent des espaces (le prompt tient en une ligne).
 */
export function texteBrut(texte: string): string {
  return (texte ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((ligne) => {
      const l = ligne.trim();
      if (!l || BLOC.test(l)) return l;
      return passagesInline(l)
        .map((p) => p.morceaux.map((m) => (m.t === "math" ? `$${m.v}$` : m.v)).join(""))
        .join("");
    })
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Le prompt « Copier pour l'IA » d'une carte. */
export function promptIA(recto: string, verso: string): string {
  return CARTE_JOUR.prompt(texteBrut(recto), texteBrut(verso));
}

// ── le tirage ───────────────────────────────────────────────────────────────

/** FNV-1a 32 bits : un entier non signé, le même partout. */
export function fnv1a(texte: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texte.length; i++) {
    h ^= texte.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * La graine du jour : la même toute la journée (heure de Paris, `jour` en
 * AAAA-MM-JJ), qui change à minuit, avec le joueur, la source et les matières.
 */
export function graineDuJour(userId: string, jour: string, r: ReglagesCarte): string {
  return `${userId}|${jour}|${r.src}|${r.mats.join(",")}`;
}

/**
 * Les identifiants rangés par tirage décroissant (le « rendez-vous » : chacun
 * reçoit une note tirée de la graine et de son identifiant). Stable quand le
 * lot change : une carte ajoutée ne prend la tête que si sa note est la plus
 * haute, les autres gardent leur ordre. Égalité : l'identifiant le plus petit.
 */
export function classerParTirage(graine: string, ids: readonly string[]): string[] {
  return [...new Set(ids)]
    .map((id) => ({ id, note: fnv1a(`${graine}|${id}`) }))
    .sort((a, b) => b.note - a.note || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((x) => x.id);
}

/** L'identifiant tiré du jour (null : lot vide). */
export function gagnant(graine: string, ids: readonly string[]): string | null {
  return classerParTirage(graine, ids)[0] ?? null;
}

/** Un paquet de cartes et sa taille (null : taille inconnue). */
export type PaquetTirage = { id: string; nb: number | null };

/**
 * Le paquet tiré et le rang de la carte dedans (0 pour la première). Les
 * paquets sont comptés carte par carte : une carte du programme a la même
 * chance qu'une autre, quelle que soit la taille de son paquet. Une taille
 * inconnue (ou nulle) pour l'un d'eux : chaque paquet pèse 1 et le rang est
 * laissé à null (c'est la lecture du paquet qui le tire).
 */
export function choisirPaquet(graine: string, paquets: readonly PaquetTirage[]): { id: string; rang: number | null } | null {
  const liste = [...paquets].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  if (!liste.length) return null;
  if (liste.every((p) => typeof p.nb === "number" && p.nb > 0)) {
    const total = liste.reduce((s, p) => s + (p.nb as number), 0);
    let i = fnv1a(graine) % total;
    for (const p of liste) {
      const nb = p.nb as number;
      if (i < nb) return { id: p.id, rang: i };
      i -= nb;
    }
  }
  const id = gagnant(graine, liste.map((p) => p.id));
  return id ? { id, rang: null } : null;
}

/** L'indice d'une carte dans un paquet de `n` cartes, quand le rang n'a pas été tiré avec le paquet. */
export function indexDansPaquet(graine: string, n: number): number {
  return n > 0 ? fnv1a(`${graine}|carte`) % n : 0;
}

/**
 * La part d'un paquet qui revient à une notion : le paquet couvre plusieurs
 * notions, dans l'ordre du programme (même partage que les cartes Rappel de
 * l'Atelier, app/atelier/donnees.ts). La dernière notion garde le reste.
 * Renvoie l'intervalle [debut, fin) des positions dans le paquet.
 */
export function partDuPaquet(rang: number, voisines: number, nbCartes: number): { debut: number; fin: number } {
  if (nbCartes <= 0) return { debut: 0, fin: 0 };
  if (voisines <= 1) return { debut: 0, fin: nbCartes };
  const r = Math.max(0, Math.min(rang, voisines - 1));
  const part = Math.floor(nbCartes / voisines);
  if (part < 1) return { debut: 0, fin: nbCartes };
  return { debut: r * part, fin: r === voisines - 1 ? nbCartes : (r + 1) * part };
}
