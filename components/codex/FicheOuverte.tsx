"use client";

import { useEffect } from "react";
import { codexNoter } from "@/lib/codex/actions";

// Note l'ouverture d'une fiche sans drill (Derivatives) pour le Codex :
// « fiche_ouverte ». Silencieux : sans la migration, ou hors connexion, rien.
// Une fois par visite de la page.
export function FicheOuverte({ matiere, fiche }: { matiere: string; fiche: string }) {
  useEffect(() => {
    codexNoter("fiche_ouverte", { matiere, fiche }).catch(() => undefined);
  }, [matiere, fiche]);
  return null;
}
