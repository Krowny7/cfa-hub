import { MAITRISE } from "@/lib/maitrise";
import { MIN_REPONSES } from "@/lib/points-faibles";
import { TOPICS } from "@/lib/practiceTopics";
import { COURTS_FR } from "@/lib/voice-moi";
import { BILAN, pointsDeNote } from "@/lib/voice-moi-bilan";
import { COUVERTURE_MIN, atouts, hrefQuete, ton, type Atout } from "@/components/moi/synthese/modele";
import type { MatiereSynthese, NoteSynthese, NotionSynthese, Zone } from "@/components/moi/synthese/types";

// Le calcul des trois cartes du bilan de la page Moi « La synthèse » : Tes
// lacunes, Tes forces, Où gagner des points. Pur, sans hook, sans Intl (les
// textes viennent de lib/voice-moi-bilan.ts). Les cartes ne reçoivent que des
// données du contrat (types.ts) : les notions (objets courts) et les matières.

/** Le seuil d'acquisition (70 %), le même que partout dans la synthèse. */
export const SEUIL: number = MAITRISE.REPERE;
/** Combien de notions chaque carte montre. */
export const NB_LACUNES = 5;
export const NB_FORCES = 3;
/** Combien d'atouts face aux joueurs s'affichent (le compte du pied dit le total). */
export const NB_ATOUTS = 6;
/** Les trois matières du premier palier de note de « Où gagner ». */
export const NB_PREMIERES = 3;
/** Où mène « Les N notions → » : la carte du programme (lot suivant). */
export const HREF_CARTE = "#carte";
/** Le lobby des duels (« Défier quelqu'un ») : il ne prend pas de matière. */
export const HREF_DEFI = "/duel";

type Mat = Pick<MatiereSynthese, "cle" | "court" | "poids" | "pct" | "statut" | "hrefEntrainer">;

const matiereDe = (id: string) => id.split(":")[0];
const courtDe = (cle: string, matieres: readonly Mat[] | null): string => matieres?.find((m) => m.cle === cle)?.court ?? COURTS_FR[cle] ?? cle;
const hrefEntrainerDe = (cle: string, matieres: readonly Mat[] | null): string => matieres?.find((m) => m.cle === cle)?.hrefEntrainer ?? `/practice?topic=${cle}&go=1`;
const entre0et100 = (x: number) => Math.max(0, Math.min(100, x));

/** La route de l'Atelier existant sur une notion (la page dit elle-même « bientôt » si l'Atelier manque). */
export const hrefAtelier = (id: string): string => `/atelier?notion=${encodeURIComponent(id)}`;

// ── Les notions mesurées, des plus faibles aux plus fortes ─────────────────

export type LigneBilan = {
  id: string;
  /** le libellé court de la notion */
  nom: string;
  /** la clé de la matière et son nom court, en français */
  cle: string;
  matiere: string;
  pct: number;
  /** réponses prises en compte (20 au plus) */
  n: number;
  ton: Zone;
  /** largeur de la barre, de 0 à 100 */
  w: number;
  /** l'écart au seuil, en points, toujours positif ; `sous` dit de quel côté */
  points: number;
  sous: boolean;
  /** « Réviser » : la fiche de la notion, sinon son cours */
  href: string;
  /** « S'entraîner » : l'Atelier de la notion */
  hrefAtelier: string;
};

type Classee = { lg: LigneBilan; rang: number };

function mesurees(notions: readonly NotionSynthese[], matieres: readonly Mat[] | null): Classee[] {
  const r: Classee[] = [];
  notions.forEach((nt, rang) => {
    if (nt.pct === null) return;
    const cle = matiereDe(nt.id);
    r.push({
      rang,
      lg: {
        id: nt.id,
        nom: nt.court,
        cle,
        matiere: courtDe(cle, matieres),
        pct: nt.pct,
        n: nt.n,
        ton: ton(nt.pct) ?? "r",
        w: entre0et100(nt.pct),
        points: Math.round(Math.abs(nt.pct - SEUIL)),
        sous: nt.pct < SEUIL,
        href: nt.href,
        hrefAtelier: hrefAtelier(nt.id),
      },
    });
  });
  return r;
}

