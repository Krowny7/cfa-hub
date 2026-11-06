"use client";

import { RotateCcw } from "lucide-react";
import { Bouton, BoutonEnvoi, PorteeEncre } from "@/components/classement/Encre";
import { lienSimilaires, ratures, raturesUniques, type LigneBilan } from "@/lib/notions-similaires";
import { RETEST as V } from "@/lib/voice-notions";

// « Me retester » : depuis une copie, des questions du même concept que mes ratures, pour voir
// si c'est compris depuis. Sans rature à retravailler, rien ne s'affiche. `onLancer` : la séance
// se prépare sur place (déjà sur /practice, un lien ne remonterait pas la page).

export function RetestRatures({ questionIds, onLancer, occupe = false, erreur = null }: { questionIds: (string | null | undefined)[]; onLancer?: (ids: string[]) => void; occupe?: boolean; erreur?: string | null }) {
  const ids = ratures(questionIds);
  if (ids.length === 0) return null;
  return (
    // la portée d'encre mesure sa largeur sur son parent : elle entoure la carte, pas le seul bouton
    <PorteeEncre>
      <section className="card-quiet flex flex-wrap items-center justify-between gap-x-6 gap-y-3 p-5 md:p-6" aria-label={V.bouton}>
        <div className="grid min-w-0 flex-1 basis-[260px] gap-1">
          <p className="t-h3 m-0">{V.titre(raturesUniques(questionIds).length)}</p>
          <p className="t-small m-0">{V.texte}</p>
        </div>
        {onLancer ? (
          <BoutonEnvoi type="button" disabled={occupe} onClick={() => onLancer(ids)}>
            <RotateCcw size={16} aria-hidden /> {V.bouton}
          </BoutonEnvoi>
        ) : (
          <Bouton href={lienSimilaires(ids)}>
            <RotateCcw size={16} aria-hidden /> {V.bouton}
          </Bouton>
        )}
        {erreur && (
          <p role="alert" className="m-0 basis-full text-sm text-pen">
            {erreur}
          </p>
        )}
      </section>
    </PorteeEncre>
  );
}

const COULEUR: Record<LigneBilan["verdict"], string> = { compris: "var(--ink)", en_progres: "var(--ink-2)", fragile: "var(--pen)" };

/** Le bilan de fin de retest : concept par concept, ce qui coince d'abord. */
export function BilanRetest({ lignes }: { lignes: LigneBilan[] }) {
  if (lignes.length === 0) return null;
  const compris = lignes.filter((l) => l.verdict === "compris").length;
  return (
    <section className="card-quiet grid gap-3 p-5 md:p-6" aria-label={V.bilanTitre}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="t-h3 m-0">{V.bilanTitre}</h2>
        <p className="t-small m-0">{V.bilanResume(compris, lignes.length)}</p>
      </div>
      <ul className="m-0 grid list-none divide-y divide-[var(--pencil-2)] p-0">
        {lignes.map((l) => (
          <li key={l.cle} className="flex items-center justify-between gap-4 py-2.5 text-[14px]">
            <span className="min-w-0 flex-1">{l.libelle}</span>
            <span className="shrink-0 font-mono text-[13px] tabular-nums text-[var(--ink-2)]">
              {l.justes}/{l.total}
            </span>
            <b className="w-[104px] shrink-0 text-right text-[13px] font-semibold" style={{ color: COULEUR[l.verdict] }}>
              {V[l.verdict]}
            </b>
          </li>
        ))}
      </ul>
    </section>
  );
}
