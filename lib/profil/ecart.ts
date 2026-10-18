// La grammaire des écarts du profil (chez un autre : « est-il chaud,
// comparé à moi ? ») : le chiffre fort est le sien ; le jeton dit l'écart de
// ton côté (« toi −1 692 » : + tu mènes, − il mène ; vert / rouge, le signe
// double toujours la couleur) ; l'égalité a ses seuils ; un rang, une place
// ou un palier ne se soustraient pas : on écrit ta valeur, colorée. Le
// score d'une tuile compte les manches où chacun mène (« toi 1 – 2 »).
// Module neutre (client et serveur, sans React).

import { nombre } from "@/lib/voice";

/** la nature d'une mesure : elle décide de l'égalité et de l'unité du jeton */
export type NatureMesure = "compte" | "pct" | "elo" | "jours";
export type Sens = "gain" | "perte" | "egal";

export type Ecart = {
  sens: Sens;
  /** l'écart signé, de ton côté (toi − lui) */
  delta: number;
  /** « −1 692 », « −18 j », « −6 », « = » */
  court: string;
  /** « toi −1 692 », « toi = » */
  long: string;
};

/** le vrai signe moins, l'espace fine des milliers (nombre), l'unité des jours */
const signeDe = (n: number, nature: NatureMesure) => {
  const abs = Math.abs(n);
  const corps = nature === "jours" ? `${nombre(abs)} j` : nombre(abs);
  return n > 0 ? `+${corps}` : n < 0 ? `−${corps}` : corps;
};

/** L'égalité, selon la nature de la mesure (les seuils de la grammaire). */
export function egalite(lui: number, toi: number, nature: NatureMesure): boolean {
  const d = toi - lui;
  if (nature === "elo") return Math.abs(d) < 10;
  if (nature === "pct") return Math.round(d) === 0;
  if (nature === "jours") return d === 0;
  // un compte : écart nul, ou de moins de 1 % de la plus grande valeur dès 100
  const max = Math.max(Math.abs(lui), Math.abs(toi));
  return d === 0 || (max >= 100 && Math.abs(d) < max / 100);
}

/** L'écart de ton côté entre sa valeur et la tienne ; null si l'une manque. */
export function ecart(lui: number | null | undefined, toi: number | null | undefined, nature: NatureMesure): Ecart | null {
  if (lui === null || lui === undefined || toi === null || toi === undefined || !Number.isFinite(lui) || !Number.isFinite(toi)) return null;
  const delta = nature === "pct" ? Math.round(toi) - Math.round(lui) : toi - lui;
  if (egalite(lui, toi, nature)) return { sens: "egal", delta, court: "=", long: "toi =" };
  const court = signeDe(delta, nature);
  return { sens: delta > 0 ? "gain" : "perte", delta, court, long: `toi ${court}` };
}

/**
 * Un rang (plus petit = mieux : une place, 1re) : ta valeur, colorée.
 * « toi 5e » ; null si l'une manque.
 */
export function ecartRang(lui: number | null | undefined, toi: number | null | undefined): Ecart | null {
  if (!lui || !toi) return null;
  const court = `${toi}${toi === 1 ? "re" : "e"}`;
  if (lui === toi) return { sens: "egal", delta: 0, court, long: `toi ${court}` };
  return { sens: toi < lui ? "gain" : "perte", delta: lui - toi, court, long: `toi ${court}` };
}

/** Un palier (plus grand = mieux) : ta valeur nommée, colorée. « toi Argent I ». */
export function ecartPalier(lui: number | null | undefined, toi: number | null | undefined, nomToi: string): Ecart | null {
  if (lui === null || lui === undefined || toi === null || toi === undefined) return null;
  if (lui === toi) return { sens: "egal", delta: 0, court: nomToi, long: `toi ${nomToi}` };
  return { sens: toi > lui ? "gain" : "perte", delta: toi - lui, court: nomToi, long: `toi ${nomToi}` };
}

export type Score = { toi: number; lui: number; egal: number };

/** Le score d'une tuile : les manches où chacun mène (une manche sans écart ne compte pas). */
export function score(ecarts: (Ecart | null)[]): Score | null {
  const vus = ecarts.filter((e): e is Ecart => !!e);
  if (vus.length < 2) return null;
  return { toi: vus.filter((e) => e.sens === "gain").length, lui: vus.filter((e) => e.sens === "perte").length, egal: vus.filter((e) => e.sens === "egal").length };
}

/** Le sens d'un score : qui mène la tuile. */
export const sensScore = (s: Score): Sens => (s.toi > s.lui ? "gain" : s.toi < s.lui ? "perte" : "egal");

/** La couleur d'un sens (jetons du thème : vert, rouge, encre douce). */
export const couleurSens = (s: Sens) => (s === "gain" ? "var(--gain)" : s === "perte" ? "var(--perte)" : "var(--ink-2)");

/**
 * Le rattrapage des questions : à ton rythme des 7 derniers jours, combien
 * de jours pour combler l'écart (null si tu mènes, ou sans rythme).
 */
export function joursPourRattraper(ecartQuestions: number, questions7: number): number | null {
  if (ecartQuestions >= 0 || questions7 <= 0) return null;
  return Math.ceil(-ecartQuestions / (questions7 / 7));
}

/**
 * Le rattrapage d'ELO : combien de victoires contre lui pour passer devant
 * (son ELO tenu fixe), avec la fonction d'enjeu du site (stakesAgainst).
 * null si tu mènes ; plafonné à 50.
 */
export function victoiresPourPasser(monElo: number, mesParties: number, sonElo: number, enjeu: (elo: number, parties: number, sien: number) => { win: number }): number | null {
  if (monElo >= sonElo) return null;
  let elo = monElo;
  let parties = mesParties;
  for (let n = 1; n <= 50; n++) {
    elo += Math.max(1, enjeu(elo, parties, sonElo).win);
    parties++;
    if (elo > sonElo) return n;
  }
  return null;
}

/** Les questions des 7 derniers jours (aujourd'hui compris), d'après un carnet [jour, n]. */
export function questionsSur7(jours: [string, number][], aujourdhui: string): number {
  const debut = new Date(aujourdhui + "T12:00:00Z");
  debut.setUTCDate(debut.getUTCDate() - 6);
  const borne = debut.toISOString().slice(0, 10);
  return jours.reduce((s, [j, n]) => (j >= borne && j <= aujourdhui ? s + n : s), 0);
}
