import type { SupabaseClient } from "@supabase/supabase-js";
import type { CalcQuestionPublic } from "@/lib/calc/engine";
import type { ApresNotion, AvantNotion, BilanAtelier, ItemPool, Niveau, Reponse } from "@/lib/atelier";

// L'Atelier tel que le voit l'écran : la séance (le pool, sans bonne réponse
// tant qu'une question n'a pas reçu de réponse ; les calculs avec leur
// énoncé public), les cartes Rappel des notions, et les appels qui la font
// avancer (migration_atelier.sql). Module neutre : le serveur construit la
// séance (app/atelier/donnees.ts), le navigateur répond.

export type CorrectionQcm = { choix: number; juste: boolean; bonne: number | null; explication: string | null; statut: string | null };
export type CorrectionCalc = { valeur: number | null; juste: boolean; bonne: number | null; solution: string[] };

export type ItemQcm = {
  i: number;
  k: "rature" | "neuve";
  notion: string;
  niveau: Niveau;
  ref: string;
  prompt: string;
  choices: string[];
  /** rature : ses erreurs jusqu'ici */
  misses: number | null;
  premier: CorrectionQcm | null;
  retest: { choix: number; juste: boolean } | null;
};

export type ItemCalc = {
  i: number;
  k: "calc";
  notion: string;
  niveau: Niveau;
  ref: string;
  type: string;
  matiere: string;
  /** le nom du type de calcul (« Modèle de Gordon ») */
  nomType: string;
  /** null : le calcul n'existe plus dans le code (il saute) */
  q: CalcQuestionPublic | null;
  premier: CorrectionCalc | null;
  retest: { valeur: number | null; juste: boolean } | null;
};

export type ItemSeance = ItemQcm | ItemCalc;

export type SeanceAtelier = {
  id: string;
  notions: string[];
  poids: number[];
  startedAt: string;
  /** dernière réponse : la reprise reste possible 24 heures après */
  vuAt: string;
  secondes: number;
  avant: Record<string, AvantNotion>;
  /** les réponses dans l'ordre */
  ordre: Reponse[];
  items: ItemSeance[];
};

/** Une carte Rappel : ce qui coince, formules et pièges du calcul, flashcards, fiche, chapitre audio. */
export type RappelNotion = {
  notion: string;
  libelle: string;
  /** « Fixed Income · LM 11 » */
  repere: string;
  titre: string;
  concepts: string[];
  calcul: { nom: string; formules: string[]; pieges: string[] } | null;
  flashcards: { recto: string; verso: string }[];
  /** la page de fiche ; pdf : adresse signée (une heure) pour l'ouvrir dans le tiroir */
  fiche: { href: string; page: number | null; pdf: string | null } | null;
  cours: { href: string; debut: string | null; minutes: number | null };
  /** « S'entraîner sur ce calcul » */
  calculHref: string | null;
};

/** Un Atelier clos, pour l'historique de Moi : sa date (« 6 oct. », jour de Paris), sa durée, son XP et son bilan. */
export type AtelierPasse = { id: string; date: string; minutes: number; xp: number; bilan: BilanAtelier };

/** L'historique des Ateliers (les plus récents d'abord) et le nom de leurs notions. */
export type HistoriqueAteliers = { ateliers: AtelierPasse[]; noms: Record<string, { libelle: string }> };

/** Une notion proposée à l'ouverture (un point faible). calcul : jouée seulement en calcul ; aCalcul : un bloc Calcul est possible (type de calcul rattaché, clé service présente). */
export type NotionProposee = { notion: string; libelle: string; repere: string; enCours: number; calcul: boolean; aCalcul: boolean };

