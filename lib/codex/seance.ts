// Le Codex : la séance du jour (V3 §6.1). Le temps que le joueur se donne
// (« J'ai 30 min ») devient deux à quatre blocs concrets, dans l'ordre de sa
// phase : retouches (la file « À revoir »), ce qui coince (la matière qui
// coûte le plus de points), du neuf (les notions jamais vues), l'épreuve
// (30 questions mêlées aux poids officiels), et les 5 ou les 30 du jour,
// qui gardent leur place en haut de l'accueil et peuvent aussi être des blocs.
// Chaque bloc a son lien (« Y aller », lib/codex/destinations.ts), sa raison
// chiffrée et son objectif : il est fait quand ses compteurs le disent, sans
// toucher aux outils (fenêtre « depuisLancement », lib/codex/moteur.ts).
// La séance se garde en base (codex_seances, migration_codex_v3.sql §6) sous
// une forme courte (versStockage / depuisStockage) ; un bloc fait n'en est
// jamais retiré.
// Module neutre et pur : le serveur (lib/codex/serveur.ts) compose, garde et
// évalue ; l'écran affiche (lot A5b).

import { MODELES_CONTRATS, contenuDuProgramme, evenementsDe, type ContenuMatiere } from "@/lib/codex/catalogue";
import { destinationBloc, type CibleBloc, type ContexteDestination, type Destination } from "@/lib/codex/destinations";
import { budgetParDefaut as budgetParDefautReglage } from "@/lib/codex/reglage";
import { scoreFaiblesse, type Maitrise } from "@/lib/codex/cap";
import type { DefinitionProgramme } from "@/lib/codex/programmes";
import { lireInstantane, type InstantaneSeance } from "@/lib/codex/seance-etat";
import type { VueContrat } from "@/lib/codex/vue";
import type { Budget, Objectif, Phase } from "@/lib/codex/types";
import { SEANCE } from "@/lib/voice-codex";

export type { Budget };
// l'état de la séance pour l'écran, et ce qu'elle a fait avancer : un module léger, sans le catalogue (importé par les écrans)
export * from "@/lib/codex/seance-etat";

export type GenreBloc = "cinq" | "trente" | "retouches" | "coince" | "nouveau" | "epreuve";

export const GENRES_BLOC: readonly GenreBloc[] = ["cinq", "trente", "retouches", "coince", "nouveau", "epreuve"];
export const estGenreBloc = (x: unknown): x is GenreBloc => typeof x === "string" && (GENRES_BLOC as readonly string[]).includes(x);

export type Bloc = {
  genre: GenreBloc;
  titre: string;
  /** minutes */
  duree: number;
  raison: string;
  destination: Destination;
  /** fait quand ses compteurs le disent (fenêtre « depuisLancement ») */
  objectif: Objectif;
  /** les contrats du jour qu'il fait avancer (ids) */
  contrats: string[];
  /** la matière visée (ce qui coince, du neuf) */
  matiere?: string;
  /** la taille des retouches (questions à revoir) */
  n?: number;
};

export type Seance = { jour: string; budget: Budget; phase: Phase; blocs: Bloc[]; duree: number };

/** La maîtrise du cap (lib/codex/cap.ts), copie locale de lib/maitrise.ts (V3 §4.3) : remplacée par l'import après F2. */
export type MaitriseCodex = Maitrise;

/**
 * La file « À revoir » (V3 §5.1, `Revisions` de lib/revisions.ts sans les
 * questions) : copie locale, remplacée par l'import après F2. `complet` faux :
 * le repli (les ratures en cours, sans les rappels ni demain).
 */
export type RevoirCodex = { aujourdhui: number; demain: number; ratures: number; rappels: number; complet: boolean };

export type EntreeSeance = {
  jour: string;
  phase: Phase;
  /** jours avant l'examen (null : sans jour J) */
  joursAvant: number | null;
  budget: Budget;
  maitrise: MaitriseCodex;
  /** null : rien de connu */
  revoir: RevoirCodex | null;
  cinqFait: boolean;
  trenteFait: boolean;
  /** les 30 du jour existent aujourd'hui */
  trenteDispo: boolean;
  questionsTotal: number;
  notionsNonVues: { matiere: string; n: number; total: number }[];
  contrats: VueContrat[];
  def: DefinitionProgramme;
  /** les genres écartés aujourd'hui par « Une autre idée ? » */
  ecartes: GenreBloc[];
  /** le contexte du résolveur de destinations (routes de cette copie, replis, points faibles, liens de /practice) */
  dest: ContexteDestination;
  /** les blocs déjà faits de la séance précédente du jour : gardés tels quels, en tête */
  blocsFaits?: Bloc[];
  /** après un « pas cette fois » (V3 §10.5, recalageVerdict) : les bandes basses pèsent plus, les retouches passent en tête */
  recalage?: { facteur: (matiere: string) => number } | null;
};

