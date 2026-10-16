// Le Codex : le REGISTRE des programmes (V3 §1.3). Un programme se décrit par
// des données (ses matières, ses outils, sa trame, ses chaînes) et son arbre
// en est généré : CFA I garde sa trame propre et ses ids publiés ; un autre
// programme (CFA II, histoire…) prend la trame générique et des ids préfixés
// de son slug. Le fil rouge et les exploits sont communs (« global ») et
// s'ajoutent à l'arbre du programme actif (catalogueComplet).
// Module neutre et pur.

import { MODELES_CONTRATS, QUETES_EXPLOITS, genererBranches, type ContenuMatiere } from "@/lib/codex/catalogue";
import { CFA_L1, CFA_L2, CFA_L3 } from "@/lib/codex/programmes/cfa-l1";
import { PROGRAMME_ESSAI, PROGRAMME_ESSAI_BIS } from "@/lib/codex/programmes/essai";
import { actesGeneriques, quetesChainesGeneriques, quetesTrameGenerique, titreMaitreProgramme } from "@/lib/codex/programmes/generique";
import { PROGRAMME_GLOBAL, PROGRAMME_HISTORIQUE, estGlobal, idDe, slugDe, slugDeId } from "@/lib/codex/programmes/ids";
import type { Domain } from "@/lib/domains";
import type { Acte, CosmetiqueCodex, ModeleContrat, Outil, Prerequis, Quete } from "@/lib/codex/types";

export { PROGRAMME_GLOBAL, PROGRAMME_HISTORIQUE, cleLocale, cleMatiere, idDe, slugDe } from "@/lib/codex/programmes/ids";
export type { Outil } from "@/lib/codex/types";

export type DefinitionProgramme = {
  /** « finance/cfa-l1 » */
  cle: string;
  /** lib/domains.ts */
  domaine: Domain["key"];
  /** « CFA Niveau I » */
  nom: string;
  /** « CFA I » */
  court: string;
  /** examen daté par le joueur (CFA) ou pas de date (histoire) : phases par date ou par avancement (phaseDe) */
  examen: { date: "joueur" } | null;
  /** les matières (poids en %, somme 100 ; notions ; ce qui existe), clés qualifiées hors CFA I */
  matieres: () => ContenuMatiere[];
  /** les outils du site disponibles pour ce programme */
  outils: ReadonlySet<Outil>;
  /** trame propre (CFA I : ACTES + QUETES_TRAME) ou trame générique (actesGeneriques) */
  trame: { actes: Acte[]; quetes: Quete[] } | "generique";
  /** chaînes génériques retenues (ids de CHAINES_GENERIQUES) */
  chaines: string[];
  /** quêtes propres hors trame et branches, ids déjà publiés (CFA I : ses chaînes et ses contrats de la semaine) */
  quetesPropres?: () => Quete[];
  /** seuils propres */
  seuils: { acteV: number /* matières à « ciblee » pour ouvrir l'acte V, ex. 8 */ };
  /** programme suivant (« La route de Milan ») */
  suivant: string | null;
  /** visible dans le site (false : programme d'essai, ou contenu pas encore prêt) */
  public: boolean;
};

/** Les programmes que le site connaît. Les programmes d'essai n'y sont pas : les tests les passent eux-mêmes. */
export const REGISTRE: DefinitionProgramme[] = [CFA_L1, CFA_L2, CFA_L3];

/** Les programmes de test, joignables par leur clé (programmeDe) mais jamais listés. */
const ESSAIS: DefinitionProgramme[] = [PROGRAMME_ESSAI, PROGRAMME_ESSAI_BIS];

export function programmeDe(cle: string): DefinitionProgramme | null {
  return REGISTRE.find((p) => p.cle === cle) ?? ESSAIS.find((p) => p.cle === cle) ?? null;
}

/** Le programme d'un id publié : « global » (fil rouge, exploits), CFA I (sans préfixe) ou celui du slug (inconnu : « ?/slug »). */
export function programmeDeId(id: string): string {
  if (estGlobal(id.startsWith("acte:") ? id.slice(5) : id)) return PROGRAMME_GLOBAL;
  const slug = slugDeId(id);
  if (!slug) return PROGRAMME_HISTORIQUE;
  return [...REGISTRE, ...ESSAIS].find((p) => slugDe(p.cle) === slug)?.cle ?? `?/${slug}`;
}

/** Les actes d'un programme (sa trame propre, sinon les cinq actes génériques). */
export const actesDe = (def: DefinitionProgramme): Acte[] => (def.trame === "generique" ? actesGeneriques(def) : def.trame.actes);

/** Les pièces que l'arbre d'un programme peut donner en plus du catalogue commun (le titre de maître du programme). */
export const cosmetiquesDe = (def: DefinitionProgramme): CosmetiqueCodex[] => (def.trame === "generique" ? [titreMaitreProgramme(def)] : []);

