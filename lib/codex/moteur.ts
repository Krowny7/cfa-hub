// Le Codex : le MOTEUR générique. Module neutre (aucun accès réseau, aucune
// dépendance serveur) : il reçoit ce que la base a lu (progression, compteurs,
// mesures) et rend ce qu'il faut écrire et afficher. Aucune quête n'est codée
// ici : tout vient du catalogue (lib/codex/catalogue.ts) et de la grammaire
// (lib/codex/types.ts). Le côté serveur (lecture, écriture, repli sans
// migration) est dans lib/codex/serveur.ts.
//
// Le calcul se fait en deux passes sur la MÊME fonction d'évaluation :
//   1. planifier(entree)  : évalue à blanc toutes les quêtes et collecte les
//      compteurs à demander à la base (codex_lire) ;
//   2. evaluer(entree)    : avec les réponses, fait la cascade des prérequis
//      (une quête déjà remplie se valide dès que ses prérequis tombent), décide
//      de la rétroactivité, des récompenses (plafonnées) et des ouvertures, et
//      construit la vue (prochaine quête, contrats, branches…).
// La bible : docs/codex/CONCEPTION.md.

import { ACTES, CHAINES, DECOUVERTE, MODELES_CONTRATS, PHASES, PROGRAMME, RECOMMANDATION, XP, xpContrat, ajusterCiblee, catalogueCodex, quetesSemaine, type Semaine, cibleeDe, contenuDuProgramme, estCiblee, formatCiblee, lienCiblee, phaseDe, plafondQuete, plafondRetro, queteBranchee, evenementsDe, tailleMaxCiblee, type ContenuMatiere } from "@/lib/codex/catalogue";
import { PRACTICE_V3, ROUTES, destinationDe, type ContexteDestination, type Destination } from "@/lib/codex/destinations";
import { gabarit } from "@/lib/codex/elision";
import { CAPACITES_VIDE, budgetParDefaut, questionsDes7Jours } from "@/lib/codex/reglage";
import { MALLE_PRETE } from "@/lib/codex/calendrier";
import { maitriseDuCodex, maitriseLue } from "@/lib/codex/cap";
import { actesDe, programmeActif, type ProgrammeJoueur } from "@/lib/codex/programmes";
import { CHAPITRES_FIL, compterPiecesCodex, palierAtteint, paliersRecompenses, quetesFilRouge, tropheesAuMoins, type TropheesLus } from "@/lib/codex/fil-rouge";
import { levelInfoFromXp } from "@/lib/leveling";
import { DEFAULT_ELO, rankFor } from "@/lib/ranks";
import { notionParId, notionsDeMatiere } from "@/lib/notions";
import { decaleJour, joursEntre } from "@/lib/objectif-calc";
import { BUDGET_REPRISE, DUREE_SPRINT, differeeEnSprint, enReprise, estSprint, facteurBande, jalonsDe, semainesRestantes, type Verdict } from "@/lib/codex/plan";
import type { Acte, Budget, Capacite, Capacites, Comparaison, Requis, Emplacement, EtapeBranche, Fenetre, FiltreMesure, ModeleContrat, Objectif, Phase, Prerequis, Quete, TypeEvenement, TypeMesure } from "@/lib/codex/types";

// ── Ce que la base donne ───────────────────────────────────────────────

/** Un compteur demandé à codex_lire (migration_codex.sql). */
export type Demande = {
  id: string;
  evenement: TypeEvenement;
  filtre?: Record<string, unknown>;
  fenetre?: unknown;
  /** jour de Paris des fenêtres « jour » / « semaine » (AAAA-MM-JJ) */
  jour?: string;
  distinct?: string;
  somme?: string;
  seuil: number;
};

export type ResultatCompteur = { n: number; atteint: string | null };

/** Les mesures que codex_lire sait faire (tout est optionnel : une table absente = clé absente). */
export type MesuresSql = {
  ratures_ouvertes?: { total: number; matieres: Record<string, number> };
  notions?: Record<string, number>;
  jours?: { jour: string; n: number }[];
  drill_pages?: { matiere: string; page: number; meilleur: number }[];
  drill_totaux?: Record<string, number>;
  maitrise?: Record<string, { pct: number; questions: number; debut: number | null }>;
  types_calcul_tenus?: number;
  sceaux?: Record<string, number>;
  elo?: number | null;
  pic_elo?: number | null;
  xp_total?: number;
  inscrit_le?: string;
  serie?: number;
  meilleure_serie?: number;
  /** codex_mesures_v3 (migration_codex_v3.sql §4) : jours à 10 questions ou plus, à vie */
  jours_encre_total?: number;
  /** codex_mesures_v3 : programmes menés (codex_programmes_joueur, statut « mene ») */
  programmes_menes?: number;
  /** codex_mesures_v3 : branches menées jusqu'à « Maître de… », tous programmes */
  maitres_total?: number;
  /** codex_mesures_v3 : trophées par source et par palier (1 bronze … 4 diamant), V3 §2.5 */
  trophees?: TropheesLus;
  /** codex_mesures_v3 : par notion, les réponses (n) et les justes parmi les 5 dernières (j5), V3 §8.5 */
  notions_tenues?: Record<string, { n: number; j5: number }>;
  /** codex_mesures_v3 : les spéciaux par matière (plus longues suites d'affilée), V3 §8.7 */
  speciaux_matiere?: { serie_bonnes?: Record<string, number>; serie_calculs?: Record<string, number> };
  /** codex_mesures_v3 (A4a) : examens blancs à débriefer, V3 §7.6 */
  blancs_a_debriefer?: number;
  /**
   * codex_mesures_v3 (A4a) : la maîtrise unique (maitrise_joueur, V3 §4) ; questions = réponses de
   * la fenêtre (60 au plus), pct null sous 10 ; `ancienne` garde le verrou des rangs (§4.5)
   */
  maitrise_unique?: Record<string, { pct: number | null; questions: number; total: number; debut: number | null; statut: "non_mesuree" | "provisoire" | "mesuree"; derniere: string | null; ancienne: number | null }>;
  /** codex_mesures_v3 (A4a) : la file « À revoir » (revisions_dues, V3 §5.1), ses comptes */
  revoir?: { aujourdhui: number; demain: number; ratures: number; rappels: number };
  /** codex_mesures_v3 (A4a) : ratures scellées (V3 §5.3) */
  ratures_scellees?: number;
  /** codex_mesures_v3 (A4a) : les causes d'erreur des débriefs des 60 derniers jours, en %, et leur nombre (V3 §7.6) */
  causes?: { savoir: number; lecture: number; calcul: number; temps: number; chance: number; n: number };
};

export type LectureSql = { compteurs: Record<string, ResultatCompteur>; mesures: MesuresSql; speciaux: Record<string, number> };

export const LECTURE_VIDE: LectureSql = { compteurs: {}, mesures: {}, speciaux: {} };

/** Une ligne de codex_progression. */
export type LigneProgression = {
  quete_id: string;
  periode: string;
  etat: "verrouillee" | "disponible" | "active" | "terminee" | "recompensee";
  progression: number;
  cible: number | null;
  ouverte_le: string;
  terminee_le: string | null;
  recompensee_le: string | null;
  retro: boolean;
  xp: number;
  cosmetique: string | null;
  titre: string | null;
  vu: boolean;
};

/** Un contrat du jour tiré (codex_contrats). */
export type ContratTire = { emplacement: Emplacement; modele: string; params: Partial<Record<"matiere" | "notion" | "fiche", string>>; change: boolean };

export type Entree = {
  /** le catalogue : par défaut catalogueCodex() */
  catalogue?: Quete[];
  contenu?: ContenuMatiere[];
  now: Date;
  /** le jour de Paris (AAAA-MM-JJ) */
  jour: string;
  /** date d'examen (AAAA-MM-JJ) */
  jourJ: string | null;
  /** rl_objectif : total de questions visé et jour où il a été fixé */
  objectif: { total: number; depuis: string } | null;
  visiteVue: boolean;
  progression: LigneProgression[];
  /** les contrats du jour déjà tirés (vide : à tirer) */
  contrats: ContratTire[];
  /** pas encore de ligne codex_joueur : ce qui se valide est rétroactif */
  premier: boolean;
  dernierCalcul: Date | null;
  lecture: LectureSql;
  /** matière de la dernière séance (continuité) */
  derniereMatiere?: string | null;
  /** points faibles, du plus net au moins net (notion, score 0–100) */
  pointsFaibles?: { notion: string; score: number }[];
  /** réponses par matière, sur JOURS_OUBLI jours et depuis toujours (demandesActivite) : le contrat « prend la poussière » */
  activite?: Record<string, { recentes: number; total: number }>;
  /** le temps que le joueur s'est donné aujourd'hui (« J'ai 30 min ») ; absent : budgetDuJour le déduit de son rythme */
  budget?: Budget | null;
  /** les quêtes écartées aujourd'hui par « Une autre idée ? » (ids) : recommander ne les propose plus jusqu'à demain */
  ecartees?: string[];
  /** ce que la base sait faire (V3 §1.8) ; absent : rien (CAPACITES_VIDE) */
  capacites?: Capacites;
  /** les programmes du joueur (codex_programmes_joueur, V3 §1.6) ; absent ou vide : CFA I actif, rien de mené */
  programmes?: ProgrammeJoueur[];
  /**
   * Le marqueur du rattrapage (V3 §1.9) : les capacités de la base vues au
   * dernier calcul écrit. null : jamais (premier calcul v3) ; absent : pas de
   * rattrapage (aperçus, tests d'avant la v3).
   */
  capacitesVues?: Partial<Capacites> | null;
  /** la malle de l'examen (user_metadata.rl_malle, V3 §7.3) : cases cochées ; absent : pas encore lue (la quête n'est pas branchée) */
  malleCoches?: number;
  /**
   * La séance du jour déjà proposée (codex_seances, V3 §6) : les objectifs de
   * ses blocs, demandés à codex_lire avec le reste (evaluerObjectifs) ;
   * `lanceeLe` : le départ de la fenêtre « depuisLancement » (null : le jour) ;
   * `tenue` : lancée, tous ses blocs faits : le bonus du trio est versé, comme
   * pour trois contrats sur trois (V3 §6.4).
   */
  seance?: { objectifs: Objectif[]; lanceeLe: string | null; tenue?: boolean };
  /** le premier calcul du Codex (codex_joueur.premier_calcul) : il décide du mode sprint (V3 §10.2) ; absent : aujourd'hui */
  premierCalcul?: string | null;
  /** le choix de la semaine (codex_semaine, V3 §10.3) ; absent ou d'une autre semaine : les contrats de la semaine d'avant */
  semaine?: Semaine | null;
  /** le verdict de l'examen (codex_resultat, V3 §10.5) : les bandes basses pèsent plus dans la faiblesse */
  verdict?: Verdict | null;
};

/** Ce que la base sait faire pour cette entrée : rien tant que codex_mesures_v3 ne l'a pas dit. */
export const capacitesDe = (e: Pick<Entree, "capacites">): Capacites => e.capacites ?? CAPACITES_VIDE;

/** La base sait-elle faire ce que la quête exige (Quete.requiert) ? Sinon la quête n'est pas branchée à l'exécution. */
export function requisOk(q: Pick<Quete, "requiert">, c: Capacites): boolean {
  return (q.requiert ?? []).every((r: Requis) => (r === "journal3" ? c.journal === 3 : c[r]));
}

/** Ce qu'une quête exige de la base : son `requiert`, plus la capacité « fil » pour un palier du fil rouge (il ne s'écrit pas sans elle). */
export const requisDe = (q: Pick<Quete, "requiert" | "famille">): Requis[] => (q.famille === "fil" ? [...(q.requiert ?? []), "fil"] : (q.requiert ?? []));

