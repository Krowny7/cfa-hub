// Les lectures des sept tuiles de plus de la page de profil (Duels, Jour J,
// Matière phare, Classement, Examens blancs, Codex, Rythme) : ce que le
// serveur lit, une seule fois, pour les tuiles posées (app/people/[id]/page.tsx)
// ou pour toutes (Personnaliser), et les fonctions pures qui en font les
// données des blocs (DonneesBlocs, lib/profil/blocs-donnees.ts).
// - Duels : ses 5 derniers (V, D, N) ; les totaux viennent des stats.
// - Jour J : sa date d'examen (profiles.exam_date), les jours qui restent
//   (Paris), la part du programme couverte (getMaitrise : en cache).
// - Matière phare : rien à lire (les stats), voir matierePhare.
// - Classement : sa place (déjà lue par la page), le nombre de joueurs, la
//   variation de son ELO sur 7 jours (rating_events, lisible par tous).
// - Examens : mock_exam_results, ses 10 derniers en pourcentage.
// - Codex : codex_progression (jamais lireCodex ni lirePanneau : elles
//   écrivent en base), le fil, l'acte en cours, la quête en cours.
// - Rythme : quiz_answer_log et practice_session_results des 60 derniers
//   jours, la matrice 7 × 24 en heure de Paris ; aucun horodatage ne part
//   au client.
// - Temps sur le site (la tuile d'après) : les totaux de temps_site_resume
//   (lib/temps-site.ts), jamais le détail par jour.
// Le jour J, les examens, le rythme et la suite des 5 derniers duels suivent
// la visibilité du Journal (`ouvert`). Toute lecture se dégrade en null.
// Module serveur ; les fonctions pures (formeDesDuels, jourJDepuis,
// variationElo, examensDepuis, matriceRythme, rythmeDepuis, codexDepuis,
// classementDepuis) se testent sans base : scripts/profil/test-tuiles-neuves.tsx.

import type { SupabaseClient } from "@supabase/supabase-js";
import { countPlayers } from "@/components/classement/data";
import { COSMETIQUES_CODEX, ACTES, QUETES_TRAME, filDesActes } from "@/lib/codex/catalogue";
import { PROGRAMME_DEFAUT } from "@/lib/codex/programmes";
import { acteCourantDe } from "@/lib/codex/moteur";
import { titreActe, titreClair } from "@/lib/codex/titres-clairs";
import type { Recompense } from "@/lib/codex/types";
import { getMaitrise } from "@/lib/mastery";
import { dateExamen, jourParis } from "@/lib/objectif";
import { estJour, joursEntre } from "@/lib/objectif-calc";
import { rankFor } from "@/lib/ranks";
import { parHeure, type EtapeCodex, type ExtraitClassement, type ExtraitCodex, type ExtraitExamens, type ExtraitJourJ, type ExtraitRythme, type IssueDuel, type MomentJournee } from "@/lib/profil/blocs-donnees";
import { BLOCS_NEUVES as V } from "@/lib/voice-blocs-neuves";
import { romain } from "@/lib/voice-codex";
import { lireTempsSite, type ResumeTemps } from "@/lib/temps-site";

const JOUR_MS = 86_400_000;

// ── Duels : les 5 derniers ────────────────────────────────────────────────

export const DUELS_FORME = 5;

/**
 * Les derniers duels du joueur, du plus ancien au plus récent : V (il a gagné),
 * D (l'autre a gagné), N (aucun gagnant). `lignes` : des duels terminés, dans
 * n'importe quel ordre.
 */
export function formeDesDuels(lignes: { winner_id: string | null; finished_at: string | null }[], id: string): IssueDuel[] {
  const t = (l: { finished_at: string | null }) => Date.parse(l.finished_at ?? "") || 0;
  return [...lignes]
    .sort((a, b) => t(b) - t(a))
    .slice(0, DUELS_FORME)
    .reverse()
    .map((l) => (l.winner_id === id ? "V" : l.winner_id ? "D" : "N"));
}

// ── Jour J ────────────────────────────────────────────────────────────────

/**
 * Le compte à rebours : les jours entre aujourd'hui et la date d'examen
 * (Paris). Pas de date, une date illisible ou un examen passé : null.
 * `couverture` : la part du programme couverte ; 0 (rien de mesuré) ou
 * inconnue : null.
 */
