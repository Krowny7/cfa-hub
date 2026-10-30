// La partie de cartes (/flashcards/partie), sans React (testée par
// scripts/flashcards/test-partie.ts).
//
// Léonard de Vinci est le croupier : il distribue des mains de cartes face
// cachée ; on soulève une carte (recto, puis verso), on dit « Maîtrisée » ou
// « Pas encore » ; chaque maîtrisée fait passer un jeton de son rack à la
// plaque du joueur ; un bilan clôt la partie. Ce module n'a ni état ni
// navigateur : les réglages (matières, paquets, mains, cartes par main,
// seulement les non maîtrisées, mélange), le tirage des cartes à partir des
// paquets et de la maîtrise du joueur, le découpage en mains, les jetons, la
// série, le bilan, et la pose de Léonard selon ce qui vient de se passer.
//
// La maîtrise d'une carte est celle du reste du site : la boucle « À revoir »
// de son paquet (lib/flashcards/boucle.ts, clé « set:<id> », gardée sur
// l'appareil et sur le compte) ; une carte est « maîtrisée » quand cette
// boucle (ou celle de sa matière) la tient pour sue (cartesMaitrisees).
// « Maîtrisée » / « Pas encore » l'écrivent par boucle.marquerId, jamais dans
// un second système.

import { appareilPrime, melanger, type EtatBoucle, type Stockage } from "@/lib/flashcards/boucle";
import { lieuCarte } from "@/lib/flashcards/paquets";
import { cleMatiere, cleSet } from "@/lib/flashcards/progression";

type Rng = () => number;

// ---------------------------------------------------------------------------
// Bornes

export const MAINS_POSSIBLES = [3, 5, 10] as const;
export type NbMains = (typeof MAINS_POSSIBLES)[number];
/** Cartes par main : 1 à 5, 3 par défaut. */
export const PAR_MAIN = { min: 1, max: 5, defaut: 3 } as const;
/** Une série : au moins 3 maîtrisées d'affilée. */
export const SERIE_MIN = 3;
/** Le plus qu'une partie distribue : 10 mains de 5 cartes. */
export const CARTES_MAX = MAINS_POSSIBLES[2] * PAR_MAIN.max;

const borner = (n: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(n)));

// ---------------------------------------------------------------------------
// Ce que le serveur donne aux réglages

/** Un paquet officiel : ses cartes (ids) dans l'ordre du paquet. */
export type PaquetPartie = { id: string; matiere: string; numero: number | null; theme: string; cartes: readonly string[] };
/** Une matière du programme avec ses paquets (vide : « bientôt »). */
export type MatierePartie = { cle: string; nom: string; abrege: string; paquets: PaquetPartie[] };

const aDesCartes = (m: MatierePartie) => m.paquets.some((p) => p.cartes.length > 0);
const paquetsAvecCartes = (m: MatierePartie) => m.paquets.filter((p) => p.cartes.length > 0);

// ---------------------------------------------------------------------------
// Les réglages

export type ReglagesPartie = {
  /** matières cochées (clés du programme) */
  matieres: string[];
  /** paquets cochés (ids), toujours parmi ceux des matières cochées */
  paquets: string[];
  mains: NbMains;
  parMain: number;
  /** seulement les cartes que la boucle du joueur ne tient pas pour maîtrisées */
  seulementNonMaitrisees: boolean;
  melanger: boolean;
};

export type PrefsPartie = Pick<ReglagesPartie, "mains" | "parMain" | "seulementNonMaitrisees" | "melanger">;

export const PREFS_DEFAUT: PrefsPartie = { mains: 3, parMain: PAR_MAIN.defaut, seulementNonMaitrisees: false, melanger: true };

/**
 * Les réglages à l'ouverture : les matières demandées (celles qui ont des
 * cartes), sinon toutes celles qui en ont ; tous leurs paquets cochés ; le
 * reste, les préférences gardées (ou celles par défaut : 3 mains de 3 cartes,
 * mélangées).
 */