/**
 * Les mesures qui changent de source quand une capacité s'allume, sans que la
 * quête en dépende pour être suivie : la maîtrise passe de l'ancienne règle à
 * la maîtrise unique (maitriseLue, lib/codex/cap.ts) dès que codex_mesures_v3
 * la rend. `pic_palier` lit l'ancienne maîtrise : il n'en est pas.
 */
const MESURES_DE_CAPACITE: Partial<Record<string, Requis>> = {
  maitrise: "maitrise",
  maitrise_programme: "maitrise",
  matieres_au_dessus: "maitrise",
  matieres_remontees: "maitrise",
  preparation: "maitrise",
};
const capacitesDeObjectif = (o: Objectif, out: Set<Requis>): Set<Requis> => {
  if (o.k === "mesure") {
    const r = MESURES_DE_CAPACITE[o.mesure];
    if (r) out.add(r);
  } else if (o.k === "tous" || o.k === "unDe") for (const x of o.objectifs) capacitesDeObjectif(x, out);
  return out;
};

/**
 * Ce dont dépend une quête pour le rattrapage (V3 §1.9) : ce qu'elle exige
 * (requisDe), plus la capacité dont une de ses mesures change de source. Sert
 * au rattrapage seulement : `suivie` n'en tient pas compte (la quête reste
 * affichée et jouable sans la capacité, sur l'ancienne mesure).
 */
export const dependancesDe = (q: Pick<Quete, "requiert" | "famille" | "objectif">): Requis[] => [...capacitesDeObjectif(q.objectif, new Set(requisDe(q)))];

const CLES_CAPACITES: Capacite[] = ["fil", "mesures", "seances", "revoir", "maitrise", "trophees", "debrief", "ratures_seches"];

/**
 * Ce qui est nouveau pour ce joueur depuis son dernier calcul écrit (le
 * rattrapage, V3 §1.9) : `v3` au premier calcul v3 (aucun marqueur), et les
 * capacités de la base qui s'allument pour la première fois. null : pas de
 * marqueur dans l'entrée, rien à rattraper.
 */
export function nouveautesDe(e: Pick<Entree, "capacites" | "capacitesVues">): { v3: boolean; requis: Set<Requis> } | null {
  if (e.capacitesVues === undefined) return null;
  const c = capacitesDe(e);
  const vues = e.capacitesVues;
  const requis = new Set<Requis>(CLES_CAPACITES.filter((k) => c[k] && !vues?.[k]));
  if (c.journal === 3 && vues?.journal !== 3) requis.add("journal3");
  return { v3: vues === null, requis };
}

/**
 * Le marqueur à écrire après une écriture réussie du lot : tout ce qui a été
 * vu (une capacité vue le reste) ; null : inchangé, ou pas de marqueur dans
 * l'entrée.
 */
export function marqueurDe(e: Pick<Entree, "capacites" | "capacitesVues">): Capacites | null {
  if (e.capacitesVues === undefined) return null;
  const c = capacitesDe(e);
  const vues = e.capacitesVues ?? {};
  const out: Capacites = { ...c, journal: vues.journal === 3 || c.journal === 3 ? 3 : 2 };
  for (const k of CLES_CAPACITES) out[k] = !!vues[k] || c[k];
  const change = e.capacitesVues === null || CLES_CAPACITES.some((k) => out[k] !== !!vues[k]) || out.journal !== (vues.journal ?? 2);
  return change ? out : null;
}

/**
 * L'examen est-il derrière le joueur (prérequis « apresExamen », V3 §1.6) :
 * un programme mené, ou le jour J de son programme actif (daté) passé.
 */
export function apresExamenDe(e: Pick<Entree, "programmes" | "jour" | "jourJ">): boolean {
  if (e.programmes?.some((p) => p.statut === "mene")) return true;
  const j = joursAvantExamen(e.jour, e.jourJ);
  return !!programmeActif(e.programmes).examen && j !== null && j < 0;
}

/** Les actes de la trame du joueur : ceux de son programme actif (CFA I : ACTES). */
export const actesDuJoueur = (e: Pick<Entree, "programmes">): Acte[] => actesDe(programmeActif(e.programmes));

/** Les actes clos d'après les lignes de progression (« acte:<id> » récompensé). */
export const actesClosDe = (progression: LigneProgression[]): string[] =>
  progression.filter((l) => l.quete_id.startsWith("acte:") && (l.etat === "recompensee" || l.etat === "terminee")).map((l) => l.quete_id.slice(5));

/** La phase du joueur : par son jour J s'il en a un, sinon par l'avancement de la trame de son programme (V3 §1.4). */
export function phaseJoueur(e: Pick<Entree, "programmes" | "jour" | "jourJ">, actesClos: Iterable<string>): Phase {
  return phaseDe(joursAvantExamen(e.jour, e.jourJ), { def: programmeActif(e.programmes), actesClos, apresExamen: apresExamenDe(e) });
}

/**
 * Le budget du jour : celui que le joueur a choisi, sinon celui de son rythme des 7 derniers jours actifs avant
 * aujourd'hui (il ne bouge pas dans la journée) ; le jour d'un retour après une absence, 15 minutes (V3 §10.4).
 */
export const budgetDuJour = (e: Pick<Entree, "budget" | "lecture" | "jour">): Budget =>
  e.budget ?? (repriseDuJour(e) ? BUDGET_REPRISE : budgetParDefaut(questionsDes7Jours(e.lecture.mesures.jours, e.jour)));

/** Le jour du retour après 4 jours sans réponse au moins : reprise douce, un seul contrat, séance courte (V3 §10.4). */
export const repriseDuJour = (e: Pick<Entree, "lecture" | "jour">): boolean => enReprise(e.lecture.mesures.jours, e.jour);

/** Le mode sprint (V3 §10.2) : un programme daté dont le jour J tombait à moins de 8 semaines du premier calcul. */
export const sprintDe = (e: Pick<Entree, "jour" | "jourJ" | "premierCalcul" | "programmes">): boolean =>
  !!programmeActif(e.programmes).examen && estSprint(e.jourJ, e.premierCalcul ?? null, e.jour);

/** Les objectifs du plan daté (V3 §10.2), demandés à codex_lire avec le reste ; aucun sans jour J. */
export const objectifsPlan = (e: Pick<Entree, "jourJ" | "programmes">): Objectif[] => (e.jourJ ? jalonsDe(programmeActif(e.programmes).cle).map((j) => j.objectif) : []);

/** Une matière sans réponse depuis ce nombre de jours « prend la poussière ». */
export const JOURS_OUBLI = 10;

/** Les compteurs à demander à codex_lire pour l'activité par matière (avant le tirage des contrats). */
export function demandesActivite(contenu: ContenuMatiere[], jour: string): Demande[] {
  return contenu.flatMap((m) => [
    { id: `activite:${m.key}:recentes`, evenement: "question_repondue" as const, filtre: { matiere: m.key }, fenetre: { jours: JOURS_OUBLI }, jour, seuil: 1 },
    { id: `activite:${m.key}:total`, evenement: "question_repondue" as const, filtre: { matiere: m.key }, fenetre: "toujours", jour, seuil: 1 },
  ]);
}

/** L'activité par matière lue dans la réponse de codex_lire (demandesActivite). */
export function lireActivite(contenu: ContenuMatiere[], brut: LectureSql): NonNullable<Entree["activite"]> {
  return Object.fromEntries(contenu.map((m) => [m.key, { recentes: brut.compteurs[`activite:${m.key}:recentes`]?.n ?? 0, total: brut.compteurs[`activite:${m.key}:total`]?.n ?? 0 }]));
}

// ── Petits outils ──────────────────────────────────────────────────────

const clePeriode = (id: string, periode: string) => `${id}|${periode}`;
export const lundiDe = (jour: string) => {
  const d = new Date(jour + "T12:00:00Z");
  const dow = (d.getUTCDay() + 6) % 7; // lundi = 0
  return decaleJour(jour, -dow);
};
/** La période d'une instance : '' (unique), le lundi (hebdo) ou le jour (quotidienne). */
export const periodeDe = (q: Pick<Quete, "repetition">, jour: string) => (q.repetition === "unique" ? "" : q.repetition === "hebdomadaire" ? lundiDe(jour) : jour);

const clamp01 = (x: number) => (Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0);

/** Joursavant l'examen (négatif : passé) ; null sans jour J. */
export const joursAvantExamen = (jour: string, jourJ: string | null) => (jourJ ? joursEntre(jour, jourJ) : null);

// ── L'évaluation d'un objectif ─────────────────────────────────────────

/** Résultat d'un objectif : fait ou non, avancée (valeur / cible), date d'atteinte si on la connaît. */
export type Ev = {
  fait: boolean;
  valeur: number;
  cible: number;
  atteint: Date | null;
  inconnu?: boolean;
  /** objectif « à faire baisser » (ratures sous un seuil) : la valeur mesurée et le seuil ; valeur/cible est alors l'avancée (0–1) */
  baisse?: { actuel: number; seuil: number };
  /** objectif composé (tous / unDe) : l'évaluation de chaque sous-objectif, dans l'ordre (le résolveur de destinations vise le premier non rempli) */
  sous?: Ev[];
};

type Contexte = {
  e: Entree;
  contenu: ContenuMatiere[];
  /** compteur : renvoie sa réponse (passe 2) ou la collecte (passe 1) */
  compteur: (d: Omit<Demande, "id">) => ResultatCompteur;
  /** les quêtes terminées pendant la cascade */
  faites: Set<string>;
  /** les quêtes hors jeu : leur mesure est inconnue à l'exécution (ids) ; elles ne bloquent rien */
  horsJeu: Set<string>;
  catalogue: Quete[];
  /** instance évaluée : sa période et son départ (fenêtre depuisOuverture) */
  periode: string;
  ouverteLe: Date | null;
  params: Record<string, string | undefined>;
};

const dateOu = (s: string | null | undefined) => (s ? new Date(s) : null);
const dmax = (a: (Date | null)[]) => (a.some((x) => !x) ? null : new Date(Math.max(...a.map((x) => x!.getTime()))));
const dmin = (a: (Date | null)[]) => {
  const l = a.filter((x): x is Date => !!x);
  return l.length ? new Date(Math.min(...l.map((x) => x.getTime()))) : null;
};

/** Remplace {param:…} par la valeur du contrat dans un filtre. */
function resoudreFiltre(f: Record<string, Comparaison> | FiltreMesure | undefined, params: Contexte["params"]): Record<string, unknown> | undefined {
  if (!f) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(f)) {
    if (v && typeof v === "object" && !Array.isArray(v) && "param" in v) {
      const p = params[(v as { param: string }).param];
      if (p === undefined) return { __indisponible: true };
      out[k] = p;
    } else out[k] = v;
  }
  return out;
}

function fenetreDe(f: Fenetre | undefined, c: Contexte): unknown {
  if (f === "depuisOuverture") return { depuis: (c.ouverteLe ?? c.e.now).toISOString() };
  if (f === "depuisLancement") return c.e.seance?.lanceeLe ? { depuis: c.e.seance.lanceeLe } : "jour";
  return f ?? "toujours";
}

const jourDemande = (c: Contexte) => (c.periode ? c.periode : c.e.jour);

function compteurObjectif(o: Extract<Objectif, { k: "compteur" }>, c: Contexte): Ev {
  const filtre = resoudreFiltre(o.filtre as Record<string, Comparaison> | undefined, c.params);
  if (filtre && "__indisponible" in filtre) return { fait: false, valeur: 0, cible: o.seuil, atteint: null, inconnu: true };
  const r = c.compteur({
    evenement: o.evenement,
    ...(filtre ? { filtre } : {}),
    fenetre: fenetreDe(o.fenetre, c),
    jour: jourDemande(c),
    ...(o.distinct ? { distinct: o.distinct } : {}),
    ...(o.somme ? { somme: o.somme } : {}),
    seuil: o.seuil,
  });
  return { fait: r.n >= o.seuil, valeur: Math.min(r.n, o.seuil), cible: o.seuil, atteint: r.n >= o.seuil ? dateOu(r.atteint) : null };
}

