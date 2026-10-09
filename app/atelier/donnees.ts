import type { SupabaseClient } from "@supabase/supabase-js";
import { calcQuestion, calcSubject, calcType, levelPool } from "@/lib/calc/index";
import { correctionSteps, pickRound, publicQuestion, recentPrecision, suggestedLevel, type HistoryMap } from "@/lib/calc/engine";
import { CALC_LEVELS, type CalcLevel, type CalcTopic } from "@/lib/calc/types";
import { getCourse } from "@/lib/courses";
import { NOTIONS, notionParId } from "@/lib/notions";
import { SUBJECTS } from "@/components/reviser/catalog";
import { loadCalcHistory, loadCalcProgress } from "@/app/calculs/data";
import type { AvantNotion, Niveau, Reponse } from "@/lib/atelier";
import { fonctionAbsente, type ItemSeance, type RappelNotion, type SeanceAtelier } from "@/lib/atelier-seance";
import { horloge } from "@/lib/voice-atelier";
import { POINTS_FAIBLES } from "@/lib/voice-points-faibles";
import type { PointsFaiblesData } from "@/lib/points-faibles";

// L'Atelier côté serveur : la séance lue en base (atelier_courant,
// atelier_lancer), les calculs de lib/calc joints au pool (énoncés publics ;
// la bonne réponse et la correction seulement une fois répondu), le pool de
// calcul d'un nouvel Atelier, les cartes Rappel des notions et l'état léger
// des points d'entrée. Importe le catalogue des calculs (avec réponses) :
// jamais dans un composant client.

type Brut = Record<string, unknown>;
const num = (v: unknown, d = 0) => (v === null || v === undefined || Number.isNaN(Number(v)) ? d : Number(v));
const numOuNull = (v: unknown) => (v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v));
const niveau = (v: unknown): Niveau => (v === 2 || v === 3 ? v : 1);
const NIVEAU_DE: Record<CalcLevel, Niveau> = { facile: 1, moyen: 2, difficile: 3 };

/** Les fiches en PDF (bucket « fiches », <slug>.pdf), qui s'ouvrent dans le tiroir de l'Atelier. */
const FICHES_PDF = new Set(["equity", "financial-statement-analysis", "fixed-income", "portfolio-management"]);

function item(x: Brut): ItemSeance | null {
  const i = num(x.i, -1);
  const notion = String(x.notion ?? "");
  if (i < 0 || !notion) return null;
  const repondu = x.repondu === true;
  if (x.k === "calc") {
    const topic = String(x.matiere ?? "") as CalcTopic;
    const type = String(x.type ?? "");
    const ref = String(x.ref ?? "");
    const t = calcType(topic, type);
    const q = calcQuestion(topic, type, ref);
    return {
      i,
      k: "calc",
      notion,
      niveau: niveau(x.niveau),
      ref,
      type,
      matiere: topic,
      nomType: t?.name ?? type,
      q: q ? publicQuestion(q) : null,
      premier: repondu ? { valeur: numOuNull(x.valeur), juste: x.juste === true, bonne: q?.answer ?? null, solution: q ? correctionSteps(q.solution) : [] } : null,
      retest: x.retest_juste === null || x.retest_juste === undefined ? null : { valeur: numOuNull(x.retest_valeur), juste: x.retest_juste === true },
    };
  }
  if (x.k !== "rature" && x.k !== "neuve") return null;
  return {
    i,
    k: x.k,
    notion,
    niveau: niveau(x.niveau),
    ref: String(x.ref ?? ""),
    prompt: String(x.prompt ?? ""),
    choices: Array.isArray(x.choices) ? (x.choices as unknown[]).map(String) : [],
    misses: numOuNull(x.misses),
    premier: repondu
      ? { choix: num(x.choix), juste: x.juste === true, bonne: numOuNull(x.correct_index), explication: x.explanation ? String(x.explanation) : null, statut: null }
      : null,
    retest: x.retest_juste === null || x.retest_juste === undefined ? null : { choix: num(x.retest_choix), juste: x.retest_juste === true },
  };
}