/** Le budget par défaut : la médiane des 7 derniers jours actifs × 1,2 min, au budget le plus proche (30 sans historique). */
export const budgetParDefaut = (questionsParJour7: number[]): Budget => budgetParDefautReglage(questionsParJour7);

// ── Les règles (V3 §6.1) ───────────────────────────────────────────────

/** L'ordre des candidats par phase : on prend dans l'ordre tant que le budget le permet. */
export const ORDRE_BLOCS: Record<Phase, readonly GenreBloc[]> = {
  fondations: ["cinq", "retouches", "nouveau", "coince", "trente"],
  consolidation: ["cinq", "retouches", "coince", "nouveau", "trente"],
  // l'épreuve avant ce qui coince : dès 60 min elle entre (retouches 15 + épreuve 45), coince à 90 min
  repetition: ["retouches", "epreuve", "coince", "cinq"],
  veillee: ["retouches", "epreuve", "cinq", "coince"],
  apres: ["retouches", "coince", "nouveau"],
};

/** Blocs au plus selon le budget : 15 → 2, 30 → 2, 60 → 3, 90 → 4. */
export const MAX_BLOCS: Record<Budget, number> = { 15: 2, 30: 2, 60: 3, 90: 4 };
/** La séance ne dépasse jamais le budget de plus de 5 minutes. */
export const MARGE_SEANCE = 5;
/** Le plus court des blocs : sous ce reste, on s'arrête. */
const DUREE_MIN = 5;
/** Retouches : de 5 à 25 questions (≈ 1 min chacune), 15 au plus en répétition et en veillée (l'épreuve passe) ; proposées dès 5 à revoir. */
export const RETOUCHES = { min: 5, max: 25, repetition: 15, veillee: 15 } as const;
/** Les 30 du jour dans la séance : dès 60 min et 100 questions posées. */
export const TRENTE_SEANCE = { budget: 60, questions: 100 } as const;
/** L'épreuve en veillée : de J-7 à J-4 (ensuite, la malle et le repos). */
export const EPREUVE_VEILLEE = { de: 7, a: 4 } as const;
/**
 * La dernière semaine (V3 §7.1) : la veillée plafonne la séance à 60 min ; la
 * malle (J-3 à J-1) ne garde que les 5 du jour et 10 retouches au plus.
 */
export const VEILLEE = { budgetMax: 60, malle: 3, retouchesMalle: 10 } as const;
const ORDRE_MALLE: readonly GenreBloc[] = ["cinq", "retouches"];
/** J-3 à J-1 (et le jour J) : la malle. */
const enMalle = (e: Pick<EntreeSeance, "phase" | "joursAvant">) => e.phase === "veillee" && e.joursAvant !== null && e.joursAvant <= VEILLEE.malle;
/** Ce qui coince et du neuf : il faut ce nombre de réponses dans la matière (ou une séance, ou une page de drill). */
const QUESTIONS_BLOC = 12;

/**
 * Les titres d'avant le Codex simplifié : une séance gardée en base avec l'un
 * d'eux (composée avant la mise en ligne) se relit avec le titre clair.
 */
const TITRES_ANCIENS: ReadonlySet<string> = new Set(["Retouches", "Ce qui coince", "Du neuf", "L'épreuve"]);

/** Le titre clair d'un bloc (« Corriger 14 ratures », « Renforcer FSA », lib/voice-codex SEANCE.bloc). */
function titreBloc(genre: GenreBloc, p: { n?: number; matiere?: string; defi?: boolean }, contenu: ContenuMatiere[]): string {
  const court = p.matiere ? contenu.find((m) => m.key === p.matiere)?.court : undefined;
  return SEANCE.bloc(genre, { ...(p.n ? { n: p.n } : {}), ...(court ? { matiere: court } : {}), ...(p.defi !== undefined ? { defi: p.defi } : {}) });
}

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