/** Un compteur déguisé en mesure (questions, duels, amis…). */
function mesureCompteur(c: Contexte, evenement: TypeEvenement, seuil: number, filtre?: Record<string, unknown>): Ev {
  const r = c.compteur({ evenement, ...(filtre ? { filtre } : {}), fenetre: "toujours", seuil });
  return { fait: r.n >= seuil, valeur: Math.min(r.n, seuil), cible: seuil, atteint: r.n >= seuil ? dateOu(r.atteint) : null };
}

/** La part des notions de ces matières vues (≥ 5 réponses chacune). */
function notionsVues(c: Contexte, matiere?: string) {
  const comptes = c.e.lecture.mesures.notions ?? {};
  const cles = matiere ? [matiere] : c.contenu.map((m) => m.key);
  let total = 0;
  let vues = 0;
  for (const k of cles) {
    for (const n of notionsDeMatiere(k)) {
      total++;
      if ((comptes[n.id] ?? 0) >= 5) vues++;
    }
  }
  return { total, vues };
}

/** Une notion tenue (V3 §8.5) : 5 réponses au moins, dont 3 justes sur les 5 dernières. */
export const NOTION_TENUE = { reponses: 5, justesSur5: 3 } as const;

/**
 * Les notions tenues de ces matières, et la part tenue (0–100) : dans une
 * matière, tenues / notions ; sur le programme, la part de chaque matière
 * pondérée par son poids à l'examen. null : codex_mesures_v3 ne l'a pas dit.
 */
function notionsTenues(c: Contexte, matiere?: string): { tenues: number; pct: number } | null {
  const t = c.e.lecture.mesures.notions_tenues;
  if (!t) return null;
  const tenue = (id: string) => (t[id]?.n ?? 0) >= NOTION_TENUE.reponses && (t[id]?.j5 ?? 0) >= NOTION_TENUE.justesSur5;
  const matieres = matiere ? c.contenu.filter((m) => m.key === matiere) : c.contenu;
  let tenues = 0;
  let poids = 0;
  let part = 0;
  for (const m of matieres) {
    const notions = notionsDeMatiere(m.key);
    if (!notions.length) continue;
    const n = notions.filter((x) => tenue(x.id)).length;
    tenues += n;
    poids += m.poids;
    part += (m.poids * n) / notions.length;
  }
  return { tenues, pct: poids ? Math.floor((100 * part) / poids) : 0 };
}

/**
 * Maîtrise d'une matière, null tant qu'elle n'est pas mesurée : la maîtrise
 * unique au statut « mesuree » (40 réponses dans sa fenêtre) quand
 * codex_mesures_v3 la rend, sinon l'ancienne mesure à 40 questions, comme les
 * sceaux (maitriseLue, lib/codex/cap.ts).
 */
export const MAITRISE_MIN = 40;
export const maitriseDe = (e: Pick<Entree, "lecture">, matiere: string) => {
  const m = maitriseLue(e.lecture.mesures, matiere);
  return m.statut === "mesuree" ? m.pct : null;
};
export const maitriseProgramme = (e: Pick<Entree, "lecture">, contenu: ContenuMatiere[]) =>
  contenu.length ? Math.round(contenu.reduce((s, m) => s + (maitriseDe(e, m.key) ?? 0), 0) / contenu.length) : 0;

/**
 * La maîtrise du programme à l'ancienne règle (codex_lire, 40 questions) :
 * le rang en dépend, et le rang garde partout l'ancienne maîtrise (V3 §4.5).
 */
const maitriseProgrammeAncienne = (e: Pick<Entree, "lecture">, contenu: ContenuMatiere[]) => {
  const M = e.lecture.mesures.maitrise;
  const pct = (k: string) => (M?.[k] && M[k].questions >= MAITRISE_MIN ? M[k].pct : 0);
  return contenu.length ? Math.round(contenu.reduce((s, m) => s + pct(m.key), 0) / contenu.length) : 0;
};

/** Le plafond de la file « À revoir » affichée (V3 §5.1) : le reste attend, sans reproche. */
export const REVOIR_MAX = 25;

/**
 * La file « À revoir » (V3 §5.4) : revisions_dues lue par codex_mesures_v3 ;
 * sans elle, le repli commun, les ratures en cours bornées à 25 (rien pour
 * demain) ; null : rien de connu.
 */
export function revoirDe(e: Pick<Entree, "lecture">): { aujourdhui: number; demain: number } | null {
  const M = e.lecture.mesures;
  if (M.revoir) return { aujourdhui: Math.min(REVOIR_MAX, M.revoir.aujourdhui), demain: Math.min(REVOIR_MAX, M.revoir.demain) };
  return M.ratures_ouvertes ? { aujourdhui: Math.min(REVOIR_MAX, M.ratures_ouvertes.total), demain: 0 } : null;
}

/** Semaines (lun.–dim.) avec au moins n jours d'encre. */
function semainesActives(jours: { jour: string; n: number }[], n: number) {
  const parSemaine = new Map<string, number>();
  for (const j of jours) {
    if (j.n < 10) continue;
    const lundi = lundiDe(String(j.jour).slice(0, 10));
    parSemaine.set(lundi, (parSemaine.get(lundi) ?? 0) + 1);
  }
  return [...parSemaine.values()].filter((x) => x >= n).length;
}

/**
 * Le jour depuis lequel on « garde la main » (chapitre entretien du fil
 * rouge) : le premier jour J passé, admis ou non (celui du joueur ou d'un de
 * ses programmes), ou le jour où un programme a été mené ; null : pas encore.
 */
export function debutEntretien(e: Pick<Entree, "jour" | "jourJ" | "programmes">): string | null {
  const jours = [e.jourJ, ...(e.programmes ?? []).map((p) => p.jourJ)].filter((j): j is string => !!j && j < e.jour);
  const menes = (e.programmes ?? []).filter((p) => p.statut === "mene" && p.meneLe).map((p) => p.meneLe!.slice(0, 10));
  return [...jours, ...menes].sort()[0] ?? null;
}

/** Semaines (lun.–dim.) à 2 jours d'encre ou plus, comptées après le début de l'entretien. */
function semainesEntretien(e: Entree): number {
  const depuis = debutEntretien(e);
  if (!depuis) return 0;
  return semainesActives((e.lecture.mesures.jours ?? []).filter((j) => String(j.jour).slice(0, 10) > depuis), 2);
}

/** Semaines complètes (lun.–dim.) où le rythme vers l'objectif a été tenu. */
function semainesAuRythme(e: Entree) {
  if (!e.objectif || !e.jourJ) return 0;
  const jours = (e.lecture.mesures.jours ?? []).map((j) => ({ jour: String(j.jour).slice(0, 10), n: j.n }));
  const base = jours.filter((j) => j.jour < e.objectif!.depuis).reduce((s, j) => s + j.n, 0);
  const span = Math.max(1, joursEntre(e.objectif.depuis, e.jourJ));
  const parSemaine = Math.max(1, ((e.objectif.total - base) / span) * 7);
  const parLundi = new Map<string, number>();
  for (const j of jours) parLundi.set(lundiDe(j.jour), (parLundi.get(lundiDe(j.jour)) ?? 0) + j.n);
  let tenues = 0;
  for (let lundi = lundiDe(e.objectif.depuis); decaleJour(lundi, 6) < e.jour; lundi = decaleJour(lundi, 7)) {
    if (lundi < e.objectif.depuis && decaleJour(lundi, 6) < e.objectif.depuis) continue;
    if ((parLundi.get(lundi) ?? 0) >= parSemaine) tenues++;
  }
  return tenues;
}

function mesureObjectif(o: Extract<Objectif, { k: "mesure" }>, c: Contexte): Ev {
  const f = (resoudreFiltre(o.filtre, c.params) ?? {}) as FiltreMesure & { __indisponible?: boolean };
  const M = c.e.lecture.mesures;
  const sens = o.sens ?? ">=";
  const seuil = o.seuil;
  const fini = (valeur: number | null, atteint: Date | null = null): Ev => {
    if (valeur === null) return { fait: false, valeur: 0, cible: seuil, atteint: null, inconnu: true };
    if (sens === ">=") {
      const fait = valeur >= seuil;
      return { fait, valeur: Math.min(valeur, seuil), cible: seuil, atteint: fait ? atteint : null };
    }
    // à faire baisser : la jauge se remplit en descendant, (seuil + 1) / (valeur + 1), pleine au seuil
    const fait = valeur <= seuil;
    return { fait, valeur: fait ? 1 : Math.floor((100 * (seuil + 1)) / (valeur + 1)) / 100, cible: 1, atteint: fait ? atteint : null, baisse: { actuel: valeur, seuil } };
  };
  if (f.__indisponible) return fini(null);
  const matieres = c.contenu.map((m) => m.key);
  switch (o.mesure) {
    case "maitrise": return fini(f.matiere ? (maitriseDe(c.e, f.matiere as string) ?? 0) : null);
    case "maitrise_programme": return fini(maitriseProgramme(c.e, c.contenu));
    case "matieres_au_dessus": return fini(matieres.filter((k) => (maitriseDe(c.e, k) ?? 0) >= (f.pct ?? 0)).length);
    case "notions_vues": return fini(notionsVues(c, f.matiere as string | undefined).vues);
    case "notions_vues_pct": {
      const { total, vues } = notionsVues(c, f.matiere as string | undefined);
      return fini(total ? Math.floor((100 * vues) / total) : 0);
    }
    case "drill_pages_restantes": {
      const m = f.matiere as string | undefined;
      const total = m ? M.drill_totaux?.[m] : Object.values(M.drill_totaux ?? {}).reduce((s, x) => s + x, 0);
      if (total === undefined || total <= 0) return fini(null);
      const passees = Math.min(total, (M.drill_pages ?? []).filter((p) => !m || p.matiere === m).length);
      if (sens === ">=") return fini(total - passees);
      // « toutes les pages » : la jauge compte les pages passées sur celles de la fiche
      const cible = Math.max(1, total - seuil);
      return { fait: total - passees <= seuil, valeur: Math.min(passees, cible), cible, atteint: null };
    }
    case "drill_pages_reussies": {
      const m = f.matiere as string | undefined;
      return fini((M.drill_pages ?? []).filter((p) => (!m || p.matiere === m) && p.meilleur >= (f.pct ?? 0)).length);
    }
    case "elo": return fini(M.elo ?? DEFAULT_ELO);
    case "pic_palier": {
      const elo = Math.max(M.elo ?? DEFAULT_ELO, M.pic_elo ?? 0);
      return fini(rankFor(elo, maitriseProgrammeAncienne(c.e, c.contenu), null).tierIndex);
    }
    case "niveau": return fini(levelInfoFromXp(M.xp_total ?? 0).level);
    case "serie": return fini(M.serie ?? 0);
    case "meilleure_serie": return fini(M.meilleure_serie ?? 0);
    case "ratures_ouvertes": {
      if (!M.ratures_ouvertes) return fini(null);
      return fini(f.matiere ? (M.ratures_ouvertes.matieres[f.matiere as string] ?? 0) : M.ratures_ouvertes.total);
    }
    case "ratures_rayees": return mesureCompteur(c, "rature_rayee", seuil);
    case "semaines_actives": return fini(semainesActives(M.jours ?? [], f.n ?? 4));
    case "semaines_objectif_tenu": return fini(semainesAuRythme(c.e));
    case "rappels_espaces": return mesureCompteur(c, "question_repondue", seuil, { juste: true, ecartJours: { min: f.n ?? 7 } });
    case "matieres_remontees": {
      const n = f.n ?? 10;
      return fini(matieres.filter((k) => {
        const m = maitriseLue(M, k);
        return m.statut === "mesuree" && m.pct !== null && m.debut !== null && m.pct - m.debut >= n;
      }).length);
    }
    case "types_calcul_tenus": return fini(M.types_calcul_tenus ?? 0);
    case "examens_blancs_au_dessus": return mesureCompteur(c, "examen_blanc_rendu", seuil, { pct: { min: f.pct ?? 0 }, ...(f.questions ? { questions: { min: f.questions } } : {}) });
    case "sceau": return fini(f.cle ? (M.sceaux?.[f.cle] ?? 0) : null);
    case "jour_j_fixe": return fini(c.e.jourJ ? 1 : 0);
    case "visite_vue": return fini(c.e.visiteVue ? 1 : 0);
    case "questions_total": return mesureCompteur(c, "question_repondue", seuil);
    case "duels_joues": return mesureCompteur(c, "duel_termine", seuil);
    case "amis": return mesureCompteur(c, "ami_ajoute", seuil);
    case "quetes_terminees": {
      // le fil rouge, sans fin, ne compte que si on le demande (famille « fil »)
      const faites = c.catalogue.filter((q) => c.faites.has(clePeriode(q.id, "")) && q.famille !== "contrat" && (f.famille ? q.famille === f.famille : q.famille !== "fil") && (!f.chaine || q.chaine === f.chaine));
      return fini(faites.length);
    }
    case "branches_etape": return fini(branchesFaites(c, f.etape as EtapeBranche).faites);
    case "branches_etape_pct": {
      const { faites, total } = branchesFaites(c, f.etape as EtapeBranche);
      // un programme sans matière (CFA II tant qu'il n'est pas rempli) : rien n'est fait à vide
      return fini(total ? Math.floor((100 * faites) / total) : 0);
    }
    // v3 : sans codex_mesures_v3, inconnues (la quête ne se valide pas)
    case "jours_encre_total": return fini(M.jours_encre_total ?? null);
    case "maitres_total": return fini(M.maitres_total ?? null);
    case "programmes_menes": return fini(M.programmes_menes ?? null);
    case "trophees": return fini(M.trophees ? tropheesAuMoins(M.trophees, RANG_TROPHEE[f.palier ?? "bronze"], f.source) : null);
    case "pieces_possedees": return fini(compterPiecesCodex({ progression: c.e.progression, sceaux: M.sceaux, trophees: M.trophees, folios: foliosDonnes(c.catalogue) }));
    case "semaines_entretien": return fini(semainesEntretien(c.e));
    case "trophees_sources": {
      if (!M.trophees) return fini(null);
      const p = RANG_TROPHEE[f.palier ?? "bronze"];
      return fini(new Set(M.trophees.filter((x) => x.palier >= p && x.n > 0).map((x) => x.source)).size);
    }
    case "notions_tenues": return fini(notionsTenues(c, f.matiere as string | undefined)?.tenues ?? null);
    case "notions_tenues_pct": return fini(notionsTenues(c, f.matiere as string | undefined)?.pct ?? null);
    case "malle_faite": return fini(c.e.malleCoches === undefined ? null : c.e.malleCoches >= MALLE_PRETE ? 1 : 0);
    case "blancs_a_debriefer": return fini(M.blancs_a_debriefer ?? null);
    // sans revisions_dues (migration_v3_profil.sql §3b), inconnue : le repli des ratures en cours ne dit pas ce qui est dû
    case "revisions_dues": return fini(M.revoir ? Math.min(REVOIR_MAX, M.revoir.aujourdhui) : null);
    case "ratures_scellees": return fini(M.ratures_scellees ?? null);
    case "preparation": return fini(maitriseDuCodex(c.contenu, M).preparation);
  }
}