export function jourJDepuis(examen: string | null | undefined, aujourdhui: string, couverture: number | null | undefined): ExtraitJourJ | null {
  if (!estJour(examen) || !estJour(aujourdhui)) return null;
  const jours = joursEntre(aujourdhui, examen);
  if (!Number.isFinite(jours) || jours < 0) return null;
  const c = typeof couverture === "number" && Number.isFinite(couverture) && couverture > 0 ? Math.min(100, Math.round(couverture)) : null;
  return { jours, date: examen, couverture: c };
}

// ── Classement ────────────────────────────────────────────────────────────

/** Une ligne de rating_events. */
export type EvenementElo = { created_at: string; elo_before: number; elo_after: number };

/**
 * La variation de l'ELO depuis `depuisMs` : l'ELO actuel moins l'ELO d'avant
 * le premier match de la période (0 sans match). Deux matchs réglés à la même
 * seconde : celui que l'autre ne précède pas.
 */
export function variationElo(evenements: EvenementElo[], eloActuel: number, depuisMs: number): number {
  const dans = evenements.filter((e) => (Date.parse(e.created_at) || 0) >= depuisMs).sort((a, b) => (Date.parse(a.created_at) || 0) - (Date.parse(b.created_at) || 0));
  if (!dans.length) return 0;
  const groupe = dans.filter((e) => e.created_at === dans[0].created_at);
  const premier = groupe.find((e) => !groupe.some((f) => f !== e && f.elo_after === e.elo_before)) ?? groupe[0];
  return Math.round(eloActuel - premier.elo_before);
}

/**
 * Sa place, son palier (comme l'en-tête : l'ELO, la maîtrise, la place), où il en est dans ce palier et la
 * variation de la semaine. Pas de place (pas classé) : null.
 */
export function classementDepuis(o: { place: number | null | undefined; joueurs: number | null | undefined; elo: number; maitrise: number | null; variation: number }): ExtraitClassement | null {
  if (typeof o.place !== "number" || !(o.place >= 1)) return null;
  const r = rankFor(o.elo, o.maitrise, o.place);
  return {
    place: o.place,
    joueurs: typeof o.joueurs === "number" && o.joueurs >= o.place ? o.joueurs : null,
    elo: Math.round(o.elo),
    palier: r.tierIndex,
    division: r.division,
    progress: r.progress,
    suivant: r.next ? r.next.name : null,
    points: r.pointsToNext,
    variation: Math.round(o.variation),
  };
}

// ── Examens blancs ────────────────────────────────────────────────────────

/** Une ligne de mock_exam_results avec le titre de son examen. */
export type LigneExamen = { score: number | null; total: number | null; completed_at: string | null; mock_exams?: { title: string | null } | { title: string | null }[] | null };

export const EXAMENS_MONTRES = 10;

/** Ses examens blancs en pourcentage, du plus ancien au plus récent, les 10 derniers ; aucun examen (ou total nul) : null. */
export function examensDepuis(lignes: LigneExamen[]): ExtraitExamens | null {
  const valides = lignes
    .filter((l) => typeof l.score === "number" && typeof l.total === "number" && l.total > 0)
    .map((l) => ({ t: Date.parse(l.completed_at ?? "") || 0, pct: Math.max(0, Math.min(100, Math.round(((l.score as number) / (l.total as number)) * 100))), titre: (Array.isArray(l.mock_exams) ? l.mock_exams[0]?.title : l.mock_exams?.title) ?? null }))
    .sort((a, b) => a.t - b.t);
  if (!valides.length) return null;
  return { scores: valides.slice(-EXAMENS_MONTRES).map((x) => ({ pct: x.pct, titre: x.titre })), n: valides.length };
}

// ── Codex ─────────────────────────────────────────────────────────────────

