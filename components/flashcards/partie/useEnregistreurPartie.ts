"use client";

import { useEffect, useMemo, useState } from "react";
import { enregistrerBoucle } from "@/app/flashcards/actions";
import { codexNoter } from "@/lib/codex/actions";
import type { EtatBoucle } from "@/lib/flashcards/boucle";
import type { MatierePartie } from "@/lib/flashcards/partie";
import { EnregistreurPartie } from "@/lib/flashcards/partie-enregistrement";

// L'enregistrement de la partie de cartes, branché sur le navigateur : la
// boucle « À revoir » du paquet de chaque carte jugée (appareil + compte,
// comme la révision), sa répétition espacée et le Codex. Toute la logique est
// dans lib/flashcards/partie-enregistrement.ts ; ici, seulement ce que le
// navigateur apporte : l'action serveur, la balise de fermeture (sendBeacon,
// comme useSynchroBoucle : une action serveur ne survit pas à une fermeture
// ni à un lien suivi) et le Codex.
//
//   const enregistreur = useEnregistreurPartie(joueur, matieres);
//   enregistreur.nouvellePartie(lignes);                 // à chaque donne (lignes : réponse de /api/flashcards/partie)
//   enregistreur.enregistrer(carte, true | false);       // « Maîtrisée » / « Pas encore »
//   enregistreur.terminer();                             // fin ou abandon de la partie

const ROUTE = "/api/flashcards/progression";

function balise(cle: string, etat: EtatBoucle) {
  const corps = JSON.stringify({ cle, etat });
  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon?.(ROUTE, new Blob([corps], { type: "text/plain;charset=UTF-8" }))) return;
  } catch {
    // pas de balise : fetch keepalive
  }
  try {
    void fetch(ROUTE, { method: "POST", body: corps, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => undefined);
  } catch {
    // l'état reste sur l'appareil, renvoyé à la prochaine ouverture du paquet
  }
}

export function useEnregistreurPartie(joueur: string, matieres: readonly MatierePartie[]): EnregistreurPartie {
  const cartesDe = useMemo(() => new Map(matieres.flatMap((m) => m.paquets.map((p) => [p.id, p.cartes] as const))), [matieres]);
  const [enregistreur] = useState(
    () =>
      new EnregistreurPartie({
        joueur,
        cartesDuPaquet: (setId) => cartesDe.get(setId) ?? null,
        envoyer: enregistrerBoucle,
        balise,
        noter: (matiere, cartes) => {
          codexNoter("flashcards_revues", { matiere, cartes }).catch(() => undefined);
        },
      })
  );

  // page cachée, fermée, démontée ou lien suivi : ce que le compte n'a pas encore reçu part par la balise
  useEffect(() => {
    const cacher = () => {
      if (document.visibilityState === "hidden") enregistreur.balise();
    };
    const fermer = () => enregistreur.balise();
    const versLien = (ev: Event) => {
      if (ev instanceof KeyboardEvent && ev.key !== "Enter") return;
      if ((ev.target as Element | null)?.closest?.("a[href]")) enregistreur.balise();
    };
    document.addEventListener("visibilitychange", cacher);
    window.addEventListener("pagehide", fermer);
    document.addEventListener("pointerdown", versLien, true);
    document.addEventListener("keydown", versLien, true);
    return () => {
      document.removeEventListener("visibilitychange", cacher);
      window.removeEventListener("pagehide", fermer);
      document.removeEventListener("pointerdown", versLien, true);
      document.removeEventListener("keydown", versLien, true);
      enregistreur.balise();
    };
  }, [enregistreur]);

  return enregistreur;
}
