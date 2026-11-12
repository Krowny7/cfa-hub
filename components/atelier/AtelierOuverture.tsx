"use client";

import { useState } from "react";
import { ArrowRight, RefreshCw } from "lucide-react";
import type { NotionProposee } from "@/lib/atelier-seance";
import { ActionEncre } from "@/components/ui/SousPage";
import { ATELIER as V } from "@/lib/voice-atelier";

// L'ouverture de l'Atelier (dix secondes), dans le cadre à zones de la page (« La notion du jour ») :
// la notion la plus faible (ou celle demandée par ?notion=), sa ligne ; un toucher la remplace par la
// suivante de la liste des points faibles ; puis « Commencer ». Rien d'autre (le nom du lieu et ce
// qu'il promet sont dans l'en-tête).

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

  return (
    <div className="grid min-w-0 gap-6">
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1">
          <span className="block text-[22px] font-bold leading-tight tracking-[-0.02em] [overflow-wrap:anywhere]">{p?.libelle ?? choix}</span>
          <span className="t-micro mt-1 block">{[p?.repere, p ? V.detailNotion(p.enCours, p.calcul) : null].filter(Boolean).join(" · ")}</span>
        </span>
        {remplacante && (
          <button
            type="button"
            className="btn btn-ghost btn-sm !h-11 min-w-11 shrink-0 justify-center gap-1.5 px-2.5"
            aria-label={V.remplacerPar(remplacante.libelle)}
            title={V.remplacerPar(remplacante.libelle)}
            onClick={() => setChoix(remplacante.notion)}
          >
            <RefreshCw size={14} aria-hidden /> <span className="hidden sm:inline">{V.remplacer}</span>
          </button>
        )}
      </div>

      {message && (
        <p role="alert" className="t-small m-0 text-pen">
          {message}
        </p>
      )}

      <div>
        <ActionEncre disabled={envoi || !choix} onClick={() => onCommencer([choix])}>
          {envoi ? V.preparation : V.commencer} <ArrowRight size={17} aria-hidden />
        </ActionEncre>
      </div>
    </div>
  );
}
