// Le calendrier du Codex (V3 §7) : où en est le joueur par rapport à son jour
// J, et ce que /codex montre à chaque moment. La veillée (J-7 à J-4) : sept
// tampons, un par jour d'encre, et « On ne commence plus rien. » ; la malle
// (J-3 à J-1) : la liste à cocher ; le jour J : « Bonne chance. » et rien
// d'autre ; le lendemain (J+1 à J+7) : « Pose le pinceau. » et le récap de la
// préparation. Un programme sans date ne connaît aucun de ces moments.
// Module neutre et pur (serveur et navigateur).

import { decaleJour, joursEntre } from "@/lib/objectif-calc";
import type { Maitrise } from "@/lib/codex/cap";
import type { Phase } from "@/lib/codex/types";

/** Le moment du joueur : « courant » hors des derniers jours (et sans date), « apres » au-delà de J+7 ou une fois le programme mené. */
export type Moment = "courant" | "veillee" | "malle" | "jourJ" | "lendemain" | "apres";

/** Les fenêtres, en jours avant (positif) ou après (négatif) le jour J. */
export const FENETRES = { veillee: 7, malle: 3, lendemain: 7 } as const;

/**
 * Le moment d'après les jours avant l'examen (null : programme sans date, ou
 * jour J pas saisi) ; sans date, seule la phase « après » (programme mené,
 * dernier acte clos) en sort.
 */
export function momentDe(joursAvant: number | null, phase: Phase): Moment {
  if (joursAvant === null) return phase === "apres" ? "apres" : "courant";
  if (joursAvant > FENETRES.veillee) return "courant";
  if (joursAvant > FENETRES.malle) return "veillee";
  if (joursAvant > 0) return "malle";
  if (joursAvant === 0) return "jourJ";
  return joursAvant >= -FENETRES.lendemain ? "lendemain" : "apres";
}

/** Les derniers jours avant l'examen (veillée, malle, jour J) : le Codex se fait calme, rien de neuf ne s'ouvre ni ne se dévoile. */
export const momentCalme = (m: Moment) => m === "veillee" || m === "malle" || m === "jourJ";

/**
 * Le jour J et le lendemain (V3 §7.4, §7.5) : on a posé le pinceau. Pas de
 * séance du jour : ni composée, ni gardée, ni bonus du trio pour une séance
 * tenue. Décidé une fois, côté serveur (lib/codex/serveur.ts) : l'accueil, la
 * pastille et /codex ne lisent que `vue.seance`.
 */
export const pinceauPose = (m: Moment) => m === "jourJ" || m === "lendemain";

/** « La veille » (V3 §7.3, ouverte de J-3 à J-1) : montrée sous la malle. */
export const QUETE_VEILLE = "trame:ep:veille";

/** « Bonne chance. … » : le jour J, sur /codex et dans le panneau de la barre du haut. */
export const BONNE_CHANCE = { titre: "Bonne chance.", texte: "Lis chaque énoncé jusqu'au bout. Le reste, tu l'as." } as const;

// ── La veillée : sept tampons ──────────────────────────────────────────

/** Un jour d'encre : 10 questions ou plus (la règle de la série d'encre, lib/serie-encre). */
export const SEUIL_ENCRE = 10;

export type Tampon = { jour: string; encre: boolean; aVenir: boolean; aujourdhui: boolean };

/**
 * Les sept tampons de la dernière semaine, de J-7 à J-1 : rempli si le jour
 * a été un jour d'encre ; un jour à venir reste un cercle vide. Aucun compte
 * à rebours : seulement les jours.
 */
export function tamponsVeillee(jour: string, joursAvant: number, jours: { jour: string; n: number }[] = []): Tampon[] {
  const jourJ = decaleJour(jour, joursAvant);
  const n = new Map(jours.map((j) => [j.jour.slice(0, 10), j.n]));
  return Array.from({ length: FENETRES.veillee }, (_, i) => {
    const d = decaleJour(jourJ, i - FENETRES.veillee);
    return { jour: d, encre: (n.get(d) ?? 0) >= SEUIL_ENCRE, aVenir: d > jour, aujourdhui: d === jour };
  });
}

// ── La malle (J-3 à J-1) ───────────────────────────────────────────────

export type CaseMalle = { id: string; libelle: string; facultative?: boolean };

/** La malle est prête à 5 cases cochées sur 7 (la quête « La malle est prête », mesure malle_faite). */
export const MALLE_PRETE = 5;

/** Les sept cases de la malle (V3 §7.3). */
export const CASES_MALLE: readonly CaseMalle[] = [
  { id: "convocation", libelle: "Convocation imprimée" },
  { id: "identite", libelle: "Pièce d'identité (passeport) valide" },
  { id: "calculatrice", libelle: "Calculatrice autorisée (BA II Plus ou HP 12C) et piles de rechange" },
  { id: "trajet", libelle: "Trajet et heure d'arrivée vérifiés" },
  // en centre Prometric, aucune montre n'entre en salle (le temps est à l'écran) : la case dit de la laisser au casier ;
  // l'id « montre » est gardé pour les coches déjà enregistrées
  { id: "montre", libelle: "Casier : rien en poche, ni montre ni téléphone (le temps est à l'écran)", facultative: true },
  { id: "sommeil", libelle: "Sommeil : couché à heure fixe trois soirs" },
  { id: "pause", libelle: "Eau et en-cas pour la pause" },
];

