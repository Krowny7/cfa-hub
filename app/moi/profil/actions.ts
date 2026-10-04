"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { statsProfil } from "@/lib/profil/donnees";
import { normaliserLinkedin, validerStyle, type StyleProfil, type Visibilite } from "@/lib/profil/catalogue";

// Enregistrer son profil : le style (revalidé : seules les pièces débloquées
// passent) et le LinkedIn (adresse linkedin.com/in normalisée, visibilité).
// Écriture par le client service role : les joueurs n'ont pas le droit
// d'écrire ces tables eux-mêmes (migration_profil.sql).

export type EnregistrerResultat =
  | { ok: true; style: StyleProfil; refus: string[] }
  | { ok: false; erreur: string };

const VISIBILITES: Visibilite[] = ["public", "friends", "private"];

export async function enregistrerProfil(input: { style: Partial<StyleProfil>; linkedin: string; visibilite: Visibilite }): Promise<EnregistrerResultat> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { ok: false, erreur: "Connecte-toi pour enregistrer ton profil." };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { ok: false, erreur: "Enregistrement indisponible pour le moment." };
  }

  const linkedin = input.linkedin.trim() ? normaliserLinkedin(input.linkedin) : null;
  if (input.linkedin.trim() && !linkedin) return { ok: false, erreur: "Adresse LinkedIn non reconnue : colle le lien de ton profil (linkedin.com/in/…)." };
  const visibilite = VISIBILITES.includes(input.visibilite) ? input.visibilite : "friends";

  const stats = await statsProfil(user.id, supabase);
  const { style, refus } = validerStyle(input.style ?? {}, stats);

  const now = new Date().toISOString();
  const s = await admin.from("profile_style").upsert({ user_id: user.id, ...style, updated_at: now }, { onConflict: "user_id" });
  if (s.error) {
    return {
      ok: false,
      erreur: /does not exist|schema cache/i.test(s.error.message) ? "La personnalisation arrive bientôt : la base n'est pas encore prête." : "Enregistrement impossible, réessaie dans un instant.",
    };
  }
  const l = await admin.from("profile_links").upsert({ user_id: user.id, linkedin_url: linkedin, linkedin_visibility: visibilite, updated_at: now }, { onConflict: "user_id" });
  if (l.error) return { ok: false, erreur: "Ton style est enregistré, mais pas ton LinkedIn. Réessaie dans un instant." };

  revalidatePath(`/people/${user.id}`);
  revalidatePath("/moi/profil");
  return { ok: true, style, refus };
}
