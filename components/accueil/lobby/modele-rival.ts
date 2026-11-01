import { initials } from "@/components/classement/format";
import { decaleJour } from "@/lib/objectif-calc";
import type { Visibilite } from "@/lib/profil/catalogue";
import type { Relation } from "@/lib/profil/donnees";
import { RIV, type CleMesure } from "@/lib/voice-accueil-lobby-rival";
import type { Segment } from "@/lib/voice-moi";
import type { MesureRival, RivalLobby } from "./types";

// « Ton rival » de l'accueil (lot 3) : les calculs purs, sans base ni réseau.
// La carte compare ton activité à celle de ton plus grand rival (le joueur que
// tu as le plus croisé : components/classement/rival.ts) sur les SEPT DERNIERS
// JOURS glissants, aujourd'hui compris, en cinq mesures : traits (questions
// répondues), jours actifs (au moins une question), temps sur le site, série
// d'encre et duels joués. Ici : la fenêtre, le compte par côté, les lignes, les
// barres, le verdict, ce qui reste à rattraper et le mot de la relance. La
// lecture (lecture-rival.ts) rassemble les chiffres ; la carte (CarteRival.tsx)
// n'affiche que ce que ce module a décidé.

/** Les jours de la fenêtre (sept jours glissants). */
export const JOURS_FENETRE = 7;
/** Longueur maximale du prénom affiché dans un bouton avant d'être coupé. */
const PRENOM_MAX = 14;

/** Tout ce qui se compare, d'un côté. null : la mesure n'est pas visible (Journal fermé, temps privé, lecture en échec). */
export type CoteSemaine = {
  /** questions répondues sur les 7 jours */
  traits: number | null;
  /** jours à au moins une question, sur 7 */
  jours: number | null;
  /** secondes passées sur le site sur les 7 jours */
  temps: number | null;
  /** série d'encre en cours, en jours */
  serie: number | null;
  /** duels terminés sur les 7 jours */
  duels: number | null;
};

/** Un côté entièrement inconnu. */
export const COTE_VIDE: CoteSemaine = { traits: null, jours: null, temps: null, serie: null, duels: null };

/** L'ordre des lignes de la carte. */
export const ORDRE_MESURES: readonly CleMesure[] = ["traits", "jours", "temps", "serie", "duels"];

// ── la fenêtre et le compte ─────────────────────────────────────────────────

/** Les sept jours glissants qui finissent à `jour` (AAAA-MM-JJ), du plus ancien à aujourd'hui. */
export function fenetre(jour: string): string[] {
  return Array.from({ length: JOURS_FENETRE }, (_, i) => decaleJour(jour, i + 1 - JOURS_FENETRE));
}

/** Le jour (AAAA-MM-JJ, Paris) où commence la fenêtre : J-6. */
export const debutFenetre = (jour: string): string => decaleJour(jour, 1 - JOURS_FENETRE);

/**
 * Traits et jours actifs sur la fenêtre. `avant` : les questions posées par jour
 * AVANT aujourd'hui (lib/objectif.ts : joursAvant) ; `duJour` : celles
 * d'aujourd'hui. Un jour hors fenêtre, ou aujourd'hui lu dans `avant`, n'est pas
 * compté deux fois.
 */
export function activiteSemaine(avant: readonly { day: string; n: number }[], duJour: number, jour: string): { traits: number; jours: number } {
  const dans = new Set(fenetre(jour).slice(0, JOURS_FENETRE - 1));
  const parJour = new Map<string, number>();
  for (const j of avant) if (dans.has(j.day) && j.n > 0) parJour.set(j.day, (parJour.get(j.day) ?? 0) + j.n);
  let traits = 0;
  for (const n of parJour.values()) traits += n;
  let jours = parJour.size;
  const auj = Math.max(0, Math.round(Number(duJour) || 0));
  if (auj > 0) {
    traits += auj;
    jours += 1;
  }
  return { traits, jours };
}

/** Le Journal d'un joueur m'est-il ouvert ? Même règle que son profil (app/people/[id]/page.tsx : journalOuvert). */
export function journalOuvertPour(visibilite: Visibilite, relation: Relation | null): boolean {
  return visibilite === "public" || (visibilite === "friends" && relation === "amis");
}

/** Un nombre de jours, d'heures ou de duels sûr : entier, jamais négatif ; null reste null. */
const sur = (n: number | null | undefined): number | null => (typeof n === "number" && Number.isFinite(n) ? Math.max(0, Math.round(n)) : null);