// ── Les objectifs des blocs ────────────────────────────────────────────

const compteur = (evenement: string, seuil: number, filtre?: Record<string, unknown>): Objectif =>
  ({ k: "compteur", evenement, ...(filtre ? { filtre } : {}), seuil, fenetre: "depuisLancement" }) as Objectif;

/**
 * L'objectif d'un bloc (V3 §6.1), compté depuis le lancement de la séance :
 * cinq → les 5 rendus ; trente → les 30 rendus ; retouches → une séance
 * « À revoir » rendue ou la moitié des ratures rayées ; ce qui coince → une
 * séance dans la matière, une séance d'Atelier ou 12 réponses dans la
 * matière ; du neuf → 12 réponses dans la matière ou une page de drill ;
 * l'épreuve → les 30 du jour, une séance mêlée de 30 questions ou un examen blanc.
 */
export function objectifBloc(genre: GenreBloc, p: { matiere?: string; n?: number } = {}): Objectif {
  switch (genre) {
    case "cinq": return compteur("cinq_rendu", 1);
    case "trente": return compteur("defi_rendu", 1);
    case "retouches": return { k: "unDe", objectifs: [compteur("revoir_rendue", 1), compteur("rature_rayee", Math.ceil((p.n ?? RETOUCHES.min) / 2))] };
    case "coince": return { k: "unDe", objectifs: [compteur("session_terminee", 1, { matiere: p.matiere ?? null }), compteur("seance_atelier", 1), compteur("question_repondue", QUESTIONS_BLOC, { matiere: p.matiere ?? null })] };
    case "nouveau": return { k: "unDe", objectifs: [compteur("question_repondue", QUESTIONS_BLOC, { matiere: p.matiere ?? null }), compteur("drill_page_terminee", 1, { matiere: p.matiere ?? null })] };
    case "epreuve": return { k: "unDe", objectifs: [compteur("defi_rendu", 1), compteur("session_terminee", 1, { matiere: null, questions: { min: 30 } }), compteur("examen_blanc_rendu", 1)] };
  }
}

/** Les événements d'un objectif, et la matière qu'il vise s'il en vise une. */
function cibleObjectif(o: Objectif): { evenements: Set<string>; matiere: string | null } {
  const evenements = new Set<string>(evenementsDe(o));
  let matiere: string | null = null;
  const visite = (x: Objectif) => {
    if (x.k === "compteur") {
      const m = (x.filtre as Record<string, unknown> | undefined)?.matiere;
      if (typeof m === "string") matiere = m;
    } else if (x.k === "tous" || x.k === "unDe") x.objectifs.forEach(visite);
  };
  visite(o);
  return { evenements, matiere };
}

/**
 * Les contrats du jour pas encore faits qu'un bloc fait avancer : ils
 * comptent un même événement et, s'ils visent tous deux une matière, la même.
 */
export function contratsAvances(objectif: Objectif, matiere: string | undefined, contrats: VueContrat[]): string[] {
  const b = cibleObjectif(objectif);
  return contrats
    .filter((c) => {
      if (c.ligne.etat === "terminee") return false;
      const m = MODELES_CONTRATS.find((x) => x.id === c.modele);
      if (!m) return false;
      const k = cibleObjectif(m.objectif);
      const mc = c.ligne.matiere ?? null;
      return [...k.evenements].some((ev) => b.evenements.has(ev)) && (!mc || !matiere || mc === matiere);
    })
    .map((c) => c.ligne.id);
}

// ── Les blocs ──────────────────────────────────────────────────────────

// Les raisons : une phrase-fait de 12 mots au plus, dans les mots du site
// (lib/voice-codex SEANCE.raisons, Codex simplifié §2 et §4).

/** La raison des retouches : « 15 à revoir : 8 ratures, 7 rappels · demain 22 » (repli : un fait). */
export const raisonRetouches = (r: RevoirCodex): string => SEANCE.raisons.retouches(r);

/** « FSA pèse 12,5 % de l'examen, tu es à 48 % » ; « …, pas encore mesurée ». */
export const raisonCoince = (m: Pick<Maitrise["matieres"][number], "court" | "poids" | "pct">): string => SEANCE.raisons.coince(m);

/** « 12 notions de FSA jamais vues sur 30 ». */
export const raisonNouveau = (court: string, n: number, total: number): string => SEANCE.raisons.nouveau(court, n, total);

