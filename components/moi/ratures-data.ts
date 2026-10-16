// Le carnet de ratures (Moi › Erreurs, migration_ratures.sql) : toutes les
// questions manquées, d'où qu'elles viennent, gardées jusqu'à ce que le
// joueur les retire. Lecture par pages (get_ratures) : la première page
// arrive avec la page Moi, les suivantes à la demande (RaturesTab). Les
// fonctions de mise en forme servent aussi côté navigateur. Regroupé par
// notion (ratures_par_notion, migration_carnet_notions.sql) : les notions du
// carnet arrivent avec la page Moi, la page d'une notion à la demande ;
// fonction absente, ou questions pas encore rangées par notion : le carnet
// reste par source, sans erreur. Les ratures qui sèchent
// (migration_v3_profil.sql §3a) : réussie moins de 24 h après l'erreur, une
// rature reste en cours à l'encre fraîche (seche_le) ; rayée puis réussie
// 7 jours plus tard, elle est scellée (scellee_le). Sans la section, ces
// champs manquent et le carnet se lit comme avant.
import type { SupabaseClient } from "@supabase/supabase-js";
import { rubriqueDe } from "@/components/moi/marquees-data";
import { jourParis } from "@/lib/voice-z4";
import type { BilanAtelier } from "@/lib/atelier";
import type { ItemSeance } from "@/lib/atelier-seance";

export const PAGE_RATURES = 20;

export type RatureItem = {
  questionId: string;
  prompt: string;
  choices: string[];
  correctIndex: number | null;
  explanation: string | null;
  /** la dernière mauvaise réponse donnée */
  lastSelected: number | null;
  misses: number;
  sources: string[];
  lastSource: string;
  lastMissedAt: string;
  firstMissedAt: string;
  /** bonnes réponses depuis la dernière erreur */
  correctSince: number;
  removedAt: string | null;
  /** réussie trop tôt : elle sèche à cette heure-là (l'erreur + 24 h) ; null sinon, ou sans la section §3a */
  secheLe?: string | null;
  /** scellée : rayée, puis réussie de nouveau 7 jours au moins après */
  scelleeLe?: string | null;
  /** la fiche (« Fiche Fixed Income ») ou la matière */
  rubrique: string;
  page: number | null;
  href: string | null;
};

export type RaturesPage = {
  /** ratures au carnet (non retirées) */
  total: number;
  retirees: number;
  retireesSemaine: number;
  /** ratures de la vue demandée (filtre de source, ou retirées) */
  filtre: number;
  /** ratures au carnet par source */
  sources: Record<string, number>;
  /** anciennes scellées ; absent sans la section §3a */
  scellees?: number;
  /** en cours, réussies trop tôt, qui sèchent encore ; absent sans la section §3a */
  fraiches?: number;
  items: RatureItem[];
};

/** Une notion du carnet (« » : les questions sans notion) et ses ratures dans chaque temps. */
export type NotionCarnet = { notion: string; enCours: number; anciennes: number };

/** Le nom d'une notion, son repère (« Fixed Income · LM 11 ») et son rang dans le programme (ordre à égalité). */
export type LibelleNotion = { libelle: string; repere: string; rang: number };

/** Le carnet par notion : les notions (les plus chargées d'abord) et leurs noms ; null tant que migration_carnet_notions.sql manque ou que les questions ne portent pas leur notion. */
export type CarnetNotions = { liste: NotionCarnet[]; libelles: Record<string, LibelleNotion> } | null;

/** available : false tant que la migration manque (l'onglet garde l'ancien carnet des fiches). */
export type Ratures = ({ available: true; parNotion: CarnetNotions } & RaturesPage) | { available: false };

type Ligne = {
  question_id: string;
  prompt: string;
  choices: string[] | null;
  correct_index: number | null;
  explanation: string | null;
  last_selected: number | null;
  misses: number;
  sources: string[] | null;
  last_source: string;
  last_missed_at: string;
  first_missed_at: string;
  correct_since: number;
  removed_at: string | null;
  seche_le?: string | null;
  scellee_le?: string | null;
  set_title: string | null;
  folder_name: string | null;
};

type Brut = {
  total: number;
  retirees: number;
  retirees_semaine: number;
  scellees?: number;
  fraiches?: number;
  filtre: number;
  sources: Record<string, number> | null;
  items: Ligne[] | null;
};
type BrutNotions = Brut & { remplie: boolean; notions: { notion: string; en_cours: number; anciennes: number }[] | null };

export function pageDe(r: Brut): RaturesPage {
  return {
    total: Number(r.total) || 0,
    retirees: Number(r.retirees) || 0,
    retireesSemaine: Number(r.retirees_semaine) || 0,
    filtre: Number(r.filtre) || 0,
    sources: r.sources ?? {},
    // absents tant que la section §3a manque : le carnet ne parle pas de séchage
    scellees: r.scellees === undefined ? undefined : Number(r.scellees) || 0,
    fraiches: r.fraiches === undefined ? undefined : Number(r.fraiches) || 0,
    items: (r.items ?? []).map((l) => ({
      questionId: l.question_id,
      prompt: l.prompt,
      choices: l.choices ?? [],
      correctIndex: l.correct_index,
      explanation: l.explanation,
      lastSelected: l.last_selected,
      misses: Number(l.misses) || 1,
      sources: l.sources ?? [],
      lastSource: l.last_source,
      lastMissedAt: l.last_missed_at,
      firstMissedAt: l.first_missed_at,
      correctSince: Number(l.correct_since) || 0,
      removedAt: l.removed_at,
      secheLe: l.seche_le ?? null,
      scelleeLe: l.scellee_le ?? null,
      ...rubriqueDe(l.set_title, l.folder_name),
    })),
  };
}

