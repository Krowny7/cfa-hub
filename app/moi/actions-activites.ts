"use server";

import { tryAdmin } from "@/components/classement/data";
import { texteRatures, type RatureACopier } from "@/lib/activites";
import { raturesUniques } from "@/lib/notions-similaires";
import { createClient } from "@/lib/supabase/server";
import { ACTIVITES } from "@/lib/voice-moi";

// Moi › Activités › « Copier les ratures » : le texte des questions ratées d'une sélection.
// Lu dans le carnet du joueur (table ratures, migration_ratures.sql), jamais dans la banque :
// seules ses propres ratures, déjà corrigées à l'écran (visible_from passé), en sortent.

export type ResultatCopie = { ok: true; texte: string; n: number } | { ok: false; erreur: string };

/** Au-delà, le texte devient trop long pour être collé quelque part. */
const MAX_COPIE = 120;

export async function copierRatures(ids: string[], selection: string): Promise<ResultatCopie> {
  const voulues = raturesUniques(Array.isArray(ids) ? ids : []).slice(0, MAX_COPIE);
  if (voulues.length === 0) return { ok: false, erreur: ACTIVITES.copieVide };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, erreur: ACTIVITES.copieKo };
  const admin = tryAdmin();
  if (!admin) return { ok: false, erreur: ACTIVITES.copieKo };
  const { data, error } = await admin
    .from("ratures")
    .select("question_id,prompt,choices,correct_index,explanation,last_selected,set_title")
    .eq("user_id", auth.user.id)
    .in("question_id", voulues)
    .lte("visible_from", new Date().toISOString());
  if (error) return { ok: false, erreur: ACTIVITES.copieKo };
  type Ligne = { question_id: string; prompt: string; choices: string[] | null; correct_index: number | null; explanation: string | null; last_selected: number | null; set_title: string | null };
  const parId = new Map(((data ?? []) as Ligne[]).map((r) => [r.question_id, r]));
  const items: RatureACopier[] = voulues.flatMap((id) => {
    const r = parId.get(id);
    return r ? [{ prompt: r.prompt, choices: r.choices ?? [], correctIndex: r.correct_index, explanation: r.explanation, lastSelected: r.last_selected, setTitle: r.set_title }] : [];
  });
  if (items.length === 0) return { ok: false, erreur: ACTIVITES.copieVide };
  return { ok: true, texte: texteRatures(ACTIVITES.copieTitre(String(selection).slice(0, 80), items.length), items), n: items.length };
}
