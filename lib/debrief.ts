import type { SupabaseClient } from "@supabase/supabase-js";
import { NBSP } from "@/lib/voice";

// Le débrief des examens blancs (V3 §7.6) : sous chaque question ratée d'une
// copie, le joueur dit d'où vient l'erreur (savoir, lecture de l'énoncé,
// calcul, temps, chance). Un toucher, modifiable, toujours permis. La base
// garde les causes (blanc_debrief, migration_v3_profil.sql §5) : écriture
// par blanc_debrief_noter, qui refuse une question réussie ; lecture par
// blanc_debrief_lire (une copie) et mes_causes (tous les débriefs récents).
// Le Codex en tire la quête « Le débrief » (80 XP, versée par le Codex).
// Tant que la section n'est pas collée : boutons masqués, le temps par
// question s'affiche quand même (durée de la copie / questions).
// Module neutre (client et serveur).

export type SourceDebrief = "blanc" | "officiel";
export type CauseErreur = "savoir" | "lecture" | "calcul" | "temps" | "chance";

/** Les cinq causes, dans l'ordre des boutons ; `part` : « 30 % de lecture ». */
export const CAUSES: { cle: CauseErreur; libelle: string; part: string }[] = [
  { cle: "savoir", libelle: "Savoir", part: "savoir" },
  { cle: "lecture", libelle: "Lecture de l'énoncé", part: "lecture" },
  { cle: "calcul", libelle: "Calcul", part: "calcul" },
  { cle: "temps", libelle: "Temps", part: "temps" },
  { cle: "chance", libelle: "Chance", part: "chance" },
];
const CLES = new Set<string>(CAUSES.map((c) => c.cle));
export const estCause = (v: unknown): v is CauseErreur => typeof v === "string" && CLES.has(v);

/** La répartition s'affiche une fois 80 % des erreurs classées. */
export const PART_REPARTITION = 0.8;
/** Le rythme visé à l'examen : 75 à 110 s par question. */
export const CIBLE_SECONDES = { min: 75, max: 110 } as const;
/** Le lien du Codex : la revue ouverte sur la première erreur non classée. */
export const PARAM_DEBRIEF = "debrief";
export const hrefDebrief = (examId: string) => `/mock-exams/${examId}?${PARAM_DEBRIEF}=1`;

export type EtatDebrief = {
  erreurs: number;
  classees: number;
  causes: Record<CauseErreur, number>;
  /** question → cause, pour les questions classées */
  notes: Record<string, CauseErreur>;
  /** durée de la copie / questions ; null sans durée */
  secondesParQuestion: number | null;
};

type Raw = Record<string, unknown>;
const entier = (v: unknown) => (typeof v === "number" || (typeof v === "string" && v.trim() !== "") ? Math.max(0, Math.round(Number(v)) || 0) : 0);
const causesVides = (): Record<CauseErreur, number> => ({ savoir: 0, lecture: 0, calcul: 0, temps: 0, chance: 0 });

/** La section §5 n'est pas collée (table ou fonction absente). */
export function debriefAbsent(e: { code?: string; message?: string } | null | undefined): boolean {
  return !!e && (["PGRST202", "PGRST205", "42883", "42P01", "42703"].includes(e.code ?? "") || /could not find|does not exist/i.test(e.message ?? ""));
}

/** La réponse de blanc_debrief_lire ; illisible (ou copie inconnue) : null. */
export function etatDepuis(data: unknown): EtatDebrief | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const r = data as Raw;
  if (!("erreurs" in r)) return null;
  const causes = causesVides();
  const brutes = r.causes && typeof r.causes === "object" ? (r.causes as Raw) : {};
  for (const c of CAUSES) causes[c.cle] = entier(brutes[c.cle]);
  const notes: Record<string, CauseErreur> = {};
  if (r.notes && typeof r.notes === "object" && !Array.isArray(r.notes))
    for (const [q, c] of Object.entries(r.notes as Raw)) if (estCause(c)) notes[q] = c;
  const s = r.secondesParQuestion;
  return {
    erreurs: entier(r.erreurs),
    classees: entier(r.classees),
    causes,
    notes,
    secondesParQuestion: typeof s === "number" && s > 0 ? Math.round(s) : null,
  };
}

/** L'état d'une copie sans débrief en base : les erreurs de la revue, rien de classé. */
export function etatVide(erreurs: number, secondesParQuestion: number | null = null): EtatDebrief {
  return { erreurs, classees: 0, causes: causesVides(), notes: {}, secondesParQuestion };
}

/** L'état après un toucher (posé tout de suite, la base confirme ensuite). */
export function avecCause(e: EtatDebrief, questionId: string, cause: CauseErreur): EtatDebrief {
  const avant = e.notes[questionId];
  if (avant === cause) return e;
  const causes = { ...e.causes, [cause]: e.causes[cause] + 1 };
  if (avant) causes[avant] = Math.max(0, causes[avant] - 1);
  return { ...e, causes, notes: { ...e.notes, [questionId]: cause }, classees: avant ? e.classees : Math.min(e.erreurs, e.classees + 1) };
}