/** Les éléments jouables : un calcul qui existe encore, une question avec son énoncé et au moins deux choix (une question neuve retirée de la banque pendant un Atelier en cours n'en a plus). */
export const itemsPool = (s: Pick<SeanceAtelier, "items">): ItemPool[] =>
  s.items.filter((x) => (x.k === "calc" ? x.q !== null : x.prompt.trim() !== "" && x.choices.length >= 2)).map((x) => ({ i: x.i, k: x.k, notion: x.notion, niveau: x.niveau }));

/** La fonction appelée n'existe pas (encore) en base : migration pas collée. */
export const fonctionAbsente = (e: { code?: string; message?: string } | null | undefined) =>
  !!e && (["PGRST202", "PGRST205", "42883", "42P01", "42703"].includes(e.code ?? "") || /could not find/i.test(e.message ?? ""));

export type ResultatLancer = { kind: "ok"; seance: SeanceAtelier } | { kind: "vide" } | { kind: "indisponible" } | { kind: "erreur" };
export type ReponseQcm = { ferme: true } | { ferme: false; juste: boolean; choix: number; bonne: number | null; explication: string | null; statut: string | null; xp: number };
export type ReponseCalc =
  | { ferme: true }
  | { ferme: false; status: "format"; indice: string }
  | { ferme: false; status: "juste" | "faux"; valeur: number | null; bonne: number | null; solution: string[]; xp: number }
  | { ferme: false; status: "erreur"; message: string };
export type ClotureAtelier = { score: number; total: number; xp: number; secondes: number; apres: Record<string, ApresNotion> | null };

/** Ce que fait l'écran : lancer, répondre, clore (en vrai, ou sur place dans les aperçus). */
export type ApiAtelier = {
  lancer: (notions: string[]) => Promise<ResultatLancer>;
  repondre: (id: string, i: number, choix: number, retest: boolean, secondes: number) => Promise<ReponseQcm>;
  repondreCalc: (id: string, i: number, raw: string, retest: boolean, secondes: number) => Promise<ReponseCalc>;
  clore: (id: string, secondes: number) => Promise<ClotureAtelier | null>;
};

type Brut = Record<string, unknown>;
const num = (v: unknown, d = 0) => (v === null || v === undefined || Number.isNaN(Number(v)) ? d : Number(v));
const numOuNull = (v: unknown) => (v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v));

/** Répondre à une question (rature ou neuve), au premier passage ou au re-test. */
export async function repondreQcm(sb: SupabaseClient, id: string, i: number, choix: number, retest: boolean, secondes: number): Promise<ReponseQcm> {
  const { data, error } = await sb.rpc("atelier_repondre", { p_id: id, p_i: i, p_choix: choix, p_retest: retest, p_secondes: Math.round(secondes) });
  if (error) throw new Error(error.message);
  const r = (data ?? {}) as Brut;
  if (r.ferme === true) return { ferme: true };
  return {
    ferme: false,
    juste: r.is_correct === true,
    choix: num(r.selected_index, choix),
    bonne: numOuNull(r.correct_index),
    explication: r.explanation ? String(r.explanation) : null,
    statut: r.statut ? String(r.statut) : null,
    xp: num(r.xp),
  };
}

/** Clore : le bilan du serveur (null : rien n'avait été répondu, l'Atelier s'efface). */
export async function cloreAtelier(sb: SupabaseClient, id: string, secondes: number): Promise<ClotureAtelier | null> {
  const { data, error } = await sb.rpc("atelier_clore", { p_id: id, p_secondes: Math.round(secondes) });
  if (error) throw new Error(error.message);
  const r = (data ?? {}) as Brut;
  if (!r.id) return null;
  const apres = r.apres && typeof r.apres === "object" ? (r.apres as Record<string, { en_cours?: number; vives?: number }>) : null;
  return {
    score: num(r.score),
    total: num(r.total),
    xp: num(r.xp),
    secondes: num(r.secondes),
    apres: apres ? Object.fromEntries(Object.entries(apres).map(([k, v]) => [k, { enCours: num(v?.en_cours), vives: num(v?.vives) }])) : null,
  };
}