/** « 30 questions mêlées, aux poids de l'examen » (ou les 30 du jour, sous chrono) ; pas de compte à rebours. */
export const raisonEpreuve = (_joursAvant: number | null, defi: boolean): string => SEANCE.raisons.epreuve(defi);

/**
 * La matière de « ce qui coince » : le point faible, plus fort poids ×
 * (1 − maîtrise), une matière pas encore mesurée comptant pour 20 %
 * (scoreFaiblesse, lib/codex/cap.ts, la définition unique) ; en veillée, seulement une
 * matière déjà en zone moyenne ou haute (on consolide, on ne découvre plus).
 */
export function matiereCoince(m: MaitriseCodex, veillee: boolean, facteur: (matiere: string) => number = () => 1): Maitrise["matieres"][number] | null {
  let meilleure: Maitrise["matieres"][number] | null = null;
  let score = -1;
  for (const x of m.matieres) {
    if (veillee && x.zone !== "moyenne" && x.zone !== "haute") continue;
    const s = scoreFaiblesse(x) * facteur(x.cle);
    if (s > score) [meilleure, score] = [x, s];
  }
  return meilleure;
}

/** La matière de « du neuf » : le plus fort poids × part des notions jamais vues. */
function matiereNouveau(e: EntreeSeance, contenu: ContenuMatiere[]): { m: ContenuMatiere; n: number; total: number } | null {
  let meilleure: { m: ContenuMatiere; n: number; total: number } | null = null;
  let score = 0;
  for (const x of e.notionsNonVues) {
    const m = contenu.find((c) => c.key === x.matiere);
    if (!m || x.n <= 0 || x.total <= 0) continue;
    const s = (m.poids * x.n) / x.total;
    if (s > score) [meilleure, score] = [{ m, n: x.n, total: x.total }, s];
  }
  return meilleure;
}

const epreuveOuverte = (e: Pick<EntreeSeance, "phase" | "joursAvant">) =>
  e.phase === "repetition" || (e.phase === "veillee" && e.joursAvant !== null && e.joursAvant <= EPREUVE_VEILLEE.de && e.joursAvant >= EPREUVE_VEILLEE.a);

/** Un bloc de ce genre pour ce joueur, avec le budget qui reste ; null : il n'a pas lieu d'être aujourd'hui, ou rien n'y mène. */
function blocDe(genre: GenreBloc, e: EntreeSeance, restant: number): Bloc | null {
  const outils = e.def.outils;
  const avec = (cible: CibleBloc, duree: number, raison: string, p: { matiere?: string; n?: number } = {}): Bloc | null => {
    const destination = destinationBloc(cible, e.dest);
    if (!destination) return null;
    const objectif = objectifBloc(genre, p);
    const titre = titreBloc(genre, { ...p, ...(cible.k === "epreuve" ? { defi: cible.defi } : {}) }, e.dest.contenu);
    return { genre, titre, duree, raison, destination: { ...destination, duree, raison }, objectif, contrats: contratsAvances(objectif, p.matiere, e.contrats), ...p };
  };
  switch (genre) {
    case "cinq":
      return e.cinqFait || !outils.has("cinq") ? null : avec({ k: "cinq" }, 5, SEANCE.raisons.cinq);
    case "trente":
      if (e.budget < TRENTE_SEANCE.budget || e.trenteFait || !e.trenteDispo || e.questionsTotal < TRENTE_SEANCE.questions || !outils.has("trente")) return null;
      return avec({ k: "trente" }, 40, SEANCE.raisons.trente);
    case "retouches": {
      const r = e.revoir;
      if (!r || r.aujourdhui < RETOUCHES.min || !outils.has("revoir")) return null;
      const plafond = enMalle(e) ? VEILLEE.retouchesMalle : e.phase === "veillee" ? RETOUCHES.veillee : e.phase === "repetition" ? RETOUCHES.repetition : RETOUCHES.max;
      const n = Math.min(clamp(Math.min(r.aujourdhui, restant), RETOUCHES.min, RETOUCHES.max), plafond);
      return avec({ k: "revoir", n }, n, raisonRetouches(r), { n });
    }
    case "coince": {
      const veillee = e.phase === "veillee";
      const m = matiereCoince(e.maitrise, veillee, e.recalage?.facteur);
      if (!m) return null;
      const duree = veillee || e.budget <= 30 ? 15 : 25;
      return avec({ k: "coince", matiere: m.cle, duree }, duree, raisonCoince(m), { matiere: m.cle });
    }
    case "nouveau": {
      const x = matiereNouveau(e, e.dest.contenu);
      return x ? avec({ k: "nouveau", matiere: x.m.key, duree: 20 }, 20, raisonNouveau(x.m.court, x.n, x.total), { matiere: x.m.key }) : null;
    }
    case "epreuve": {
      if (!epreuveOuverte(e)) return null;
      const defi = !e.trenteFait && e.trenteDispo && outils.has("trente");
      const duree = defi ? 40 : 45;
      return avec({ k: "epreuve", defi, duree }, duree, raisonEpreuve(e.joursAvant, defi));
    }
  }
}

