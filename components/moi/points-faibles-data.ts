// « Tes points faibles » (Moi › Stats, S'entraîner) : les notions d'un joueur
// et leurs mesures, puis le classement (lib/points-faibles.ts).
// Étape 2 : une notion est un Learning Module (lib/notions.ts), construit à
// partir de points_faibles (migration_notions.sql : ses réponses aux
// questions et ses ratures, par notion, et les concepts qui coincent) et des
// calculs de lib/answer-stats (chaque type de calcul rattaché à son LM). Une
// question sans notion reste comptée dans sa matière (lib/mastery).
// Repli, tant que points_faibles manque ou que les colonnes sont vides :
// l'étape 1, où une notion est un thème, construit à partir de trois lectures :
// - ses réponses rangées par matière et thème (lib/answer-stats, déjà chargé
//   par la page), pour la réussite récente ;
// - ses ratures comptées par thème (ratures_par_theme,
//   migration_points_faibles.sql). Fonction absente : la réussite récente
//   seule, sans « Mettre au propre ce thème ».
// - les QCM de la banque, par matière et repère R (lireBanqueQcm).
// Une page de fiche et sa réserve (« Réserve — … Page N ») font un seul
// thème ; un QCM recréé garde son thème (même repère R) et mène au QCM
// courant, même si le joueur n'a répondu qu'à l'ancien ; une page de fiche
// recréée mène toujours à sa page. Les mocks officiels et les regroupements
// sans détail restent au niveau de la matière, comme les thèmes qui ne
// mènent plus nulle part (anciennes numérotations, sans QCM ni page dans la
// banque) : rien à y refaire.
// Côté serveur seulement : importe le catalogue des calculs (avec réponses).
import type { SupabaseClient } from "@supabase/supabase-js";
import { ANSWER_SOURCES, EMPTY_ANSWER_STATS, SOURCE_LABELS, placeSet, type AnswerSource, type AnswerStats, type ThemeKind } from "@/lib/answer-stats";
import { SUBJECTS } from "@/components/reviser/catalog";
import { calcSubject, calcType } from "@/lib/calc";
import type { CalcTopic } from "@/lib/calc/types";
import { NOTIONS, notionParId, notionsDuTitre, type Notion as NotionLM } from "@/lib/notions";
import { conceptsQuiCoincent, pointsFaibles, recentDe, type ConceptCoince, type Lien, type Notion, type PointsFaiblesData, type SeanceDatee } from "@/lib/points-faibles";
import { POINTS_FAIBLES } from "@/lib/voice-points-faibles";

/** Une ligne de ratures_par_theme. */
export type RaturesTheme = {
  setId: string | null;
  setTitle: string | null;
  folderName: string | null;
  enCours: number;
  vives: number;
  anciennes: number;
  rayees7j: number;
  derniere: string | null;
};

/** disponible : false tant que migration_points_faibles.sql manque (ni ratures par thème, ni reprise ciblée). */
export type RaturesParTheme = { disponible: boolean; lignes: RaturesTheme[] };

export const SANS_RATURES_PAR_THEME: RaturesParTheme = { disponible: false, lignes: [] };

type Brut = { set_id: string | null; set_title: string | null; folder_name: string | null; en_cours: number; vives: number; anciennes: number; rayees_7j: number; derniere: string | null };

/**
 * Les QCM de la banque, par thème (« qcm:fixed_income:R59–R61 » → ses sets :
 * un QCM recréé sous un autre id se retrouve par son repère) et par notion
 * (« fixed_income:11 » → les QCM qui la couvrent, le plus resserré d'abord).
 */
export type BanqueQcm = { themes: Map<string, string[]>; notions: Map<string, string[]> };

const banqueVide = (): BanqueQcm => ({ themes: new Map(), notions: new Map() });

type SetBanque = { id: string; title: string | null; library_folders: { name: string | null } | { name: string | null }[] | null };

