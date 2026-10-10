"use client";

import { useState } from "react";
import { FicheSceau, SceauDe, ditSceau } from "@/components/profil/FicheSceau";
import type { EtatSceau } from "@/lib/profil/sceaux";

// Les 3 sceaux posés dans l'en-tête, légèrement inclinés comme posés à la
// main (96 px sur téléphone, 120 px sur ordinateur) : ceux que le joueur a
// posés, sinon les plus rares (posesDe). Toucher : la fiche (dans
// Personnaliser : `onToucher`, la feuille qui les choisit).

const ANGLES = [-6, 3, -2];

export function SceauxPoses({ poses, label, onToucher }: { poses: EtatSceau[]; label: string; onToucher?: () => void }) {
  const [fiche, setFiche] = useState<EtatSceau | null>(null);
  if (!poses.length) return null;
  return (
    <>
      <ul data-leonard="sceaux-poses" className="m-0 flex list-none items-center gap-5 p-0 max-lg:justify-center lg:gap-7" aria-label={label}>
        {poses.map((e, i) => (
          <li key={e.def.cle}>
            <button type="button" onClick={() => (onToucher ? onToucher() : setFiche(e))} className="block w-[96px] rounded-[14px] outline-offset-4 transition-transform duration-200 hover:-translate-y-0.5 lg:w-[120px]" aria-label={ditSceau(e)}>
              <SceauDe e={e} taille="remplir" angle={ANGLES[i]} />
            </button>
          </li>
        ))}
      </ul>
      <FicheSceau e={fiche} onFermer={() => setFiche(null)} />
    </>
  );
}
