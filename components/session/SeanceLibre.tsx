"use client";

import { useState } from "react";
import { ExamClient } from "@/components/ExamClient";
import { SessionClient, type SetOption } from "@/components/SessionClient";
import { CadreZones, EnTeteSousPage, SousPage } from "@/components/ui/SousPage";
import type { EtatJour } from "@/lib/voice";
import { RETOUR_ENTRAINEMENT, SOUS_ENTRAINEMENT } from "@/lib/voice-entrainement-sous";
import s from "./SeanceLibre.module.css";

// La séance libre (/session), sur le modèle des sous-pages validé par Théo (2026-11-12) : l'ancienne
// « Session du jour » et l'ancien « Mode examen » (/exam) réunis. L'en-tête commun, puis le cadre à
// zones : le réglage à gauche (la banque, la durée ou le format), l'interrupteur du mode examen dans
// la colonne grise : éteint, la séance de 15 minutes corrigée à chaque question (SessionClient) ;
// allumé, l'examen chronométré sans correction avant la fin (ExamClient). L'adresse suit
// (/session?mode=examen : c'est là que /exam renvoie). La séance lancée, chacun garde son écran.

const S = SOUS_ENTRAINEMENT.seance;

/** L'interrupteur du mode examen : un vrai interrupteur (role switch), sa ligne dit le mode en cours. */
function Interrupteur({ actif, onChange }: { actif: boolean; onChange: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={actif} className={s.interrupteur} onClick={onChange}>
      <span className={s.piste} aria-hidden>
        <span className={s.bouton} />
      </span>
      <span className={s.texte}>
        <span className={s.nom}>{S.interrupteur}</span>
        <span className={s.aide}>{actif ? S.examenOui : S.examenNon}</span>
      </span>
    </button>
  );
}

export function SeanceLibre({
  qcmSets,
  flashSets,
  streak,
  etatJour,
  serieReste,
  traitsJour,
  examenDepart,
}: {
  qcmSets: SetOption[];
  flashSets: SetOption[];
  streak: number;
  etatJour: EtatJour;
  serieReste: number | null;
  traitsJour: number | null;
  /** ?mode=examen : la page s'ouvre interrupteur allumé */
  examenDepart: boolean;
}) {
  const [examen, setExamen] = useState(examenDepart);

  function basculer() {
    const suivant = !examen;
    setExamen(suivant);
    try {
      window.history.replaceState(null, "", suivant ? "/session?mode=examen" : "/session");
    } catch {
      // l'adresse ne suit pas : le mode change quand même
    }
  }

  const cadre = (reglage: React.ReactNode) => (
    <SousPage entete={<EnTeteSousPage retour={RETOUR_ENTRAINEMENT} titre={S.titre} ligne={S.ligne} illustration={{ nom: "practice-corrige" }} />}>
      <CadreZones gauche={{ titre: S.preparer, contenu: reglage }} droite={{ titre: S.examen, contenu: <Interrupteur actif={examen} onChange={basculer} /> }} />
    </SousPage>
  );

  return examen ? (
    <ExamClient sets={qcmSets} traitsJour={traitsJour} cadre={cadre} />
  ) : (
    <SessionClient qcmSets={qcmSets} flashSets={flashSets} streak={streak} etatJour={etatJour} serieReste={serieReste} traitsJour={traitsJour} cadre={cadre} />
  );
}