/** Les QCM des dossiers « (Système) ». Toute erreur : une banque vide (les thèmes gardent alors les sets du joueur). */
export async function lireBanqueQcm(reader: SupabaseClient): Promise<BanqueQcm> {
  try {
    const { data, error } = await reader.from("quiz_sets").select("id,title,library_folders(name)").like("title", "% — QCM (%");
    if (error || !Array.isArray(data)) return banqueVide();
    const banque = banqueVide();
    const parNotion = new Map<string, { id: string; largeur: number }[]>();
    for (const s of data as unknown as SetBanque[]) {
      const dossier = (Array.isArray(s.library_folders) ? s.library_folders[0]?.name : s.library_folders?.name) ?? null;
      if (!dossier?.endsWith(" (Système)")) continue;
      const place = placeSet(s.id, s.title, dossier);
      const cle = place.kind === "qcm" ? cleDe(place.subject, place.kind, place.tag, s.id, null) : null;
      if (cle) banque.themes.set(cle, [...(banque.themes.get(cle) ?? []), s.id]);
      const couvertes = notionsDuTitre(s.title ?? "");
      for (const n of couvertes) parNotion.set(n.id, [...(parNotion.get(n.id) ?? []), { id: s.id, largeur: couvertes.length }]);
    }
    for (const [id, sets] of parNotion) banque.notions.set(id, sets.sort((a, b) => a.largeur - b.largeur || (a.id < b.id ? -1 : 1)).map((x) => x.id));
    return banque;
  } catch {
    return banqueVide();
  }
}

/** Les ratures du joueur connecté, par thème. Toute erreur (fonction absente comprise) : indisponible, sans bruit. */
export async function lireRaturesParTheme(supabase: SupabaseClient): Promise<RaturesParTheme> {
  try {
    const { data, error } = await supabase.rpc("ratures_par_theme");
    if (error || !Array.isArray(data)) return SANS_RATURES_PAR_THEME;
    return {
      disponible: true,
      lignes: (data as Brut[]).map((l) => ({
        setId: l.set_id,
        setTitle: l.set_title,
        folderName: l.folder_name,
        enCours: Number(l.en_cours) || 0,
        vives: Number(l.vives) || 0,
        anciennes: Number(l.anciennes) || 0,
        rayees7j: Number(l.rayees_7j) || 0,
        derniere: l.derniere,
      })),
    };
  } catch {
    return SANS_RATURES_PAR_THEME;
  }
}

const MATIERES = new Map(SUBJECTS.map((s) => [s.key, s]));
const page = (tag: string | null) => {
  const m = /^p\. ([0-9]+)$/.exec(tag ?? "");
  return m ? Number(m[1]) : null;
};

/**
 * La clé de la notion d'un thème (null : hors notion). Page de fiche :
 * matière et page ; QCM : matière et repère R ; calcul : matière et type ;
 * autre set : le set.
 */
function cleDe(matiere: string, kind: ThemeKind, tag: string | null, setId: string | null, calcKey: string | null): string | null {
  if (!MATIERES.has(matiere) || kind === "mock") return null;
  if (kind === "calc") return calcKey ? `calc:${matiere}:${calcKey}` : null;
  if (kind === "fiche" && page(tag) !== null) return `fiche:${matiere}:${page(tag)}`;
  if (kind === "qcm" && tag) return `qcm:${matiere}:${tag}`;
  return setId ? `set:${setId}` : null;
}

type Acc = {
  cle: string;
  libelle: string;
  matiere: string;
  repere: string | null;
  kind: ThemeKind;
  calcKey: string | null;
  sets: Set<string>;
  seances: Map<string, SeanceDatee>;
  sources: Map<AnswerSource, number>;
  enCours: number;
  vives: number;
  anciennes: number;
  rayees7j: number;
  aRepasser: number;
  derniere: string | null;
};

const plusTard = (a: string | null, b: string | null) => (!a ? b : !b ? a : a > b ? a : b);

function liensDe(a: Acc): Lien[] {
  const sujet = MATIERES.get(a.matiere);
  if (a.kind === "calc" && a.calcKey) {
    const s = calcSubject(a.matiere as CalcTopic);
    return s ? [{ nature: "calcul", href: `/calculs/${s.slug}/${a.calcKey}`, libelle: POINTS_FAIBLES.lienCalcul }] : [];
  }
  const p = page(a.repere);
  if (a.kind === "fiche" && p !== null && sujet?.fiche) return [{ nature: "fiche", href: `/fiches/${sujet.fiche}?page=${p}`, libelle: POINTS_FAIBLES.lienFiche(p) }];
  const set = [...a.sets][0];
  return set ? [{ nature: "qcm", href: `/qcm/${set}`, libelle: POINTS_FAIBLES.lienQcm }] : [];
}