/** Ce que gagne une quête, en clair : « 150 XP », « folio « Étude pour l'Adoration » »… */
export function texteRecompense(r: Recompense): string {
  const nom = (cle: string | undefined) => (cle ? COSMETIQUES_CODEX.find((c) => c.cle === cle)?.nom : undefined);
  return [
    r.xp > 0 ? V.xp(r.xp) : null,
    r.folio && nom(r.folio) ? `folio « ${nom(r.folio)} »` : null,
    r.titre && nom(r.titre) ? `titre « ${nom(r.titre)} »` : null,
    r.cosmetique && nom(r.cosmetique) ? (nom(r.cosmetique) as string) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Où il en est au Codex d'après ses lignes faites (terminée ou récompensée) : le fil principal (le prologue,
 * puis les actes II à VI), l'acte en cours (acteCourantDe), la première quête de la trame de cet acte qu'il
 * n'a pas faite (pas les facultatives, pas les retirées). Le fil achevé : `acte` null, plus de quête.
 */
export function codexDepuis(lignes: { quete_id: string; etat: string }[]): ExtraitCodex | null {
  const faites = new Set(lignes.filter((l) => l.etat === "terminee" || l.etat === "recompensee").map((l) => l.quete_id));
  const clos = ACTES.filter((a) => faites.has(`acte:${a.id}`)).map((a) => a.id);
  const fil = filDesActes(PROGRAMME_DEFAUT);
  if (!fil.length) return null;
  const courant = acteCourantDe(clos);
  // un acte parallèle (les outils) ou plus d'acte ouvert : tout le fil est clos
  const enCours = courant && !courant.parallele && fil.some((a) => a.id === courant.id) ? courant : null;
  const etapes: EtapeCodex[] = fil.map((a) => ({
    marque: a.numero === 0 ? "P" : romain(a.numero),
    titre: titreActe(a),
    etat: enCours ? (clos.includes(a.id) ? "fait" : a.id === enCours.id ? "cours" : "avenir") : "fait",
  }));
  if (!enCours) return { fil: etapes, acte: null, quete: null };
  const quete = QUETES_TRAME.filter((q) => q.acte === enCours.id && !q.optionnelle && !q.retiree)
    .sort((a, b) => a.ordre - b.ordre)
    .find((q) => !faites.has(q.id));
  return {
    fil: etapes,
    acte: { numero: enCours.numero, total: fil[fil.length - 1].numero },
    quete: quete ? { titre: titreClair(quete), recompense: texteRecompense(quete.recompense) } : null,
  };
}

// ── Rythme ────────────────────────────────────────────────────────────────

/** Moins de réponses que cela sur 60 jours : le rythme ne dit rien de fiable. */
export const RYTHME_MIN = 30;
export const RYTHME_JOURS = 60;

const HEURE_PARIS = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", weekday: "short", hour: "2-digit", hourCycle: "h23" });
const JOUR_DE: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

/** Le jour (0 : lundi … 6 : dimanche) et l'heure (0–23) d'un instant, à Paris ; null : instant illisible. */
export function jourHeureParis(ms: number): [number, number] | null {
  if (!Number.isFinite(ms)) return null;
  const p = HEURE_PARIS.formatToParts(new Date(ms));
  const jour = JOUR_DE[p.find((x) => x.type === "weekday")?.value ?? ""];
  const heure = Number(p.find((x) => x.type === "hour")?.value);
  return jour === undefined || !Number.isFinite(heure) ? null : [jour, heure % 24];
}

/** Les réponses par jour de la semaine × heure (Paris) : 7 lignes de 24 entiers ; `w` : le poids d'un instant (1 par défaut). */
export function matriceRythme(instants: { t: string | number; w?: number }[]): { grille: number[][]; total: number } {
  const grille = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
  let total = 0;
  for (const { t, w = 1 } of instants) {
    const jh = jourHeureParis(typeof t === "number" ? t : Date.parse(t));
    if (!jh || !(w > 0)) continue;
    grille[jh[0]][jh[1]] += w;
    total += w;
  }
  return { grille, total };
}

/** Les moments de la journée et leurs heures : la nuit (23 h → 5 h), le matin, le midi, l'après-midi, le soir. */
export const MOMENTS: [MomentJournee, number[]][] = [
  ["matin", [5, 6, 7, 8, 9, 10, 11]],
  ["midi", [12, 13]],
  ["apres-midi", [14, 15, 16, 17, 18]],
  ["soir", [19, 20, 21, 22]],
  ["nuit", [23, 0, 1, 2, 3, 4]],
];

/** L'heure forte (la première en cas d'égalité). */
export function heurePic(heures: number[]): number {
  let pic = 0;
  heures.forEach((v, h) => {
    if (v > heures[pic]) pic = h;
  });
  return pic;
}

/** Le moment de la journée où il révise le plus (le premier en cas d'égalité). */
export function momentDe(heures: number[]): MomentJournee {
  let meilleur = MOMENTS[0];
  let max = -1;
  for (const m of MOMENTS) {
    const v = m[1].reduce((t, h) => t + (heures[h] ?? 0), 0);
    if (v > max) {
      max = v;
      meilleur = m;
    }
  }
  return meilleur[0];
}

/** Le rythme d'après les instants de réponse (60 jours) ; moins de RYTHME_MIN réponses : null. */
export function rythmeDepuis(instants: { t: string | number; w?: number }[]): ExtraitRythme | null {
  const { grille, total } = matriceRythme(instants);
  if (total < RYTHME_MIN) return null;
  const heures = parHeure(grille);
  return { grille, pic: heurePic(heures), moment: momentDe(heures), total };
}

// ── Les lectures ──────────────────────────────────────────────────────────

/** Quelles tuiles sont posées (donc à lire). */
export type BesoinsNeuves = { duels: boolean; jourj: boolean; classement: boolean; examens: boolean; codex: boolean; rythme: boolean; temps: boolean };
export const besoinsDe = (blocs: ReadonlySet<string>): BesoinsNeuves => ({
  duels: blocs.has("duels"),
  jourj: blocs.has("jourj"),
  classement: blocs.has("classement"),
  examens: blocs.has("examens"),
  codex: blocs.has("codex"),
  rythme: blocs.has("rythme"),
  temps: blocs.has("temps"),
});
/** Personnaliser : le propriétaire peut poser n'importe laquelle, tout se lit. */
export const BESOINS_TOUS: BesoinsNeuves = { duels: true, jourj: true, classement: true, examens: true, codex: true, rythme: true, temps: true };
export const aDesBesoins = (b: BesoinsNeuves) => Object.values(b).some(Boolean);

/** Ce que les lectures rendent ; le classement s'assemble avec la place que la page a déjà lue (classementDepuis). */
export type LuNeuves = {
  formeDuels: IssueDuel[] | null;
  jourJ: ExtraitJourJ | null;
  examens: ExtraitExamens | null;
  codex: ExtraitCodex | null;
  rythme: ExtraitRythme | null;
  /** le temps sur le site (les totaux de temps_site_resume) */
  temps: ResumeTemps | null;
  joueurs: number | null;
  variation: number;
};

const SANS_RIEN: LuNeuves = { formeDuels: null, jourJ: null, examens: null, codex: null, rythme: null, temps: null, joueurs: null, variation: 0 };

async function lireFormeDuels(sb: SupabaseClient, id: string): Promise<IssueDuel[] | null> {
  try {
    const { data, error } = await sb
      .from("duels")
      .select("winner_id,finished_at")
      .or(`challenger_id.eq.${id},opponent_id.eq.${id}`)
      .eq("status", "finished")
      .order("finished_at", { ascending: false })
      .limit(DUELS_FORME);
    return error || !data ? null : formeDesDuels(data as { winner_id: string | null; finished_at: string | null }[], id);
  } catch {
    return null;
  }
}

async function lireJourJ(sb: SupabaseClient, id: string, aujourdhui: string): Promise<ExtraitJourJ | null> {
  try {
    const examen = await dateExamen(id);
    if (!examen) return null;
    // déjà lue par l'en-tête du profil (mémo de 60 s) : presque rien de plus
    const m = await getMaitrise(sb, id).catch(() => null);
    return jourJDepuis(examen, aujourdhui, m?.couverture ?? null);
  } catch {
    return null;
  }
}

async function lireExamens(sb: SupabaseClient, id: string): Promise<ExtraitExamens | null> {
  try {
    // les 20 derniers rendus (les plus récents d'abord), remis dans l'ordre par examensDepuis
    const { data, error } = await sb
      .from("mock_exam_results")
      .select("score,total,completed_at,mock_exams(title)")
      .eq("user_id", id)
      .order("completed_at", { ascending: false, nullsFirst: false })
      .limit(20);
    return error || !data ? null : examensDepuis(data as unknown as LigneExamen[]);
  } catch {
    return null;
  }
}

async function lireCodex(sb: SupabaseClient, id: string): Promise<ExtraitCodex | null> {
  try {
    // seulement ce qu'il faut : les actes et la trame (jamais lireCodex ni lirePanneau : elles écrivent en base)
    const ids = [...ACTES.map((a) => `acte:${a.id}`), ...QUETES_TRAME.map((q) => q.id)];
    const { data, error } = await sb.from("codex_progression").select("quete_id,etat").eq("user_id", id).in("quete_id", ids).in("etat", ["terminee", "recompensee"]).limit(500);
    return error || !data ? null : codexDepuis(data as { quete_id: string; etat: string }[]);
  } catch {
    return null;
  }
}

async function lireRythme(sb: SupabaseClient, id: string, maintenant: number): Promise<ExtraitRythme | null> {
  const depuis = new Date(maintenant - RYTHME_JOURS * JOUR_MS).toISOString();
  const reponses = async () => {
    const out: { t: string }[] = [];
    // par pages de 1 000 (la limite de l'API), cinq au plus
    for (let page = 0; page < 5; page++) {
      const { data, error } = await sb
        .from("quiz_answer_log")
        .select("answered_at")
        .eq("user_id", id)
        .gte("answered_at", depuis)
        .order("answered_at", { ascending: false })
        .range(page * 1000, page * 1000 + 999);
      if (error || !data) break;
      for (const r of data as { answered_at: string }[]) out.push({ t: r.answered_at });
      if (data.length < 1000) break;
    }
    return out;
  };
  const seances = async () => {
    const { data, error } = await sb.from("practice_session_results").select("completed_at,total").eq("user_id", id).gte("completed_at", depuis).limit(1000);
    if (error || !data) return [];
    return (data as { completed_at: string | null; total: number | null }[]).filter((r) => r.completed_at && (r.total ?? 0) > 0).map((r) => ({ t: r.completed_at as string, w: Math.min(r.total as number, 200) }));
  };
  try {
    const [a, b] = await Promise.all([reponses().catch(() => []), seances().catch(() => [])]);
    return rythmeDepuis([...a, ...b]);
  } catch {
    return null;
  }
}

async function lireVariation(sb: SupabaseClient, id: string, elo: number, maintenant: number): Promise<number> {
  try {
    const depuisMs = maintenant - 7 * JOUR_MS;
    const { data, error } = await sb
      .from("rating_events")
      .select("created_at,elo_before,elo_after")
      .eq("user_id", id)
      .gte("created_at", new Date(depuisMs).toISOString())
      .order("created_at", { ascending: true })
      .limit(200);
    return error || !data ? 0 : variationElo(data as EvenementElo[], elo, depuisMs);
  } catch {
    return 0;
  }
}

/**
 * Lit ce que les tuiles posées demandent, en parallèle. `ouvert` : le Journal
 * est ouvert à celui qui regarde (le jour J, les examens, le rythme et les
 * derniers duels n'en sortent pas sinon). `admin` : le client admin (les
 * duels, les examens, le Codex et les réponses d'un autre ne se lisent qu'avec) ;
 * sans lui, seul le propriétaire (`moi`) lit ses propres lignes. Rien ne lève.
 */
export async function lireTuilesNeuves(o: {
  id: string;
  sb: SupabaseClient;
  admin: SupabaseClient | null;
  moi: boolean;
  besoins: BesoinsNeuves;
  ouvert: boolean;
  elo: number;
  aujourdhui?: string;
  maintenant?: number;
}): Promise<LuNeuves> {
  const { id, sb, besoins, ouvert } = o;
  const lecteur = o.admin ?? (o.moi ? sb : null);
  const aujourdhui = o.aujourdhui ?? jourParis();
  const maintenant = o.maintenant ?? Date.now();
  try {
    const [formeDuels, jourJ, examens, codex, rythme, temps, joueurs, variation] = await Promise.all([
      besoins.duels && ouvert && lecteur ? lireFormeDuels(lecteur, id) : Promise.resolve(null),
      besoins.jourj && ouvert ? lireJourJ(sb, id, aujourdhui) : Promise.resolve(null),
      besoins.examens && ouvert && lecteur ? lireExamens(lecteur, id) : Promise.resolve(null),
      besoins.codex && lecteur ? lireCodex(lecteur, id) : Promise.resolve(null),
      besoins.rythme && ouvert && lecteur ? lireRythme(lecteur, id, maintenant) : Promise.resolve(null),
      // avec le client de celui qui regarde : la base ne rend les totaux d'un autre que si la tuile est sur sa page
      besoins.temps ? lireTempsSite(sb, id) : Promise.resolve(null),
      besoins.classement ? countPlayers(sb).catch(() => null) : Promise.resolve(null),
      besoins.classement ? lireVariation(sb, id, o.elo, maintenant) : Promise.resolve(0),
    ]);
    return { formeDuels, jourJ, examens, codex, rythme, temps, joueurs, variation };
  } catch {
    return SANS_RIEN;
  }
}