// ── Tes lacunes ────────────────────────────────────────────────────────────

export type Lacunes = {
  /** les 5 notions mesurées les plus basses (à égalité, celle qui a le plus de réponses, puis l'ordre du catalogue) */
  lignes: LigneBilan[];
  /** les notions mesurées sous le seuil (toutes, pas seulement les 5) */
  sous70: number;
  mesurees: number;
  /** la plus basse : la cible du bouton d'encre */
  pire: LigneBilan | null;
};

export function lacunes(notions: readonly NotionSynthese[], matieres: readonly Mat[] | null): Lacunes {
  const m = mesurees(notions, matieres);
  const triees = [...m].sort((a, b) => a.lg.pct - b.lg.pct || b.lg.n - a.lg.n || a.rang - b.rang).map((x) => x.lg);
  return { lignes: triees.slice(0, NB_LACUNES), sous70: triees.filter((l) => l.sous).length, mesurees: triees.length, pire: triees[0] ?? null };
}

/** L'écart d'une ligne au seuil, en toutes lettres : « à 39 points du seuil » ou « 3 points au-dessus du seuil ». */
export function ecartLigne(l: Pick<LigneBilan, "sous" | "points">): string {
  return l.sous ? BILAN.lacunes.ecartSous(l.points) : BILAN.lacunes.ecartAu(l.points);
}

/** Où mène « Les N notions → » (le compte des notions sous le seuil, sinon la carte entière). */
export function texteToutesLesNotions(sous70: number): string {
  return sous70 > NB_LACUNES ? BILAN.lacunes.notions(sous70) : BILAN.lacunes.carte;
}

/**
 * « Ce que ça veut dire » des lacunes : les matières qui reviennent le plus parmi
 * les cinq pires notions (à égalité, celle de la notion la plus basse), la
 * matière de la pire, puis le rapprochement avec la première matière de « Où
 * gagner » quand elle y figure. null sans notion mesurée.
 * @param premiereGain la clé de la matière qui rapporte le plus de points (premiereAGagner)
 */
export function phraseLacunes(l: Lacunes, premiereGain: string | null, matieres: readonly Mat[] | null): string | null {
  const k = l.lignes.length;
  if (!k || !l.pire) return null;
  const T = BILAN.lacunes.lire;
  const pire = l.pire;
  if (l.sous70 === 0) return T.aucuneSous(SEUIL, pire.matiere, pire.pct);
  const compte = new Map<string, number>();
  for (const lg of l.lignes) compte.set(lg.cle, (compte.get(lg.cle) ?? 0) + 1);
  // la matière la plus fréquente ; à égalité, la première rencontrée (celle de la notion la plus basse)
  let frequente = pire.cle;
  let m = compte.get(pire.cle) ?? 1;
  for (const [cle, c] of compte) {
    if (c > m) {
      frequente = cle;
      m = c;
    }
  }
  const nomFrequente = courtDe(frequente, matieres);
  const corps = k === 1 ? T.seule(pire.matiere, pire.pct) : m === k ? T.toutes(k, nomFrequente) : m >= 2 ? T.groupe(m, k, nomFrequente, frequente !== pire.cle ? pire.matiere : null) : T.dispersees(k, pire.matiere);
  const suite = !premiereGain ? T.fin : premiereGain === pire.cle ? T.gainPire : compte.has(premiereGain) ? T.gainAutre(courtDe(premiereGain, matieres)) : T.fin;
  return corps + suite;
}