/**
 * La séance du jour : les blocs déjà faits d'abord (jamais retirés), puis les
 * candidats de la phase dans l'ordre, sans les genres écartés, tant que le
 * reste du budget couvre un bloc ; jamais plus de budget + 5 min, et 2, 3 ou
 * 4 blocs au plus selon le budget.
 */
export function composerSeance(entree: EntreeSeance): Seance {
  // en veillée, 60 min au plus, quel que soit le temps choisi (le budget choisi reste celui de la séance)
  const e: EntreeSeance = entree.phase === "veillee" && entree.budget > VEILLEE.budgetMax ? { ...entree, budget: VEILLEE.budgetMax } : entree;
  const blocs: Bloc[] = [];
  for (const b of e.blocsFaits ?? []) if (!blocs.some((x) => x.genre === b.genre)) blocs.push(b);
  let total = blocs.reduce((s, b) => s + b.duree, 0);
  const max = Math.max(MAX_BLOCS[e.budget], blocs.length);
  const ordre = enMalle(e) ? ORDRE_MALLE : ORDRE_BLOCS[e.phase];
  for (const genre of e.recalage ? ["retouches" as const, ...ordre.filter((g) => g !== "retouches")] : ordre) {
    if (blocs.length >= max || e.budget - total < DUREE_MIN) break;
    if (blocs.some((b) => b.genre === genre) || e.ecartes.includes(genre)) continue;
    const b = blocDe(genre, e, e.budget - total);
    if (!b || total + b.duree > e.budget + MARGE_SEANCE) continue;
    blocs.push(b);
    total += b.duree;
  }
  return { jour: e.jour, budget: entree.budget, phase: e.phase, blocs, duree: total };
}

// ── L'état de la séance ────────────────────────────────────────────────

/**
 * La séance telle que la vue la porte : ses blocs, ceux qui sont faits, si
 * elle est lancée, finie (tous faits, ou « J'arrête là »), et si la base la
 * garde (codex_seances ; sinon recomposée par le serveur, « Continuer » se
 * garde dans le navigateur).
 */
export type VueSeance = Seance & {
  faits: GenreBloc[]; lancee: boolean; lanceeLe: string | null; finie: boolean; finieLe: string | null; gardee: boolean;
  /** l'instantané pris au lancement (« Ce que ça a fait avancer », V3 §6.5) ; absent : pas lancée, ou rien de gardé */
  avant?: InstantaneSeance | null;
};

// ── Le stockage (codex_seances.blocs) ──────────────────────────────────

/** Un bloc tel que la base le garde : de quoi l'afficher et refaire son objectif. */
export type BlocStocke = { genre: GenreBloc; titre: string; duree: number; raison: string; href: string; outil: Destination["outil"]; matiere?: string; n?: number; contrats?: string[] };

export function versStockage(blocs: Bloc[]): BlocStocke[] {
  return blocs.map((b) => ({
    genre: b.genre, titre: b.titre, duree: b.duree, raison: b.raison, href: b.destination.href, outil: b.destination.outil,
    ...(b.matiere ? { matiere: b.matiere } : {}), ...(b.n ? { n: b.n } : {}), ...(b.contrats.length ? { contrats: b.contrats } : {}),
  }));
}

const OUTILS_BLOC: ReadonlySet<string> = new Set(["ciblee", "fiche", "drill", "cours", "flashcards", "atelier", "calculs", "blancs", "trente", "cinq", "eclair", "duels", "revoir", "codex", "profil", "classement"]);
const texte = (x: unknown, max: number): string | null => (typeof x === "string" && x.length > 0 && x.length <= max ? x : null);

