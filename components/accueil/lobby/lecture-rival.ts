import type { SupabaseClient } from "@supabase/supabase-js";
import { parisMidnight } from "@/components/adn/AnneauDuJourData";
import { lireRival } from "@/components/classement/rival";
import { joursAvant } from "@/lib/objectif";
import { decaleJour } from "@/lib/objectif-calc";
import { lireStyle, relationAvec, statsProfil } from "@/lib/profil/donnees";
import { lireTempsSite } from "@/lib/temps-site";
import { RIV } from "@/lib/voice-accueil-lobby-rival";
import {
  COTE_VIDE,
  coteSemaine,
  construireRival,
  dejaRelance,
  debutFenetre,
  journalOuvertPour,
  momentDe,
  prenomDe,
  recueDe,
  type CoteSemaine,
  type LigneRelance,
} from "./modele-rival";
import type { CtxLecture, RivalLobby } from "./types";

// « Ton rival » de l'accueil, côté serveur (lot 3). Le rival est celui du
// classement (components/classement/rival.ts : le joueur le plus croisé, lu avec
// le client admin) ; sans clé de service, ou sans rencontre, la carte est
// absente (null). Pour toi et pour lui, sur les sept derniers jours glissants :
//   - traits et jours actifs : lib/objectif.ts (joursAvant, mis en cache un jour)
//     et les questions d'aujourd'hui lues par statsProfil, SEULEMENT si son
//     Journal t'est ouvert (la règle de son profil) ;
//   - temps sur le site : temps_site_resume (lib/temps-site.ts), qui rend null
//     tant qu'il n'a pas posé la tuile ; la ligne est alors omise ;
//   - série d'encre : statsProfil (celle de son profil) ;
//   - duels : ceux qu'il a terminés dans la fenêtre (table duels, client admin).
// Les relances viennent de la table `relances` (migration_accueil.sql) : sans
// elle, le bouton « Relancer » n'apparaît pas et le reste de la carte marche.
// Chaque lecture qui échoue laisse son champ à null : jamais d'exception. Les
// calculs sont dans modele-rival.ts.

/** Les duels terminés dans la fenêtre par un joueur, challenger ou adversaire (client admin). null : lecture impossible. */
async function duelsDepuis(admin: SupabaseClient, id: string, debutIso: string): Promise<number | null> {
  try {
    const { count, error } = await admin
      .from("duels")
      .select("id", { count: "exact", head: true })
      .eq("status", "finished")
      .gte("finished_at", debutIso)
      .or(`challenger_id.eq.${id},opponent_id.eq.${id}`);
    return error ? null : (count ?? 0);
  } catch {
    return null;
  }
}

/** Les relances d'hier et d'aujourd'hui où tu es l'expéditeur ou le destinataire (la RLS te les montre toutes). `dispo` : la table existe et se lit. */
export async function lireRelances(sb: SupabaseClient, moi: string, jour: string): Promise<{ dispo: boolean; lignes: LigneRelance[] }> {
  try {
    const { data, error } = await sb
      .from("relances")
      .select("de,a,jour,cree_le")
      .or(`de.eq.${moi},a.eq.${moi}`)
      .gte("jour", decaleJour(jour, -1))
      .order("cree_le", { ascending: false })
      .limit(60);
    if (error) return { dispo: false, lignes: [] };
    const lignes = ((data ?? []) as Partial<LigneRelance>[])
      .filter((l): l is LigneRelance => !!l && typeof l.de === "string" && typeof l.a === "string" && typeof l.jour === "string" && typeof l.cree_le === "string")
      .map((l) => ({ de: l.de, a: l.a, jour: l.jour.slice(0, 10), cree_le: l.cree_le }));
    return { dispo: true, lignes };
  } catch {
    return { dispo: false, lignes: [] };
  }
}

/** Le pseudo d'un joueur (profiles.username), ou null. */
async function pseudoDe(sb: SupabaseClient, id: string): Promise<string | null> {
  try {
    const { data } = await sb.from("profiles").select("username").eq("id", id).maybeSingle();
    const p = (data as { username?: string | null } | null)?.username?.trim();
    return p || null;
  } catch {
    return null;
  }
}