/** La matière mesurée la plus faible (à égalité, la plus lourde), sinon la plus lourde : la cible de « S'entraîner en … » quand aucune notion n'est mesurée. */
export function matiereCible(matieres: readonly Mat[] | null): { cle: string; court: string; href: string } {
  const liste = matieres && matieres.length ? matieres : null;
  const faibles = (liste ?? []).filter((x) => x.pct !== null);
  const choisie = faibles.length
    ? [...faibles].sort((a, b) => (a.pct as number) - (b.pct as number) || b.poids - a.poids)[0].cle
    : liste
      ? [...liste].sort((a, b) => b.poids - a.poids)[0].cle
      : [...TOPICS].sort((a, b) => b.weight - a.weight)[0].key;
  return { cle: choisie, court: courtDe(choisie, liste), href: hrefEntrainerDe(choisie, liste) };
}

// ── Tes forces ─────────────────────────────────────────────────────────────

export type AtoutBilan = Atout & { points: number };

export type Forces = {
  /** les 3 notions mesurées les plus hautes, à 70 % ou plus */
  lignes: LigneBilan[];
  mesurees: number;
  /** null : aucune moyenne fondée (moins de 5 joueurs, ou source absente) ; l'encart se masque. [] : des moyennes, mais aucune avance. */
  atouts: { liste: AtoutBilan[]; total: number; comparables: number } | null;
};

/** Les atouts face aux joueurs : la maîtrise de la matière moins la moyenne des joueurs, l'écart arrondi à 1 point au moins, du plus grand au plus petit. */
export function atoutsBilan(matieres: readonly MatiereSynthese[] | null): Forces["atouts"] {
  if (!matieres) return null;
  const moyennes: Record<string, number> = {};
  for (const m of matieres) if (m.moyJoueurs !== null) moyennes[m.cle] = m.moyJoueurs;
  const brut = atouts(matieres, moyennes);
  if (!brut) return null;
  const tous = brut.map((a): AtoutBilan => ({ ...a, points: Math.round(a.ecart) })).filter((a) => a.points >= 1);
  const comparables = matieres.filter((m) => m.pct !== null && m.moyJoueurs !== null).length;
  return { liste: tous.slice(0, NB_ATOUTS), total: tous.length, comparables };
}

export function forces(notions: readonly NotionSynthese[], matieres: readonly MatiereSynthese[] | null): Forces {
  const m = mesurees(notions, matieres);
  const fortes = m
    .filter((x) => !x.lg.sous)
    .sort((a, b) => b.lg.pct - a.lg.pct || b.lg.n - a.lg.n || a.rang - b.rang)
    .map((x) => x.lg);
  return { lignes: fortes.slice(0, NB_FORCES), mesurees: m.length, atouts: atoutsBilan(matieres) };
}

/** Les matières des forces, dans l'ordre où elles apparaissent, sans doublon. */
export function matieresDesForces(lignes: readonly LigneBilan[]): { cle: string; court: string }[] {
  const vues = new Set<string>();
  const r: { cle: string; court: string }[] = [];
  for (const l of lignes) {
    if (vues.has(l.cle)) continue;
    vues.add(l.cle);
    r.push({ cle: l.cle, court: l.matiere });
  }
  return r;
}

/** « Entretenir mes forces → » : une séance de 20 questions dans les matières des forces. null sans force. */
export function hrefEntretenir(lignes: readonly LigneBilan[]): string | null {
  const cles = matieresDesForces(lignes).map((x) => x.cle);
  return cles.length ? `/practice?topic=${cles.join(",")}&n=20&go=1` : null;
}

/** « Ce que ça veut dire » des forces : où elles se trouvent, puis le plus gros avantage sur les joueurs s'il y en a un. null sans force. */
export function phraseForces(f: Forces): string | null {
  const k = f.lignes.length;
  if (!k) return null;
  const T = BILAN.forces.lire;
  const mats = matieresDesForces(f.lignes);
  const corps = k === 1 ? T.seule(f.lignes[0].matiere, f.lignes[0].pct) : mats.length === 1 ? T.toutes(k, mats[0].court) : T.liste(k, mats.map((x) => x.court));
  const meilleur = f.atouts?.liste[0];
  return corps + (meilleur ? T.atout(meilleur.court, meilleur.points) : "");
}