/** La malle est prête à 5 cases cochées sur 7 (V3 §7.3) : la règle vit dans lib/codex/calendrier (léger, lu par l'écran). */
export { MALLE_PRETE };

/**
 * La valeur d'un spécial : dans speciaux (codex_lire), ou par matière dans
 * speciaux_matiere (codex_mesures_v3 : « serie_bonnes_matiere » se lit sous
 * serie_bonnes) ; undefined : inconnue (la base ne le calcule pas encore).
 */
function valeurSpeciale(o: Extract<Objectif, { k: "special" }>, e: Pick<Entree, "lecture">): number | undefined {
  if (!o.matiere) return e.lecture.speciaux[o.cle];
  const parMatiere = e.lecture.mesures.speciaux_matiere?.[o.cle.replace(/_matiere$/, "") as "serie_bonnes" | "serie_calculs"];
  return parMatiere ? (parMatiere[o.matiere] ?? 0) : undefined;
}

/** Les folios donnés (V3 §3.7) : quête ou « acte:<id> » → clé du folio ; ils n'ont pas de colonne dans codex_progression. */
function foliosDonnes(catalogue: Quete[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const a of ACTES) if (a.recompense.folio) m.set(`acte:${a.id}`, a.recompense.folio);
  for (const q of catalogue) if (q.recompense.folio) m.set(q.id, q.recompense.folio);
  return m;
}

/** Le rang d'un palier de trophée (lib/trophees.ts : 1 bronze … 4 diamant). */
const RANG_TROPHEE = { bronze: 1, argent: 2, or: 3, diamant: 4 } as const;

/**
 * La valeur d'un chapitre du fil rouge sous un filtre, quel que soit le
 * palier : une seule demande à codex_lire pour les questions (son n est le
 * total), la mesure sinon ; null : inconnue.
 */
function valeurFil(mesure: TypeMesure, filtre: FiltreMesure | undefined, c: Contexte): number | null {
  if (mesure === "questions_total") return c.compteur({ evenement: "question_repondue", fenetre: "toujours", seuil: 1 }).n;
  const ev = mesureObjectif({ k: "mesure", mesure, seuil: Number.POSITIVE_INFINITY, ...(filtre ? { filtre } : {}) }, c);
  return ev.inconnu ? null : ev.valeur;
}

/** Un palier du fil rouge : la valeur de son chapitre comparée à son seuil (pas de date d'atteinte lue : c'est l'instant du calcul). */
function evalFil(o: Objectif, c: Contexte): Ev {
  if (o.k !== "mesure") return evalObjectif(o, c);
  const v = valeurFil(o.mesure, o.filtre, c);
  if (v === null) return { fait: false, valeur: 0, cible: o.seuil, atteint: null, inconnu: true };
  return { fait: v >= o.seuil, valeur: Math.min(v, o.seuil), cible: o.seuil, atteint: null };
}

/** L'évaluation d'une quête : celle de son objectif (un palier du fil rouge passe par la valeur de son chapitre). */
const evalQuete = (q: Pick<Quete, "famille" | "objectif">, c: Contexte): Ev => (q.famille === "fil" ? evalFil(q.objectif, c) : evalObjectif(q.objectif, c));

/**
 * Branches (matières) qui ont passé une étape ; une branche sans cette étape
 * compte pour faite. `prerequis` : pour un nœud de convergence, une étape hors
 * jeu (mesure inconnue, V3 §8) compte aussi pour faite, elle ne bloque rien.
 */
function branchesFaites(c: Contexte, etape: EtapeBranche, prerequis = false) {
  let faites = 0;
  for (const m of c.contenu) {
    // par la matière et l'étape (l'id porte le préfixe du programme hors CFA I)
    const q = c.catalogue.find((x) => x.famille === "branche" && x.matiere === m.key && x.etape === etape && !x.retiree);
    if (!q || c.faites.has(clePeriode(q.id, "")) || (prerequis && c.horsJeu.has(q.id))) faites++;
  }
  return { faites, total: c.contenu.length };
}

export function evalObjectif(o: Objectif, c: Contexte): Ev {
  switch (o.k) {
    case "compteur": return compteurObjectif(o, c);
    case "mesure": return mesureObjectif(o, c);
    case "special": {
      const v = valeurSpeciale(o, c.e);
      const seuil = o.seuil ?? 1;
      if (v === undefined) return { fait: false, valeur: 0, cible: seuil, atteint: null, inconnu: true };
      return { fait: v >= seuil, valeur: Math.min(v, seuil), cible: seuil, atteint: null };
    }
    case "tous": {
      const l = o.objectifs.map((x) => evalObjectif(x, c));
      const fait = l.every((x) => x.fait);
      return { fait, valeur: l.reduce((s, x) => s + clamp01(x.valeur / (x.cible || 1)), 0), cible: l.length, atteint: fait ? dmax(l.map((x) => x.atteint)) : null, inconnu: l.some((x) => x.inconnu), sous: l };
    }
    case "unDe": {
      const l = o.objectifs.map((x) => evalObjectif(x, c));
      const fait = l.some((x) => x.fait);
      return { fait, valeur: Math.max(0, ...l.map((x) => clamp01(x.valeur / (x.cible || 1)))), cible: 1, atteint: fait ? dmin(l.filter((x) => x.fait).map((x) => x.atteint)) : null, inconnu: l.every((x) => x.inconnu), sous: l };
    }
  }
}

// ── Les contrats du jour : choix, paramètres, instances ───────────────

