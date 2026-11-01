import type { SupabaseClient } from "@supabase/supabase-js";
import { loadNextMockExam } from "@/components/accueil/queries";
import { historiqueEn } from "@/components/moi/synthese/modele";
import { lireCodex } from "@/lib/codex/serveur";
import { FORMATS, getDailyHistory } from "@/lib/daily";
import { getMaitrise } from "@/lib/mastery";
import { datesSynthese, lireMaitriseSynthese } from "@/lib/moi-synthese";
import { jourParis } from "@/lib/objectif";
import { enLigne as estEnLigne } from "@/lib/presence";
import { lireAcquis } from "@/lib/profil/acquis";
import { amisDe, demandesDe, statsProfil } from "@/lib/profil/donnees";
import { nouveautesAmis, type Nouveaute } from "@/lib/profil/nouveau";
import { PIECES } from "@/lib/profil/pieces";
import { sceauxDuJoueur } from "@/lib/profil/sceaux-base";
import { lireEssentiel } from "@/lib/profil/visiteur";
import { SEUIL_JOUR } from "@/lib/serie-encre";
import {
  amisLobby,
  carnetDe,
  choisirDeblocage,
  grandeSalleDe,
  meilleurResultatBlanc,
  queteLobby,
  recordCopie,
  recordExamen,
  recordMaitrise,
  recordRang,
  scoresDe,
  type CopieLue,
  type DeblocageVue,
  type ResultatBlanc,
} from "./modele-parcours";
import type { AmisLobby, CarnetLobby, CtxLecture, GrandeSalleLobby, QueteLobby, ScoresLobby } from "./types";

// Les cartes « parcours » de l'accueil, côté serveur (lot 5) : Tes meilleurs
// scores, Prochain déblocage, Ta prochaine quête, La Grande Salle, Du nouveau,
// Tes amis et Ton carnet de jours. Chaque lecture a son propre `.catch(() =>
// null)` : une source qui manque (migration pas collée, pas de clé de service,
// base occupée) laisse sa carte à null, jamais d'exception ni de valeur inventée.
// Les calculs sont dans modele-parcours.ts. Module serveur.

const nombreOuNull = (v: unknown): number | null => {
  const x = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(x) ? x : null;
};

// ── Tes meilleurs scores ────────────────────────────────────────────────────

/**
 * La meilleure copie aux 30 : une seule ligne de daily_attempts (le plus haut score
 * rendu, ta propre ligne : la RLS te l'ouvre), de tous les temps. Sinon (la table ne
 * répond pas), l'historique des 120 derniers jours, le plus que daily_history rende.
 */
async function lireCopies(sb: SupabaseClient, id: string): Promise<CopieLue[]> {
  try {
    const { data, error } = await sb
      .from("daily_attempts")
      .select("day,score,total")
      .eq("user_id", id)
      .eq("total", FORMATS.trente.questions)
      .not("score", "is", null)
      .order("score", { ascending: false })
      .order("day", { ascending: false })
      .limit(1);
    if (!error && Array.isArray(data)) return (data as { day: unknown; score: unknown; total: unknown }[]).map((r) => ({ day: String(r.day).slice(0, 10), score: nombreOuNull(r.score), total: nombreOuNull(r.total) }));
  } catch {
    // table illisible : le repli ci-dessous
  }
  const histoire = await getDailyHistory(sb, 120, "trente");
  return histoire.map((h) => ({ day: h.day, score: h.score, total: h.total }));
}

/** La maîtrise du jour, puis ses 15 dates passées (maitrise_synthese, avec le client de service) : la meilleure, avec sa meilleure matière. */
async function lireMaitrise(ctx: CtxLecture) {
  const dates = datesSynthese(ctx.now.getTime());
  const [m, syn] = await Promise.all([getMaitrise(ctx.sb, ctx.user.id).catch(() => null), lireMaitriseSynthese(ctx.admin, ctx.user.id, dates).catch(() => null)]);
  const histo = syn ? historiqueEn(syn.historique, dates.map((d) => jourParis(Date.parse(d)))) : null;
  return recordMaitrise(histo, m, ctx.jour);
}

/** Le meilleur pourcentage à un examen blanc (premier essai officiel), avec le titre de l'examen. */
async function lireExamen(ctx: CtxLecture) {
  const { data, error } = await ctx.sb.from("mock_exam_results").select("exam_id,score,total,completed_at").eq("user_id", ctx.user.id).limit(200);
  if (error || !Array.isArray(data)) return null;
  const lignes = (data as { exam_id: string; score: unknown; total: unknown; completed_at: string | null }[]).map(
    (r): ResultatBlanc => ({ examId: r.exam_id, score: nombreOuNull(r.score), total: nombreOuNull(r.total), jour: r.completed_at ? jourParis(new Date(r.completed_at)) : null }),
  );
  const meilleur = meilleurResultatBlanc(lignes);
  let titre: string | null = null;
  if (meilleur) {
    const { data: ex } = await (ctx.admin ?? ctx.sb).from("mock_exams").select("title").eq("id", meilleur.examId).maybeSingle();
    titre = (ex as { title?: string | null } | null)?.title ?? null;
  }
  return recordExamen(meilleur, titre, ctx.jour);
}

/** Le plus haut ELO atteint (rating_events, lisible par tous) ; les matchs illisibles : le palier de ProfilStats.picAtteint. */
async function lireRang(ctx: CtxLecture) {
  const { data, error } = await ctx.sb.from("rating_events").select("elo_after,created_at").eq("user_id", ctx.user.id).order("elo_after", { ascending: false }).limit(1);
  if (error || !Array.isArray(data)) {
    const stats = await statsProfil(ctx.user.id, ctx.sb);
    return recordRang(null, stats.picAtteint, ctx.jour);
  }
  const ligne = (data as { elo_after: unknown; created_at: string | null }[])[0];
  const elo = ligne ? nombreOuNull(ligne.elo_after) : null;
  return recordRang(elo !== null ? { elo, jour: ligne?.created_at ? jourParis(new Date(ligne.created_at)) : null } : null, null, ctx.jour);
}

