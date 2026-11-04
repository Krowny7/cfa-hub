// Les lectures de la mise en scène, avec le client du navigateur : ce qu'un
// joueur a réglé (profile_style et ratings sont lisibles par tous les joueurs
// connectés), jamais bloquantes. Sans la colonne profile_style.arene
// (migration_arene.sql), chacun garde les réglages de départ.

import type { SupabaseClient } from "@supabase/supabase-js";
import { rankFor } from "@/lib/ranks";
import { ARENE_VIDE, areneDepuis, type Arene } from "@/lib/arene/perso";

export type JoueurArene = {
  id: string;
  pseudo: string;
  photo: string | null;
  /** « Platine II » ; null : ELO inconnu */
  rang: string | null;
  elo: number | null;
  arene: Arene;
};

/** La colonne ou la table manque : la base dit qu'elle ne la connaît pas. */
export const colonneAbsente = (e: { code?: string; message?: string } | null | undefined): boolean => !!e && (e.code === "42703" || e.code === "PGRST204" || /does not exist|schema cache/i.test(e.message ?? ""));

/** « Platine II », « Top 10 ». */
export function libelleRang(elo: number, maitrise: number | null = null, place: number | null = null): string {
  const r = rankFor(elo, maitrise, place);
  return r.division ? `${r.tier.name} ${r.division}` : r.tier.name;
}

/** Un joueur tel que le dessinent les bannières. */
export function joueurArene(j: { id: string; pseudo: string; photo: string | null; elo: number | null; maitrise?: number | null; place?: number | null }, arene: Arene): JoueurArene {
  return { id: j.id, pseudo: j.pseudo, photo: j.photo, elo: j.elo, rang: j.elo === null ? null : libelleRang(j.elo, j.maitrise ?? null, j.place ?? null), arene };
}

/** Les réglages des joueurs demandés ; un joueur sans ligne n'a pas d'entrée, et une erreur rend une liste vide. */
export async function lireArene(sb: SupabaseClient, ids: string[]): Promise<Map<string, Arene>> {
  const out = new Map<string, Arene>();
  try {
    const { data, error } = await sb.from("profile_style").select("user_id,arene").in("user_id", ids);
    if (error || !Array.isArray(data)) return out;
    for (const r of data as unknown as { user_id: string; arene: unknown }[]) out.set(r.user_id, areneDepuis(r.arene));
  } catch {
    // réseau : les réglages de départ
  }
  return out;
}

/** L'ELO des joueurs demandés (un joueur qui n'a jamais joué n'a pas d'entrée) ; null : lecture impossible. */
export async function lireElos(sb: SupabaseClient, ids: string[]): Promise<Map<string, number> | null> {
  try {
    const { data, error } = await sb.from("ratings").select("user_id,elo").in("user_id", ids);
    if (error || !Array.isArray(data)) return null;
    return new Map((data as unknown as { user_id: string; elo: number }[]).map((r) => [r.user_id, Number(r.elo)]));
  } catch {
    return null;
  }
}

/** Le joueur connecté : pseudo et photo ; null s'ils manquent. */
export async function lireMoi(sb: SupabaseClient): Promise<{ id: string; pseudo: string; photo: string | null } | null> {
  try {
    const { data: auth } = await sb.auth.getUser();
    if (!auth.user) return null;
    const { data } = await sb.from("profiles").select("username,avatar_url").eq("id", auth.user.id).maybeSingle();
    const p = data as unknown as { username: string | null; avatar_url: string | null } | null;
    return p?.username ? { id: auth.user.id, pseudo: p.username, photo: p.avatar_url } : null;
  } catch {
    return null;
  }
}

/** Ses propres réglages, pour Personnaliser ; `dispo` est faux seulement quand la base dit que la colonne manque. */
export async function lireReglages(sb: SupabaseClient, id: string): Promise<{ dispo: boolean; arene: Arene }> {
  try {
    const { data, error } = await sb.from("profile_style").select("arene").eq("user_id", id).maybeSingle();
    if (error) return { dispo: !colonneAbsente(error), arene: ARENE_VIDE };
    return { dispo: true, arene: areneDepuis((data as unknown as { arene: unknown } | null)?.arene) };
  } catch {
    return { dispo: true, arene: ARENE_VIDE };
  }
}
