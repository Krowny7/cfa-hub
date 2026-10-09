"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { lireStyle, statsProfil } from "@/lib/profil/donnees";
import { sceauxDuJoueur } from "@/lib/profil/sceaux-base";
import { acquisDe, nettoyerNom, normaliserLinkedin, validerStyle, type StyleProfil, type Visibilite } from "@/lib/profil/catalogue";
import { BUCKET_MEDIAS, BUCKET_VIDEOS, blocsDe, estMedia } from "@/lib/profil/disposition";

// Enregistrer son profil : le style (revalidé : cadres et bannières gagnés,
// ou déjà portés, seulement ; image de bannière et médias venus de son
// dossier ; la disposition des blocs), le LinkedIn (adresse
// linkedin.com/in normalisée, visibilité) et le prénom et nom (visibilité).
// Écriture par le client service role : les joueurs n'ont pas le droit
// d'écrire ces tables eux-mêmes (migration_profil.sql).

export type EnregistrerResultat =
  | { ok: true; style: StyleProfil; refus: string[] }
  | { ok: false; erreur: string };

const VISIBILITES: Visibilite[] = ["public", "friends", "private"];

export async function enregistrerProfil(input: {
  style: Partial<StyleProfil>;
  linkedin: string;
  visibilite: Visibilite;
  nom: string;
  nomVisibilite: "public" | "friends";
}): Promise<EnregistrerResultat> {
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

  // ce qui ouvre les pièces gagnées : questions, pic, sceaux ; et ce qu'il porte déjà (on ne reprend rien)
  const stats = await statsProfil(user.id, supabase);
  const [{ etats }, { style: porte }] = await Promise.all([sceauxDuJoueur(user.id, stats, supabase), lireStyle(admin, user.id)]);
  // l'image de bannière doit venir du dossier du joueur dans le stockage
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/[/]+$/, "");
  const prefixe = base ? `${base}/storage/v1/object/public/avatars/${user.id}/` : null;
  const dossier = (bucket: string) => `${base}/storage/v1/object/public/${bucket}/${user.id}/`;
  const prefixesMedias = base ? { images: dossier(BUCKET_MEDIAS), videos: dossier(BUCKET_VIDEOS) } : null;
  const { style, refus } = validerStyle(input.style ?? {}, acquisDe(stats, etats), prefixe, prefixesMedias, porte);

  const now = new Date().toISOString();
  const ligne = {
    user_id: user.id,
    banner: style.banner,
    banner_url: style.bannerUrl,
    banner_pos: style.bannerPos,
    accent: style.accent,
    frame: style.frame,
    showcase: style.showcase,
    show_radar: style.radar,
    bio: style.bio,
    updated_at: now,
  };
  let s = await admin.from("profile_style").upsert({ ...ligne, layout: style.disposition, ambiance: style.ambiance, banner_h: style.bannerH }, { onConflict: "user_id" });
  const dispositionOk = !s.error;
  // disposition, ambiance et hauteur de bannière arrivent avec
  // migration_profil_medias.sql : sans elles, le reste
  if (s.error && /layout|ambiance|banner_h|column|schema cache/i.test(s.error.message)) {
    s = await admin.from("profile_style").upsert(ligne, { onConflict: "user_id" });
    if (!s.error) refus.push("la disposition et l'ambiance (la base n'est pas encore prête)");
  }
  if (s.error) {
    return {
      ok: false,
      erreur: /does not exist|schema cache/i.test(s.error.message) ? "La personnalisation arrive bientôt : la base n'est pas encore prête." : "Enregistrement impossible, réessaie dans un instant.",
    };
  }
  const l = await admin.from("profile_links").upsert({ user_id: user.id, linkedin_url: linkedin, linkedin_visibility: visibilite, updated_at: now }, { onConflict: "user_id" });
  if (l.error) return { ok: false, erreur: "Ton style est enregistré, mais pas ton LinkedIn. Réessaie dans un instant." };

  // prénom et nom : enregistrés s'ils sont remplis, effacés sinon
  const nom = nettoyerNom(input.nom);
  const n = nom
    ? await admin.from("profile_names").upsert({ user_id: user.id, full_name: nom, visibility: input.nomVisibilite === "public" ? "public" : "friends", updated_at: now }, { onConflict: "user_id" })
    : await admin.from("profile_names").delete().eq("user_id", user.id);
  if (n.error) return { ok: false, erreur: "Ton style est enregistré, mais pas ton prénom et nom. Réessaie dans un instant." };

  // ménage : les fichiers de ses dossiers (images, vidéos) que la page n'utilise plus
  if (dispositionOk) {
    const gardes = new Set(blocsDe(style.disposition).filter(estMedia).map((b) => b.url.split("/").pop()));
    for (const bucket of [BUCKET_MEDIAS, BUCKET_VIDEOS]) {
      try {
        const { data: objets } = await admin.storage.from(bucket).list(user.id, { limit: 100 });
        const inutiles = (objets ?? []).filter((o) => o.name && !gardes.has(o.name)).map((o) => `${user.id}/${o.name}`);
        if (inutiles.length) await admin.storage.from(bucket).remove(inutiles);
      } catch {
        // bucket pas encore créé : rien à ranger
      }
    }
  }

  revalidatePath(`/people/${user.id}`);
  return { ok: true, style, refus };
}