/** Assez d'erreurs classées pour montrer la répartition (80 %). */
export const repartitionVisible = (e: EtatDebrief) => e.erreurs > 0 && e.classees >= Math.ceil(PART_REPARTITION * e.erreurs);

/** La répartition des erreurs classées, de la plus fréquente à la plus rare (en %, arrondis). */
export function repartition(e: EtatDebrief): { cause: CauseErreur; pct: number; n: number }[] {
  const total = CAUSES.reduce((t, c) => t + e.causes[c.cle], 0);
  if (total === 0) return [];
  return CAUSES.map((c, i) => ({ cause: c.cle, n: e.causes[c.cle], pct: Math.round((100 * e.causes[c.cle]) / total), i }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n || a.i - b.i)
    .map(({ cause, pct, n }) => ({ cause, pct, n }));
}

/** « 1 min 32 », « 48 s » */
export function dureeCourte(s: number): string {
  const t = Math.max(0, Math.round(s));
  if (t < 60) return `${t}${NBSP}s`;
  const m = Math.floor(t / 60);
  const r = t % 60;
  return r ? `${m}${NBSP}min${NBSP}${String(r).padStart(2, "0")}` : `${m}${NBSP}min`;
}

/** Le temps moyen par question d'une copie (durée / questions) ; null sans durée. */
export function secondesDe(dureeS: number | null | undefined, total: number): number | null {
  return dureeS && dureeS > 0 && total > 0 ? Math.round(dureeS / total) : null;
}

/** Où se place le rythme par rapport à la cible. */
export const rythme = (s: number): "vite" | "cible" | "lent" => (s < CIBLE_SECONDES.min ? "vite" : s > CIBLE_SECONDES.max ? "lent" : "cible");

export const DEBRIEF = {
  titre: "Débrief",
  /** « Débrief : 12/20 erreurs classées » */
  avancement: (classees: number, erreurs: number) =>
    `${classees}/${erreurs} erreur${erreurs > 1 ? "s" : ""} classée${erreurs > 1 ? "s" : ""}`,
  question: "D'où vient l'erreur ?",
  /** « 30 % de lecture » */
  part: (pct: number, cause: CauseErreur) => `${pct}${NBSP}% de ${CAUSES.find((c) => c.cle === cause)?.part ?? cause}`,
  aClasser: "Classe chaque erreur d'un toucher : la répartition apparaît à 80 %.",
  commencer: "Classer mes erreurs",
  reprendre: "Reprendre le débrief",
  fini: "Toutes tes erreurs sont classées.",
  /** « 1 min 32 par question » */
  temps: (s: number) => `${dureeCourte(s)} par question`,
  cible: `cible ${CIBLE_SECONDES.min} à ${CIBLE_SECONDES.max}${NBSP}s`,
  nonEnregistre: "Pas enregistré. Touche de nouveau.",
} as const;

/** La ligne de répartition (« 40 % de lecture · 30 % de savoir · … »). */
export const ligneRepartition = (e: EtatDebrief) => repartition(e).map((x) => DEBRIEF.part(x.pct, x.cause)).join(" · ");

/**
 * L'état du débrief d'une copie. `null` : section absente, copie inconnue ou
 * lecture impossible (boutons masqués). Jamais d'erreur.
 */
export async function lireDebrief(client: SupabaseClient, source: SourceDebrief, ref: string): Promise<EtatDebrief | null> {
  try {
    const { data, error } = await client.rpc("blanc_debrief_lire", { p_source: source, p_ref: ref });
    if (error) return null;
    return etatDepuis(data);
  } catch {
    return null;
  }
}

export type ResultatNote = { ok: true; erreurs: number; classees: number } | { ok: false; absente: boolean };

/** Classe une erreur (ou change sa cause). `absente` : la section n'est pas collée. */
export async function noterCause(client: SupabaseClient, source: SourceDebrief, ref: string, questionId: string, cause: CauseErreur): Promise<ResultatNote> {
  try {
    const { data, error } = await client.rpc("blanc_debrief_noter", { p_source: source, p_ref: ref, p_question: questionId, p_cause: cause });
    if (error) return { ok: false, absente: debriefAbsent(error) };
    const r = (data ?? {}) as Raw;
    return { ok: true, erreurs: entier(r.erreurs), classees: entier(r.classees) };
  } catch {
    return { ok: false, absente: false };
  }
}

/** La répartition de tous les débriefs récents (mes_causes) : % par cause, et le nombre d'erreurs classées. */
export type MesCauses = { parts: Record<CauseErreur, number>; n: number };

/** La réponse de mes_causes ; illisible : null. */
export function causesDepuis(data: unknown): MesCauses | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const r = data as Raw;
  if (!("n" in r)) return null;
  const parts = causesVides();
  for (const c of CAUSES) parts[c.cle] = Math.min(100, entier(r[c.cle]));
  return { parts, n: entier(r.n) };
}

/** Les causes des débriefs des `jours` derniers jours du joueur connecté ; section absente : null. */
export async function lireMesCauses(client: SupabaseClient, jours = 60): Promise<MesCauses | null> {
  try {
    const { data, error } = await client.rpc("mes_causes", { p_jours: jours });
    if (error) return null;
    return causesDepuis(data);
  } catch {
    return null;
  }
}