/** Les cases connues, sans doublon, dans l'ordre de la malle ; tout le reste est ignoré. */
export function cochesValides(coches: unknown): string[] {
  if (!Array.isArray(coches)) return [];
  const vues = new Set(coches.filter((c): c is string => typeof c === "string"));
  return CASES_MALLE.filter((c) => vues.has(c.id)).map((c) => c.id);
}

/** La malle du programme, lue dans le compte (user_metadata.rl_malle = { programme, coches }) ; celle d'un autre programme ne compte pas. */
export function lireMalle(meta: unknown, programme: string): string[] {
  const m = (meta as { rl_malle?: { programme?: unknown; coches?: unknown } } | null)?.rl_malle;
  if (!m || typeof m !== "object" || m.programme !== programme) return [];
  return cochesValides(m.coches);
}

// ── Le lendemain : le récap de la préparation ──────────────────────────

/** Une heure de travail : 50 questions (≈ 1,2 min chacune). */
export const MINUTES_PAR_QUESTION = 1.2;

export type Recap = {
  /** le programme préparé (« CFA Niveau I ») */
  programme: string;
  /** le début de la préparation (AAAA-MM-JJ) : l'inscription au programme, sinon la première réponse */
  depuis: string | null;
  questions: number;
  /** heures estimées, arrondies à l'heure */
  heures: number;
  joursEncre: number;
  /** les matières qui ont le plus monté depuis leurs 40 premières réponses, 3 au plus */
  matieres: { cle: string; court: string; debut: number; pct: number }[];
  /** null : la base ne le sait pas encore (on n'affiche rien plutôt que 0) */
  raturesScellees: number | null;
  trophees: number | null;
  /** la préparation finale (0–100) */
  preparation: number;
};

/**
 * Le récap du lendemain (V3 §7.5), de l'inscription au programme (sinon la
 * première réponse) jusqu'au jour J compris.
 */
export function recapDe(p: {
  programme: string;
  debut: string | null;
  jourJ: string | null;
  jours: { jour: string; n: number }[];
  maitrise: Pick<Maitrise, "matieres" | "preparation">;
  raturesScellees?: number;
  trophees?: { n: number }[];
}): Recap {
  const jours = [...p.jours].map((j) => ({ jour: j.jour.slice(0, 10), n: j.n })).sort((a, b) => (a.jour < b.jour ? -1 : 1));
  const depuis = p.debut?.slice(0, 10) ?? jours.find((j) => j.n > 0)?.jour ?? null;
  const dedans = jours.filter((j) => (!depuis || j.jour >= depuis) && (!p.jourJ || j.jour <= p.jourJ));
  const questions = dedans.reduce((s, j) => s + j.n, 0);
  const matieres = p.maitrise.matieres
    .flatMap((m) => (m.debut !== null && m.pct !== null && m.pct > m.debut ? [{ cle: m.cle, court: m.court, debut: m.debut, pct: m.pct }] : []))
    .sort((a, b) => b.pct - b.debut - (a.pct - a.debut))
    .slice(0, 3);
  return {
    programme: p.programme,
    depuis,
    questions,
    heures: Math.round((questions * MINUTES_PAR_QUESTION) / 60),
    joursEncre: dedans.filter((j) => j.n >= SEUIL_ENCRE).length,
    matieres,
    raturesScellees: p.raturesScellees ?? null,
    trophees: p.trophees ? p.trophees.reduce((s, t) => s + t.n, 0) : null,
    preparation: p.maitrise.preparation,
  };
}

/** Les jours écoulés depuis le début de la préparation jusqu'au jour J (pour « en 94 jours ») ; null sans début. */
export const dureePreparation = (r: Pick<Recap, "depuis">, jourJ: string | null): number | null => (r.depuis && jourJ ? Math.max(1, joursEntre(r.depuis, jourJ) + 1) : null);

const nombre = (n: number) => n.toLocaleString("fr-FR");

/** Le texte à partager (« Partager ») : les chiffres du travail, rien de plus. */
export function texteRecap(r: Recap): string {
  const parts = [`${nombre(r.questions)} questions`, ...(r.heures > 0 ? [`≈ ${nombre(r.heures)} h de travail`] : []), `${nombre(r.joursEncre)} jours d'encre`];
  return `Ma préparation · ${r.programme} : ${parts.join(", ")}. Le pinceau est posé.`;
}

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
/** « 12 août 2026 » (« 1er » le premier du mois), sans Intl : le serveur et le navigateur écrivent la même chose. */
export function dateLongue(jour: string): string {
  const [a, m, j] = jour.slice(0, 10).split("-").map(Number);
  return `${j === 1 ? "1er" : j} ${MOIS[m - 1]} ${a}`;
}
