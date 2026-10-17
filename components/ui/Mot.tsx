"use client";

import { useId, useState } from "react";
import { MOTS_MAISON, premierMotMaison, type MotMaison } from "@/lib/voice-codex";

// Les mots maison (rature, jour d'encre, notion tenue) : leur définition
// s'ouvre au doigt, à leur premier usage sur un écran (règle d'écriture du
// Codex simplifié, §4 règle 4). Un bouton qui se lit comme un mot souligné
// en pointillé ; pas d'infobulle title= (rien au doigt sur téléphone).

const bouton =
  // la cible tactile déborde du mot (44 px de haut) sans bouger la ligne
  "relative inline cursor-pointer border-0 bg-transparent p-0 text-left font-[inherit] text-inherit underline decoration-dotted decoration-1 underline-offset-[3px] after:absolute after:-inset-x-1 after:-inset-y-3 after:content-['']";

/** Le texte, son mot maison en bouton, puis (au tap) la définition, sous le texte entier. */
function Deplie({ cle, avant = "", mot, apres = "" }: { cle: MotMaison; avant?: string; mot: React.ReactNode; apres?: string }) {
  const [ouvert, setOuvert] = useState(false);
  const id = useId();
  const m = MOTS_MAISON[cle];
  return (
    <>
      {avant}
      <button
        type="button"
        aria-expanded={ouvert}
        aria-controls={ouvert ? id : undefined}
        className={bouton}
        onClick={(e) => {
          // le mot peut vivre dans une ligne cliquable : seul le mot réagit
          e.stopPropagation();
          setOuvert((x) => !x);
        }}
      >
        {mot}
      </button>
      {apres}
      {ouvert && (
        <span id={id} role="note" className="t-micro mt-1 block font-normal">
          {m.mot} : {m.definition}
        </span>
      )}
    </>
  );
}

/** Un mot maison seul : un tap déplie sa définition, un second la replie. */
export function Mot({ cle, children }: { cle: MotMaison; children?: React.ReactNode }) {
  return <Deplie cle={cle} mot={children ?? MOTS_MAISON[cle].mot} />;
}

/** Un texte dont le premier mot maison (« Corriger 14 ratures ») se définit au tap ; sans mot maison, le texte tel quel. */
export function AvecMots({ texte }: { texte: string }) {
  const d = premierMotMaison(texte);
  return d ? <Deplie cle={d.cle} avant={d.avant} mot={d.mot} apres={d.apres} /> : <>{texte}</>;
}