/** Ce qui se compare d'un joueur : ses 7 jours, sa série, son temps et ses duels. `ouvert` : ses traits et ses jours actifs te sont visibles. */
async function coteDe(ctx: CtxLecture, id: string, ouvert: boolean, debutIso: string): Promise<CoteSemaine> {
  const { sb, admin, jour } = ctx;
  try {
    const [avant, stats, temps, duels] = await Promise.all([
      ouvert ? joursAvant(id, jour).catch(() => null) : Promise.resolve(null),
      statsProfil(id, sb).catch(() => null),
      lireTempsSite(sb, id).catch(() => null),
      admin ? duelsDepuis(admin, id, debutIso) : Promise.resolve(null),
    ]);
    return coteSemaine({ avant, duJour: stats?.duJour ?? 0, ouvert, temps: temps ? temps.semaine : null, serie: stats ? stats.serie : null, duels, jour });
  } catch {
    return COTE_VIDE;
  }
}

/**
 * La carte « Ton rival » : ton plus grand rival et l'activité comparée des
 * sept derniers jours, la relance (envoyée ou possible) et celle qu'il t'a
 * peut-être envoyée. null : pas de clé de service, rien joué ensemble, ou
 * lecture impossible (la carte est absente).
 */
export async function lireRivalActivite(ctx: CtxLecture): Promise<RivalLobby | null> {
  const { sb, admin, user, jour } = ctx;
  if (!admin) return null;
  try {
    const debutIso = parisMidnight(new Date(debutFenetre(jour) + "T12:00:00Z")).toISOString();
    // ce qui ne dépend pas du rival se lit pendant qu'on le cherche
    const [rival, moi, relances, pseudoMoi] = await Promise.all([lireRival(sb, admin, user.id), coteDe(ctx, user.id, true, debutIso), lireRelances(sb, user.id, jour), pseudoDe(sb, user.id)]);
    if (!rival) return null;
    const id = rival.userId;
    // son Journal t'est-il ouvert ? (illisible : fermé, par prudence)
    const [style, relation] = await Promise.all([lireStyle(sb, id).catch(() => null), relationAvec(sb, user.id, id).catch(() => null)]);
    const ouvert = style ? journalOuvertPour(style.journal, relation) : false;
    const lui = await coteDe(ctx, id, ouvert, debutIso);
    return construireRival({
      id,
      nom: rival.name,
      rencontres: rival.rencontres,
      victoiresMoi: rival.moi,
      victoiresLui: rival.lui,
      pseudoMoi,
      moi,
      lui,
      relance: { dispo: relances.dispo, envoyee: dejaRelance(relances.lignes, user.id, id, jour) },
      recue: recueDe(prenomDe(rival.name), relances.lignes, id, user.id, jour),
    });
  } catch {
    return null;
  }
}

/** Une relance reçue, d'aujourd'hui ou d'hier, avec le nom de son expéditeur et « ce matin », « hier »… (null si elle date d'avant). */
export type RelanceRecue = { de: string; nom: string; creeLe: string; quand: string };

/**
 * Toutes les relances que tu as reçues aujourd'hui ou hier, de n'importe quel
 * joueur : de quoi alimenter « Du nouveau » (le lot 6). null : la table manque
 * ou ne se lit pas ; [] : rien reçu.
 */
export async function lireRelancesRecues(ctx: CtxLecture): Promise<RelanceRecue[] | null> {
  const { sb, user, jour } = ctx;
  const { dispo, lignes } = await lireRelances(sb, user.id, jour);
  if (!dispo) return null;
  const recues = lignes.filter((l) => l.a === user.id && l.de !== user.id);
  if (!recues.length) return [];
  const ids = [...new Set(recues.map((l) => l.de))];
  const noms = new Map<string, string>();
  try {
    const { data } = await sb.from("profiles").select("id,username").in("id", ids);
    for (const p of (data ?? []) as { id: string; username: string | null }[]) if (p.username?.trim()) noms.set(p.id, p.username.trim());
  } catch {
    // sans nom : « Un joueur »
  }
  const out: RelanceRecue[] = [];
  for (const l of recues) {
    const quand = momentDe(l.cree_le, jour);
    if (quand) out.push({ de: l.de, nom: noms.get(l.de) ?? RIV.inconnu, creeLe: l.cree_le, quand });
  }
  return out;
}