export async function lireScores(ctx: CtxLecture): Promise<ScoresLobby | null> {
  const [copie, maitrise, examen, rang] = await Promise.all([
    lireCopies(ctx.sb, ctx.user.id).then((c) => recordCopie(c, ctx.jour)).catch(() => null),
    lireMaitrise(ctx).catch(() => null),
    lireExamen(ctx).catch(() => null),
    lireRang(ctx).catch(() => null),
  ]);
  return scoresDe({ copie, maitrise, examen, rang });
}

// ── Prochain déblocage ──────────────────────────────────────────────────────

/** Ce que le joueur a fait (l'Acquis, comme l'étagère de Moi › Mes pièces), puis la pièce la plus proche de s'ouvrir. La plus lourde des lectures de ce lot : le lot 6 la plafonne. */
export async function lireDeblocage(ctx: CtxLecture): Promise<DeblocageVue | null> {
  const id = ctx.user.id;
  const stats = await statsProfil(id, ctx.sb);
  const [sceaux, acquis] = await Promise.all([sceauxDuJoueur(id, stats), lireAcquis(ctx.admin ?? ctx.sb, id, { stats, sceaux: [], datesPic: [] })]);
  return choisirDeblocage(PIECES, { ...acquis, sceaux: sceaux.etats });
}

// ── Ta prochaine quête ──────────────────────────────────────────────────────

/** La vue du Codex (mémo de 45 s), puis sa prochaine quête. Le Codex indisponible : null. */
export async function lireQuete(ctx: CtxLecture): Promise<QueteLobby | null> {
  return queteLobby(await lireCodex(ctx.sb, ctx.user));
}

// ── La Grande Salle ─────────────────────────────────────────────────────────

/** Le prochain examen blanc (celui dont la fenêtre n'est pas close), avec son jour de Paris. Aucun : null. */
export async function lireGrandeSalle(ctx: CtxLecture): Promise<GrandeSalleLobby | null> {
  const e = await loadNextMockExam(ctx.sb, ctx.admin, ctx.user.id, ctx.now);
  return grandeSalleDe(e ? { id: e.id, title: e.title, jourExamen: jourParis(new Date(e.scheduledAt)), daysLeft: e.daysLeft, registered: e.registered } : null);
}

// ── Tes amis ────────────────────────────────────────────────────────────────

/** Ceux de tes amis qui sont en ligne (get_presence, 300 identifiants au plus) ; null si la présence ne se lit pas. */
async function enLigneParmi(sb: SupabaseClient, ids: string[], now: number): Promise<Set<string> | null> {
  if (!ids.length) return null;
  try {
    const { data, error } = await sb.rpc("get_presence", { p_ids: ids.slice(0, 300) });
    if (error || !Array.isArray(data)) return null;
    const en = new Set<string>();
    for (const r of data as { user_id: string; visible: boolean; seconds_ago: number | null }[]) if (estEnLigne({ visible: !!r.visible, secondsAgo: r.seconds_ago ?? null, at: now }, now)) en.add(r.user_id);
    return en;
  } catch {
    return null;
  }
}

export async function lireAmis(ctx: CtxLecture): Promise<AmisLobby | null> {
  // les 60 amis les plus récents (la limite d'amisDe : la liste des profils passe dans l'adresse de la requête) ; le total, lui, les compte tous
  const lu = await amisDe(ctx.user.id, ctx.sb);
  if (!lu) return null;
  const [presents, demandes] = await Promise.all([enLigneParmi(ctx.sb, lu.amis.map((a) => a.id), ctx.now.getTime()), demandesDe(ctx.sb, ctx.user.id).catch(() => null)]);
  return amisLobby({ amis: lu.amis.map((a) => ({ id: a.id, name: a.name })), total: lu.total, enLigne: presents, demandes: demandes?.recues.length ?? 0 });
}

// ── Ton carnet de jours ─────────────────────────────────────────────────────

/** Les 52 semaines, la série et le record : l'essentiel du joueur (le même que celui de son profil). */
export async function lireCarnet(ctx: CtxLecture): Promise<CarnetLobby | null> {
  return carnetDe(await lireEssentiel(ctx.sb, ctx.user.id, ctx.jour), SEUIL_JOUR);
}

// ── Le tout ─────────────────────────────────────────────────────────────────

/** Ce que les cartes du lot 5 rendent ; chaque champ vaut null quand sa source manque (la carte se masque). */
export type ParcoursLobby = {
  scores: ScoresLobby | null;
  deblocage: DeblocageVue | null;
  quete: QueteLobby | null;
  grandeSalle: GrandeSalleLobby | null;
  nouveau: Nouveaute[] | null;
  amis: AmisLobby | null;
  carnet: CarnetLobby | null;
};

export async function lireParcours(ctx: CtxLecture): Promise<ParcoursLobby> {
  const [scores, deblocage, quete, grandeSalle, nouveau, amis, carnet] = await Promise.all([
    lireScores(ctx).catch(() => null),
    lireDeblocage(ctx).catch(() => null),
    lireQuete(ctx).catch(() => null),
    lireGrandeSalle(ctx).catch(() => null),
    nouveautesAmis(ctx.sb, ctx.admin, ctx.user.id).catch(() => null),
    lireAmis(ctx).catch(() => null),
    lireCarnet(ctx).catch(() => null),
  ]);
  return { scores, deblocage, quete, grandeSalle, nouveau, amis, carnet };
}