/** Étape 1, en repli : les thèmes d'un joueur et leur classement. */
function construireParTheme(stats: AnswerStats, ratures: RaturesParTheme, banque: BanqueQcm, now: number): PointsFaiblesData {
  const acc = new Map<string, Acc>();
  const ouvrir = (cle: string, init: Omit<Acc, "cle" | "sets" | "seances" | "sources" | "enCours" | "vives" | "anciennes" | "rayees7j" | "aRepasser" | "derniere">) => {
    let a = acc.get(cle);
    if (!a) {
      a = { cle, ...init, sets: new Set(), seances: new Map(), sources: new Map(), enCours: 0, vives: 0, anciennes: 0, rayees7j: 0, aRepasser: 0, derniere: null };
      acc.set(cle, a);
    }
    return a;
  };

  // 1. les réponses, thème par thème
  for (const s of stats.subjects) {
    if (s.pseudo) continue;
    for (const th of s.themes) {
      const kind = th.kind ?? "autre";
      const setId = th.key.startsWith("set:") ? th.key.slice(4) : null;
      const calcKey = th.key.startsWith("calc:") ? th.key.slice(5) : null;
      if (!setId && !calcKey) continue;
      const cle = cleDe(s.key, kind, th.tag, setId, calcKey);
      if (!cle) continue;
      const a = ouvrir(cle, { libelle: th.label, matiere: s.key, repere: th.tag, kind, calcKey });
      // un set supprimé depuis garde ses réponses, pas son lien
      if (setId && !th.retired) a.sets.add(setId);
      for (const p of th.passages) {
        // un même passage peut toucher deux sets d'une notion (page et réserve) : on additionne
        const v = a.seances.get(p.id) ?? { n: 0, ok: 0, at: p.at };
        v.n += p.n;
        v.ok += p.ok;
        a.seances.set(p.id, v);
        a.derniere = plusTard(a.derniere, p.at || null);
      }
      for (const [src, t] of Object.entries(th.by) as [AnswerSource, [number, number]][]) a.sources.set(src, (a.sources.get(src) ?? 0) + t[0]);
    }
  }

  // 2. les ratures, thème par thème (set courant, sinon titre gardé)
  for (const r of ratures.lignes) {
    const place = placeSet(r.setId ?? "", r.setTitle, r.folderName);
    const cle = cleDe(place.subject, place.kind, place.tag, r.setId, null);
    if (!cle) continue;
    const a = ouvrir(cle, { libelle: place.label, matiere: place.subject, repere: place.tag, kind: place.kind, calcKey: null });
    a.enCours += r.enCours;
    a.vives += r.vives;
    a.anciennes += r.anciennes;
    a.rayees7j += r.rayees7j;
    if (r.setId) {
      a.sets.add(r.setId);
      a.aRepasser += r.enCours;
    }
    a.derniere = plusTard(a.derniere, r.derniere);
  }

  // 3. un QCM recréé (nouvel id) : le set courant de même matière et même repère
  for (const a of acc.values()) for (const id of banque.themes.get(a.cle) ?? []) a.sets.add(id);

  // un thème qui ne mène plus nulle part (ni QCM, ni page de fiche, ni calcul) reste au niveau de la matière
  const notions: Notion[] = [...acc.values()].flatMap((a) => {
    const liens = liensDe(a);
    if (!liens.length) return [];
    const recent = recentDe([...a.seances.values()], now);
    const calcul = a.kind === "calc";
    const nomCalcul = calcul && a.calcKey ? calcType(a.matiere as CalcTopic, a.calcKey)?.name : null;
    return [{
      cle: a.cle,
      libelle: nomCalcul ? POINTS_FAIBLES.calcul(nomCalcul) : a.libelle,
      matiere: a.matiere,
      matiereNom: MATIERES.get(a.matiere)?.name ?? a.matiere,
      repere: a.repere,
      calcul,
      liens,
      lm: null,
      sets: [...a.sets].sort(),
      concepts: [],
      sources: [...a.sources.entries()].filter(([, n]) => n > 0).sort((x, y) => y[1] - x[1]).map(([src, n]) => ({ libelle: SOURCE_LABELS[src], n })),
      mesures: { n: recent.n, ok: recent.ok, enCours: a.enCours, vives: a.vives, anciennes: a.anciennes, rayees7j: a.rayees7j, aRepasser: a.aRepasser, derniere: a.derniere },
    }];
  });

  // rayées cette semaine : tout le carnet (mocks et thèmes retirés compris), le même compte que Moi › Erreurs
  const rayeesSemaine = ratures.lignes.reduce((s, r) => s + r.rayees7j, 0);
  return { ...pointsFaibles(notions, ratures.disponible), propre: ratures.disponible, rayeesSemaine, unite: "theme" };
}

// ---------------------------------------------------------------------------
// Étape 2 : par notion (Learning Module)

/** Une notion du joueur, lue dans points_faibles. */
export type LigneNotion = {
  notion: string;
  /** ses dernières réponses aux questions (20 au plus, 90 jours), les plus récentes d'abord */
  recentes: { at: string; ok: boolean }[];
  /** toutes ses réponses aux questions, par source */
  sources: Partial<Record<AnswerSource, number>>;
  enCours: number;
  vives: number;
  anciennes: number;
  rayees7j: number;
  derniere: string | null;
  concepts: ConceptCoince[];
};

