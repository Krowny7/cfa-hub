// Le Codex : la séance du jour vue par l'écran (V3 §6.3 à §6.5). Où elle en
// est (proposée, en cours, tenue, close), « Continuer · 2/3 », « Encore un
// bloc ? », son en-tête, et ce qu'elle a fait avancer depuis son lancement
// (l'instantané « avant », les plus grands gains). Module neutre et LÉGER :
// aucun import du catalogue ni du résolveur (seulement des types), pour que
// les écrans (accueil, /codex, fin d'outil) n'en chargent pas le poids dans
// le navigateur. lib/codex/seance.ts le réexporte.

import type { Bloc, VueSeance } from "@/lib/codex/seance";
import type { Budget } from "@/lib/codex/types";
import type { LigneQuete, VueCodex } from "@/lib/codex/vue";

// ── L'état de la séance ────────────────────────────────────────────────

/** Le bloc en cours : le premier qui n'est pas fait (null : séance tenue). */
export const blocSuivant = (s: Pick<VueSeance, "blocs" | "faits">): Bloc | null => s.blocs.find((b) => !s.faits.includes(b.genre)) ?? null;

/** Tous les blocs sont faits. */
export const seanceTenue = (s: Pick<VueSeance, "blocs" | "faits">): boolean => s.blocs.length > 0 && s.blocs.every((b) => s.faits.includes(b.genre));

/**
 * Où en est la séance, pour l'écran : proposée (« Commencer »), en cours
 * (« Continuer · 2/3 »), tenue (tous ses blocs faits : « Ce que ça a fait
 * avancer », puis « C'est assez pour aujourd'hui » ou « Encore un bloc ? »),
 * close (« C'est assez » ou « J'arrête là » : plus rien à demander).
 */
export type EtapeSeance = "proposee" | "enCours" | "tenue" | "close";

export function etapeSeance(s: Pick<VueSeance, "blocs" | "faits" | "lancee" | "finieLe">): EtapeSeance {
  if (s.finieLe) return "close";
  if (seanceTenue(s)) return "tenue";
  return s.lancee ? "enCours" : "proposee";
}

/** Le rang du bloc en cours sur le total (« 2/3 ») : le premier bloc pas fait ; tous faits, le total. */
export function rangEnCours(s: Pick<VueSeance, "blocs" | "faits">): { rang: number; total: number } {
  const total = s.blocs.length;
  const i = s.blocs.findIndex((b) => !s.faits.includes(b.genre));
  return { rang: i < 0 ? total : i + 1, total };
}

/** L'en-tête de la séance : « J-10 · Répétition générale » ; sans jour J, la phase seule. */
export const enteteSeance = (joursAvant: number | null, phaseNom: string): string =>
  [joursAvant === 0 ? "Jour J" : joursAvant !== null && joursAvant > 0 ? `J-${joursAvant}` : null, phaseNom].filter(Boolean).join(" · ");

/** « Encore un bloc ? » : le budget du dessus (15 → 30 → 60 → 90), qui recompose avec un bloc de plus ; null à 90 min. */
export const budgetSuivant = (b: Budget): Budget | null => (b === 15 ? 30 : b === 30 ? 60 : b === 60 ? 90 : null);

// ── Ce que la séance a fait avancer (V3 §6.5) ──────────────────────────

/**
 * L'instantané pris au lancement (codex_seances.avant) : la maîtrise par
 * matière (cle → %), la file « À revoir », et l'avancée de cinq quêtes visées
 * au plus (« id|periode » → fraction).
 */
export type InstantaneSeance = { maitrise: Record<string, number>; revoir: number | null; quetes: Record<string, number> };

/**
 * Les quêtes visées au lancement, cinq au plus : la prochaine, puis les
 * contrats du jour pas encore faits, ceux qu'un bloc de la séance fait
 * avancer d'abord.
 */
export const MAX_QUETES_VISEES = 5;

export function instantaneSeance(v: Pick<VueCodex, "prochaine" | "contrats" | "cap" | "revoir"> & { seance?: Pick<VueSeance, "blocs"> | null }): InstantaneSeance {
  const avances = new Set((v.seance?.blocs ?? []).flatMap((b) => b.contrats));
  const contrats = v.contrats.map((c) => c.ligne).filter((l) => l.etat !== "terminee").sort((a, b) => Number(avances.has(b.id)) - Number(avances.has(a.id)));
  const visees = [...(v.prochaine ? [v.prochaine.ligne] : []), ...contrats].filter((l, i, t) => t.findIndex((x) => x.id === l.id && x.periode === l.periode) === i).slice(0, MAX_QUETES_VISEES);
  return {
    maitrise: Object.fromEntries((v.cap?.matieres ?? []).flatMap((m) => (m.pct === null ? [] : [[m.cle, m.pct]]))),
    revoir: v.revoir?.aujourdhui ?? null,
    quetes: Object.fromEntries(visees.map((l) => [`${l.id}|${l.periode}`, Math.round(l.fraction * 100) / 100])),
  };
}

