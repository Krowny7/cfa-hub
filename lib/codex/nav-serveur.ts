// L'état de la navigation pour le compte connecté, lu sans toucher aux
// données de jeu : le dévoilement écrit dans le compte (user_metadata
// rl_codex), la date d'inscription, et la sonde « la migration est-elle
// collée ». Sans migration, ou hors connexion : tout est montré et l'onglet
// Codex n'est pas proposé. Un compte inscrit avant LANCEMENT_CODEX voit tout
// dès le premier jour. Module serveur.

import { cache } from "react";
import { getSessionUserWithProfile } from "@/lib/supabase/user";
import { codexDisponible } from "@/lib/codex/disponible";
import { LANCEMENT_CODEX, lireMetaCodex } from "@/lib/codex/moteur";
import type { EtatNav } from "@/components/nav/DevoileContext";

export const etatNavCodex = cache(async (): Promise<EtatNav> => {
  try {
    const { user } = await getSessionUserWithProfile();
    if (!user) return { devoile: "tout", codex: false };
    if (!(await codexDisponible())) return { devoile: "tout", codex: false };
    const meta = lireMetaCodex(user.user_metadata);
    if (meta.devoile === "tout") return { devoile: "tout", codex: true };
    if (user.created_at && Date.parse(user.created_at) < Date.parse(LANCEMENT_CODEX)) return { devoile: "tout", codex: true };
    return { devoile: meta.devoile, codex: true };
  } catch {
    return { devoile: "tout", codex: false };
  }
});
