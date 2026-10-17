"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Le mode sobre (V3 §11.5), réglé dans Moi › Réglages : une seule clé du
// compte, user_metadata.rl_sobre (true : sobre ; false : comme d'habitude),
// lue partout ailleurs (le Codex masque les « +n XP », les pièces et les
// grandes fêtes ; Léonard ne passe plus de lui-même). Rien d'autre n'est
// touché dans les métadonnées.

export type ResultatSobre = { ok: true; sobre: boolean } | { ok: false; erreur: string };

export async function reglerSobre(sobre: boolean): Promise<ResultatSobre> {
  if (typeof sobre !== "boolean") return { ok: false, erreur: "Réglage inconnu." };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, erreur: "Connecte-toi pour changer ce réglage." };
  try {
    const { error } = await supabase.auth.updateUser({ data: { rl_sobre: sobre } });
    if (error) return { ok: false, erreur: "Réglage impossible, réessaie dans un instant." };
  } catch {
    return { ok: false, erreur: "Réglage impossible, réessaie dans un instant." };
  }
  revalidatePath("/", "layout");
  return { ok: true, sobre };
}