/** Le titre clair d'un bloc gardé sous un titre d'avant (la matière lue dans le CFA I ; inconnue : le titre gardé). */
function titreAncien(genre: GenreBloc, lu: string, o: Record<string, unknown>): string {
  const matiere = typeof o.matiere === "string" ? o.matiere : undefined;
  const contenu = contenuDuProgramme();
  if (matiere && !contenu.some((m) => m.key === matiere)) return lu;
  const n = typeof o.n === "number" && o.n > 0 ? Math.round(o.n) : undefined;
  return titreBloc(genre, { n, matiere, defi: o.outil === "trente" }, contenu);
}

/** Les blocs gardés en base, relus (un bloc mal formé est ignoré : la séance se recompose sans lui). */
export function depuisStockage(x: unknown): Bloc[] {
  if (!Array.isArray(x)) return [];
  const out: Bloc[] = [];
  for (const o of x.slice(0, 6) as Record<string, unknown>[]) {
    if (!o || typeof o !== "object") continue;
    const genre = o.genre;
    const lu = texte(o.titre, 80);
    // un titre d'avant le Codex simplifié se relit en clair (la matière : celle du CFA I, sinon le titre gardé)
    const titre = lu && estGenreBloc(genre) && TITRES_ANCIENS.has(lu) ? titreAncien(genre, lu, o) : lu;
    const raison = texte(o.raison, 200) ?? "";
    const href = texte(o.href, 300);
    const duree = typeof o.duree === "number" && o.duree > 0 && o.duree <= 120 ? Math.round(o.duree) : null;
    if (!estGenreBloc(genre) || !titre || !href || !href.startsWith("/") || href.startsWith("//") || duree === null || out.some((b) => b.genre === genre)) continue;
    const matiere = texte(o.matiere, 60) ?? undefined;
    const n = typeof o.n === "number" && o.n > 0 && o.n <= 90 ? Math.round(o.n) : undefined;
    const outil = typeof o.outil === "string" && OUTILS_BLOC.has(o.outil) ? (o.outil as Destination["outil"]) : "codex";
    const contrats = Array.isArray(o.contrats) ? o.contrats.filter((c): c is string => typeof c === "string" && c.length <= 120).slice(0, 6) : [];
    out.push({
      genre, titre, duree, raison, destination: { href, libelle: "Y aller", duree, raison, outil },
      objectif: objectifBloc(genre, { matiere, n }), contrats, ...(matiere ? { matiere } : {}), ...(n ? { n } : {}),
    });
  }
  return out;
}

// ── Ce que le serveur garde et relit ───────────────────────────────────

/** Les colonnes de codex_seances que le serveur relit à chaque calcul. */
export const COLONNES_SEANCE = "budget_min,blocs,faits,lancee_le,finie_le,avant";

/** La séance gardée du jour : la ligne de codex_seances, ou (sans elle) la dernière séance calculée par cette instance. */
export type SeanceGardee = { budget: Budget; blocs: Bloc[]; faits: GenreBloc[]; lanceeLe: string | null; finieLe: string | null; avant?: InstantaneSeance | null };

const dateIso = (x: unknown): string | null => (typeof x === "string" && !Number.isNaN(Date.parse(x)) ? x : null);

/** Une ligne de codex_seances (codex_seance_poser / _marquer, ou un select) ; null : rien d'exploitable. */
export function lireSeanceGardee(x: unknown): SeanceGardee | null {
  const o = x as Record<string, unknown> | null;
  if (!o || typeof o !== "object") return null;
  const budget = o.budget_min;
  if (budget !== 15 && budget !== 30 && budget !== 60 && budget !== 90) return null;
  const blocs = depuisStockage(o.blocs);
  const faits = Array.isArray(o.faits) ? o.faits.filter((g): g is GenreBloc => estGenreBloc(g) && blocs.some((b) => b.genre === g)) : [];
  return { budget, blocs, faits, lanceeLe: dateIso(o.lancee_le), finieLe: dateIso(o.finie_le), avant: lireInstantane(o.avant) };
}

/** Les sondes du jour, demandées avec les blocs : les 5 et les 30 du jour déjà rendus aujourd'hui. */
export const SONDES_SEANCE: readonly Objectif[] = [
  { k: "compteur", evenement: "cinq_rendu", seuil: 1, fenetre: "jour" },
  { k: "compteur", evenement: "defi_rendu", seuil: 1, fenetre: "jour" },
];

