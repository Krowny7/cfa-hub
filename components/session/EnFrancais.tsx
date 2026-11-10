"use client";

import { useEffect, useState } from "react";
import { ouvrirTraducteur, traductionPossible, traduireFr } from "@/lib/traduction-fr";
import { TRADUCTION as T } from "@/lib/voice-traduction";

// Le bouton « En français » de l'entraînement ciblé, quand la séance contient de l'Ethics.
// La question affichée (énoncé et choix) passe en français, termes d'examen gardés en
// anglais (lib/traduction-fr). L'explication de la correction est déjà en français.

export function useEnFrancais(ethics: boolean, prompt: string | undefined, choices: string[] | undefined) {
  const [possible, setPossible] = useState(false);
  const [actif, setActif] = useState(false);
  const [etat, setEtat] = useState<"" | "charge" | "rate">("");
  const [fr, setFr] = useState<{ prompt: string; choices: string[] } | null>(null);

  useEffect(() => {
    if (ethics) void traductionPossible().then(setPossible);
  }, [ethics]);

  useEffect(() => {
    setFr(null);
    if (!actif || !prompt || !choices) return;
    let fini = false;
    setEtat("charge");
    Promise.all([traduireFr(prompt), ...choices.map(traduireFr)])
      .then(([p, ...c]) => {
        if (fini) return;
        setFr({ prompt: p, choices: c });
        setEtat("");
      })
      .catch(() => !fini && setEtat("rate"));
    return () => {
      fini = true;
    };
  }, [actif, prompt, choices]);

  function basculer() {
    // le premier clic ouvre le traducteur (Chrome peut télécharger son modèle à ce moment)
    if (!actif) ouvrirTraducteur().catch(() => setEtat("rate"));
    setActif((a) => !a);
    setEtat("");
  }

  const bouton =
    ethics && possible ? (
      <button type="button" className="btn btn-secondary btn-sm" aria-pressed={actif} onClick={basculer} title={T.aide}>
        {actif ? (etat === "charge" ? T.enCours : etat === "rate" ? T.rate : T.anglais) : T.francais}
      </button>
    ) : null;

  return { bouton, prompt: actif && fr ? fr.prompt : prompt, choices: actif && fr ? fr.choices : choices };
}