export function reglagesInitiaux(matieres: readonly MatierePartie[], cochees: readonly string[] = [], prefs: Partial<PrefsPartie> = {}): ReglagesPartie {
  const dispo = matieres.filter(aDesCartes);
  const voulues = dispo.filter((m) => cochees.includes(m.cle));
  const choisies = voulues.length ? voulues : dispo;
  const p = { ...PREFS_DEFAUT, ...prefs };
  return {
    matieres: choisies.map((m) => m.cle),
    paquets: choisies.flatMap((m) => paquetsAvecCartes(m).map((q) => q.id)),
    mains: (MAINS_POSSIBLES as readonly number[]).includes(p.mains) ? p.mains : PREFS_DEFAUT.mains,
    parMain: borner(p.parMain, PAR_MAIN.min, PAR_MAIN.max),
    seulementNonMaitrisees: !!p.seulementNonMaitrisees,
    melanger: !!p.melanger,
  };
}

/** Cocher une matière coche tous ses paquets ; la décocher les retire de la liste. Une matière sans carte ne se coche pas. */
export function basculerMatiere(r: ReglagesPartie, matieres: readonly MatierePartie[], cle: string): ReglagesPartie {
  const m = matieres.find((x) => x.cle === cle);
  if (!m || !aDesCartes(m)) return r;
  const ids = paquetsAvecCartes(m).map((q) => q.id);
  if (r.matieres.includes(cle)) return { ...r, matieres: r.matieres.filter((x) => x !== cle), paquets: r.paquets.filter((id) => !ids.includes(id)) };
  return { ...r, matieres: [...r.matieres, cle], paquets: [...r.paquets.filter((id) => !ids.includes(id)), ...ids] };
}

/** Cocher ou décocher un paquet d'une matière cochée. */
export function basculerPaquet(r: ReglagesPartie, matieres: readonly MatierePartie[], id: string): ReglagesPartie {
  if (!paquetsVisibles(r, matieres).some((p) => p.id === id)) return r;
  return { ...r, paquets: r.paquets.includes(id) ? r.paquets.filter((x) => x !== id) : [...r.paquets, id] };
}

export const choisirMains = (r: ReglagesPartie, n: number): ReglagesPartie => ((MAINS_POSSIBLES as readonly number[]).includes(n) ? { ...r, mains: n as NbMains } : r);
export const changerParMain = (r: ReglagesPartie, delta: number): ReglagesPartie => ({ ...r, parMain: borner(r.parMain + delta, PAR_MAIN.min, PAR_MAIN.max) });

/** Les paquets de la liste : ceux des matières cochées, dans l'ordre du programme. */
export function paquetsVisibles(r: ReglagesPartie, matieres: readonly MatierePartie[]): PaquetPartie[] {
  return matieres.filter((m) => r.matieres.includes(m.cle)).flatMap(paquetsAvecCartes);
}

/** Les paquets cochés (donc tirés), dans l'ordre du programme. */
export function paquetsChoisis(r: ReglagesPartie, matieres: readonly MatierePartie[]): PaquetPartie[] {
  return paquetsVisibles(r, matieres).filter((p) => r.paquets.includes(p.id));
}

// ---------------------------------------------------------------------------
// Le tirage

/** Une carte tirée, sans son texte (le texte vient après, des seuls ids tirés). */
export type RefCarte = { id: string; setId: string; matiere: string };

/** Les cartes qui peuvent être tirées : celles des paquets, sauf les maîtrisées si on ne veut que les autres. */
export function vivier(paquets: readonly PaquetPartie[], maitrisees: ReadonlySet<string>, seulementNonMaitrisees: boolean): RefCarte[] {
  const out: RefCarte[] = [];
  const vues = new Set<string>();
  for (const p of paquets) {
    for (const id of p.cartes) {
      if (vues.has(id) || (seulementNonMaitrisees && maitrisees.has(id))) continue;
      vues.add(id);
      out.push({ id, setId: p.id, matiere: p.matiere });
    }
  }
  return out;
}