/** Une graine stable (joueur + jour) : un petit générateur mulberry32. */
export function graine(s: string) {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = (h ^ (h >>> 16)) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const EMPLACEMENTS: Emplacement[] = ["faiblesse", "entretien", "variete"];
export const BUDGET_TRIO = 45;
/** En veillée, un seul contrat léger : l'entretien, 15 minutes au plus (V3 §7.2). */
export const DUREE_VEILLEE = 15;

/** Les emplacements tirés : les trois, sauf en veillée (l'entretien seul : un seul arc autour du sceau, pas de « 1/3 »). */
export const emplacementsDe = (phase: Phase): Emplacement[] => (phase === "veillee" ? ["entretien"] : EMPLACEMENTS);

const modeleParId = (id: string) => MODELES_CONTRATS.find((m) => m.id === id) ?? null;

/**
 * Le titre ou la consigne d'un modèle avec ses paramètres, l'article élidé
 * (« Séance d'Economics »). {questions} et {format} : la taille d'une séance
 * ciblée dans la matière (cibleeDe).
 */
export function libelle(texte: string, params: ContratTire["params"], contenu: ContenuMatiere[] = contenuDuProgramme()) {
  const mat = contenu.find((m) => m.key === params.matiere);
  const notion = notionParId(params.notion);
  const fiche = contenu.find((m) => m.fiche === params.fiche);
  const cib = mat ? cibleeDe(mat.poids) : null;
  return gabarit(texte, {
    matiere: mat?.nom ?? params.matiere ?? "",
    notion: notion?.court ?? params.notion ?? "",
    fiche: fiche?.court ?? params.fiche ?? "",
    questions: String(cib?.questions ?? 15),
    format: cib ? formatCiblee(cib.format) : "",
  });
}

/** Une instance de contrat : la quête du jour (id contrat:<modèle>:<jour>), objectifs et paramètres résolus. */
export function instanceContrat(m: ModeleContrat, params: ContratTire["params"], jour: string, contenu: ContenuMatiere[]): Quete {
  // une séance ciblée se règle sur la matière tirée : seuil possible, lien vers le bon format
  const mat = contenu.find((x) => x.key === params.matiere);
  const ciblee = mat && estCiblee(m.objectif) ? cibleeDe(mat.poids) : null;
  const lien = ciblee && mat ? lienCiblee(mat.key, ciblee.format) : m.lien;
  return {
    id: `contrat:${m.id}:${jour}`,
    famille: "contrat",
    programme: PROGRAMME,
    titre: libelle(m.titre, params, contenu),
    consigne: libelle(m.consigne, params, contenu),
    objectif: mat && ciblee ? ajusterCiblee(m.objectif, mat.poids) : m.objectif,
    prerequis: [],
    recompense: { xp: xpContrat(m.duree) },
    repetition: "quotidienne",
    visibilite: "visible",
    duree: m.duree,
    ...(lien ? { lien } : {}),
    ...(params.matiere ? { matiere: params.matiere } : {}),
    ordre: 1000 + EMPLACEMENTS.indexOf(m.emplacement),
  };
}

export type Instance = { quete: Quete; periode: string; params: ContratTire["params"]; emplacement?: Emplacement };

/**
 * Tire les 3 contrats du jour : un par emplacement, pondérés par la phase,
 * sans répéter le modèle de la veille, dans le budget de 45 minutes ; en
 * veillée, un seul, l'entretien de 15 minutes au plus (emplacementsDe). Pure
 * et déterministe (graine = joueur + jour) ; la base garde le premier tirage
 * (codex_contrats_poser).
 */
export function tirerContrats(e: Entree, joueur: string, hier: Partial<Record<Emplacement, string>> = {}): ContratTire[] {
  const contenu = e.contenu ?? contenuDuProgramme();
  // le jour du retour après une absence : la reprise douce, seule (V3 §10.4)
  if (repriseDuJour(e)) return [{ emplacement: "entretien", modele: "reprise", params: {}, change: false }];
  const rnd = graine(`${joueur}:${e.jour}`);
  const phase = phaseJoueur(e, actesClosDe(e.progression));
  const M = e.lecture.mesures;
  // paramètres : matière la plus à risque (poids × (1 − maîtrise), inconnue = 0,2), notion la plus faible, fiche de la matière
  const risque = contenu
    // après un « pas cette fois », une matière en bande basse pèse ×1,3 pendant 60 jours (V3 §10.5)
    .map((m) => ({ m, r: m.poids * (1 - (maitriseDe(e, m.key) ?? 20) / 100) * facteurBande(e.verdict, m.key, e.jour) }))
    .sort((a, b) => b.r - a.r);
  const matiere = risque[0]?.m.key;
  const avecDrill = risque.find((x) => x.m.fiche && x.m.drill)?.m;
  const notion = e.pointsFaibles?.[0]?.notion;
  // matière « oubliée » : déjà travaillée, sans une réponse depuis JOURS_OUBLI jours (compté par la base), la plus lourde d'abord ;
  // sans ce compte (e.activite absent), pas de contrat « prend la poussière » : son texte serait faux
  const act = e.activite;
  const oubliee = act ? [...contenu].filter((m) => (act[m.key]?.total ?? 0) > 0 && (act[m.key]?.recentes ?? 0) === 0).sort((a, b) => b.poids - a.poids)[0]?.key : undefined;
  const sources = (m: ModeleContrat): ContratTire["params"] | null => {
    const p: ContratTire["params"] = {};
    for (const nom of m.params) {
      const v = nom === "notion" ? notion : nom === "fiche" ? avecDrill?.fiche : m.id === "matiere-oubliee" ? oubliee : matiere;
      if (!v) return null;
      p[nom] = v;
    }
    return p;
  };
  const outils = programmeActif(e.programmes).outils;
  const eligible = (m: ModeleContrat) => {
    if (!evenementsDe(m.objectif).every((ev) => queteBrancheeEv(ev))) return false;
    // un modèle dont le programme n'a pas l'outil (pas de drill en histoire) n'est jamais tiré
    if (!(m.requiert ?? []).every((o) => outils.has(o))) return false;
    if (m.poids[phase] <= 0) return false;
    return m.eligible.every((x) => eligibleMesure(x, e));
  };
  const choisis: ContratTire[] = [];
  let duree = 0;
  const veillee = phase === "veillee";
  // en sprint, des contrats courts : 15 minutes au plus quand l'emplacement en a un (V3 §10.2)
  const sprint = sprintDe(e);
  const emplacements = emplacementsDe(phase);
  emplacements.forEach((emp, i) => {
    let pool = MODELES_CONTRATS.filter((m) => m.emplacement === emp && eligible(m) && sources(m) && m.id !== hier[emp]);
    if (!pool.length) pool = MODELES_CONTRATS.filter((m) => m.emplacement === emp && eligible(m) && sources(m));
    if (sprint && pool.some((m) => m.duree <= DUREE_SPRINT)) pool = pool.filter((m) => m.duree <= DUREE_SPRINT);
    const restant = veillee ? DUREE_VEILLEE : BUDGET_TRIO - duree - (emplacements.length - 1 - i) * 5;
    const tenables = pool.filter((m) => m.duree <= restant);
    if (tenables.length) pool = tenables;
    // en veillée, rien de plus long que 15 minutes : plutôt aucun contrat
    else if (veillee) pool = [];
    else if (pool.length) pool = [pool.reduce((a, b) => (b.duree < a.duree ? b : a))];
    const total = pool.reduce((s, m) => s + m.poids[phase], 0);
    if (!pool.length || total <= 0) return;
    let t = rnd() * total;
    const m = pool.find((x) => (t -= x.poids[phase]) <= 0) ?? pool[pool.length - 1];
    duree += m.duree;
    choisis.push({ emplacement: emp, modele: m.id, params: sources(m)!, change: false });
  });
  return choisis;
}

/** Un autre modèle pour un emplacement (le changement du jour) : tiré hors du modèle actuel. */
export function remplacantContrat(e: Entree, joueur: string, emplacement: Emplacement, actuel: string): ContratTire | null {
  const t = tirerContrats(e, joueur + ":autre:" + actuel, { [emplacement]: actuel }).find((c) => c.emplacement === emplacement);
  return t && t.modele !== actuel ? { ...t, change: true } : null;
}

/** Une condition de tirage (ObjectifMesure) lue sur les mesures de la base. */
function eligibleMesure(x: Extract<Objectif, { k: "mesure" }>, e: Entree): boolean {
  const M = e.lecture.mesures;
  const v = x.mesure === "ratures_ouvertes" ? (M.ratures_ouvertes?.total ?? 0) : x.mesure === "questions_total" ? (M.jours ?? []).reduce((s, j) => s + j.n, 0) : 0;
  return (x.sens ?? ">=") === ">=" ? v >= x.seuil : v <= x.seuil;
}

const queteBrancheeEv = (ev: TypeEvenement) => queteBranchee({ objectif: { k: "compteur", evenement: ev, seuil: 1 } as Objectif });

// ── Le contexte d'évaluation ───────────────────────────────────────────

function contexteBlanc(e: Entree, contenu: ContenuMatiere[], compteur: Contexte["compteur"], catalogue: Quete[] = []): Contexte {
  return { e, contenu, compteur, faites: new Set(), horsJeu: new Set(), catalogue, periode: "", ouverteLe: null, params: {} };
}

// ── L'état d'une quête ─────────────────────────────────────────────────

export type EtatQuete = {
  quete: Quete;
  periode: string;
  /** les prérequis sont remplis */
  ouverte: boolean;
  ouverteLe: Date | null;
  fait: boolean;
  atteint: Date | null;
  ev: Ev | null;
  /** la ligne de la base, si elle existe */
  ligne: LigneProgression | null;
  /** validée d'après l'historique (rétroactive) */
  retro: boolean;
  /**
   * hors jeu (V3 §8) : sa mesure est inconnue à l'exécution (le SQL qui la
   * lit n'est pas collé) ; elle est traitée comme non branchée : elle ne
   * bloque ni un prérequis ni la clôture d'un acte, et rien ne s'écrit pour elle
   */
  horsJeu: boolean;
  /** hors jeu et jamais commencée (aucune ligne en base) : à ne pas afficher ; commencée, elle reste affichée, gelée */
  masquee: boolean;
  /** en sprint, un palier de régularité hors de portée avant le jour J : « après l'examen », pas proposé (V3 §10.2) */
  differee?: true;
};

export type ItemEcriture = {
  quete: string;
  periode: string;
  famille: "trame" | "branche" | "longcours" | "contrat" | "exploit" | "acte" | "fil";
  etat: "disponible" | "active" | "terminee";
  progression?: number;
  cible?: number;
  atteint?: string;
  retro?: boolean;
  xp?: number;
  plafond?: number;
  cosmetique?: string;
  titre?: string;
};

export type Resultat = {
  etats: EtatQuete[];
  /** ce qu'il faut écrire (codex_ecrire) */
  lot: ItemEcriture[];
  budgetRetro: number;
  niveau: number;
  phase: Phase;
  /** actes clos (ids) */
  actesClos: string[];
  /** l'acte en cours : le premier non clos, dans l'ordre */
  acteCourant: Acte | null;
  /** les contrats du jour tirés (instances, un par emplacement ; sans le débrief) */
  contrats: Instance[];
  trioFait: boolean;
  /** le marqueur du rattrapage à écrire après une écriture réussie du lot (marqueurDe) ; null : inchangé */
  capacitesVues: Capacites | null;
};

const ordreFamille = { trame: 0, branche: 1, longcours: 2, contrat: 3, exploit: 4, fil: 5 } as const;

/** Une quête suivie : ni retirée, ni sur un événement pas encore suivi en base, ni sur ce que la base ne sait pas encore faire (V3 §1.8). */
const suivie = (q: Quete, c: Capacites) => !q.retiree && queteBranchee(q) && requisOk(q, c);

/** Ce qui ouvre le premier palier du fil rouge : l'acte 0 du programme du joueur (le prologue de CFA I). */
function ouvertureFil(e: Entree): Prerequis[] {
  const actes = actesDuJoueur(e);
  const zero = actes.find((a) => a.numero === 0) ?? actes[0];
  return zero ? [{ k: "acte", id: zero.id }] : [];
}

/** Les contrats de la semaine que le choix du lundi remplace (V3 §10.3). */
const HEBDO_REMPLACES = new Set(["contrat:hebdo:encre", "contrat:hebdo:pigments", "contrat:hebdo:commande"]);

/**
 * La semaine a-t-elle déjà payé un des contrats que la commande remplace
 * (le tour des pigments, l'examen blanc de la semaine ; V3 §10.3) ? Alors le
 * choix du lundi n'est plus proposé ni accepté : ses contrats repaieraient le
 * même travail (lib/codex/rythme.ts, rythme-serveur.ts). La semaine d'encre
 * garde son id avec la cible choisie : déjà payée, elle ne repaie pas.
 */
export const semaineEntamee = (progression: Pick<LigneProgression, "quete_id" | "periode" | "etat">[], lundi: string) =>
  progression.some((l) => l.periode === lundi && HEBDO_REMPLACES.has(l.quete_id) && l.quete_id !== "contrat:hebdo:encre" && (l.etat === "terminee" || l.etat === "recompensee"));

/**
 * La semaine choisie (V3 §10.3) : la semaine d'encre prend sa cible et les
 * contrats de la commande remplacent le tour des pigments et l'examen blanc
 * de la semaine. Sans choix pour la semaine en cours : le catalogue tel quel.
 */
function avecSemaine(catalogue: Quete[], e: Pick<Entree, "semaine" | "jour" | "progression">, contenu: ContenuMatiere[]): Quete[] {
  if (!e.semaine || e.semaine.lundi !== lundiDe(e.jour)) return catalogue;
  // un choix posé après qu'un contrat de la semaine a payé ne remplace rien : sa commande
  // repaierait le même travail (le blanc de la semaine, le tour des pigments)
  if (semaineEntamee(e.progression, e.semaine.lundi)) return catalogue;
  return [...catalogue.filter((q) => !HEBDO_REMPLACES.has(q.id)), ...quetesSemaine(e.semaine, contenu)];
}

/**
 * Les quêtes à suivre : catalogue branché et non retiré, les paliers du fil
 * rouge (atteints et pas encore récompensés, plus le suivant ; `atteints`
 * absent : le palier en cours et le suivant), plus les instances du jour.
 */
export function quetesASuivre(e: Entree, contenu: ContenuMatiere[], atteints?: Record<string, number>): { catalogue: Quete[]; instances: Instance[] } {
  const catalogue = [...avecSemaine(e.catalogue ?? catalogueCodex(contenu), e, contenu), ...quetesFilRouge(e.progression, { ouverture: ouvertureFil(e), atteints })];
  const capacites = capacitesDe(e);
  const instances: Instance[] = [];
  for (const q of catalogue) {
    if (!suivie(q, capacites)) continue;
    instances.push({ quete: q, periode: periodeDe(q, e.jour), params: {} });
  }
  for (const c of e.contrats) {
    const m = modeleParId(c.modele);
    if (!m || !evenementsDe(m.objectif).every(queteBrancheeEv)) continue;
    instances.push({ quete: instanceContrat(m, c.params, e.jour, contenu), periode: e.jour, params: c.params, emplacement: c.emplacement });
  }
  return { catalogue, instances };
}

/**
 * Passe 1 : toutes les demandes à envoyer à codex_lire. Les quêtes sont
 * évaluées à blanc (rien n'est fait), sans cascade : on veut les compteurs de
 * TOUTES les quêtes, y compris celles dont les prérequis ne sont pas encore
 * remplis (l'historique peut déjà les remplir).
 */
export function planifier(e: Entree): Demande[] {
  const contenu = e.contenu ?? contenuDuProgramme();
  const { catalogue, instances } = quetesASuivre(e, contenu);
  const demandes = new Map<string, Demande>();
  const collecte: Contexte["compteur"] = (d) => {
    const cle = JSON.stringify([d.evenement, d.filtre ?? null, d.fenetre ?? null, d.jour ?? null, d.distinct ?? null, d.somme ?? null, d.seuil]);
    if (!demandes.has(cle)) demandes.set(cle, { id: "d" + demandes.size, ...d });
    return { n: 0, atteint: null };
  };
  const lignes = new Map(e.progression.map((l) => [clePeriode(l.quete_id, l.periode), l]));
  for (const { quete, periode, params } of instances) {
    const l = lignes.get(clePeriode(quete.id, periode));
    const c = { ...contexteBlanc(e, contenu, collecte, catalogue), periode, ouverteLe: dateOu(l?.ouverte_le), params };
    evalQuete(quete, c);
    for (const o of objectifsDesPrerequis(quete.prerequis)) evalObjectif(o, c);
  }
  // les blocs de la séance du jour : leurs compteurs partent dans le même appel
  for (const o of e.seance?.objectifs ?? []) evalObjectif(o, contexteBlanc(e, contenu, collecte));
  // les jalons du plan daté (V3 §10.2), de même
  for (const o of objectifsPlan(e)) evalObjectif(o, contexteBlanc(e, contenu, collecte));
  return [...demandes.values()];
}

/**
 * Des objectifs hors quêtes (les blocs de la séance du jour, V3 §6.1),
 * évalués sur les compteurs lus : ceux d'Entree.seance ont été demandés par
 * planifier ; un compteur jamais demandé vaut 0.
 */
export function evaluerObjectifs(e: Entree, compteurs: Record<string, ResultatCompteur>, objectifs: Objectif[]): Ev[] {
  const resolveur: Contexte["compteur"] = (d) => compteurs[JSON.stringify([d.evenement, d.filtre ?? null, d.fenetre ?? null, d.jour ?? null, d.distinct ?? null, d.somme ?? null, d.seuil])] ?? { n: 0, atteint: null };
  const ctx = contexteBlanc(e, e.contenu ?? contenuDuProgramme(), resolveur);
  return objectifs.map((o) => evalObjectif(o, ctx));
}

/** Indexe les réponses de codex_lire par la clé d'une demande (même construction que planifier). */
export function indexerLecture(demandes: Demande[], brut: LectureSql): Record<string, ResultatCompteur> {
  const out: Record<string, ResultatCompteur> = {};
  for (const d of demandes) {
    const cle = JSON.stringify([d.evenement, d.filtre ?? null, d.fenetre ?? null, d.jour ?? null, d.distinct ?? null, d.somme ?? null, d.seuil]);
    out[cle] = brut.compteurs[d.id] ?? { n: 0, atteint: null };
  }
  return out;
}

function prerequisOk(p: Prerequis, c: Contexte, actesClos: Set<string>): boolean {
  switch (p.k) {
    case "quete": {
      const q = c.catalogue.find((x) => x.id === p.id);
      // une quête retirée, pas encore branchée (événement, capacité de la base) ou hors jeu (mesure inconnue) ne bloque jamais
      if (!q || !suivie(q, capacitesDe(c.e)) || c.horsJeu.has(p.id)) return true;
      // souple : conseillée avant l'examen, exigée après (V3 §8.5)
      if (p.souple && !apresExamenDe(c.e)) return true;
      return c.faites.has(clePeriode(p.id, ""));
    }
    case "acte": return actesClos.has(p.id);
    case "toutesBranches": {
      const { faites, total } = branchesFaites(c, p.etape, true);
      return faites >= total;
    }
    case "branches": return branchesFaites(c, p.etape, true).faites >= p.n;
    case "joursAvantExamen": {
      const j = joursAvantExamen(c.e.jour, c.e.jourJ);
      return j !== null && j <= p.max && j >= (p.min ?? 0);
    }
    case "apresExamen": return apresExamenDe(c.e);
    case "etat": {
      // une mesure inconnue (le SQL qui la lit n'est pas collé) n'ouvre rien
      const ev = mesureObjectif({ k: "mesure", mesure: p.mesure, seuil: p.seuil }, c);
      return !ev.inconnu && ev.fait;
    }
    case "objectif": {
      const ev = evalObjectif(p.objectif, c);
      return !ev.inconnu && ev.fait;
    }
    case "unDe": return p.prerequis.some((x) => prerequisOk(x, c, actesClos));
  }
}

/** Les objectifs des prérequis d'une quête (k « objectif », dans « unDe » compris) : planifier demande leurs compteurs. */
const objectifsDesPrerequis = (ps: Prerequis[]): Objectif[] => ps.flatMap((p) => (p.k === "objectif" ? [p.objectif] : p.k === "unDe" ? objectifsDesPrerequis(p.prerequis) : []));

/**
 * Passe 2 : la cascade. `compteurs` : codex_lire indexé (indexerLecture).
 * Rend les états, ce qu'il faut écrire, la phase, les actes clos.
 */
export function evaluer(e: Entree, compteurs: Record<string, ResultatCompteur>): Resultat {
  const contenu = e.contenu ?? contenuDuProgramme();
  const resolveur: Contexte["compteur"] = (d) => {
    const cle = JSON.stringify([d.evenement, d.filtre ?? null, d.fenetre ?? null, d.jour ?? null, d.distinct ?? null, d.somme ?? null, d.seuil]);
    return compteurs[cle] ?? { n: 0, atteint: null };
  };
  // le fil rouge : jusqu'où chaque chapitre est atteint (ses paliers atteints sont instanciés d'un coup)
  const sonde = contexteBlanc(e, contenu, resolveur);
  const recompenses = paliersRecompenses(e.progression);
  const atteints = Object.fromEntries(CHAPITRES_FIL.map((c) => [c.id, palierAtteint(c, (f) => valeurFil(c.mesure, f, sonde), recompenses[c.id] ?? 0)]));
  const { catalogue, instances } = quetesASuivre(e, contenu, atteints);
  const actes = actesDuJoueur(e);
  const lignes = new Map(e.progression.map((l) => [clePeriode(l.quete_id, l.periode), l]));
  const niveau = levelInfoFromXp(e.lecture.mesures.xp_total ?? 0).level;
  const capacites = capacitesDe(e);
  const ctx = contexteBlanc(e, contenu, resolveur, catalogue);
  const etats = new Map<string, EtatQuete>();
  const semaines = sprintDe(e) && e.jourJ ? semainesRestantes(e.jour, e.jourJ) : null;
  for (const { quete, periode } of instances) {
    const l = lignes.get(clePeriode(quete.id, periode)) ?? null;
    const recompensee = l?.etat === "recompensee" || l?.etat === "terminee";
    etats.set(clePeriode(quete.id, periode), {
      ...(semaines !== null && differeeEnSprint(quete, semaines) ? { differee: true as const } : {}),
      quete, periode,
      ouverte: !!l && l.etat !== "verrouillee",
      ouverteLe: l ? new Date(l.ouverte_le) : null,
      fait: recompensee,
      atteint: recompensee ? dateOu(l!.terminee_le) : null,
      ev: null, ligne: l, retro: !!l?.retro, horsJeu: false, masquee: false,
    });
    if (recompensee) ctx.faites.add(clePeriode(quete.id, periode));
  }
  // une quête retirée déjà tamponnée reste faite (« Codex Atlanticus » la compte ; rien de gagné n'est repris)
  const retirees = new Set(catalogue.filter((q) => q.retiree).map((q) => q.id));
  for (const l of e.progression) if (l.periode === "" && retirees.has(l.quete_id) && (l.etat === "recompensee" || l.etat === "terminee")) ctx.faites.add(clePeriode(l.quete_id, ""));
  // hors jeu (V3 §8) : une quête dont la mesure est inconnue à l'exécution (le SQL qui la lit n'est pas
  // collé) est traitée comme non branchée ; le fil rouge a sa propre règle (la capacité « fil », aVenir)
  for (const st of etats.values()) {
    if (st.fait || st.quete.famille === "fil") continue;
    const ev = evalQuete(st.quete, { ...ctx, periode: st.periode, ouverteLe: st.ouverteLe ?? e.now, params: parametresDe(e, st) });
    if (!ev.inconnu) continue;
    st.horsJeu = true;
    st.masquee = !st.ligne;
    if (st.periode === "") ctx.horsJeu.add(st.quete.id);
  }
  const actesClos = new Set<string>();
  const lignesActes = new Map(e.progression.filter((l) => l.quete_id.startsWith("acte:")).map((l) => [l.quete_id.slice(5), l]));
  for (const [id, l] of lignesActes) if (l.etat === "recompensee" || l.etat === "terminee") actesClos.add(id);
  const actesFaits = new Map<string, Date | null>([...actesClos].map((id) => [id, dateOu(lignesActes.get(id)!.terminee_le)]));

  const tri = [...etats.values()].sort((a, b) => (ordreFamille[a.quete.famille as keyof typeof ordreFamille] ?? 9) - (ordreFamille[b.quete.famille as keyof typeof ordreFamille] ?? 9) || a.quete.ordre - b.quete.ordre);
  const parId = new Map(tri.filter((s) => s.periode === "").map((s) => [s.quete.id, s]));
  // la cascade : jusqu'à ce que plus rien ne change
  for (let tour = 0, change = true; change && tour < 60; tour++) {
    change = false;
    for (const st of tri) {
      if (st.fait || st.horsJeu) continue;
      const q = st.quete;
      const c: Contexte = { ...ctx, periode: st.periode, ouverteLe: st.ouverteLe ?? e.now, params: parametresDe(e, st) };
      if (!st.ouverte && q.prerequis.every((p) => prerequisOk(p, c, actesClos))) {
        st.ouverte = true;
        st.ouverteLe = e.now;
        change = true;
      }
      // un miroir (V3 §8.2) se tamponne avec sa quête payeuse, même avant d'être ouvert : sa chaîne ne reste pas en arrière
      const payeuse = q.miroir ? parId.get(q.miroir) : undefined;
      if (payeuse?.fait) {
        st.ouverte = true;
        st.fait = true;
        st.atteint = payeuse.atteint;
        st.ev = { fait: true, valeur: payeuse.ev?.cible ?? 1, cible: payeuse.ev?.cible ?? 1, atteint: payeuse.atteint };
        ctx.faites.add(clePeriode(q.id, st.periode));
        change = true;
        continue;
      }
      if (!st.ouverte) continue;
      st.ev = evalQuete(q, c);
      if (st.ev.fait) {
        st.fait = true;
        st.atteint = st.ev.atteint;
        ctx.faites.add(clePeriode(q.id, st.periode));
        change = true;
      }
    }
    for (const a of actes) {
      if (actesClos.has(a.id)) continue;
      const clos = clotureActe(a, tri.filter((s) => s.quete.acte === a.id && !s.horsJeu));
      if (clos) {
        actesClos.add(a.id);
        actesFaits.set(a.id, clos.atteint ?? e.now);
        change = true;
      }
    }
  }

  // l'écriture
  const lot: ItemEcriture[] = [];
  const plafond = plafondQuete(niveau);
  const retroDe = (atteint: Date | null) => e.premier || (!!atteint && !!e.dernierCalcul && atteint.getTime() < e.dernierCalcul.getTime());
  // le rattrapage (V3 §1.9) : déjà remplie et dépendante de ce qui est nouveau (quête de la v3 au premier
  // calcul v3, capacité vue pour la première fois) → rétro, quelle que soit sa date d'atteinte
  const nouveau = nouveautesDe(e);
  const rattrapee = (q: Quete) => !!nouveau && ((nouveau.v3 && q.nouvelle === "v3") || dependancesDe(q).some((r) => nouveau.requis.has(r)));
  // l'XP déjà versée par les miroirs d'une payeuse (payés avant la v3, quand ils n'en étaient pas) :
  // la payeuse ne verse que le reste, jamais deux fois la même chose (V3 §8.2)
  const miroirsDe = new Map<string, string[]>();
  for (const x of catalogue) if (x.miroir) miroirsDe.set(x.miroir, [...(miroirsDe.get(x.miroir) ?? []), x.id]);
  const dejaVerse = (q: Quete) => (miroirsDe.get(q.id) ?? []).reduce((s, id) => {
    const l = lignes.get(clePeriode(id, ""));
    return s + (l && (l.etat === "recompensee" || l.etat === "terminee") ? Math.max(0, Number(l.xp) || 0) : 0);
  }, 0);
  for (const st of tri) {
    const q = st.quete;
    // sans la capacité « fil » (CHECK de codex_progression pas encore élargi), aucun palier du fil ne s'écrit (V3 §1.8)
    if (q.famille === "fil" && !capacites.fil) continue;
    // hors jeu : gelée, rien ne s'écrit (sa progression en base reste telle quelle)
    if (st.horsJeu) continue;
    const base = { quete: q.id, periode: st.periode, famille: q.famille as ItemEcriture["famille"] };
    if (st.fait && !(st.ligne && (st.ligne.etat === "recompensee" || st.ligne.etat === "terminee"))) {
      const retro = q.repetition === "unique" && (rattrapee(q) || (!usesDepuisOuverture(q.objectif) && retroDe(st.atteint)));
      st.retro = retro;
      // un miroir est tamponné sans rien verser : sa quête payeuse paie (V3 §8.2), moins ce que ses
      // miroirs ont déjà versé ; elle garde cosmétique et titre, et compte pour la clôture d'acte
      const paie = !q.miroir;
      lot.push({ ...base, etat: "terminee", cible: st.ev?.cible ?? 1, retro, xp: paie ? Math.max(0, q.recompense.xp - dejaVerse(q)) : 0, plafond, ...(st.atteint ? { atteint: st.atteint.toISOString() } : {}), ...(paie && q.recompense.cosmetique ? { cosmetique: q.recompense.cosmetique } : {}), ...(paie && q.recompense.titre ? { titre: q.recompense.titre } : {}) });
    } else if (!st.fait && st.ouverte) {
      const v = st.ev ? st.ev.valeur : 0;
      const etat = v > 0 ? "active" : "disponible";
      const l = st.ligne;
      if (!l || l.etat !== etat || Math.abs(Number(l.progression) - v) > 1e-9) lot.push({ ...base, etat, progression: v, cible: st.ev?.cible ?? 1 });
    }
  }
  for (const a of actes) {
    if (!actesClos.has(a.id) || lignesActes.has(a.id)) continue;
    const atteint = actesFaits.get(a.id) ?? null;
    const retro = retroDe(atteint) && a.id !== "epilogue";
    lot.push({ quete: `acte:${a.id}`, periode: "", famille: "acte", etat: "terminee", cible: 1, retro, xp: a.recompense.xp, plafond, ...(atteint ? { atteint: atteint.toISOString() } : {}), ...(a.recompense.cosmetique ? { cosmetique: a.recompense.cosmetique } : {}), ...(a.recompense.titre ? { titre: a.recompense.titre } : {}) });
  }
  // le trio du jour : les contrats tirés, un par emplacement (le débrief, quotidien lui aussi, n'en est pas)
  const duTrio = new Set(instances.filter((i) => i.emplacement).map((i) => clePeriode(i.quete.id, i.periode)));
  const dujour = tri.filter((s) => duTrio.has(clePeriode(s.quete.id, s.periode)));
  // ou la séance du jour lancée et tenue (V3 §6.4) : même id, même XP, une fois par jour
  const trioFait = (dujour.length === EMPLACEMENTS.length && dujour.every((s) => s.fait)) || e.seance?.tenue === true;
  if (trioFait && !lignes.has(clePeriode(`contrat:trio:${e.jour}`, e.jour))) {
    lot.push({ quete: `contrat:trio:${e.jour}`, periode: e.jour, famille: "contrat", etat: "terminee", cible: 3, retro: false, xp: XP.contratTrio, plafond });
  }
  return {
    etats: [...etats.values()],
    lot,
    budgetRetro: plafondRetro(niveau),
    niveau,
    phase: phaseJoueur(e, actesClos),
    actesClos: [...actesClos],
    acteCourant: acteCourantDe(actesClos, actes),
    contrats: instances.filter((i) => i.emplacement),
    trioFait,
    capacitesVues: marqueurDe(e),
  };
}

/**
 * La clôture d'un acte, d'après ses quêtes suivies et en jeu : toutes ses
 * quêtes non optionnelles faites ; avec `closAvec`, n de ses quêtes,
 * optionnelles comprises (l'acte I : 4 outils sur 7). La date : celle de la
 * dernière quête qu'il fallait. null : pas encore clos.
 */
export function clotureActe(a: Pick<Acte, "closAvec">, dedans: Pick<EtatQuete, "quete" | "fait" | "atteint">[]): { atteint: Date | null } | null {
  if (a.closAvec) {
    const n = Math.min(a.closAvec.n, dedans.length);
    const faites = dedans.filter((s) => s.fait);
    if (n < 1 || faites.length < n) return null;
    // la n-ième quête faite, dans l'ordre des dates (une date inconnue compte pour la plus récente)
    const dates = faites.map((s) => s.atteint).sort((x, y) => (x ? x.getTime() : Infinity) - (y ? y.getTime() : Infinity));
    return { atteint: dates[n - 1] ?? null };
  }
  const requises = dedans.filter((s) => !s.quete.optionnelle);
  if (!requises.length || !requises.every((s) => s.fait)) return null;
  return { atteint: dmax(requises.map((s) => s.atteint)) };
}

/**
 * L'acte en cours : le premier acte non clos du fil (prologue, II, III…),
 * hors épilogue. Un acte parallèle (l'acte I, les outils) ne le devient que
 * quand tout le fil est clos : sinon il garderait « tu es ici », le bonus
 * d'acte et l'annonce du rideau longtemps après qu'on l'a dépassé.
 */
export function acteCourantDe(actesClos: Set<string> | string[], actes: Acte[] = ACTES): Acte | null {
  const clos = actesClos instanceof Set ? actesClos : new Set(actesClos);
  // l'épilogue (numéro 99) est calé sur le jour J : jamais l'acte en cours
  const ouverts = actes.filter((a) => !clos.has(a.id) && a.numero !== 99);
  return ouverts.find((a) => !a.parallele) ?? ouverts[0] ?? null;
}

/** Pas de rétroactivité pour une fenêtre « depuisOuverture » (le départ est l'ouverture). */
function usesDepuisOuverture(o: Objectif): boolean {
  if (o.k === "compteur") return o.fenetre === "depuisOuverture";
  if (o.k === "tous" || o.k === "unDe") return o.objectifs.some(usesDepuisOuverture);
  return false;
}

/** Les paramètres d'une instance de contrat (vide pour les autres). */
export function parametresDe(e: Entree, st: Pick<EtatQuete, "quete" | "periode">): Contexte["params"] {
  if (st.quete.famille !== "contrat" || st.quete.repetition !== "quotidienne") return {};
  const m = /^contrat:(.+):(\d{4}-\d{2}-\d{2})$/.exec(st.quete.id);
  return e.contrats.find((c) => c.modele === m?.[1])?.params ?? {};
}

// ── La prochaine quête ─────────────────────────────────────────────────

export type Recommandation = {
  quete: Quete;
  periode: string;
  score: number;
  /** une ligne : « FSA pèse 12,5 % de l'examen et tu es à 48 % » */
  pourquoi: string;
  /** progression (0–1) si la quête est entamée */
  avancee: number;
};

const virgule = (n: number) => String(n).replace(".", ",");
// la carte (notions tenues) pousse avec les fondations ; l'épreuve signature, avec la maîtrise
const ETAPES_AVANT_JALON: EtapeBranche[] = ["entree", "cours", "fiche", "drill", "flashcards", "ciblee", "serie", "tour", "carte"];

/** La prochaine quête de trame du programme : ouverte, pas faite, la plus petite par ordre ; null : aucune. */
function trameSuivante(etats: EtatQuete[], programme: string): Quete | null {
  const ouvertes = etats.filter((s) => s.quete.famille === "trame" && s.periode === "" && s.ouverte && !s.fait && !s.quete.retiree && s.quete.programme === programme);
  return ouvertes.sort((a, b) => (a.quete.ordre ?? 0) - (b.quete.ordre ?? 0))[0]?.quete ?? null;
}

/**
 * Ce que le résolveur de destinations (lib/codex/destinations.ts) sait du
 * joueur : lu sur l'entrée et, s'il est là, sur le résultat de l'évaluation
 * (les quêtes faites, pour « branches à une étape » ; la prochaine quête de
 * trame, pour « programmes menés »).
 */
export function contexteDestination(e: Entree, r?: Pick<Resultat, "etats"> & Partial<Pick<Resultat, "phase">>): ContexteDestination {
  const contenu = e.contenu ?? contenuDuProgramme();
  const M = e.lecture.mesures;
  const comptes = M.notions ?? {};
  const pages = M.drill_pages ?? [];
  const joursAvant = joursAvantExamen(e.jour, e.jourJ);
  // la page de drill la plus faible d'une matière : le plus bas meilleur score, la première à égalité
  const pageFaible = (k: string) => pages.filter((p) => p.matiere === k).sort((a, b) => a.meilleur - b.meilleur || a.page - b.page)[0]?.page ?? null;
  return {
    contenu,
    maitrise: Object.fromEntries(contenu.map((m) => [m.key, { pct: maitriseDe(e, m.key), statut: maitriseLue(M, m.key).statut }])),
    maitrises: maitriseDuCodex(contenu, M).matieres,
    notionsNonVues: Object.fromEntries(contenu.map((m) => [m.key, notionsDeMatiere(m.key).filter((n) => (comptes[n.id] ?? 0) < 5).length])),
    // les notions pas encore tenues, si codex_mesures_v3 les a lues (V3 §8.5)
    notionsNonTenues: M.notions_tenues
      ? Object.fromEntries(contenu.map((m) => [m.key, notionsDeMatiere(m.key).filter((n) => (M.notions_tenues![n.id]?.n ?? 0) < NOTION_TENUE.reponses || (M.notions_tenues![n.id]?.j5 ?? 0) < NOTION_TENUE.justesSur5).length]))
      : null,
    pointsFaibles: e.pointsFaibles ?? [],
    drillPageFaible: Object.fromEntries(contenu.map((m) => [m.key, pageFaible(m.key)])),
    revoir: revoirDe(e),
    phase: r?.phase ?? phaseJoueur(e, actesClosDe(e.progression)),
    joursAvant,
    tailleMaxCiblee: (k) => tailleMaxCiblee(contenu.find((m) => m.key === k)?.poids ?? 0),
    routes: ROUTES,
    practiceV3: PRACTICE_V3,
    programme: programmeActif(e.programmes).cle,
    outils: programmeActif(e.programmes).outils,
    ...(r ? { faites: new Set(r.etats.filter((s) => s.fait && s.periode === "").map((s) => s.quete.id)), trameSuivante: trameSuivante(r.etats, programmeActif(e.programmes).cle) } : {}),
  };
}

/**
 * LA prochaine quête (CONCEPTION.md §10) : avant tout le prologue, dans
 * l'ordre ; sinon la quête ouverte au meilleur score = importance (poids de la
 * matière à l'examen) × faiblesse × urgence (phase, axe, acte en cours) ×
 * continuité (entamée, même matière) × durée (une quête plus longue que le
 * budget du jour recule). Les exploits ne sont jamais recommandés ; les
 * quêtes cachées non plus, ni celles qui ne mènent nulle part dans cette
 * copie du site (non lançables : elles restent dans l'arbre), ni celles que
 * le joueur a écartées aujourd'hui (« Une autre idée ? »).
 */
export function recommander(e: Entree, r: Resultat): Recommandation | null {
  const contenu = e.contenu ?? contenuDuProgramme();
  const R = RECOMMANDATION;
  const dest = contexteDestination(e, r);
  const ecartees = new Set(e.ecartees ?? []);
  const budget = budgetDuJour(e);
  const destinations = new Map<EtatQuete, Destination>();
  // un miroir (V3 §8.2) ne passe pas devant sa quête payeuse : quand elle est ouverte, c'est elle qu'on propose
  const payeusesOuvertes = new Set(r.etats.filter((s) => s.ouverte && !s.fait && !s.horsJeu && s.periode === "").map((s) => s.quete.id));
  const lancables = r.etats.filter((s) => {
    if (s.quete.miroir && payeusesOuvertes.has(s.quete.miroir)) return false;
    if (!s.ouverte || s.fait || s.horsJeu || s.differee || s.quete.famille === "exploit" || s.quete.visibilite === "cachee" || s.quete.visibilite === "indice" || s.quete.optionnelle || ecartees.has(s.quete.id)) return false;
    const d = destinationDe(s.quete, parametresDe(e, s), dest, s.ev ?? undefined);
    if (d) destinations.set(s, d);
    return !!d;
  });
  // le fil rouge ne passe qu'en dernier recours : quand aucune quête du programme n'est proposable (V3 §1.5)
  const duProgramme = lancables.filter((s) => s.quete.famille !== "fil");
  const ouvertes = duProgramme.length ? duProgramme : lancables;
  const joursAvant = joursAvantExamen(e.jour, e.jourJ);
  // le jour J : aucune quête recommandée (V3 §7.4), pas même celle du prologue
  if (joursAvant === 0 && programmeActif(e.programmes).examen) return null;
  const prologue = ouvertes.filter((s) => s.quete.acte === "prologue").sort((a, b) => a.quete.ordre - b.quete.ordre);
  const dernier = (s: EtatQuete): Recommandation => ({ quete: s.quete, periode: s.periode, score: 1000, pourquoi: s.quete.pourquoi ?? actesDuJoueur(e).find((a) => a.id === s.quete.acte)?.but ?? s.quete.consigne, avancee: avanceeDe(s) });
  if (prologue.length) return dernier(prologue[0]);
  const aucuneAvance = (m: ContenuMatiere | undefined) => (m ? maitriseDe(e, m.key) : null);
  let meilleur: Recommandation | null = null;
  for (const s of ouvertes) {
    const q = s.quete;
    const cle = q.matiere ?? (q.famille === "contrat" ? parametresDe(e, s).matiere : undefined);
    const m = contenu.find((x) => x.key === cle);
    const importance = m ? m.poids / R.poidsMax : R.importanceSansMatiere;
    const mai = aucuneAvance(m);
    const faiblesse = m ? (mai === null ? R.faiblesseInconnue : 1 - mai / 100) : 0.7;
    let urgence = 1;
    const chaine = q.chaine ? ChainesAxe.get(q.chaine) : undefined;
    if (chaine) urgence = R.urgence[r.phase][chaine];
    if (q.famille === "trame" && q.acte === r.acteCourant?.id) urgence = R.acteCourant;
    if (q.famille === "branche" && q.etape) {
      if (r.phase === "fondations" && ETAPES_AVANT_JALON.includes(q.etape)) urgence = 1.2;
      if ((r.phase === "repetition" || r.phase === "veillee") && ["maitrise60", "maitrise75", "signature", "maitre"].includes(q.etape)) urgence = 1.2;
    }
    const av = avanceeDe(s);
    // en veillée, on ne commence plus rien : pas de chaîne au long cours à entamer (V3 §7.1)
    if (r.phase === "veillee" && q.chaine && av === 0 && (q.palier ?? 1) <= 1) continue;
    let continuite = av >= 0.5 ? R.continuiteMoitie : av > 0 ? R.continuite : 1;
    if (e.derniereMatiere && cle === e.derniereMatiere) continuite *= R.memeMatiere;
    const duree = (destinations.get(s)?.duree ?? 20) <= budget ? 1 : R.horsDuree;
    const score = 100 * importance * faiblesse * urgence * continuite * duree;
    if (!meilleur || score > meilleur.score) {
      let pourquoi: string;
      if (m && mai !== null) pourquoi = `${m.court} pèse ${virgule(m.poids)} % de l'examen et tu es à ${mai} %.`;
      else if (m) pourquoi = `${m.court} pèse ${virgule(m.poids)} % de l'examen et tu n'y as pas encore de mesure.`;
      else if (chaine && q.chaine) pourquoi = CHAINES_POURQUOI.get(q.chaine) ?? q.pourquoi ?? q.consigne;
      else pourquoi = q.pourquoi ?? q.consigne;
      // pas de compte à rebours dans la dernière semaine (V3 §7.2)
      if (joursAvant !== null && joursAvant > 7 && joursAvant <= 30 && q.chaine) pourquoi += ` Plus que ${joursAvant} jours.`;
      meilleur = { quete: q, periode: s.periode, score, pourquoi, avancee: av };
    }
  }
  return meilleur;
}

const ChainesAxe = new Map(CHAINES.map((c) => [c.id, c.axe]));
const CHAINES_POURQUOI = new Map(CHAINES.map((c) => [c.id, c.pourquoi]));

function avanceeDe(s: EtatQuete): number {
  if (s.ev && s.ev.cible) return clamp01(s.ev.valeur / s.ev.cible);
  if (s.ligne && s.ligne.cible) return clamp01(Number(s.ligne.progression) / s.ligne.cible);
  return 0;
}

/** Une quête affichée : complète, verrouillée (on voit le chemin), énigme ou cachée. */
export function affichage(s: Pick<EtatQuete, "quete" | "ouverte" | "fait">): "complet" | "verrouille" | "indice" | "cache" {
  if (s.fait) return "complet";
  switch (s.quete.visibilite) {
    case "visible": return s.ouverte ? "complet" : "verrouille";
    case "ouverte": return s.ouverte ? "complet" : "cache";
    case "indice": return "indice";
    case "cachee": return "cache";
  }
}

// ── Le dévoilement progressif ──────────────────────────────────────────

/** Les comptes inscrits avant ce moment voient tout dès le premier jour (à régler au déploiement). */
export const LANCEMENT_CODEX = "2026-10-16T00:00:00+02:00";
/** Au-delà de ce nombre de questions, un compte voit tout. */
export const QUESTIONS_COMPTE_ANCIEN = 50;

/** user_metadata.rl_codex */
export type MetaCodex = { devoile: string[] | "tout"; jours: string[] };

export const META_CODEX_VIDE: MetaCodex = { devoile: [], jours: [] };

export function lireMetaCodex(meta: unknown): MetaCodex {
  const o = (meta as Record<string, unknown> | null | undefined)?.rl_codex as Record<string, unknown> | undefined;
  if (!o || typeof o !== "object") return META_CODEX_VIDE;
  const devoile = o.devoile === "tout" ? "tout" : Array.isArray(o.devoile) ? (o.devoile as unknown[]).filter((x): x is string => typeof x === "string") : [];
  const jours = Array.isArray(o.jours) ? (o.jours as unknown[]).filter((x): x is string => typeof x === "string").slice(-30) : [];
  return { devoile, jours };
}

export type EtatDevoilement = { devoile: string[] | "tout"; jours: string[]; nouveaux: string[]; change: boolean };

/**
 * Ce qui est dévoilé maintenant : le premier déclencheur rempli de chaque
 * ligne de DECOUVERTE (quête faite, minutes depuis l'inscription, n-ième
 * jour de visite), le bouton « Tout montrer » (devoile = "tout") ; un compte
 * ancien (inscrit avant LANCEMENT_CODEX, ou ≥ 50 questions) voit tout. Un
 * dévoilement ne se retire jamais. `nouveaux` : ce qui apparaît à cet appel
 * (l'onglet s'encre, Léonard dit sa réplique).
 */
export function devoiler(meta: MetaCodex, p: { inscritLe: string | null; questions: number; faites: Set<string>; now: Date; jour: string }): EtatDevoilement {
  const jours = meta.jours.includes(p.jour) ? meta.jours : [...meta.jours, p.jour].slice(-30);
  if (meta.devoile === "tout") return { devoile: "tout", jours, nouveaux: [], change: jours !== meta.jours };
  const ancien = (!!p.inscritLe && Date.parse(p.inscritLe) < Date.parse(LANCEMENT_CODEX)) || p.questions >= QUESTIONS_COMPTE_ANCIEN;
  if (ancien) return { devoile: "tout", jours, nouveaux: DECOUVERTE.map((d) => d.id).filter((id) => !meta.devoile.includes(id)), change: true };
  const minutes = p.inscritLe ? (p.now.getTime() - Date.parse(p.inscritLe)) / 60_000 : 0;
  const deja = new Set(meta.devoile);
  const nouveaux: string[] = [];
  for (const d of DECOUVERTE) {
    if (deja.has(d.id)) continue;
    if (d.quand.some((x) => (x.k === "quete" ? p.faites.has(clePeriode(x.id, "")) : x.k === "minutes" ? minutes >= x.n : x.k === "visite" ? jours.length >= x.n : false))) nouveaux.push(d.id);
  }
  return { devoile: [...meta.devoile, ...nouveaux], jours, nouveaux, change: nouveaux.length > 0 || jours !== meta.jours };
}

/**
 * Les dévoilements dont Léonard dit la réplique (V3 §11.3) : une seule par
 * vague, celle du premier dévoilement de la vague ; rien pour une vague déjà
 * entamée avant cet appel (`avant` : ce qui était dévoilé jusque-là).
 */
export function repliquesDeVague(nouveaux: string[], avant: string[]): Set<string> {
  const entamees = new Set(DECOUVERTE.filter((d) => avant.includes(d.id)).map((d) => d.vague));
  const parlent = new Set<string>();
  for (const d of DECOUVERTE) {
    if (!nouveaux.includes(d.id) || entamees.has(d.vague)) continue;
    entamees.add(d.vague);
    parlent.add(d.id);
  }
  return parlent;
}

/** Un élément (onglet, famille du Codex) est-il dévoilé ? Les liens directs marchent toujours : ceci ne sert qu'à ranger. */
export function estDevoile(d: string[] | "tout", quoi: string): boolean {
  if (d === "tout") return true;
  const ligne = DECOUVERTE.find((x) => x.quoi === quoi);
  return !ligne ? true : d.includes(ligne.id);
}

export { PHASES };