/** Le bonus du trio veut une vraie séance : 15 minutes au moins, dont un bloc fait après le lancement. */
export const SEANCE_TENUE_MIN = 15;

/**
 * Ce que disent les compteurs, évalués sur Entree.seance (les sondes, puis un
 * objectif par bloc gardé) : les 5 et les 30 du jour rendus, les blocs faits
 * (jamais un fait retiré), et si la séance lancée est tenue (le bonus du trio).
 * Les 5 et les 30 du jour ne se jouent qu'une fois par jour : rendus
 * aujourd'hui, même avant le lancement, leur bloc est fait (et l'épreuve qui
 * mène aux 30 du jour aussi) ; ils se cochent ainsi des deux côtés de
 * l'accueil (V3 §6.3). Mais ils ne suffisent pas au bonus : la séance tenue
 * compte SEANCE_TENUE_MIN minutes au moins, et un de ses blocs au moins a été
 * fait après le lancement (son objectif, compté depuis le lancement, rempli).
 */
export function faitsDeSeance(g: Pick<SeanceGardee, "blocs" | "faits" | "lanceeLe"> | null, evs: readonly { fait: boolean }[]): { cinqFait: boolean; trenteFait: boolean; faits: GenreBloc[]; tenue: boolean } {
  const cinqFait = !!evs[0]?.fait;
  const trenteFait = !!evs[1]?.fait;
  const faits: GenreBloc[] = [...(g?.faits ?? [])];
  let apresLancement = false;
  g?.blocs.forEach((b, i) => {
    const duJour = (b.genre === "cinq" && cinqFait) || ((b.genre === "trente" || (b.genre === "epreuve" && b.destination.outil === "trente")) && trenteFait);
    const parObjectif = !!evs[SONDES_SEANCE.length + i]?.fait;
    if (parObjectif) apresLancement = true;
    if ((duJour || parObjectif) && !faits.includes(b.genre)) faits.push(b.genre);
  });
  const duree = g?.blocs.reduce((s, b) => s + b.duree, 0) ?? 0;
  const tenue = !!g?.lanceeLe && g.blocs.length > 0 && g.blocs.every((b) => faits.includes(b.genre)) && apresLancement && duree >= SEANCE_TENUE_MIN;
  return { cinqFait, trenteFait, faits, tenue };
}

/**
 * La séance gardée tient-elle encore ? Non s'il n'y en a pas, si le budget du
 * jour a changé, ou si un de ses blocs à faire vient d'être écarté (« Une
 * autre idée ? ») : on recompose, en gardant les blocs faits.
 */
export function aRecomposer(g: Pick<SeanceGardee, "budget" | "blocs"> | null, budget: Budget, ecartes: GenreBloc[], faits: GenreBloc[]): boolean {
  if (!g || !g.blocs.length) return true;
  return g.budget !== budget || g.blocs.some((b) => !faits.includes(b.genre) && ecartes.includes(b.genre));
}

/** La file « À revoir » pour la séance : revisions_dues (complète) ; sans elle, les ratures en cours, 25 au plus. */
export function revoirCodexDe(m: { revoir?: { aujourdhui: number; demain: number; ratures: number; rappels: number }; ratures_ouvertes?: { total: number } }): RevoirCodex | null {
  if (m.revoir) return { aujourdhui: Math.min(RETOUCHES.max, m.revoir.aujourdhui), demain: Math.min(RETOUCHES.max, m.revoir.demain), ratures: m.revoir.ratures, rappels: m.revoir.rappels, complet: true };
  if (m.ratures_ouvertes) {
    const n = Math.min(RETOUCHES.max, m.ratures_ouvertes.total);
    return { aujourdhui: n, demain: 0, ratures: n, rappels: 0, complet: false };
  }
  return null;
}

/** Les genres écartés de la séance, rangés parmi les quêtes écartées du jour (« seance:coince ») : même réglage, avec ou sans la base. */
export const ECARTE_SEANCE = "seance:";
export const ecartesSeance = (ecartees: string[]): GenreBloc[] =>
  ecartees.filter((x) => x.startsWith(ECARTE_SEANCE)).map((x) => x.slice(ECARTE_SEANCE.length)).filter(estGenreBloc);