const nombres = (x: unknown, max: number): Record<string, number> => {
  if (!x || typeof x !== "object" || Array.isArray(x)) return {};
  return Object.fromEntries(
    Object.entries(x as Record<string, unknown>)
      .filter((e): e is [string, number] => e[0].length <= 160 && typeof e[1] === "number" && Number.isFinite(e[1]) && e[1] >= 0 && e[1] <= max)
      .slice(0, 24),
  );
};

/** L'instantané relu (codex_seances.avant) ; null : rien d'exploitable. */
export function lireInstantane(x: unknown): InstantaneSeance | null {
  const o = x as Record<string, unknown> | null;
  if (!o || typeof o !== "object" || Array.isArray(o)) return null;
  const revoir = typeof o.revoir === "number" && Number.isFinite(o.revoir) && o.revoir >= 0 ? Math.round(o.revoir) : null;
  return { maitrise: nombres(o.maitrise, 100), revoir, quetes: nombres(o.quetes, 1) };
}

/** Une ligne de « Ce que ça a fait avancer » : « FSA 48 % → 52 % », sa jauge, et le poids qui la classe. */
export type GainSeance = { cle: string; texte: string; fraction: number; poids: number };

/** Trois lignes au plus. */
export const MAX_GAINS = 3;
/** Pour classer : un point de maîtrise pèse autant que 4 % d'une quête (la maîtrise bouge lentement). */
const POIDS_POINT = 0.04;

/** Toutes les quêtes de la vue, par clé « id|periode ». */
function lignesParCle(v: VueCodex): Map<string, LigneQuete> {
  const toutes = [
    ...v.contrats.map((c) => c.ligne), ...(v.prochaine ? [v.prochaine.ligne] : []), ...(v.debrief ? [v.debrief] : []), ...v.trame.flatMap((a) => a.quetes), ...v.branches.flatMap((b) => b.etapes),
    ...v.longCours.flatMap((c) => c.paliers), ...v.filRouge.chapitres.flatMap((c) => c.recents), ...v.exploits, ...v.hebdo,
  ];
  const m = new Map<string, LigneQuete>();
  for (const l of toutes) if (!m.has(`${l.id}|${l.periode}`)) m.set(`${l.id}|${l.periode}`, l);
  return m;
}

/**
 * Ce que la séance a fait avancer : les plus grands gains depuis le
 * lancement, trois au plus. Une quête visée qui a avancé (« Premier pas en
 * Quant 6 → 9/10 »), une matière dont la maîtrise a monté (« FSA 48 % →
 * 52 % »), la file « À revoir » qui a baissé (« À revoir 18 → 9 »). Vide :
 * rien de mesurable (l'écran dit alors « Séance tenue. La régularité, c'est
 * déjà la moitié du travail. »).
 */
export function gainsSeance(avant: InstantaneSeance | null | undefined, v: VueCodex): GainSeance[] {
  if (!avant) return [];
  const gains: GainSeance[] = [];
  const lignes = lignesParCle(v);
  for (const [cle, f0] of Object.entries(avant.quetes)) {
    const l = lignes.get(cle);
    if (!l || !(l.fraction > f0 + 0.005)) continue;
    const cible = Math.floor(l.cible);
    const texte = cible > 1
      ? `${l.titre} ${Math.min(cible, Math.round(f0 * cible))} → ${Math.min(cible, Math.floor(l.valeur))}/${cible}`
      : l.etat === "terminee" ? `${l.titre} : tenu` : `${l.titre} ${Math.round(f0 * 100)} → ${Math.round(l.fraction * 100)} %`;
    gains.push({ cle: `quete:${cle}`, texte, fraction: Math.min(1, l.fraction), poids: l.fraction - f0 });
  }
  for (const m of v.cap?.matieres ?? []) {
    const a = avant.maitrise[m.cle];
    if (a === undefined || m.pct === null || m.pct <= a) continue;
    gains.push({ cle: `maitrise:${m.cle}`, texte: `${m.court} ${a} % → ${m.pct} %`, fraction: m.pct / 100, poids: (m.pct - a) * POIDS_POINT });
  }
  const r0 = avant.revoir;
  const r1 = v.revoir?.aujourdhui;
  if (r0 !== null && r0 > 0 && typeof r1 === "number" && r1 < r0) {
    gains.push({ cle: "revoir", texte: `À revoir ${r0} → ${r1}`, fraction: (r0 - r1) / r0, poids: (r0 - r1) / r0 });
  }
  return gains.sort((a, b) => b.poids - a.poids).slice(0, MAX_GAINS);
}
