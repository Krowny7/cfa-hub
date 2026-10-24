import type { SupabaseClient } from "@supabase/supabase-js";
import { getAnswerStats } from "@/lib/answer-stats";
import { fonctionAbsente } from "@/lib/atelier-seance";
import { MIN_REPONSES, type PointsFaiblesData } from "@/lib/points-faibles";
import { construirePointsFaibles, lireBanqueQcm, lireBasePointsFaibles, pointsFaiblesLegers } from "@/components/moi/points-faibles-data";
import { rpcCalcul } from "@/components/moi/ratures-data";
import { subjectByFlashcardFolder } from "@/components/reviser/catalog";
import { etatAffiche } from "@/lib/flashcards/progression";
import { lireProgressions } from "@/lib/flashcards/progression-serveur";
import {
  avancementFiches,
  cartesParMatiere,
  texteBrut,
  type AvancementFiches,
  type DonneesFlashcards,
  type DonneesMarquees,
  type DonneesPointsFaibles,
  type DonneesRatures,
  type DonneesReviser,
} from "@/components/reviser/parcours";

// Les données de la page Réviser (côté serveur, client du joueur ; client
// admin pour le contenu partagé : sets, questions, paquets). Chaque bloc
// tombe à null (ou sans chiffre) si sa source manque : migration pas encore
// collée, base injoignable. Rien n'est écrit, sauf ce que get_ratures fait
// déjà d'ordinaire (rejouer les ratures en attente du joueur).
//   fiches        quiz_sets officiels publiés « <Matière> — Drill Fiche Page N »
//                 et leur nombre de questions (quiz_questions(count)), lus en
//                 même temps que les questions distinctes répondues par set :
//                 avancement_fiches() (migration_avancement_fiches.sql), sinon
//                 le journal quiz_answer_log relu (paires set, question)
//   flashcards    flashcard_sets officiels publiés (flashcards(count),
//                 library_folders) ; la boucle en cours : flashcard_progress
//   ratures       get_ratures (le carnet, avec « Sans calcul » si la base sait trier)
//   marquees      question_flags (le nombre, et les 2 dernières avec leur énoncé)
//   pointsFaibles par notion : points_faibles seule, la lecture légère de la
//                 tuile de l'accueil (sans getAnswerStats ni la banque de QCM :
//                 une notion travaillée seulement en calcul n'y paraît pas) ;
//                 par thème (repli, migration_notions.sql absente) : la lecture
//                 complète de la carte de l'Atelier de S'entraîner

const PAGE = 1000;
const PAGES_MAX = 10;

/** Toutes les lignes d'une requête paginée (PostgREST rend 1 000 lignes au plus) ; null à la première erreur. */
async function toutes<T>(page: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>): Promise<T[] | null> {
  const out: T[] = [];
  for (let p = 0; p < PAGES_MAX; p++) {
    const { data, error } = await page(p * PAGE, p * PAGE + PAGE - 1);
    if (error || !Array.isArray(data)) return null;
    out.push(...(data as T[]));
    if (data.length < PAGE) break;
  }
  return out;
}

/**
 * Les questions distinctes répondues par le joueur, par set : la fonction
 * avancement_fiches (une ligne par set) ; tant qu'elle n'est pas collée, le
 * journal relu, paires (set, question) seulement, tous sets confondus (seules
 * les fiches y écrivent, lib/ficheApi), dans l'ordre de la clé (pages
 * stables). null : illisible.
 */
async function vuesParSet(supabase: SupabaseClient, userId: string): Promise<Map<string, number> | null> {
  const { data, error } = await supabase.rpc("avancement_fiches");
  if (!error && Array.isArray(data)) return new Map((data as { set_id: string; vues: number }[]).map((r) => [r.set_id, Number(r.vues) || 0]));
  if (!fonctionAbsente(error)) return null;
  const lignes = await toutes<{ set_id: string; question_id: string }>((a, b) =>
    supabase.from("quiz_answer_log").select("set_id,question_id").eq("user_id", userId).order("id").range(a, b),
  );
  if (!lignes) return null;
  const parSet = new Map<string, Set<string>>();
  for (const l of lignes) {
    const vues = parSet.get(l.set_id) ?? new Set<string>();
    vues.add(l.question_id);
    parSet.set(l.set_id, vues);
  }
  return new Map([...parSet].map(([id, vues]) => [id, vues.size]));
}

