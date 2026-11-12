"use client";

import { Chiffre } from "@/components/ui/Decors";
import { SOUS_ENTRAINEMENT } from "@/lib/voice-entrainement-sous";
import { useCasBoucles } from "./avancement";

/** La colonne grise des cas pratiques : les dossiers bouclés sur le total (l'avancement vit dans le navigateur). */
export function OuEnEs({ cas }: { cas: { id: string; etapes: string[] }[] }) {
  const boucles = useCasBoucles(cas);
  return <Chiffre valeur={`${boucles} / ${cas.length}`} legende={SOUS_ENTRAINEMENT.cas.boucles(cas.length)} />;
}
