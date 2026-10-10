"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { statsProfil } from "@/lib/profil/donnees";
import { marquerVus, recalculerSceaux, sceauxDuJoueur } from "@/lib/profil/sceaux-base";
import type { Visibilite } from "@/lib/profil/catalogue";

// Les gestes du joueur sur ses Sceaux (migration_profil_sceaux.sql), tous
// vérifiés ici et écrits par le client service role (les joueurs n'écrivent
// ni profile_style ni sceaux eux-mêmes) :
// - poser jusqu'à 3 sceaux gagnés dans l'en-tête de son profil ;
// - régler qui voit son Journal ;
// - en fin de session : recalculer ses sceaux et rendre ceux à fêter, puis
//   les marquer fêtés une fois la cérémonie jouée.
// Sans la migration : refus propre (« indisponible »), rien ne casse.

async function joueur() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}

function adminOuNull() {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

export type ResultatSceaux = { ok: true } | { ok: false; raison: "connexion" | "indisponible" | "refus" | "erreur" };

/** Poser ces sceaux (3 au plus, gagnés) dans l'en-tête ; une liste vide rend le choix d'office. */
export async function poserSceaux(cles: string[]): Promise<ResultatSceaux> {
  const { supabase, user } = await joueur();
  if (!user) return { ok: false, raison: "connexion" };
  const admin = adminOuNull();
  if (!admin) return { ok: false, raison: "indisponible" };
  const liste = [...new Set((Array.isArray(cles) ? cles : []).filter((c) => typeof c === "string"))];
  if (liste.length > 3) return { ok: false, raison: "refus" };
  const { etats, base } = await sceauxDuJoueur(user.id, await statsProfil(user.id, supabase));
  if (!base) return { ok: false, raison: "indisponible" };
  if (!liste.every((c) => etats.some((e) => e.def.cle === c && e.palier > 0))) return { ok: false, raison: "refus" };
  const { error } = await admin.from("profile_style").upsert({ user_id: user.id, pins: liste, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return { ok: false, raison: /pins|column|schema cache/i.test(error.message) ? "indisponible" : "erreur" };
  revalidatePath(`/people/${user.id}`);
  return { ok: true };
}

/** Qui voit mon Journal : tous, mes amis, moi seul. */
export async function reglerJournal(visibilite: Visibilite): Promise<ResultatSceaux> {
  const { user } = await joueur();
  if (!user) return { ok: false, raison: "connexion" };
  if (!["public", "friends", "private"].includes(visibilite)) return { ok: false, raison: "refus" };
  const admin = adminOuNull();
  if (!admin) return { ok: false, raison: "indisponible" };
  const { error } = await admin.from("profile_style").upsert({ user_id: user.id, journal_visibility: visibilite, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return { ok: false, raison: /journal_visibility|column|schema cache/i.test(error.message) ? "indisponible" : "erreur" };
  revalidatePath(`/people/${user.id}`);
  return { ok: true };
}

export type SceauAFeter = { cle: string; palier: 1 | 2 | 3 };

/**
 * Fin de session : recalcule mes sceaux tout de suite (sans attendre les
 * 10 min ; au plus toutes les 30 s) et rend ceux que la cérémonie n'a pas
 * encore fêtés, les plus hauts paliers d'abord. Rien sans la base, ni hors
 * connexion.
 */
export async function sceauxAFeter(): Promise<{ id: string; sceaux: SceauAFeter[] } | null> {
  const { supabase, user } = await joueur();
  if (!user) return null;
  const gardes = await recalculerSceaux(user.id, () => statsProfil(user.id, supabase));
  if (!gardes) return null;
  const sceaux = gardes
    .filter((g) => !g.vu)
    .sort((a, b) => b.palier - a.palier || a.cle.localeCompare(b.cle))
    .map((g): SceauAFeter => ({ cle: g.cle, palier: g.palier as 1 | 2 | 3 }));
  return { id: user.id, sceaux };
}

/** La cérémonie a été jouée : ces sceaux ne se fêtent plus. */
export async function sceauxFetes(cles: string[]): Promise<boolean> {
  const { user } = await joueur();
  if (!user || !Array.isArray(cles)) return false;
  return marquerVus(user.id, cles.filter((c) => typeof c === "string"));
}
