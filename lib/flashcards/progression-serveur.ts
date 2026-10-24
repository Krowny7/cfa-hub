import type { SupabaseClient } from "@supabase/supabase-js";
import { CFA_SUBJECTS } from "@/components/ContentDetailHeader";
import { CLE_PROGRESSION, etatAEcrire, type LigneProgression } from "@/lib/flashcards/progression";

// La progression des flashcards en base (migration_flashcard_progress.sql),
// côté serveur, avec le client du joueur (RLS : chacun ses lignes). Lue par
// les pages (seulement les clés affichées), relue par la révision quand elle
// revient au premier plan (app/api/flashcards/progression, GET), écrite par
// app/flashcards/actions.ts et la même route (POST, balise de fermeture).
// Tant que la table n'existe pas, tout se tait : la lecture rend null (les
// pages ne proposent pas la synchronisation, la boucle reste sur l'appareil),
// l'écriture rend « absente » (le navigateur cesse d'essayer). L'absence est
// retenue quelques minutes par instance du serveur : une seule requête
// refusée, pas une par page vue.

const TABLE = "flashcard_progress";
const OUBLI_ABSENCE_MS = 3 * 60_000;
let absenteJusqua = 0;

type ErreurPg = { code?: string; message?: string } | null | undefined;

/** Table pas encore créée (Postgres ou PostgREST). */
export function tableAbsente(e: ErreurPg): boolean {
  if (!e) return false;
  return e.code === "42P01" || e.code === "PGRST205" || /relation .* does not exist|could not find the table/i.test(e.message ?? "");
}

function noterAbsence() {
  absenteJusqua = Date.now() + OUBLI_ABSENCE_MS;
}
const absenceConnue = () => Date.now() < absenteJusqua;

/** Une clé de boucle permise : « set:<uuid> » ou « matiere:<clé du programme> ». */
export function cleValide(cle: unknown): cle is string {
  if (typeof cle !== "string" || !CLE_PROGRESSION.test(cle)) return false;
  return cle.startsWith("set:") || CFA_SUBJECTS.some((s) => `matiere:${s.key}` === cle);
}

/**
 * Les boucles du joueur sur son compte, par clé (`cles` absent : toutes).
 * null : table absente ou base injoignable — pas de synchronisation.
 */
export async function lireProgressions(supabase: SupabaseClient, userId: string, cles?: string[]): Promise<Map<string, LigneProgression> | null> {
  if (absenceConnue()) return null;
  const valides = cles?.filter(cleValide);
  if (valides && !valides.length) return new Map();
  try {
    let q = supabase.from(TABLE).select("deck_key,state,updated_at").eq("user_id", userId);
    if (valides) q = q.in("deck_key", valides);
    const { data, error } = await q.limit(500);
    if (error) {
      if (tableAbsente(error)) noterAbsence();
      return null;
    }
    const out = new Map<string, LigneProgression>();
    for (const r of (data ?? []) as { deck_key: string; state: unknown; updated_at: string }[]) {
      const maj = Date.parse(r.updated_at);
      out.set(r.deck_key, { etat: r.state, maj: Number.isFinite(maj) ? maj : 0 });
    }
    return out;
  } catch {
    return null;
  }
}

export type ResultatEcriture =
  | { ok: true }
  /** le compte a une version plus récente que celle sur laquelle l'état s'appuie : la ligne n'a pas bougé, la voici (null : relecture ratée) */
  | { ok: false; raison: "conflit"; ligne: LigneProgression | null }
  | { ok: false; raison: "connexion" | "absente" | "refus" | "erreur" };

/**
 * Écrit (ou remplace) la boucle `cle` du joueur, après validation. La base
 * ignore un état bâti sur une version dépassée (déclencheur
 * flashcard_progress_horodater : écrite ailleurs depuis, ou envoi arrivé
 * après un plus récent) ; aucune ligne n'est alors rendue, et le compte est
 * relu pour le navigateur (« conflit »).
 */
export async function ecrireProgression(supabase: SupabaseClient, userId: string, cle: unknown, etat: unknown): Promise<ResultatEcriture> {
  if (!cleValide(cle)) return { ok: false, raison: "refus" };
  const propre = etatAEcrire(etat);
  if (!propre) return { ok: false, raison: "refus" };
  if (absenceConnue()) return { ok: false, raison: "absente" };
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .upsert({ user_id: userId, deck_key: cle, state: propre }, { onConflict: "user_id,deck_key" })
      .select("updated_at");
    if (!error && Array.isArray(data) && data.length === 0) {
      const lu = await lireProgressions(supabase, userId, [cle]);
      return { ok: false, raison: "conflit", ligne: lu?.get(cle) ?? null };
    }
    if (!error) return { ok: true };
    if (tableAbsente(error)) {
      noterAbsence();
      return { ok: false, raison: "absente" };
    }
    return { ok: false, raison: "erreur" };
  } catch {
    return { ok: false, raison: "erreur" };
  }
}