/** La matière mesurée la plus haute (à égalité, la plus lourde), sinon la plus lourde : la cible de « S'entraîner → » quand aucune force n'existe encore. */
export function matiereForte(matieres: readonly Mat[] | null): { cle: string; court: string; href: string } {
  const liste = matieres && matieres.length ? matieres : null;
  const mesuree = (liste ?? []).filter((x) => x.pct !== null);
  const choisie = mesuree.length
    ? [...mesuree].sort((a, b) => (b.pct as number) - (a.pct as number) || b.poids - a.poids)[0].cle
    : liste
      ? [...liste].sort((a, b) => b.poids - a.poids)[0].cle
      : [...TOPICS].sort((a, b) => b.weight - a.weight)[0].key;
  return { cle: choisie, court: courtDe(choisie, liste), href: hrefEntrainerDe(choisie, liste) };
}

// ── Où gagner des points ───────────────────────────────────────────────────

export type LigneGain = {
  cle: string;
  court: string;
  nom: string;
  /** les points de préparation que rapporterait la matière remontée à 70 %, au dixième */
  gain: number;
  /** le même, non arrondi (les paliers de note s'y additionnent) */
  exact: number;
  /** largeur de la barre, relative au plus grand gain (de 3 à 100) */
  w: number;
  rang: number;
  /** les 3 premières en noir, les suivantes en violet */
  sombre: boolean;
  href: string;
};

export type PaliersNote = {
  aujourdhui: number;
  /** avec les 3 premières remontées ; null quand il y a 3 matières ou moins (le palier serait celui de « toutes ») */
  trois: number | null;
  toutes: number;
  /** combien de matières sont sous 70 % (celles du palier « toutes ») */
  n: number;
  passeTrois: boolean;
  passeToutes: boolean;
  /** la barre : la préparation, puis les gains des 3 premières, puis ceux des autres (en points, sur 100) */
  barre: { prep: number; trois: number; reste: number };
};

export type Gagner = {
  etat: "liste" | "tout70" | "aucune";
  lignes: LigneGain[];
  /** null sous 50 % du programme mesuré (la note estimée est masquée partout) ou sans gain */
  paliers: PaliersNote | null;
  mesurees: number;
  pasMesurees: number;
  /** les points que valent, ensemble, les 3 premières (ou moins) */
  sommeTrois: number;
  /** la matière par laquelle commencer (liste), ou la plus lourde (aucune matière mesurée) */
  cible: { cle: string; court: string; href: string } | null;
};

const mesuree = (m: Pick<MatiereSynthese, "statut" | "pct">): boolean => m.statut !== "non_mesuree" && m.pct !== null;

