"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/browser";

// Note la visite du profil d'un autre joueur (rl_visiter : une par jour, un
// jour sans heure). Dans le navigateur seulement, une fois la page montée :
// ni un préchargement, ni l'aperçu « voir comme les autres » (la page ne le
// rend pas là), ni son propre profil (la base l'ignore). Sans la migration,
// l'appel échoue en silence. Ne rend rien.

export function Visite({ pour }: { pour: string }) {
  useEffect(() => {
    // le constructeur de requêtes est paresseux : il faut l'attendre pour qu'il parte
    createClient()
      .rpc("rl_visiter", { p_pour: pour })
      .then(
        () => undefined,
        () => undefined,
      );
  }, [pour]);
  return null;
}
