"use client";

import { useState } from "react";
import { ArrowRight, RefreshCw } from "lucide-react";
import type { NotionProposee } from "@/lib/atelier-seance";
import { ATELIER as V } from "@/lib/voice-atelier";
import { LogoAtelier } from "@/components/atelier/LogoAtelier";

// L'écran d'ouverture de l'Atelier (dix secondes) : « Ta notion la plus
// faible, en 15 minutes : Duration (12 ratures en cours) » ; un toucher la
// remplace par la suivante de la liste des points faibles. Depuis une ligne
// de « Tes points faibles » (?notion=), c'est cette notion-là. Le déroulé
// annonce les blocs prévus (sans ratures en cours ni calcul, pas de bloc).

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
  const avecRatures = (p?.enCours ?? 0) > 0;
  const avecCalcul = p?.aCalcul === true;
  // la plus faible : la première de la liste
  const plusFaible = choix === proposees[0]?.notion;

  /** La suivante de la liste (en boucle). */
  const remplacante = (() => {
    const depart = proposees.findIndex((x) => x.notion === choix);
    const suivante = proposees[(depart + 1) % proposees.length];
    return suivante && suivante.notion !== choix ? suivante : null;
  })();

  return (
    <section className="card-hero rl-in mx-auto grid w-full max-w-[760px] gap-6 p-6 md:p-8" aria-label={V.nom}>
      <div className="grid gap-1.5">
        <p className="font-brand m-0 flex items-center gap-2 text-[22px] leading-none">
          <LogoAtelier className="size-[24px]" />
          {V.nom}
        </p>
        <h1 className="t-h1 m-0">{V.titreOuverture(plusFaible)}</h1>
      </div>

      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-semibold leading-snug [overflow-wrap:anywhere]">{p?.libelle ?? choix}</span>
          <span className="t-micro mt-0.5 block">{[p?.repere, p ? V.detailNotion(p.enCours, p.calcul) : null].filter(Boolean).join(" · ")}</span>
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

      <p className="t-small m-0 max-w-[560px]">{V.deroule(avecRatures, avecCalcul)}</p>

      {message && (
        <p role="alert" className="t-small m-0 text-pen">
          {message}
        </p>
      )}

      <div>
        <button type="button" className="btn btn-primary btn-lg rl-press min-h-[44px] w-full sm:w-auto" disabled={envoi || !choix} onClick={() => onCommencer([choix])}>
          {envoi ? V.preparation : V.commencer} <ArrowRight size={17} aria-hidden />
        </button>
      </div>
    </section>
  );
}