/** points_faibles : remplie (au moins une question porte sa notion), les ratures rayées cette semaine dans tout le carnet, les notions. */
export type NotionsJoueur = { remplie: boolean; rayeesSemaine: number; lignes: LigneNotion[] };

/** Ce que lisent Moi et S'entraîner : les notions du joueur (null : on reste aux thèmes) et, en repli seulement, ses ratures par thème. */
export type BasePointsFaibles = { notions: NotionsJoueur | null; themes: RaturesParTheme };

type BrutNotion = {
  notion: string;
  recentes: [string, boolean][] | null;
  sources: Record<string, number> | null;
  en_cours: number;
  vives: number;
  anciennes: number;
  rayees_7j: number;
  derniere: string | null;
  concepts: { concept: string; ratures: number; erreurs: number }[] | null;
};

const SOURCES = new Set<string>(ANSWER_SOURCES);

/** points_faibles pour le joueur connecté. Toute erreur (migration_notions.sql absente comprise) : null, sans bruit. */
export async function lireNotionsJoueur(supabase: SupabaseClient): Promise<NotionsJoueur | null> {
  try {
    const { data, error } = await supabase.rpc("points_faibles");
    if (error || !data || typeof data !== "object") return null;
    const brut = data as { remplie?: boolean; rayees_semaine?: number; notions?: BrutNotion[] };
    return {
      remplie: brut.remplie === true,
      rayeesSemaine: Number(brut.rayees_semaine) || 0,
      lignes: (Array.isArray(brut.notions) ? brut.notions : []).map((l) => ({
        notion: l.notion,
        recentes: (l.recentes ?? []).map(([at, ok]) => ({ at, ok: ok === true })),
        sources: Object.fromEntries(Object.entries(l.sources ?? {}).filter(([k]) => SOURCES.has(k)).map(([k, n]) => [k, Number(n) || 0])),
        enCours: Number(l.en_cours) || 0,
        vives: Number(l.vives) || 0,
        anciennes: Number(l.anciennes) || 0,
        rayees7j: Number(l.rayees_7j) || 0,
        derniere: l.derniere,
        concepts: (l.concepts ?? []).map((c) => ({ concept: c.concept, ratures: Number(c.ratures) || 0, erreurs: Number(c.erreurs) || 0 })),
      })),
    };
  } catch {
    return null;
  }
}

/**
 * Les données des points faibles : par notion dès que points_faibles répond
 * et que les questions portent leur notion ; sinon les ratures par thème
 * (étape 1), lues seulement dans ce cas.
 */
export async function lireBasePointsFaibles(supabase: SupabaseClient): Promise<BasePointsFaibles> {
  const notions = await lireNotionsJoueur(supabase);
  if (notions?.remplie) return { notions, themes: SANS_RATURES_PAR_THEME };
  return { notions: null, themes: await lireRaturesParTheme(supabase) };
}

/** Chaque type de calcul (« equity:fcfe ») et sa notion. */
const NOTION_DU_CALCUL = new Map(NOTIONS.flatMap((n) => n.calculs.map((c) => [`${n.matiere}:${c.cle}`, n] as const)));

type AccNotion = {
  n: NotionLM;
  ligne: LigneNotion | null;
  seances: SeanceDatee[];
  sources: Map<AnswerSource, number>;
  /** réponses par type de calcul */
  calculs: Map<string, number>;
  derniere: string | null;
};

/** Les liens d'une notion : page de fiche, chapitre audio, QCM, type de calcul (le plus pratiqué) ; le calcul d'abord quand la notion ne s'est jouée qu'en calcul. */
function liensNotion(a: AccNotion, banque: BanqueQcm, calcul: boolean): Lien[] {
  const fiche = a.n.fiches[0];
  const qcm = banque.notions.get(a.n.id)?.[0];
  const type = [...a.n.calculs].sort((x, y) => (a.calculs.get(y.cle) ?? 0) - (a.calculs.get(x.cle) ?? 0))[0];
  const liens: Lien[] = [];
  if (fiche) liens.push({ nature: "fiche", href: fiche.href, libelle: fiche.page !== null ? POINTS_FAIBLES.lienFiche(fiche.page) : POINTS_FAIBLES.lienFicheEntiere });
  liens.push({ nature: "cours", href: a.n.cours, libelle: POINTS_FAIBLES.lienCours });
  if (qcm) liens.push({ nature: "qcm", href: `/qcm/${qcm}`, libelle: POINTS_FAIBLES.lienQcm });
  if (!type) return liens;
  const lienCalcul: Lien = { nature: "calcul", href: type.href, libelle: POINTS_FAIBLES.calcul(type.nom) };
  return calcul ? [lienCalcul, ...liens] : [...liens, lienCalcul];
}

