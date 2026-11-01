"use client";

import { useEffect, useState } from "react";
import { Pastille } from "@/components/reviser/Pastilles";
import { lireBoucleBrute } from "@/lib/flashcards/boucle";
import { avanceMatiere, compterStatuts, type AvanceMatiere, type LectureAppareil, type SuiviMatiere } from "@/lib/flashcards/avancement";
import { loadSRS } from "@/lib/srs";
import { RV } from "@/lib/voice-reviser";

// Sous le nom d'une matière dans l'index de /flashcards : une pastille par
// paquet et « 38/60 vues ». Le serveur donne ce que dit le compte ; après le
// montage, l'appareil est relu (boucles plus récentes, répétition espacée) :
// la liste peut dater (retour arrière) ou le dernier envoi de la révision
// n'être pas encore arrivé. Même principe que useEtatListe. Ni encre ni
// Intl : des chiffres entiers, la couleur du texte. Lu comme une seule image
// par les lecteurs d'écran (aria-label).

/** Ce que l'appareil sait, lu dans le navigateur (try/catch dans chaque lecture : rendu correct sans). */
const APPAREIL: LectureAppareil = {
  boucle: (local) => lireBoucleBrute(local),
  srs: (idPaquet) => Object.keys(loadSRS(idPaquet)).length,
};

export function AvanceFlashcards({ suivi, joueur }: { suivi: SuiviMatiere; joueur: string }) {
  // null : pas encore relu sur l'appareil, le rendu du serveur vaut
  const [appareil, setAppareil] = useState<AvanceMatiere | null>(null);
  useEffect(() => {
    setAppareil(avanceMatiere(suivi, joueur, APPAREIL));
  }, [suivi, joueur]);
  const a = appareil ?? avanceMatiere(suivi, joueur);
  const n = compterStatuts(a.paquets);
  const aide = RV.avanceAide(suivi.nom, a.vues, a.total, n.maitrise, n.cours, n.neuf);
  return (
    <span role="img" aria-label={aide} title={aide} className="t-micro mt-1 flex items-center gap-2 overflow-hidden whitespace-nowrap">
      <span className="flex shrink-0 items-center gap-1">
        {a.paquets.map((statut, i) => (
          <Pastille key={i} statut={statut} />
        ))}
      </span>
      <span className="truncate font-mono tabular-nums">{RV.avanceVues(a.vues, a.total)}</span>
    </span>
  );
}