/** La séance d'après la réponse d'atelier_courant / atelier_lancer (null : pas d'Atelier). */
export function lireSeance(raw: unknown): SeanceAtelier | null {
  const r = (raw ?? {}) as Brut;
  if (!r.id) return null;
  const avantBrut = (r.avant && typeof r.avant === "object" ? r.avant : {}) as Record<string, Brut>;
  const avant: Record<string, AvantNotion> = {};
  for (const [k, v] of Object.entries(avantBrut)) {
    const c = v?.calc as Brut | undefined;
    avant[k] = { n: num(v?.n), ok: num(v?.ok), enCours: num(v?.en_cours), vives: num(v?.vives), calc: c ? { n: num(c.n), ok: num(c.ok) } : null };
  }
  return {
    id: String(r.id),
    notions: Array.isArray(r.notions) ? (r.notions as unknown[]).map(String) : [],
    poids: Array.isArray(r.poids) ? (r.poids as unknown[]).map((x) => num(x)) : [],
    startedAt: String(r.started_at ?? ""),
    vuAt: String(r.vu_at ?? r.started_at ?? ""),
    secondes: num(r.secondes),
    avant,
    ordre: (Array.isArray(r.ordre) ? (r.ordre as Brut[]) : []).map((o): Reponse => ({ i: num(o.i), ok: o.ok === true, retest: o.r === true })),
    items: (Array.isArray(r.items) ? (r.items as Brut[]) : []).map(item).filter((x): x is ItemSeance => x !== null),
  };
}

/** L'Atelier en cours du joueur connecté. disponible : false tant que migration_atelier.sql manque. */
export async function lireAtelierCourant(sb: SupabaseClient): Promise<{ disponible: boolean; seance: SeanceAtelier | null }> {
  try {
    const { data, error } = await sb.rpc("atelier_courant");
    // fonction absente : la migration manque ; autre erreur : l'ouverture reste, le lancement le dira
    if (error) return { disponible: !fonctionAbsente(error), seance: null };
    return { disponible: true, seance: lireSeance(data) };
  } catch {
    return { disponible: false, seance: null };
  }
}

/**
 * L'état léger, pour les points d'entrée (Tes points faibles) : null tant
 * que la table manque (pas d'entrée) ; sinon l'Atelier en cours (repris
 * sous 24 heures), avec ses réponses données.
 */
export async function lireEtatAtelier(sb: SupabaseClient, userId: string): Promise<{ enCours: { faites: number } | null } | null> {
  try {
    const { data, error } = await sb.from("ateliers").select("reponses,vu_at").eq("user_id", userId).is("finished_at", null).limit(1);
    if (error) return null;
    const row = (data?.[0] ?? null) as { reponses: unknown; vu_at: string } | null;
    const frais = row && Date.parse(row.vu_at) > Date.now() - 24 * 3600_000;
    return { enCours: frais ? { faites: Array.isArray(row.reponses) ? row.reponses.length : 0 } : null };
  } catch {
    return null;
  }
}

/** Les points faibles et l'accès à l'Atelier : seulement par notion (un Atelier mélange des Learning Modules). */
export function avecAtelier(d: PointsFaiblesData, etat: { enCours: { faites: number } | null } | null): PointsFaiblesData {
  return etat && d.unite === "notion" ? { ...d, atelier: etat } : d;
}

/**
 * Le pool de calcul d'un nouvel Atelier : pour chaque notion qui a un type de
 * calcul (le moins réussi récemment d'abord), 4 questions au niveau du
 * joueur (calc_attempts : le niveau qui suit le dernier tenu) et 2 au niveau
 * en dessous, pour l'adaptation. Et la réussite récente en calcul de chaque
 * notion (les 10 dernières réponses par niveau du type).
 */
export async function poolCalcul(sb: SupabaseClient, notions: string[]): Promise<{ items: { q: string; n: string; t: string; m: string; v: Niveau }[]; avant: Record<string, { n: number; ok: number }> }> {
  const items: { q: string; n: string; t: string; m: string; v: Niveau }[] = [];
  const avant: Record<string, { n: number; ok: number }> = {};
  for (const id of notions) {
    const notion = notionParId(id);
    const topic = notion?.matiere as CalcTopic | undefined;
    if (!notion || !topic) continue;
    const types = notion.calculs.map((c) => calcType(topic, c.cle)).filter((t): t is NonNullable<typeof t> => t !== null);
    if (!types.length) continue;
    const progres = (await loadCalcProgress(sb, topic))?.[topic] ?? {};
    const type = [...types].sort((a, b) => (recentPrecision(progres[a.key]) ?? 101) - (recentPrecision(progres[b.key]) ?? 101))[0];
    const p = progres[type.key];
    if (p) {
      const n = CALC_LEVELS.reduce((s, l) => s + p.levels[l].recentN, 0);
      if (n > 0) avant[id] = { n, ok: CALC_LEVELS.reduce((s, l) => s + p.levels[l].recentOk, 0) };
    }
    const level = suggestedLevel(p);
    const dessous = CALC_LEVELS[CALC_LEVELS.indexOf(level) - 1] ?? null;
    for (const [l, combien] of [[level, 4], [dessous, 2]] as [CalcLevel | null, number][]) {
      if (!l) continue;
      const history: HistoryMap = (await loadCalcHistory(sb, topic, type.key, l)) ?? {};
      for (const q of pickRound(levelPool(type, l), history, combien)) items.push({ q, n: id, t: type.key, m: topic, v: NIVEAU_DE[l] });
    }
  }
  return { items, avant };
}