const HEURE_PARIS = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "numeric", hourCycle: "h23" });

/**
 * Une rature en cours réussie trop tôt, qui sèche encore : quand elle sèche,
 * « demain » ou, le jour même à Paris, l'heure (« 15 h ») ; null si elle est
 * sèche, rayée, ou jamais réussie depuis l'erreur.
 */
export function quandSeche(it: Pick<RatureItem, "secheLe" | "removedAt">, now: number = Date.now()): { demain: true } | { demain: false; heure: number } | null {
  if (it.removedAt !== null || !it.secheLe) return null;
  const t = new Date(it.secheLe).getTime();
  if (!(t > now)) return null;
  if (jourParis(new Date(t)) !== jourParis(new Date(now))) return { demain: true };
  const h = HEURE_PARIS.formatToParts(new Date(t)).find((p) => p.type === "hour")?.value;
  return { demain: false, heure: Number(h) || 0 };
}

/**
 * Le bilan de l'Atelier et les ratures qui sèchent : une rature réussie au
 * premier passage mais pas rayée (statut « fraiche », manquée de nouveau
 * ailleurs entre-temps) sort du compte des rayées et, tant que le serveur n'a
 * pas compté les ratures d'après la séance (clôture), reste dans celles en
 * cours. Rend le bilan corrigé et, par notion, ces ratures fraîches.
 */
export function bilanSeche(b: BilanAtelier, items: ItemSeance[], apresDuServeur?: Record<string, unknown> | null): { bilan: BilanAtelier; fraiches: Record<string, number> } {
  const fraiches: Record<string, number> = {};
  for (const it of items) if (it.k === "rature" && it.premier?.statut === "fraiche") fraiches[it.notion] = (fraiches[it.notion] ?? 0) + 1;
  if (Object.keys(fraiches).length === 0) return { bilan: b, fraiches };
  const notions = b.notions.map((n) => {
    const f = fraiches[n.notion] ?? 0;
    if (f === 0) return n;
    const rayees = Math.max(0, n.ratures.rayees - f);
    const compteServeur = apresDuServeur?.[n.notion] !== undefined;
    return { ...n, ratures: { ...n.ratures, rayees, apres: compteServeur ? n.ratures.apres : n.ratures.apres + (n.ratures.rayees - rayees) } };
  });
  return { bilan: { ...b, notions }, fraiches };
}

/** Une page du carnet (navigateur comme serveur). */
export async function lireRatures(supabase: SupabaseClient, { source = null, retirees = false, offset = 0 }: { source?: string | null; retirees?: boolean; offset?: number } = {}) {
  const { data, error } = await supabase.rpc("get_ratures", { p_source: source, p_retirees: retirees, p_limit: PAGE_RATURES, p_offset: offset });
  if (error) return { error };
  return { page: pageDe(data as Brut) };
}

const notionsDe = (r: BrutNotions): NotionCarnet[] => (r.notions ?? []).map((x) => ({ notion: x.notion ?? "", enCours: Number(x.en_cours) || 0, anciennes: Number(x.anciennes) || 0 }));

/** Une page des ratures d'une notion (« » : sans notion), et les notions du carnet (navigateur comme serveur). */
export async function lireRaturesNotion(supabase: SupabaseClient, { notion, retirees = false, offset = 0 }: { notion: string | null; retirees?: boolean; offset?: number }) {
  const { data, error } = await supabase.rpc("ratures_par_notion", { p_notion: notion, p_retirees: retirees, p_limit: PAGE_RATURES, p_offset: offset });
  if (error || !data) return { error: error ?? { message: "vide" } };
  const r = data as BrutNotions;
  return { page: pageDe(r), notions: notionsDe(r), remplie: r.remplie === true };
}

/** Les notions du carnet, sans libellés (ils se résolvent côté serveur). Toute erreur, fonction absente ou notions pas encore en place : null. */
async function lireNotionsCarnet(supabase: SupabaseClient): Promise<NotionCarnet[] | null> {
  try {
    const r = await lireRaturesNotion(supabase, { notion: null });
    return "error" in r || !r.remplie ? null : r.notions;
  } catch {
    return null;
  }
}

/**
 * La première page, avec la page Moi, et les notions du carnet ; `libelles`
 * nomme les notions (lib/notions, côté serveur seulement, pour ne pas
 * l'embarquer dans le navigateur).
 */
export async function getRatures(supabase: SupabaseClient, libelles: (ids: string[]) => Record<string, LibelleNotion>): Promise<Ratures> {
  try {
    const [r, notions] = await Promise.all([lireRatures(supabase), lireNotionsCarnet(supabase)]);
    if ("error" in r) return { available: false };
    return { available: true, ...r.page, parNotion: notions ? { liste: notions, libelles: libelles(notions.map((n) => n.notion)) } : null };
  } catch {
    return { available: false };
  }
}