/**
 * Un côté de la comparaison. Les traits et les jours actifs n'y figurent que si
 * le Journal est ouvert (`ouvert`) et les questions par jour lues (`avant`).
 */
export function coteSemaine(e: {
  avant: readonly { day: string; n: number }[] | null;
  duJour: number | null;
  ouvert: boolean;
  temps: number | null;
  serie: number | null;
  duels: number | null;
  jour: string;
}): CoteSemaine {
  const activite = e.ouvert && e.avant ? activiteSemaine(e.avant, e.duJour ?? 0, e.jour) : null;
  return { traits: activite ? activite.traits : null, jours: activite ? activite.jours : null, temps: sur(e.temps), serie: sur(e.serie), duels: sur(e.duels) };
}

// ── les lignes et les barres ────────────────────────────────────────────────

/**
 * Les mesures que l'on peut comparer : celles que les deux côtés montrent, sauf
 * celles qui valent zéro des deux côtés (rien à comparer). Dans l'ordre de la carte.
 */
export function mesuresDe(moi: CoteSemaine, lui: CoteSemaine, prenom: string): MesureRival[] {
  const out: MesureRival[] = [];
  for (const cle of ORDRE_MESURES) {
    const a = sur(moi[cle]);
    const b = sur(lui[cle]);
    if (a === null || b === null || (a === 0 && b === 0)) continue;
    out.push({ cle, lib: RIV.libelle[cle], toi: a, lui: b, toiTxt: RIV.valeur[cle](a), luiTxt: RIV.valeur[cle](b), aria: RIV.lecture(cle, a, b, prenom) });
  }
  return out;
}

/** La part d'une valeur dans le plafond, en pourcentage à une décimale (0 à 100). */
export function pourcent(valeur: number, plafond: number): number {
  if (!(plafond > 0) || !(valeur > 0)) return 0;
  return Math.min(100, Math.round((valeur / plafond) * 1000) / 10);
}

/** Les deux barres d'une ligne : chacune est une part du plus grand des deux (la plus longue remplit sa moitié). */
export function barres(m: Pick<MesureRival, "toi" | "lui">): { toi: number; lui: number } {
  const plafond = Math.max(m.toi, m.lui);
  return { toi: pourcent(m.toi, plafond), lui: pourcent(m.lui, plafond) };
}

// ── le verdict ──────────────────────────────────────────────────────────────

/** Combien de lignes chacun gagne (la plus grande valeur) et combien sont à égalité. */
export function comptes(mesures: readonly Pick<MesureRival, "toi" | "lui">[]): { toi: number; lui: number; egal: number } {
  let toi = 0;
  let lui = 0;
  let egal = 0;
  for (const m of mesures) {
    if (m.toi > m.lui) toi++;
    else if (m.lui > m.toi) lui++;
    else egal++;
  }
  return { toi, lui, egal };
}

/**
 * La phrase d'ensemble : qui devance l'autre sur combien de points. Sans accord
 * de genre (le prénom n'en dit rien) : « Marie te devance sur 4 points sur 5. »
 */
export function verdictDe(prenom: string, mesures: readonly MesureRival[]): Segment[] {
  const n = mesures.length;
  const c = comptes(mesures);
  if (c.lui > c.toi) return RIV.luiDevant(prenom, c.lui, n);
  if (c.toi > c.lui) return RIV.toiDevant(prenom, c.toi, n);
  return c.toi === 0 ? RIV.egaliteTotale(prenom) : RIV.egalite(prenom, c.toi);
}

/** « Rattrape 55 traits pour l'égaler. » quand il te devance sur les traits ; sinon null. */
export function rattrapeDe(mesures: readonly MesureRival[]): Segment[] | null {
  const t = mesures.find((m) => m.cle === "traits");
  return t && t.lui > t.toi ? RIV.rattrape(t.lui - t.toi) : null;
}

// ── les noms ────────────────────────────────────────────────────────────────

/** Le premier mot du nom (« Marie L. » → « Marie »), coupé à 14 caractères pour tenir dans un bouton. */
export function prenomDe(nom: string): string {
  const mot = (nom || "").trim().split(/\s+/)[0] || "";
  const sansPoint = mot.replace(/\.+$/, "") || mot;
  return sansPoint.length > PRENOM_MAX ? sansPoint.slice(0, PRENOM_MAX - 1) + "…" : sansPoint;
}

// ── la relance reçue ────────────────────────────────────────────────────────