async function lireFiches(supabase: SupabaseClient, admin: SupabaseClient | null, userId: string): Promise<AvancementFiches | null> {
  // les drills officiels publiés seulement : un QCM personnel titré « … — Drill Fiche Page N » ne compte pas,
  // et les séries de réserve (official_published = false, scripts/lib/seed-core.mjs) sont écartées d'office
  const [sets, vues] = await Promise.all([
    (admin ?? supabase)
      .from("quiz_sets")
      .select("id,title,quiz_questions(count)")
      .eq("is_official", true)
      .eq("official_published", true)
      .like("title", "% — Drill Fiche Page %")
      .limit(1000),
    vuesParSet(supabase, userId),
  ]);
  if (sets.error || !Array.isArray(sets.data) || !vues) return null;
  const drill = (sets.data as { id: string; title: string; quiz_questions: { count: number }[] | null }[]).map((s) => ({
    id: s.id,
    title: s.title,
    questions: Number(s.quiz_questions?.[0]?.count) || 0,
  }));
  if (!drill.length) return null;
  return avancementFiches(drill, vues);
}

async function lireFlashcards(supabase: SupabaseClient, admin: SupabaseClient | null, userId: string): Promise<DonneesFlashcards> {
  const [paquets, progressions] = await Promise.all([
    (async () => {
      try {
        const { data, error } = await (admin ?? supabase)
          .from("flashcard_sets")
          .select("id,library_folders(name),flashcards(count)")
          .eq("is_official", true)
          .eq("official_published", true)
          .limit(500);
        return error || !Array.isArray(data) ? null : (data as { library_folders: { name: string | null } | { name: string | null }[] | null; flashcards: { count: number }[] | null }[]);
      } catch {
        return null;
      }
    })(),
    lireProgressions(supabase, userId).catch(() => null),
  ]);

  let cartes: number | null = null;
  let parMatiere: number | null = null;
  if (paquets) {
    const parCle = new Map<string, number>();
    cartes = 0;
    for (const p of paquets) {
      const n = Number(p.flashcards?.[0]?.count) || 0;
      cartes += n;
      const f = Array.isArray(p.library_folders) ? p.library_folders[0] : p.library_folders;
      const m = f?.name ? subjectByFlashcardFolder(f.name) : null;
      if (m) parCle.set(m.key, (parCle.get(m.key) ?? 0) + n);
    }
    parMatiere = cartesParMatiere(parCle);
  }

  // la boucle en cours la plus récente (tour 1 entamé ou tours suivants), tous paquets et matières confondus
  let boucle: DonneesFlashcards["boucle"] = null;
  let maj = -1;
  for (const ligne of progressions?.values() ?? []) {
    const a = etatAffiche(ligne);
    if (!a || a.fini || (a.genre !== "tour1" && a.genre !== "tours")) continue;
    if (ligne.maj > maj) {
      maj = ligne.maj;
      boucle = { texte: a.texte, aide: a.aide };
    }
  }
  return { cartes, parMatiere, boucle };
}

type BrutRatures = {
  total: number;
  sans_calcul?: boolean;
  calcul_masquees?: number;
  calcul_connu?: boolean;
  items: { prompt: string }[] | null;
};

async function lireRatures(supabase: SupabaseClient): Promise<DonneesRatures | null> {
  // une seule lecture, avec « Sans calcul » quand la base sait trier (sinon rpcCalcul rejoue l'appel sans) :
  // le total y exclut les ratures à calcul, comptées à part dans calcul_masquees
  const { data, error } = await rpcCalcul(supabase, "get_ratures", { p_source: null, p_retirees: false, p_limit: 1, p_offset: 0 }, true);
  if (error || !data) return null;
  const r = data as BrutRatures;
  const filtre = r.sans_calcul === true;
  const masquees = filtre ? Number(r.calcul_masquees) || 0 : null;
  const prompt = r.items?.[0]?.prompt;
  return {
    enCours: (Number(r.total) || 0) + (masquees ?? 0),
    derniere: prompt ? texteBrut(prompt, 56) : null,
    calcul: r.calcul_connu === true ? { masquees } : null,
  };
}

