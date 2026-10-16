"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { lireStyle, statsProfil } from "@/lib/profil/donnees";
import { sceauxDuJoueur } from "@/lib/profil/sceaux-base";
import { nettoyerNom, normaliserLinkedin, type StyleProfil, type Visibilite } from "@/lib/profil/catalogue";
import { lireAcquis } from "@/lib/profil/acquis";
import { ecrireStyle, validerStyle } from "@/lib/profil/styles";
import { BUCKET_MEDIAS, BUCKET_VIDEOS, blocsDe, estMedia } from "@/lib/profil/disposition";

// Enregistrer son profil : le style (revalidé : cadres, bannières, titre et
// folio gagnés, ou déjà portés, seulement ; image de bannière et médias
// venus de son dossier ; la disposition des blocs), le LinkedIn (adresse
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

  // ce qui ouvre les pièces gagnées : questions, pic, sceaux, quêtes du Codex,
  // trophées, programmes menés ; et ce qu'il porte déjà (on ne reprend rien)
  const stats = await statsProfil(user.id, supabase);
  const [{ etats }, { style: porte }, acquis] = await Promise.all([
    sceauxDuJoueur(user.id, stats),
    lireStyle(admin, user.id),
    lireAcquis(admin, user.id, { stats, sceaux: [], datesPic: [] }),
  ]);
  // l'image de bannière doit venir du dossier du joueur dans le stockage
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/[/]+$/, "");
  const prefixe = base ? `${base}/storage/v1/object/public/avatars/${user.id}/` : null;
  const dossier = (bucket: string) => `${base}/storage/v1/object/public/${bucket}/${user.id}/`;
  const prefixesMedias = base ? { images: dossier(BUCKET_MEDIAS), videos: dossier(BUCKET_VIDEOS) } : null;
  const valide = validerStyle(input.style ?? {}, { ...acquis, sceaux: etats }, prefixe, prefixesMedias, porte);
  const refus = valide.refus;
  let style = valide.style;

  const now = new Date().toISOString();
  // les colonnes les plus récentes se replient si la base ne les a pas encore (lib/profil/styles.ts)
  const s = await ecrireStyle(admin, user.id, style, now);
  const dispositionOk = s.disposition;
  if (!s.error) {
    // titre et folio (migration_v3_profil.sql) : ce qu'il porte ne change pas tant que la base manque
    if (!s.titreFolio) {
      if (style.titre !== porte.titre) refus.push("le titre (la base n'est pas encore prête)");
      if (style.folio !== porte.folio) refus.push("le folio (la base n'est pas encore prête)");
      style = { ...style, titre: porte.titre, folio: porte.folio };
    }
    // disposition, ambiance et hauteur de bannière (migration_profil_medias.sql)
    if (!s.disposition) refus.push("la disposition et l'ambiance (la base n'est pas encore prête)");
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
