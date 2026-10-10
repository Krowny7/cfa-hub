"use client";

import { useState } from "react";
import { ArrowRight, RefreshCw } from "lucide-react";
import type { NotionProposee } from "@/lib/atelier-seance";
import { ATELIER as V } from "@/lib/voice-atelier";
import { LogoAtelier } from "@/components/atelier/LogoAtelier";

// L'écran d'ouverture de l'Atelier (dix secondes) : « Aujourd'hui : Duration
// (12 ratures en cours), Crédit souverain, FCFE », dans l'ordre de leur
// poids (le poids lui-même ne s'affiche pas : un « 60 % » se lirait comme
// une réussite) ; un toucher remplace une notion par la suivante de la
// liste des points faibles. Depuis une ligne de « Tes points faibles » : une
// seule notion, et « Ajouter mes autres points faibles ». Le déroulé
// annonce les blocs prévus (sans ratures en cours ni calcul, pas de bloc).

const TOUCHER = "relative after:absolute after:-inset-x-1 after:-inset-y-3 after:content-['']";

export function AtelierOuverture({
  proposees,
  initiales,
  envoi,
  message,
  onCommencer,
}: {
  /** les points faibles, du plus net au moins net */
  proposees: NotionProposee[];
  /** la sélection de départ : les 3 premiers, ou une seule notion */
  initiales: string[];
  envoi: boolean;
  message: string | null;
  onCommencer: (notions: string[]) => void;
}) {
  const [choix, setChoix] = useState<string[]>(initiales);
  const parId = new Map(proposees.map((p) => [p.notion, p]));
  const choisies = choix.map((id) => parId.get(id));
  const avecRatures = choisies.some((p) => (p?.enCours ?? 0) > 0);
  const avecCalcul = choisies.some((p) => p?.aCalcul === true);

  /** La suivante de la liste qui n'est pas déjà choisie (en boucle). */
  const remplacante = (actuelle: string) => {
    const depart = proposees.findIndex((p) => p.notion === actuelle);
    for (let k = 1; k <= proposees.length; k++) {
      const p = proposees[(depart + k + proposees.length) % proposees.length];
      if (p && !choix.includes(p.notion)) return p;
    }
    return null;
  };
  const autres = proposees.filter((p) => !choix.includes(p.notion)).slice(0, Math.max(0, 3 - choix.length));

  return (
    <section className="card-hero rl-in mx-auto grid w-full max-w-[760px] gap-6 p-6 md:p-8" aria-label={V.nom}>
      <div className="grid gap-1.5">
        <p className="font-brand m-0 flex items-center gap-2 text-[22px] leading-none">
          <LogoAtelier className="size-[24px]" />
          {V.nom}
        </p>
        <h1 className="t-h1 m-0">{V.aujourdhui}</h1>
      </div>

      <ol className="m-0 grid list-none divide-y divide-line p-0">
        {choix.map((id) => {
          const p = parId.get(id);
          const r = remplacante(id);
          return (
            <li key={id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-semibold leading-snug [overflow-wrap:anywhere]">{p?.libelle ?? id}</span>
                <span className="t-micro mt-0.5 block">{[p?.repere, p ? V.detailNotion(p.enCours, p.calcul) : null].filter(Boolean).join(" · ")}</span>
              </span>
              {r && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm !h-11 min-w-11 shrink-0 justify-center gap-1.5 px-2.5"
                  aria-label={V.remplacerPar(r.libelle)}
                  title={V.remplacerPar(r.libelle)}
                  onClick={() => setChoix((c) => c.map((x) => (x === id ? r.notion : x)))}
                >
                  <RefreshCw size={14} aria-hidden /> <span className="hidden sm:inline">{V.remplacer}</span>
                </button>
              )}
            </li>
          );
        })}
      </ol>

      {choix.length < 3 && autres.length > 0 && (
        <button type="button" className={"ink-link w-fit text-[13.5px] font-semibold " + TOUCHER} onClick={() => setChoix((c) => [...c, ...autres.map((p) => p.notion)].slice(0, 3))}>
          {V.ajouterAutres}
        </button>
      )}

      <p className="t-small m-0 max-w-[560px]">{V.deroule(avecRatures, avecCalcul)}</p>

      {message && (
        <p role="alert" className="t-small m-0 text-pen">
          {message}
        </p>
      )}

      <div>
        <button type="button" className="btn btn-primary btn-lg rl-press min-h-[44px] w-full sm:w-auto" disabled={envoi || !choix.length} onClick={() => onCommencer(choix)}>
          {envoi ? V.preparation : V.commencer} <ArrowRight size={17} aria-hidden />
        </button>
      </div>
    </section>
  );
}
