"use client";

import { useEffect } from "react";
import { signalerLeonard, type EvenementLeonard } from "@/lib/leonard/signal";

/** Pour une page rendue au serveur : envoie un signal à Léonard au montage (une fois par `cle`). */
export function SignalLeonard({ evt, vars, cle, delai }: { evt: EvenementLeonard; vars?: Record<string, string | number>; cle: string; delai?: number }) {
  useEffect(() => {
    signalerLeonard({ evt, vars, delai }, cle);
  }, [evt, vars, cle, delai]);
  return null;
}
