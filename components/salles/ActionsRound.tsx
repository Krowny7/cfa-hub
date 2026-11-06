"use client";

import { useState } from "react";
import { Flag, Play } from "lucide-react";
import { BoutonEnvoi } from "@/components/classement/Encre";
import type { SalleSerie } from "@/lib/salles/types";
import { PARTIE } from "@/lib/voice-salles";
import s from "./Salles.module.css";

// L'admin, entre deux rounds : lancer le suivant, ou s'arrêter là (le classement
// du moment devient le classement final). Sur l'écran de fin de round et, s'il
// est revenu au salon, au-dessus de ses réglages.

export type RetourRound = { ok: boolean; erreur?: string };

export function ActionsRound({
  serie,
  pret = true,
  surPeinture = false,
  onLancerRound,
  onTerminerSerie,
}: {
  serie: SalleSerie;
  /** faux tant que le serveur n'a pas confirmé la fin du round */
  pret?: boolean;
  surPeinture?: boolean;
  onLancerRound: () => Promise<RetourRound>;
  onTerminerSerie?: () => Promise<RetourRound>;
}) {
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const suivant = serie.round + 1;

  async function agir(f: () => Promise<RetourRound>) {
    if (occupe) return;
    setOccupe(true);
    setErreur(null);
    try {
      const r = await f();
      if (!r.ok) setErreur(r.erreur ?? PARTIE.roundErreur);
    } finally {
      setOccupe(false);
    }
  }

  return (
    <>
      <BoutonEnvoi type="button" surPeinture={surPeinture} disabled={occupe || !pret} onClick={() => void agir(onLancerRound)}>
        <Play size={17} aria-hidden /> {occupe ? PARTIE.rejouerEnCours : PARTIE.lancerRound(suivant)}
      </BoutonEnvoi>
      {onTerminerSerie && (
        <button
          type="button"
          className={[s.btn, s.btnDiscret].join(" ")}
          disabled={occupe || !pret}
          onClick={() => {
            if (window.confirm(PARTIE.terminerSerieConfirme)) void agir(onTerminerSerie);
          }}
        >
          <Flag size={15} aria-hidden /> {PARTIE.terminerSerie}
        </button>
      )}
      {erreur && (
        <p className={s.erreur} role="alert" style={{ flexBasis: "100%", margin: 0 }}>
          {erreur}
        </p>
      )}
    </>
  );
}
