"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icone } from "@/components/adn/icons";
import { createClient } from "@/lib/supabase/browser";
import { createDuel, duelErrorMessage } from "@/lib/duels";
import { FACE } from "@/lib/voice-profil";

// « Revanche » sur le profil d'un autre joueur : lance un duel contre lui,
// rattaché au dernier duel perdu (duels.rematch_of), comme l'écran de fin
// de duel. S'il y a déjà un duel ouvert entre vous, la base le rend : on y va.

export function Revanche({ adversaire, duel, className = "btn btn-primary rl-press" }: { adversaire: string; duel: string; className?: string }) {
  const router = useRouter();
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function lancer() {
    setOccupe(true);
    setErreur(null);
    try {
      const r = await createDuel(createClient(), adversaire, duel);
      router.push(`/duel/${r.id}`);
    } catch (e) {
      setErreur(duelErrorMessage(e));
      setOccupe(false);
    }
  }

  return (
    <>
      <button type="button" className={className} disabled={occupe} onClick={() => void lancer()}>
        <Icone nom="duel" size={17} /> {FACE.revanche}
      </button>
      {erreur && (
        <p role="alert" className="t-small m-0 basis-full text-pen">
          {erreur}
        </p>
      )}
    </>
  );
}