/** Ce qui sera distribué, pour la ligne de résumé (« 3 mains de 3 cartes : 9 cartes tirées parmi 180 »). */
export type ResumeTirage = { paquets: number; vivier: number; total: number; mains: number; parMain: number };

export function resumer(r: ReglagesPartie, matieres: readonly MatierePartie[], maitrisees: ReadonlySet<string>): ResumeTirage {
  const choisis = paquetsChoisis(r, matieres);
  const v = vivier(choisis, maitrisees, r.seulementNonMaitrisees).length;
  const total = Math.min(v, r.mains * r.parMain, CARTES_MAX);
  // moins de cartes que voulu : moins de mains (jamais une main vide)
  const mains = total === 0 ? 0 : Math.min(r.mains, Math.ceil(total / r.parMain));
  return { paquets: choisis.length, vivier: v, total, mains, parMain: r.parMain };
}

/** Découpe en mains de `parMain` cartes (la dernière peut être plus courte). */
export function decouper<T>(xs: readonly T[], parMain: number): T[][] {
  const n = Math.max(1, Math.floor(parMain));
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
}

/**
 * Tire les cartes de la partie et les découpe en mains. Mélangé : au hasard
 * dans tout le vivier ; sinon, les premières dans l'ordre des paquets.
 */
export function tirer(r: ReglagesPartie, matieres: readonly MatierePartie[], maitrisees: ReadonlySet<string>, rng: Rng = Math.random): RefCarte[][] {
  const choisis = paquetsChoisis(r, matieres);
  const v = vivier(choisis, maitrisees, r.seulementNonMaitrisees);
  const { total } = resumer(r, matieres, maitrisees);
  const prises = r.melanger ? melanger(v, rng).slice(0, total) : v.slice(0, total);
  return decouper(prises, r.parMain);
}

// ---------------------------------------------------------------------------
// La partie : les cartes tirées, avec leur texte

export type ContenuCarte = { front: string; back: string };

/** Une carte de la partie, prête à jouer. */
export type CarteJeu = RefCarte & {
  matiereNom: string;
  /** « FI », « FSA » : le bilan */
  abrege: string;
  theme: string;
  /** l'en-tête de la carte : « Fixed Income · Duration & convexity » */
  lieu: string;
  /** rang dans la partie, de 1 à N : « Carte 3 / 9 » */
  rang: number;
  front: string;
  back: string;
  /** un titre court tiré de la question (le bilan : « À revoir ») */
  titre: string;
};

export type Partie = { mains: CarteJeu[][]; parMain: number; /** un jeton par carte de la partie */ jetons: number };

