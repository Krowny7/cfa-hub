"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { signalerPresence } from "@/lib/salles/api";
import { createClient } from "@/lib/supabase/browser";

// Qui est vraiment sur la page d'une salle. La page signale sa présence toutes les 20 secondes
// et reçoit en retour la liste des présents (migration_salles_presence.sql). En quittant la
// page, on prévient tout de suite ; sinon on disparaît seul au bout de 90 secondes. Le tout
// reste à côté de la partie : si un signal échoue, rien d'autre ne bouge.

const BATTEMENT_MS = 20000;

/** `null` : on ne sait pas encore, et tout le monde reste affiché. */
export const PresentsContext = createContext<ReadonlySet<string> | null>(null);

export const usePresents = () => useContext(PresentsContext);

export function useSuiviPresence(salleId: string, nbMembres: number): ReadonlySet<string> | null {
  const [presents, setPresents] = useState<ReadonlySet<string> | null>(null);
  const client = useRef<SupabaseClient | null>(null);
  const battre = useRef<() => void>(() => undefined);

  useEffect(() => {
    const sb = (client.current ??= createClient());
    let fini = false;
    battre.current = () => {
      signalerPresence(sb, salleId)
        .then((ids) => {
          if (!fini) setPresents(new Set(ids));
        })
        .catch(() => undefined);
    };
    battre.current();
    const minuteur = setInterval(() => battre.current(), BATTEMENT_MS);
    const partir = () => {
      signalerPresence(sb, salleId, true).catch(() => undefined);
    };
    window.addEventListener("pagehide", partir);
    return () => {
      fini = true;
      clearInterval(minuteur);
      window.removeEventListener("pagehide", partir);
      partir();
    };
  }, [salleId]);

  // quelqu'un vient d'entrer : on relit sans attendre le prochain battement
  useEffect(() => {
    battre.current();
  }, [nbMembres]);

  return presents;
}
