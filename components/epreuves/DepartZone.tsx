"use client";

import { ArrowRight } from "lucide-react";
import { Chiffre } from "@/components/ui/Decors";
import { ActionEncre } from "@/components/ui/SousPage";
import { nombre } from "@/lib/voice";
import { SOUS_ENTRAINEMENT } from "@/lib/voice-entrainement-sous";

// Le départ des épreuves dans le cadre à zones (le modèle des sous-pages validé par Théo,
// 2026-11-12) : les 30 du jour, les 5 du jour, les séries éclair. À gauche, une ligne au plus, les
// traits à poser, les règles, l'action à l'encre ; dans la colonne grise, le chiffre de la série
// d'encre. L'illustration du lieu est dans l'en-tête : pas de bandeau ici.

/** La série d'encre, réduite à ce que montre la colonne grise (lib/serie-encre, lu par la page). */
export type SerieDuJour = { jours: number; fait: boolean; reste: number };

export function DepartZone({
  ligne,
  traits,
  regles,
  action,
  onStart,
  pied,
}: {
  /** au-dessus des traits (le format, les copies déjà rendues) */
  ligne?: React.ReactNode;
  /** les traits à poser (Ticks), déjà rendus par l'appelant */
  traits: React.ReactNode;
  /** [en gras, la suite] */
  regles: [string, string][];
  action: string;
  onStart: () => void;
  /** à côté de l'action (l'heure de clôture, le résumé des séries) */
  pied?: React.ReactNode;
}) {
  return (
    <div className="grid min-w-0 gap-5">
      {ligne && <p className="t-small m-0 font-semibold">{ligne}</p>}
      {traits}
      <ul className="m-0 grid grid-cols-[minmax(0,1fr)] list-none gap-1.5 p-0 text-[15px] leading-normal text-muted">
        {regles.map(([b, rest]) => (
          <li key={b}>
            <b className="text-white">{b}</b>
            {rest}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <ActionEncre onClick={onStart}>
          {action} <ArrowRight size={16} aria-hidden />
        </ActionEncre>
        {pied && <span className="t-micro">{pied}</span>}
      </div>
    </div>
  );
}

/** La colonne grise « Ta série » : les jours d'encre d'affilée, et ce qui manque aujourd'hui. */
export function ChiffreSerie({ serie }: { serie: SerieDuJour }) {
  return <Chiffre valeur={nombre(serie.jours)} legende={SOUS_ENTRAINEMENT.defi.serieLegende(serie.jours, serie.fait, serie.reste)} />;
}