/** Les ids d'un lot de quêtes générées (ids locaux) rendus publics : l'id et chaque prérequis de quête. */
function prefixer(def: DefinitionProgramme, quetes: Quete[]): Quete[] {
  if (def.cle === PROGRAMME_HISTORIQUE) return quetes;
  const pre = (p: Prerequis): Prerequis => (p.k === "quete" ? { ...p, id: idDe(def.cle, p.id) } : p.k === "unDe" ? { ...p, prerequis: p.prerequis.map(pre) } : p);
  return quetes.map((q) => ({ ...q, id: idDe(def.cle, q.id), programme: def.cle, prerequis: q.prerequis.map(pre) }));
}

/**
 * L'arbre d'un programme : sa trame, ses branches de matière, ses chaînes et
 * ses quêtes propres (sans exploits ni fil rouge). Une étape, une chaîne ou un
 * modèle qui demande un outil absent du programme n'est pas généré (une
 * branche sans séance ciblée prend l'étape « serie »).
 */
export function genererArbre(def: DefinitionProgramme): Quete[] {
  const trame = def.trame === "generique" ? prefixer(def, quetesTrameGenerique(def)) : def.trame.quetes;
  const generees = prefixer(def, [...genererBranches(def.matieres(), def.cle, def.outils), ...quetesChainesGeneriques(def)]);
  return [...trame, ...generees, ...(def.quetesPropres?.() ?? [])];
}

/** Le catalogue du joueur : l'arbre du programme actif, puis les quêtes communes à tous (exploits ; le fil rouge arrive avec A2b). */
export function catalogueComplet(programmeActif: string): Quete[] {
  const def = programmeDe(programmeActif) ?? CFA_L1;
  return [...genererArbre(def), ...QUETES_EXPLOITS];
}

/** Les modèles de contrats qu'un programme peut tirer (ceux dont il a les outils). */
export const modelesContrats = (def: DefinitionProgramme): ModeleContrat[] => MODELES_CONTRATS.filter((m) => (m.requiert ?? []).every((o) => def.outils.has(o)));

/** Le programme actif par défaut (sans ligne codex_programmes_joueur : le comportement d'avant la v3). */
export const PROGRAMME_DEFAUT = CFA_L1;

// ── Les programmes du joueur (codex_programmes_joueur, V3 §1.6) ─────────

export type StatutProgramme = "actif" | "pause" | "mene" | "abandonne";
export type ProgrammeJoueur = { programme: string; statut: StatutProgramme; jourJ: string | null; meneLe: string | null };

const STATUTS: readonly StatutProgramme[] = ["actif", "pause", "mene", "abandonne"];

/** Les lignes de codex_programmes_joueur lues telles quelles (une ligne mal formée est ignorée). */
export function lireProgrammesJoueur(lignes: unknown): ProgrammeJoueur[] {
  if (!Array.isArray(lignes)) return [];
  return lignes.flatMap((l) => {
    const o = l as { programme?: unknown; statut?: unknown; jour_j?: unknown; mene_le?: unknown } | null;
    if (!o || typeof o.programme !== "string" || !STATUTS.includes(o.statut as StatutProgramme)) return [];
    return [{ programme: o.programme, statut: o.statut as StatutProgramme, jourJ: typeof o.jour_j === "string" ? o.jour_j.slice(0, 10) : null, meneLe: typeof o.mene_le === "string" ? o.mene_le : null }];
  });
}

/**
 * Le programme du joueur : sa ligne « actif » ; sinon le dernier mené (il
 * reste dans son arbre, la suite lui est proposée) ; sinon CFA I (repli :
 * le comportement d'avant la v3).
 */
export function programmeActif(programmes: ProgrammeJoueur[] | undefined): DefinitionProgramme {
  const actif = programmes?.find((p) => p.statut === "actif");
  const mene = programmes?.filter((p) => p.statut === "mene").sort((a, b) => (b.meneLe ?? "").localeCompare(a.meneLe ?? ""))[0];
  return ((actif ?? mene) && programmeDe((actif ?? mene)!.programme)) || PROGRAMME_DEFAUT;
}

/**
 * La suite proposée (« La route de Milan ») : le programme qui suit celui du
 * joueur une fois celui-ci mené, tant qu'il ne l'a pas commencé ; null sinon.
 */
export function suiteDe(programmes: ProgrammeJoueur[] | undefined): DefinitionProgramme | null {
  const courant = programmeActif(programmes);
  if (!courant.suivant || programmes?.find((p) => p.programme === courant.cle)?.statut !== "mene") return null;
  if (programmes.some((p) => p.programme === courant.suivant)) return null;
  return programmeDe(courant.suivant);
}

/** Le nom d'un programme en tête de phrase : « Le Niveau II » pour un niveau du CFA, sinon son nom. */
export const nomEnTete = (def: Pick<DefinitionProgramme, "nom">) => (/^CFA Niveau /.test(def.nom) ? `Le ${def.nom.slice(4)}` : def.nom);