type LigneMarque = { question_id: string; quiz_questions: { prompt: string | null } | { prompt: string | null }[] | null };

/**
 * Le nombre de questions marquées et les 2 dernières, lus dans question_flags
 * (sans get_flagged_questions, qui cherche pour chaque marque si la question a
 * été répondue : inutile ici). La jointure est externe : une question que le
 * joueur ne peut pas lire (série de réserve) garde sa ligne, et son énoncé est
 * relu par le client admin. Table absente : null.
 */
async function lireMarquees(supabase: SupabaseClient, admin: SupabaseClient | null, userId: string): Promise<DonneesMarquees | null> {
  const { data, error, count } = await supabase
    .from("question_flags")
    .select("question_id,quiz_questions(prompt)", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(2);
  if (error || !Array.isArray(data)) return null;
  const lignes = data as unknown as LigneMarque[];
  const enonces = new Map(lignes.map((l) => [l.question_id, (Array.isArray(l.quiz_questions) ? l.quiz_questions[0]?.prompt : l.quiz_questions?.prompt) ?? null]));
  const manquants = lignes.filter((l) => !enonces.get(l.question_id)).map((l) => l.question_id);
  if (manquants.length && admin) {
    try {
      const { data: qs } = await admin.from("quiz_questions").select("id,prompt").in("id", manquants);
      for (const q of (qs ?? []) as { id: string; prompt: string | null }[]) enonces.set(q.id, q.prompt);
    } catch {
      // énoncé illisible : l'aperçu manque, le nombre reste
    }
  }
  return {
    total: count ?? lignes.length,
    apercus: lignes.flatMap((l) => {
      const p = enonces.get(l.question_id);
      return p ? [texteBrut(p, 120)] : [];
    }),
  };
}

async function lirePointsFaibles(supabase: SupabaseClient, admin: SupabaseClient | null, userId: string, now: number): Promise<DonneesPointsFaibles | null> {
  const base = await lireBasePointsFaibles(supabase);
  let d: PointsFaiblesData;
  // par notion : la lecture légère de la tuile de l'accueil. Choix assumé : une notion travaillée
  // seulement en calcul n'apparaît pas, et la réussite d'une notion ne compte pas ses calculs (la carte
  // de l'Atelier, dans S'entraîner, les compte) ; trois lignes ne valent pas getAnswerStats en entier
  if (base.notions) d = pointsFaiblesLegers(base.notions, now);
  else {
    // par thème (repli) : il faut les réponses rangées par thème, donc la lecture complète
    const [stats, banque] = await Promise.all([getAnswerStats(admin ?? supabase, userId, { privileged: !!admin, now }), lireBanqueQcm(admin ?? supabase)]);
    d = construirePointsFaibles(stats, base, banque, now);
  }
  return {
    etat: d.etat,
    notions: d.liste.slice(0, 3).map((p) => ({
      cle: p.cle,
      libelle: p.libelle,
      matiere: p.matiereNom,
      // la réussite récente, citée comme ailleurs dès MIN_REPONSES réponses (le score de faiblesse, lui,
      // ne s'écrit jamais en chiffre) ; en deçà, la notion n'est retenue que par ses ratures (au moins
      // MIN_RATURES en cours) : la carte écrit « N ratures »
      pct: p.mesures.n >= MIN_REPONSES ? Math.round((100 * p.mesures.ok) / p.mesures.n) : null,
      ratures: p.mesures.enCours,
    })),
  };
}

const ou = <T,>(p: Promise<T>, repli: T) => p.catch(() => repli);

export async function chargerReviser(supabase: SupabaseClient, admin: SupabaseClient | null, userId: string, now = Date.now()): Promise<DonneesReviser> {
  const [fiches, flashcards, ratures, marquees, pointsFaibles] = await Promise.all([
    ou(lireFiches(supabase, admin, userId), null),
    ou(lireFlashcards(supabase, admin, userId), { cartes: null, parMatiere: null, boucle: null }),
    ou(lireRatures(supabase), null),
    ou(lireMarquees(supabase, admin, userId), null),
    ou(lirePointsFaibles(supabase, admin, userId, now), null),
  ]);
  return { fiches, flashcards, ratures, marquees, pointsFaibles };
}