/** Étape 2 : les notions (Learning Modules) d'un joueur et leur classement. */
function construireParNotion(stats: AnswerStats, base: NotionsJoueur, banque: BanqueQcm, now: number): PointsFaiblesData {
  const acc = new Map<string, AccNotion>();
  const ouvrir = (n: NotionLM) => {
    let a = acc.get(n.id);
    if (!a) {
      a = { n, ligne: null, seances: [], sources: new Map(), calculs: new Map(), derniere: null };
      acc.set(n.id, a);
    }
    return a;
  };

  // 1. les réponses aux questions et les ratures, notion par notion
  for (const l of base.lignes) {
    const n = notionParId(l.notion);
    if (!n) continue;
    const a = ouvrir(n);
    a.ligne = l;
    // une réponse, une séance d'une question : recentDe garde les 20 dernières, calculs compris
    for (const r of l.recentes) a.seances.push({ n: 1, ok: r.ok ? 1 : 0, at: r.at });
    for (const [src, k] of Object.entries(l.sources) as [AnswerSource, number][]) a.sources.set(src, (a.sources.get(src) ?? 0) + k);
    a.derniere = plusTard(a.derniere, l.derniere);
  }

  // 2. les calculs (lib/answer-stats : un thème « calc:<type> » par matière), rattachés à leur notion
  for (const s of stats.subjects) {
    for (const th of s.themes) {
      if (!th.key.startsWith("calc:")) continue;
      const type = th.key.slice(5);
      const n = NOTION_DU_CALCUL.get(`${s.key}:${type}`);
      if (!n) continue;
      const a = ouvrir(n);
      for (const p of th.passages) {
        a.seances.push({ n: p.n, ok: p.ok, at: p.at });
        a.derniere = plusTard(a.derniere, p.at || null);
      }
      const total = th.by.calc?.[0] ?? 0;
      a.sources.set("calc", (a.sources.get("calc") ?? 0) + total);
      a.calculs.set(type, (a.calculs.get(type) ?? 0) + total);
    }
  }

  const notions: Notion[] = [...acc.values()].map((a) => {
    const l = a.ligne;
    const recent = recentDe(a.seances, now);
    const enCours = l?.enCours ?? 0;
    // jouée seulement en calcul ces derniers temps : la phrase parle de calculs
    const calcul = a.calculs.size > 0 && !l?.recentes.length && enCours === 0;
    return {
      cle: a.n.id,
      libelle: a.n.court,
      matiere: a.n.matiere,
      matiereNom: MATIERES.get(a.n.matiere)?.name ?? a.n.matiere,
      repere: POINTS_FAIBLES.repereLm(a.n.lm),
      calcul,
      liens: liensNotion(a, banque, calcul),
      lm: a.n.id,
      sets: [],
      concepts: conceptsQuiCoincent(l?.concepts ?? []),
      sources: [...a.sources.entries()].filter(([, k]) => k > 0).sort((x, y) => y[1] - x[1]).map(([src, k]) => ({ libelle: SOURCE_LABELS[src], n: k })),
      // une rature en cours d'une notion est sur une question encore en banque : « Mettre au propre » la repasse
      mesures: { n: recent.n, ok: recent.ok, enCours, vives: l?.vives ?? 0, anciennes: l?.anciennes ?? 0, rayees7j: l?.rayees7j ?? 0, aRepasser: enCours, derniere: a.derniere },
    };
  });

  return { ...pointsFaibles(notions), propre: true, rayeesSemaine: base.rayeesSemaine, unite: "notion" };
}

/** Les points faibles d'un joueur : par notion (étape 2) quand base.notions est là, sinon par thème (étape 1). */
export function construirePointsFaibles(stats: AnswerStats, base: BasePointsFaibles, banque: BanqueQcm, now: number): PointsFaiblesData {
  return base.notions ? construireParNotion(stats, base.notions, banque, now) : construireParTheme(stats, base.themes, banque, now);
}

/**
 * La lecture légère (tuile de l'accueil) : les notions de points_faibles
 * seules, sans les calculs ni la banque de QCM (getAnswerStats n'est pas
 * chargé). Une notion jouée seulement en calcul n'y paraît pas.
 */
export function pointsFaiblesLegers(base: NotionsJoueur, now: number): PointsFaiblesData {
  return construireParNotion(EMPTY_ANSWER_STATS, base, banqueVide(), now);
}