const PARIS = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" });

/**
 * Le moment d'une relance, en mots : « ce matin », « cet après-midi », « ce soir »
 * si elle date d'aujourd'hui (Paris), « hier » si elle date d'hier ; null au-delà
 * ou si la date est illisible.
 */
export function momentDe(creeLe: string, jour: string): string | null {
  const t = Date.parse(creeLe);
  if (!Number.isFinite(t)) return null;
  const p: Record<string, string> = {};
  for (const x of PARIS.formatToParts(new Date(t))) p[x.type] = x.value;
  const leJour = `${p.year}-${p.month}-${p.day}`;
  const heure = Number(p.hour) % 24;
  if (leJour === jour) return heure < 12 ? RIV.moment.matin : heure < 18 ? RIV.moment.apresMidi : RIV.moment.soir;
  return leJour === decaleJour(jour, -1) ? RIV.moment.hier : null;
}

/** Une ligne de la table `relances` (migration_accueil.sql). */
export type LigneRelance = { de: string; a: string; jour: string; cree_le: string };

/**
 * « Relance de Marie ce matin : à toi de jouer. » : la plus récente des
 * relances que ton rival t'a envoyées, d'aujourd'hui ou d'hier ; null sinon.
 */
export function recueDe(prenom: string, lignes: readonly LigneRelance[], idRival: string, moi: string, jour: string): string | null {
  const siennes = lignes.filter((l) => l.de === idRival && l.a === moi).sort((x, y) => (x.cree_le < y.cree_le ? 1 : x.cree_le > y.cree_le ? -1 : 0));
  for (const l of siennes) {
    const quand = momentDe(l.cree_le, jour);
    if (quand) return RIV.recue(prenom, quand);
  }
  return null;
}

/** Lui as-tu déjà envoyé sa relance d'aujourd'hui ? (une par joueur et par jour : la clé de la table) */
export function dejaRelance(lignes: readonly LigneRelance[], moi: string, idRival: string, jour: string): boolean {
  return lignes.some((l) => l.de === moi && l.a === idRival && l.jour === jour);
}

// ── la carte ────────────────────────────────────────────────────────────────

/** Tout ce que la lecture a rassemblé sur ton rival et sur toi. */
export type EntreeRival = {
  id: string;
  /** son pseudo, tel que le classement l'affiche */
  nom: string;
  /** rencontres, toutes épreuves, et qui a fait mieux (components/classement/rival.ts) */
  rencontres: number;
  victoiresMoi: number;
  victoiresLui: number;
  /** ton pseudo, pour le mot de la relance (null : inconnu) */
  pseudoMoi: string | null;
  moi: CoteSemaine;
  lui: CoteSemaine;
  /** `dispo` : la table `relances` existe (sinon pas de bouton) ; `envoyee` : déjà envoyée aujourd'hui à ce joueur */
  relance: { dispo: boolean; envoyee: boolean };
  /** la phrase de la relance qu'il t'a envoyée (recueDe), ou null */
  recue: string | null;
};

/**
 * La carte « Ton rival ». Au moins deux mesures comparables : les lignes, le
 * verdict et ce qu'il reste à rattraper. Moins : le bilan des rencontres à la
 * place (« Tu mènes : 3 victoires sur 5 rencontres. »).
 */
export function construireRival(e: EntreeRival): RivalLobby {
  const prenom = prenomDe(e.nom);
  const mesures = mesuresDe(e.moi, e.lui, prenom);
  const assez = mesures.length >= 2;
  return {
    id: e.id,
    nom: e.nom,
    prenom,
    initiales: initials(e.nom),
    // tes initiales, sur ta ligne « Toi » (sans pseudo : celle de « Toi »)
    initialesMoi: initials(e.pseudoMoi?.trim() || RIV.toi),
    href: `/people/${e.id}`,
    mesures: assez ? mesures : [],
    bilan: assez ? null : RIV.bilan(prenom, e.victoiresMoi, e.victoiresLui, e.rencontres),
    verdict: assez ? verdictDe(prenom, mesures) : [],
    rattrape: assez ? rattrapeDe(mesures) : null,
    defi: { href: `/duel?adversaire=${encodeURIComponent(e.id)}`, libelle: RIV.defi },
    relance: { dispo: e.relance.dispo, envoyee: e.relance.dispo && e.relance.envoyee, apercu: RIV.apercu(e.pseudoMoi?.trim() || null) },
    recue: e.recue,
  };
}