/** Les matières mesurées sous 70 %, de la plus rentable à la moins rentable, avec les paliers de la note estimée. */
export function gagner(matieres: readonly MatiereSynthese[], note: NoteSynthese | null): Gagner {
  const total = matieres.reduce((s, m) => s + m.poids, 0);
  const exact = (m: MatiereSynthese) => (total > 0 && mesuree(m) ? (m.poids / total) * Math.max(0, SEUIL - (m.pct as number)) : 0);
  const classees = matieres
    .map((m, i) => ({ m, i, exact: exact(m) }))
    .filter((x) => x.exact > 0)
    .sort((a, b) => b.exact - a.exact || b.m.poids - a.m.poids || a.i - b.i);
  const plus = classees[0]?.exact ?? 0;
  const lignes = classees.map((x, k): LigneGain => ({
    cle: x.m.cle,
    court: x.m.court,
    nom: x.m.nom,
    gain: Math.round(x.exact * 10) / 10,
    exact: x.exact,
    w: plus > 0 ? Math.max(3, Math.round((1000 * x.exact) / plus) / 10) : 0,
    rang: k + 1,
    sombre: k < NB_PREMIERES,
    href: x.m.hrefEntrainer,
  }));
  const nMesurees = matieres.filter(mesuree).length;
  const sommeTrois = classees.slice(0, NB_PREMIERES).reduce((s, x) => s + x.exact, 0);
  const sommeToutes = classees.reduce((s, x) => s + x.exact, 0);
  const prepExacte = total > 0 ? matieres.reduce((s, m) => s + m.poids * (m.pct ?? 0), 0) / total : 0;
  const prep = Math.round(prepExacte);
  const trois = lignes.length > NB_PREMIERES ? Math.round(prepExacte + sommeTrois) : null;
  const toutes = Math.round(prepExacte + sommeToutes);
  // la note estimée se masque sous 50 % du programme mesuré, ici comme dans « Ton objectif »
  const assez = note !== null && note.couverture >= COUVERTURE_MIN && lignes.length > 0;
  const paliers: PaliersNote | null = assez
    ? {
        aujourdhui: prep,
        trois,
        toutes,
        n: lignes.length,
        passeTrois: trois !== null && prep < SEUIL && trois >= SEUIL,
        passeToutes: prep < SEUIL && toutes >= SEUIL,
        barre: { prep: prepExacte, trois: lignes.length > NB_PREMIERES ? sommeTrois : sommeToutes, reste: lignes.length > NB_PREMIERES ? sommeToutes - sommeTrois : 0 },
      }
    : null;
  const plusLourde = [...matieres].sort((a, b) => b.poids - a.poids)[0];
  const etat: Gagner["etat"] = lignes.length ? "liste" : nMesurees > 0 ? "tout70" : "aucune";
  return {
    etat,
    lignes,
    paliers,
    mesurees: nMesurees,
    pasMesurees: matieres.length - nMesurees,
    sommeTrois,
    cible: lignes.length ? { cle: lignes[0].cle, court: lignes[0].court, href: lignes[0].href } : plusLourde ? { cle: plusLourde.cle, court: plusLourde.court, href: hrefQuete(10, plusLourde.cle) } : null,
  };
}

/** La clé de la matière qui rapporte le plus de points (null : aucune matière mesurée sous 70 %). */
export function premiereAGagner(matieres: readonly MatiereSynthese[] | null): string | null {
  return matieres ? (gagner(matieres, null).lignes[0]?.cle ?? null) : null;
}

/** « Ce que ça veut dire » de « Où gagner » : ce que valent ensemble les trois premières, et par où commencer. null hors de l'état « liste ». */
export function phraseGagner(g: Gagner): string | null {
  if (g.etat !== "liste") return null;
  const k = Math.min(NB_PREMIERES, g.lignes.length);
  const valeur = pointsDeNote(g.sommeTrois);
  return k === 1 ? BILAN.gagner.lire.une(g.lignes[0].court, valeur) : BILAN.gagner.lire.plusieurs(k, valeur, g.lignes[0].court);
}

/** Les gains à l'affichage : « +3,2 » (virgule, vrai plus, toujours un décimal pour que les chiffres s'alignent). */
export function texteGain(gain: number): string {
  return `+${gain.toFixed(1).replace(".", ",")}`;
}

/** « 3,2 » sans le plus (pour les phrases lues). */
export function nombreGain(gain: number): string {
  return String(gain).replace(".", ",");
}

/** L'ordre des cartes dans la rangée, et combien en restent après les replis. */
export function cartesBilan(p: { matieres: readonly MatiereSynthese[] | null; notions: readonly NotionSynthese[] | null }): { lacunes: boolean; forces: boolean; gagner: boolean; n: number } {
  const avecNotions = p.notions !== null;
  const avecMatieres = p.matieres !== null && p.matieres.length > 0;
  return { lacunes: avecNotions, forces: avecNotions, gagner: avecMatieres, n: [avecNotions, avecNotions, avecMatieres].filter(Boolean).length };
}

/** Le minimum de réponses pour qu'une notion soit jugée (rappelé dans l'état vide des lacunes et des forces). */
export const MIN_NOTION = MIN_REPONSES;
/** Le minimum de réponses pour qu'une matière soit jugée (rappelé dans l'état vide de « Où gagner »). */
export const MIN_MATIERE = MAITRISE.SEUIL_PROVISOIRE;
