"use client";

import { useState } from "react";
import { ArrowRight, RefreshCw } from "lucide-react";
import type { NotionProposee } from "@/lib/atelier-seance";
import { ActionEncre } from "@/components/ui/SousPage";
import { ATELIER as V } from "@/lib/voice-atelier";
import { ATELIER_B } from "@/lib/voice-entrainement-b";
import { SEUIL_CALCUL } from "@/lib/calc/faibles";
import { nombre } from "@/lib/voice";
import fiche from "./AtelierOuverture.module.css";

// L'ouverture de l'Atelier (dix secondes), sur la carte de la notion du jour : la notion la plus
// faible (ou celle demandée par ?notion=), sa précision en Dela face au seuil « tenu » (80 %), ses
// justes et ses ratures en Mono, comme sur l'ardoise des calculs ; les autres points faibles attendent
// derrière, en pile, et « Remplacer » amène la suivante devant ; puis « Commencer » à l'encre.

/** Le seuil « tenu » : 4 justes sur 5 (lib/calc/faibles.ts). */
const TENU = SEUIL_CALCUL;

export function AtelierOuverture({
  proposees,
  initiales,
  envoi,
  message,
  onCommencer,
}: {
  /** les points faibles, du plus net au moins net */
  proposees: NotionProposee[];
  /** la sélection de départ : la notion la plus faible, ou celle demandée (une seule : seule la première compte) */
  initiales: string[];
  envoi: boolean;
  message: string | null;
  onCommencer: (notions: string[]) => void;
}) {
  const [choix, setChoix] = useState<string>(initiales[0] ?? proposees[0]?.notion ?? "");
  const parId = new Map(proposees.map((p) => [p.notion, p]));
  const p = parId.get(choix);

  /** La suivante de la liste (en boucle). */
  const remplacante = (() => {
    const depart = proposees.findIndex((x) => x.notion === choix);
    const suivante = proposees[(depart + 1) % proposees.length];
    return suivante && suivante.notion !== choix ? suivante : null;
  })();
  const pct = p?.pct ?? null;
  const mesure = p && p.n ? ATELIER_B.justes(p.ok ?? 0, p.n, 0) : null;

  return (
    <div className="grid min-w-0 gap-6" key={choix}>
      <div className={fiche.tete}>
        <span className="min-w-0">
          <span className={fiche.nom + " block"}>{p?.libelle ?? choix}</span>
          <span className={fiche.repere + " mt-2 block"}>{p?.repere}</span>
        </span>
        {pct !== null && (
          <span className={fiche.pct} aria-label={`${pct} %`}>
            <b>
              {nombre(pct)}
              <small>%</small>
            </b>
            <span>{ATELIER_B.seuil(TENU)}</span>
          </span>
        )}
      </div>
      <p className={fiche.mesure}>{[mesure, p ? V.detailNotion(p.enCours, p.calcul) : null].filter(Boolean).join(" · ")}</p>

      {message && (
        <p role="alert" className={"t-small m-0 " + fiche.alerte}>
          {message}
        </p>
      )}

      <div className={fiche.actions}>
        <ActionEncre disabled={envoi || !choix} onClick={() => onCommencer([choix])}>
          {envoi ? V.preparation : V.commencer} <ArrowRight size={17} aria-hidden />
        </ActionEncre>
        {remplacante && (
          <button
            type="button"
            className={fiche.remplacer + " rl-presse"}
            aria-label={V.remplacerPar(remplacante.libelle)}
            title={V.remplacerPar(remplacante.libelle)}
            onClick={() => setChoix(remplacante.notion)}
          >
            <RefreshCw size={14} aria-hidden /> {V.remplacer}
          </button>
        )}
      </div>
    </div>
  );
}
