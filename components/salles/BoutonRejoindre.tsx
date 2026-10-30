"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { messageErreurSalle, rejoindreSallePublique } from "@/lib/salles/api";
import { createClient } from "@/lib/supabase/browser";
import { SALLES } from "@/lib/voice-salles";
import s from "./Salles.module.css";

// « Rejoindre » d'une salle publique de la liste : rejoindre_salle_publique,
// puis on entre dans le salon. Déjà membre : un simple lien « Ouvrir » (le
// parent le gère). Une erreur (salle devenue privée ou supprimée) s'affiche
// sous le bouton. `demo` (aperçus) : rien ne part.

export function BoutonRejoindre({ salleId, nom, demo = false }: { salleId: string; nom: string; demo?: boolean }) {
  const router = useRouter();
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const client = useRef<SupabaseClient | null>(null);

  async function rejoindre() {
    if (envoi || demo) return;
    setEnvoi(true);
    setErreur(null);
    try {
      client.current ??= createClient();
      const r = await rejoindreSallePublique(client.current, salleId);
      router.push(`/salles/${r.id}`);
    } catch (err) {
      setErreur(messageErreurSalle(err));
      setEnvoi(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 4, justifyItems: "end" }}>
      <button type="button" className={s.btn} onClick={rejoindre} disabled={envoi} aria-label={SALLES.rejoindreNom(nom)}>
        {SALLES.rejoindre}
      </button>
      {erreur && (
        <p role="alert" className={s.hors} style={{ margin: 0, maxWidth: 220, textAlign: "right" }}>
          {erreur}
        </p>
      )}
    </div>
  );
}