const MATIERES = new Map(SUBJECTS.map((s) => [s.key, s.name]));

type CarteFlash = { front: string; back: string; position: number };

/**
 * Les cartes Rappel des notions : formules et pièges du type de calcul,
 * trois flashcards du paquet qui couvre la notion (sa part du paquet, dans
 * l'ordre), la page de fiche (PDF signé pour le tiroir) et le chapitre audio
 * (son début et sa durée). `concepts` : ce qui coince, par notion.
 */
export async function rappelsDes(sb: SupabaseClient, ids: string[], concepts: Record<string, string[]> = {}): Promise<Record<string, RappelNotion>> {
  const out: Record<string, RappelNotion> = {};
  const notions = [...new Set(ids)].map((id) => notionParId(id)).filter((n): n is NonNullable<typeof n> => n !== null);
  const paquets = [...new Set(notions.map((n) => n.flashcards[0]).filter((t): t is string => !!t))];
  const slugs = [...new Set(notions.map((n) => /^\/fiches\/([a-z-]+)/.exec(n.fiches[0]?.href ?? "")?.[1]).filter((s): s is string => !!s && FICHES_PDF.has(s)))];
  const [cartes, pdfs] = await Promise.all([
    (async () => {
      const m = new Map<string, CarteFlash[]>();
      if (!paquets.length) return m;
      try {
        const { data } = await sb.from("flashcard_sets").select("id,title,flashcards(front,back,position)").in("title", paquets).eq("is_official", true);
        for (const s of (data ?? []) as { title: string; flashcards: CarteFlash[] | null }[]) m.set(s.title, [...(s.flashcards ?? [])].sort((a, b) => a.position - b.position));
      } catch {
        // pas de flashcards : la carte garde le reste
      }
      return m;
    })(),
    Promise.all(
      slugs.map(async (slug) => {
        try {
          const { data, error } = await sb.storage.from("fiches").createSignedUrl(`${slug}.pdf`, 3600);
          return [slug, error ? null : (data?.signedUrl ?? null)] as const;
        } catch {
          return [slug, null] as const;
        }
      }),
    ),
  ]);
  const pdfDe = new Map(pdfs);

  for (const n of notions) {
    // la part du paquet qui revient à la notion : le paquet couvre plusieurs notions, dans l'ordre du programme
    const titrePaquet = n.flashcards[0] ?? null;
    const paquet = titrePaquet ? (cartes.get(titrePaquet) ?? []) : [];
    const voisines = titrePaquet ? NOTIONS.filter((x) => x.flashcards[0] === titrePaquet).map((x) => x.id) : [];
    const rang = Math.max(0, voisines.indexOf(n.id));
    const part = voisines.length ? Math.floor(paquet.length / voisines.length) : paquet.length;
    const flash = paquet.slice(rang * part, rang * part + 3).map((c) => ({ recto: c.front, verso: c.back }));
    const fiche = n.fiches[0] ?? null;
    const slug = /^\/fiches\/([a-z-]+)/.exec(fiche?.href ?? "")?.[1] ?? null;
    const types = n.calculs.map((c) => calcType(n.matiere as CalcTopic, c.cle)).filter((t): t is NonNullable<typeof t> => t !== null);
    const t = types[0] ?? null;
    const coursSlug = /^\/courses\/([a-z-]+)/.exec(n.cours)?.[1] ?? "";
    const chapitres = getCourse(coursSlug)?.chapters ?? [];
    const chap = chapitres[n.lm - 1] ?? null;
    const suite = chapitres[n.lm]?.start ?? (getCourse(coursSlug)?.minutes ?? 0) * 60;
    const sujet = calcSubject(n.matiere as CalcTopic);
    out[n.id] = {
      notion: n.id,
      libelle: n.court,
      repere: `${MATIERES.get(n.matiere) ?? n.matiere} · ${POINTS_FAIBLES.repereLm(n.lm)}`,
      titre: n.titre,
      concepts: (concepts[n.id] ?? []).slice(0, 3),
      calcul: t ? { nom: t.name, formules: t.formulas.slice(0, 4), pieges: (t.traps ?? []).slice(0, 3) } : null,
      flashcards: flash,
      fiche: fiche ? { href: fiche.href, page: fiche.page, pdf: slug ? (pdfDe.get(slug) ?? null) : null } : null,
      cours: { href: n.cours, debut: chap ? horloge(chap.start) : null, minutes: chap && suite > chap.start ? Math.max(1, Math.round((suite - chap.start) / 60)) : null },
      calculHref: t && sujet ? `/calculs/${sujet.slug}/${t.key}` : null,
    };
  }
  return out;
}
