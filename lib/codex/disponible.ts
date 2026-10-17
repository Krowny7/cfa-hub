// Le Codex est-il en place côté base (migration_codex.sql collée) ? Une
// sonde légère, gardée en mémoire (10 min si oui, 30 s si non : on réessaie
// vite après que l'utilisateur a collé le SQL). Sert à la barre de navigation
// et au dévoilement : sans la migration, tout est montré et le sceau des
// quêtes n'est pas proposé. Ne lève jamais. Module serveur.

import { createAdminClient } from "@/lib/supabase/admin";

let memo: { at: number; ok: boolean } | null = null;

export async function codexDisponible(): Promise<boolean> {
  if (memo && Date.now() - memo.at < (memo.ok ? 10 * 60_000 : 30_000)) return memo.ok;
  let ok = false;
  try {
    const { error } = await createAdminClient().from("codex_joueur").select("user_id").limit(1);
    ok = !error;
  } catch {
    ok = false;
  }
  memo = { at: Date.now(), ok };
  return ok;
}
