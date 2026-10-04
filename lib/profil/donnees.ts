import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { chargerTraitsDuJour } from "@/components/adn/AnneauDuJourData";
import { joursAvant, jourParis } from "@/lib/objectif";
import { decaleJour } from "@/lib/objectif-calc";
import { levelInfoFromXp } from "@/lib/leveling";
import { DEFAULT_ELO, TOP_TIER, rankFor } from "@/lib/ranks";
import { getLeaderboardRank } from "@/lib/rating";
import { getTopicMastery, programMastery } from "@/lib/mastery";
import { LIEN_DEFAUT, STATS_VIDES, STYLE_DEFAUT, styleDepuis, type LienProfil, type NomProfil, type ProfilStats, type StyleProfil, type Visibilite } from "@/lib/profil/catalogue";

// Le profil de joueur, côté serveur : ses exploits (de quoi débloquer les
// pièces), son style, son LinkedIn (filtré par la base selon la visibilité),
// ses amis et ses demandes. Tout se replie proprement tant que
// migration_profil.sql n'est pas appliquée (style par défaut, pas d'amis).
// Les exploits d'un autre joueur se lisent avec le client admin (comme le
// classement) ; jamais ses réponses. Module serveur.

function admin(): SupabaseClient | null {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

const compte = async (run: () => PromiseLike<{ count: number | null; error: unknown }>) => {
  try {
    const { count, error } = await run();
    return error ? 0 : (count ?? 0);
  } catch {
    return 0;
  }
};

/** Plus longue série et série en cours, d'après les jours actifs (AAAA-MM-JJ). */
export function series(jours: string[], aujourdhui: string): { meilleure: number; enCours: number } {
  const set = new Set(jours);
  let meilleure = 0;
  for (const d of set) {
    if (set.has(decaleJour(d, -1))) continue; // pas un début de série
    let n = 1;
    while (set.has(decaleJour(d, n))) n++;
    meilleure = Math.max(meilleure, n);
  }
  let fin = set.has(aujourdhui) ? aujourdhui : decaleJour(aujourdhui, -1);
  let enCours = 0;
  while (set.has(fin)) {
    enCours++;
    fin = decaleJour(fin, -1);
  }
  return { meilleure, enCours };
}

/** Les exploits d'un joueur (une lecture par requête). */
export const statsProfil = cache(async (userId: string, fallback: SupabaseClient): Promise<ProfilStats> => {
  const sb = admin() ?? fallback;
  const aujourdhui = jourParis();
  try {
    const [jours, jour, duelsJoues, duelsGagnes, defisRendus, calculsJustes, examensBlancs, profil, rating, maxElo, place, topics] = await Promise.all([
      joursAvant(userId, aujourdhui).catch(() => [] as { day: string; n: number }[]),
      chargerTraitsDuJour(sb, userId, 3000).catch(() => null),
      compte(() => sb.from("duels").select("id", { count: "exact", head: true }).or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`).eq("status", "finished")),
      compte(() => sb.from("duels").select("id", { count: "exact", head: true }).eq("winner_id", userId).eq("status", "finished")),
      compte(() => sb.from("daily_attempts").select("day", { count: "exact", head: true }).eq("user_id", userId).not("finished_at", "is", null)),
      compte(() => sb.from("calc_attempts").select("question_id", { count: "exact", head: true }).eq("user_id", userId).eq("correct", true)),
      compte(() => sb.from("mock_exam_results").select("exam_id", { count: "exact", head: true }).eq("user_id", userId)),
      sb.from("profiles").select("xp_total").eq("id", userId).maybeSingle(),
      sb.from("ratings").select("elo").eq("user_id", userId).maybeSingle(),
      sb.from("rating_events").select("elo_after").eq("user_id", userId).order("elo_after", { ascending: false }).limit(1).maybeSingle(),
      getLeaderboardRank(sb, userId).catch(() => null),
      getTopicMastery(sb, userId).catch(() => []),
    ]);
    const actifs = [...jours.filter((j) => j.n > 0).map((j) => j.day), ...((jour ?? 0) > 0 ? [aujourdhui] : [])];
    const { meilleure, enCours } = series(actifs, aujourdhui);
    const mastery = topics.length ? programMastery(topics) : null;
    const elo = Number((rating.data as { elo?: number } | null)?.elo ?? DEFAULT_ELO);
    const top = Number((maxElo.data as { elo_after?: number } | null)?.elo_after ?? elo);
    const actuel = rankFor(elo, mastery, place).tierIndex;
    const meilleur = Math.max(actuel, rankFor(Math.max(elo, top), mastery, place).tierIndex);
    return {
      questions: jours.reduce((s, j) => s + j.n, 0) + (jour ?? 0),
      meilleureSerie: meilleure,
      serie: enCours,
      duelsGagnes,
      duelsJoues,
      defisRendus,
      calculsJustes,
      examensBlancs,
      niveau: levelInfoFromXp(Number((profil.data as { xp_total?: number } | null)?.xp_total ?? 0) || 0).level,
      palier: actuel,
      palierMax: meilleur,
      top10: actuel === TOP_TIER,
      matieres: topics.map((t) => ({ key: t.key, pct: t.pct, answered: t.answered })),
    };
  } catch {
    return STATS_VIDES;
  }
});

/** Le style d'un joueur ; `disponible` : false tant que la migration manque. */
export async function lireStyle(sb: SupabaseClient, userId: string): Promise<{ style: StyleProfil; disponible: boolean }> {
  try {
    const { data, error } = await sb.from("profile_style").select("banner,banner_url,banner_pos,accent,frame,showcase,show_radar,bio").eq("user_id", userId).maybeSingle();
    if (error) return { style: STYLE_DEFAUT, disponible: false };
    return { style: styleDepuis(data as Record<string, unknown> | null), disponible: true };
  } catch {
    return { style: STYLE_DEFAUT, disponible: false };
  }
}

/**
 * Le LinkedIn d'un joueur tel que `sb` a le droit de le voir (la base filtre
 * selon la visibilité) ; null s'il n'est pas visible, ou absent.
 */
export async function lireLien(sb: SupabaseClient, userId: string): Promise<LienProfil | null> {
  try {
    const { data, error } = await sb.from("profile_links").select("linkedin_url,linkedin_visibility").eq("user_id", userId).maybeSingle();
    if (error || !data) return null;
    const r = data as { linkedin_url: string | null; linkedin_visibility: Visibilite };
    return { linkedin: r.linkedin_url, visibilite: r.linkedin_visibility ?? LIEN_DEFAUT.visibilite };
  } catch {
    return null;
  }
}

/** Le prénom et nom d'un joueur tel que `sb` a le droit de le voir (filtré par la base) ; null sinon. */
export async function lireNom(sb: SupabaseClient, userId: string): Promise<NomProfil | null> {
  try {
    const { data, error } = await sb.from("profile_names").select("full_name,visibility").eq("user_id", userId).maybeSingle();
    if (error || !data) return null;
    const r = data as { full_name: string; visibility: "public" | "friends" };
    return { nom: r.full_name, visibilite: r.visibility === "public" ? "public" : "friends" };
  } catch {
    return null;
  }
}

export type Relation = "moi" | "aucune" | "envoyee" | "recue" | "amis";

/** Ma relation avec un joueur ; null tant que la migration manque. */
export async function relationAvec(sb: SupabaseClient, moi: string, autre: string): Promise<Relation | null> {
  if (moi === autre) return "moi";
  try {
    const { data, error } = await sb
      .from("friendships")
      .select("requester,addressee,status")
      .or(`and(requester.eq.${moi},addressee.eq.${autre}),and(requester.eq.${autre},addressee.eq.${moi})`)
      .maybeSingle();
    if (error) return null;
    if (!data) return "aucune";
    const r = data as { requester: string; status: string };
    return r.status === "accepted" ? "amis" : r.requester === moi ? "envoyee" : "recue";
  } catch {
    return null;
  }
}

export type AmiLite = { id: string; name: string; avatarUrl: string | null };

async function profilsDe(sb: SupabaseClient, ids: string[]): Promise<AmiLite[]> {
  if (!ids.length) return [];
  const { data } = await sb.from("profiles").select("id,username,avatar_url").in("id", ids);
  const byId = new Map(((data ?? []) as { id: string; username: string | null; avatar_url: string | null }[]).map((p) => [p.id, p]));
  return ids.map((id) => ({ id, name: byId.get(id)?.username || "Joueur", avatarUrl: byId.get(id)?.avatar_url ?? null }));
}

/** Les amis d'un joueur (client admin : la liste d'un autre joueur n'est pas lisible autrement). */
export async function amisDe(userId: string, fallback: SupabaseClient, limit = 60): Promise<{ amis: AmiLite[]; total: number } | null> {
  const sb = admin() ?? fallback;
  try {
    const { data, error } = await sb
      .from("friendships")
      .select("requester,addressee,responded_at")
      .eq("status", "accepted")
      .or(`requester.eq.${userId},addressee.eq.${userId}`)
      .order("responded_at", { ascending: false })
      .limit(500);
    if (error) return null;
    const ids = ((data ?? []) as { requester: string; addressee: string }[]).map((r) => (r.requester === userId ? r.addressee : r.requester));
    return { amis: await profilsDe(sb, ids.slice(0, limit)), total: ids.length };
  } catch {
    return null;
  }
}

/** Les demandes reçues (les plus récentes d'abord) et le nombre de demandes envoyées en attente. */
export async function demandesDe(sb: SupabaseClient, moi: string): Promise<{ recues: AmiLite[]; envoyees: AmiLite[] } | null> {
  try {
    const { data, error } = await sb
      .from("friendships")
      .select("requester,addressee,created_at")
      .eq("status", "pending")
      .or(`requester.eq.${moi},addressee.eq.${moi}`)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return null;
    const rows = (data ?? []) as { requester: string; addressee: string }[];
    const [recues, envoyees] = await Promise.all([
      profilsDe(sb, rows.filter((r) => r.addressee === moi).map((r) => r.requester)),
      profilsDe(sb, rows.filter((r) => r.requester === moi).map((r) => r.addressee)),
    ]);
    return { recues, envoyees };
  } catch {
    return null;
  }
}