/** Un titre court d'une question : sans balisage, sur une ligne, coupé à un mot. */
export function titreCarte(front: string, max = 64): string {
  const t = (front ?? "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\$\$?([^$]*)\$\$?/g, "$1")
    .replace(/\*\*|==|`/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length <= max) return t;
  const coupe = t.slice(0, max);
  const espace = coupe.lastIndexOf(" ");
  return (espace > max * 0.6 ? coupe.slice(0, espace) : coupe).replace(/[\s,;:.\-–—]+$/, "") + "…";
}

/**
 * Les mains tirées + le texte des cartes reçu du serveur → la partie. Une
 * carte dont le texte manque (retirée depuis) est écartée, une main vide
 * disparaît ; null s'il ne reste rien à jouer.
 */
export function assembler(mains: readonly (readonly RefCarte[])[], contenus: Readonly<Record<string, ContenuCarte>>, matieres: readonly MatierePartie[], parMain: number): Partie | null {
  const paquets = new Map(matieres.flatMap((m) => m.paquets.map((p) => [p.id, { m, p }] as const)));
  let rang = 0;
  const out: CarteJeu[][] = [];
  for (const main of mains) {
    const cartes: CarteJeu[] = [];
    for (const c of main) {
      const t = contenus[c.id];
      const lieu = paquets.get(c.setId);
      if (!t || !lieu) continue;
      cartes.push({
        ...c,
        matiereNom: lieu.m.nom,
        abrege: lieu.m.abrege,
        theme: lieu.p.theme,
        lieu: lieuCarte(lieu.m.nom, lieu.p.theme),
        rang: ++rang,
        front: t.front,
        back: t.back,
        titre: titreCarte(t.front),
      });
    }
    if (cartes.length) out.push(cartes);
  }
  return rang === 0 ? null : { mains: out, parMain: Math.max(1, parMain), jetons: rang };
}

/** La partie des cartes pas encore maîtrisées de celle-ci (« Rejouer les non maîtrisées »), mélangées, redistribuées ; null s'il n'y en a pas. */
export function rejouer(partie: Partie, verdicts: Verdicts, opts: { parMain?: number; melanger?: boolean; rng?: Rng } = {}): Partie | null {
  const rejouees = partie.mains.flat().filter((c) => verdicts[c.id] === false);
  if (rejouees.length === 0) return null;
  const parMain = Math.max(1, opts.parMain ?? partie.parMain);
  const ordre = (opts.melanger ?? true) ? melanger(rejouees, opts.rng) : rejouees;
  let rang = 0;
  return { mains: decouper(ordre, parMain).map((m) => m.map((c) => ({ ...c, rang: ++rang }))), parMain, jetons: ordre.length };
}

// ---------------------------------------------------------------------------
// Jouer : verdicts, jetons, série

/** « Maîtrisée » (true) ou « Pas encore » (false), par carte posée. */
export type Verdicts = Readonly<Record<string, boolean>>;

/** Les maîtrisées d'affilée en fin d'historique (true = maîtrisée), dans l'ordre où les cartes ont été jugées. */
export function serieEnCours(historique: readonly boolean[]): number {
  let n = 0;
  for (let i = historique.length - 1; i >= 0 && historique[i]; i--) n++;
  return n;
}

/** Les « Pas encore » d'affilée en fin d'historique. */
export function serieDePas(historique: readonly boolean[]): number {
  let n = 0;
  for (let i = historique.length - 1; i >= 0 && !historique[i]; i--) n++;
  return n;
}

/** La plus longue suite de maîtrisées de la partie. */
export function meilleureSerie(historique: readonly boolean[]): number {
  let best = 0;
  let run = 0;
  for (const ok of historique) {
    run = ok ? run + 1 : 0;
    if (run > best) best = run;
  }
  return best;
}

/** Les jetons gagnés : une carte maîtrisée, un jeton. */
export const jetonsGagnes = (verdicts: Verdicts): number => Object.values(verdicts).filter((v) => v === true).length;

// ---------------------------------------------------------------------------
// Léonard réagit

export type Pose = "fier" | "moqueur" | "etonne" | "decu";

/** Le fichier de chaque pose (public/leonard). */
export const IMAGE_POSE: Record<Pose, string> = {
  fier: "/leonard/pose-fier.webp",
  moqueur: "/leonard/pose-moqueur.webp",
  etonne: "/leonard/pose-etonne.webp",
  decu: "/leonard/pose-decu.webp",
};

/** Où en est la table : de quoi choisir la pose et la phrase de Léonard (lib/voice-partie.ts). */
export type SituationTable = {
  /** la main en cours, à partir de 0, et le nombre de mains de la partie */
  main: number;
  nbMains: number;
  /** cartes de cette main, jugées, maîtrisées */
  tailleMain: number;
  jugeesMain: number;
  maitriseesMain: number;
  /** la carte soulevée : sa question, ou sa réponse ; null : toutes face cachée */
  ouverte: "recto" | "verso" | null;
  /** le dernier verdict de cette main (null : encore aucun depuis la donne) */
  dernier: boolean | null;
  /** maîtrisées / « Pas encore » d'affilée (historique de la partie) */
  serie: number;
  serieKo: number;
};

export const toutJugee = (s: SituationTable) => s.tailleMain > 0 && s.jugeesMain >= s.tailleMain;
export const mainReussie = (s: SituationTable) => s.maitriseesMain * 3 >= s.tailleMain * 2;
export const derniereMain = (s: SituationTable) => s.main >= s.nbMains - 1;

/**
 * La pose de Léonard : étonné à la donne et devant la réponse retournée,
 * moqueur quand on cherche et au premier « Pas encore », fier après une
 * maîtrisée et quand la main est réussie (au moins 2 sur 3), déçu quand la
 * main est ratée ou après deux « Pas encore » d'affilée.
 */
export function poseLeonard(s: SituationTable): Pose {
  if (toutJugee(s)) return mainReussie(s) ? "fier" : "decu";
  if (s.ouverte === "verso") return "etonne";
  if (s.ouverte === "recto") return "moqueur";
  if (s.dernier === true) return "fier";
  if (s.dernier === false) return s.serieKo >= 2 ? "decu" : "moqueur";
  return "etonne";
}

// ---------------------------------------------------------------------------
// Le bilan

export type NiveauBilan = "sans-faute" | "bon" | "moyen" | "bas";

/** Une matière du bilan : ses cartes dans l'ordre où on les a jouées (ok null : pas jugée). */
export type LigneBilan = { cle: string; nom: string; abrege: string; total: number; maitrisees: number; cartes: { id: string; ok: boolean | null }[] };

export type Bilan = {
  total: number;
  jugees: number;
  maitrisees: number;
  /** la part maîtrisée de la partie, en % (arrondi) */
  pct: number;
  niveau: NiveauBilan;
  mains: number;
  /** par matière, dans l'ordre où elles sont apparues à la table */
  lignes: LigneBilan[];
  /** les « Pas encore », dans l'ordre de jeu */
  aRevoir: CarteJeu[];
  meilleureSerie: number;
};

export function niveauBilan(maitrisees: number, total: number): NiveauBilan {
  if (total <= 0) return "bas";
  if (maitrisees === total) return "sans-faute";
  if (maitrisees * 3 >= total * 2) return "bon";
  if (maitrisees * 3 >= total) return "moyen";
  return "bas";
}

/** La pose de Léonard au bilan : fier au bon score, moqueur au score moyen, déçu au score faible. */
export const poseBilan = (n: NiveauBilan): Pose => (n === "sans-faute" || n === "bon" ? "fier" : n === "moyen" ? "moqueur" : "decu");

export function bilanDe(partie: Partie, verdicts: Verdicts, historique: readonly boolean[] = []): Bilan {
  const cartes = partie.mains.flat();
  const lignes = new Map<string, LigneBilan>();
  for (const c of cartes) {
    const l = lignes.get(c.matiere) ?? { cle: c.matiere, nom: c.matiereNom, abrege: c.abrege, total: 0, maitrisees: 0, cartes: [] };
    const v = Object.prototype.hasOwnProperty.call(verdicts, c.id) ? verdicts[c.id] : null;
    l.total += 1;
    if (v === true) l.maitrisees += 1;
    l.cartes.push({ id: c.id, ok: v });
    lignes.set(c.matiere, l);
  }
  const maitrisees = cartes.filter((c) => verdicts[c.id] === true).length;
  const total = cartes.length;
  return {
    total,
    jugees: cartes.filter((c) => Object.prototype.hasOwnProperty.call(verdicts, c.id)).length,
    maitrisees,
    pct: total === 0 ? 0 : Math.round((maitrisees / total) * 100),
    niveau: niveauBilan(maitrisees, total),
    mains: partie.mains.length,
    lignes: [...lignes.values()],
    aRevoir: cartes.filter((c) => verdicts[c.id] === false),
    meilleureSerie: meilleureSerie(historique),
  };
}

// ---------------------------------------------------------------------------
// La maîtrise du joueur, lue dans ses boucles

/**
 * Les cartes que cette boucle tient pour maîtrisées : celles marquées « Je
 * maîtrise » dans le tour en cours, et celles qui n'y sont plus parce qu'un
 * tour d'avant les a maîtrisées (seules les « À revoir » passent au tour
 * suivant). Boucle neuve : aucune.
 */
export function cartesMaitrisees(e: EtatBoucle): string[] {
  const dansFile = new Set(e.file);
  const out = new Set<string>();
  for (const id of Object.keys(e.premier)) if (!dansFile.has(id)) out.add(id);
  for (const id of e.file) if (e.marques[id] === true) out.add(id);
  return [...out];
}

/** Ce que le serveur sait d'une boucle du compte : sa version (maj) et ses cartes maîtrisées. */
export type MaitriseCompte = { maj: number; ids: readonly string[] };

/**
 * Les maîtrisées d'une boucle : celles de l'appareil s'il l'emporte sur la
 * version du compte (même règle que la révision : appareilPrime), sinon
 * celles du compte.
 */
export function maitriseesDe(local: EtatBoucle | null, compte: MaitriseCompte | null): Set<string> {
  if (local && appareilPrime(local, compte ? compte.maj : null)) return new Set(cartesMaitrisees(local));
  return new Set(compte?.ids ?? []);
}

/**
 * Toutes les cartes que le joueur maîtrise parmi ces matières : la boucle de
 * chaque paquet et celle de la matière entière (révisée d'un bloc), chacune
 * lue sur l'appareil (`lireLocal`, déjà réparée sur ces cartes) et sur le
 * compte (`compte`, par clé « set:<id> » / « matiere:<clé> »).
 */
export function maitriseesDuJoueur(
  matieres: readonly MatierePartie[],
  lireLocal: (cle: string, ids: readonly string[]) => EtatBoucle | null,
  compte: Readonly<Record<string, MaitriseCompte>>
): Set<string> {
  const out = new Set<string>();
  const ajouter = (cle: string, ids: readonly string[]) => {
    for (const id of maitriseesDe(lireLocal(cle, ids), compte[cle] ?? null)) out.add(id);
  };
  for (const m of matieres) {
    const toutes = m.paquets.flatMap((p) => p.cartes);
    if (!toutes.length) continue;
    ajouter(cleMatiere(m.cle), toutes);
    for (const p of m.paquets) if (p.cartes.length) ajouter(cleSet(p.id), p.cartes);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Préférences gardées sur l'appareil (localStorage, try/catch : rendu correct sans)

export const CLE_PREFS_PARTIE = "rl_fc_partie";

function stockage(s?: Stockage | null): Stockage | null {
  if (s !== undefined) return s;
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/** Les préférences gardées (mains, cartes par main, non maîtrisées, mélange) ; ce qui est illisible est ignoré. */
export function lirePrefs(s?: Stockage | null): Partial<PrefsPartie> {
  const st = stockage(s);
  if (!st) return {};
  try {
    const raw = st.getItem(CLE_PREFS_PARTIE);
    const o = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
    if (!o || typeof o !== "object") return {};
    const out: Partial<PrefsPartie> = {};
    if (typeof o.mains === "number" && (MAINS_POSSIBLES as readonly number[]).includes(o.mains)) out.mains = o.mains as NbMains;
    if (typeof o.parMain === "number" && Number.isFinite(o.parMain)) out.parMain = borner(o.parMain, PAR_MAIN.min, PAR_MAIN.max);
    if (typeof o.seulementNonMaitrisees === "boolean") out.seulementNonMaitrisees = o.seulementNonMaitrisees;
    if (typeof o.melanger === "boolean") out.melanger = o.melanger;
    return out;
  } catch {
    return {};
  }
}

export function ecrirePrefs(r: ReglagesPartie, s?: Stockage | null): void {
  const st = stockage(s);
  if (!st) return;
  try {
    const p: PrefsPartie = { mains: r.mains, parMain: r.parMain, seulementNonMaitrisees: r.seulementNonMaitrisees, melanger: r.melanger };
    st.setItem(CLE_PREFS_PARTIE, JSON.stringify(p));
  } catch {
    // préférences perdues, sans conséquence
  }
}
