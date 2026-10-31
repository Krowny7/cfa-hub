"use client";

import { useRef, type CSSProperties, type KeyboardEvent } from "react";
import { PALETTES, type PaletteCle } from "@/lib/palettes";
import { ENCRES } from "@/lib/profil/banniere";
import { BANNIERE_ED } from "@/lib/voice-banniere";
import c from "./EditeurBanniere.module.css";

// La couleur du contour de la bannière et de l'encre de la carte
// (Personnaliser › Ta bannière › Ta carte) : UNE couleur pour les deux, liées
// (composition.encre ; pour le joueur au fanion, sans composition, style.encre :
// son fanion la prend aussi). Une rangée de pastilles, comme la couleur du profil :
// d'abord « Couleur du rang » (le métal du rang autour de la bannière,
// l'ébène dans la carte : le défaut, null), puis les palettes du site
// (lib/palettes.ts, dans l'ordre de ENCRES). Chaque pastille montre l'anneau
// (le contour) et, au milieu, l'encre sous son voile : des dégradés fixes des
// tons du liquide, sans canvas ni texture qui glisse ; le vrai liquide est
// dans l'aperçu de la carte complète, à côté, qui suit chaque choix. Un
// groupe de boutons radio : un seul arrêt de tabulation (la pastille cochée),
// les flèches (et Début, Fin) passent d'une pastille à l'autre et la cochent.
// Seul un VRAI changement appelle onChange : toucher la pastille déjà cochée
// (ou Début sur la première, Fin sur la dernière) ne fait rien ; sinon le
// brouillon changeait pour rien (et l'éditeur, qui l'ignore aussi :
// choisirEncre, créait une composition vide pour un joueur au fanion).
// Le serveur revalide à l'enregistrement (validerStyle : liste blanche).

/** les choix, dans l'ordre des pastilles : la couleur du rang (null), puis les palettes */
export const CHOIX_ENCRE: readonly (PaletteCle | null)[] = [null, ...ENCRES];

/** La pastille qu'une touche vise depuis la pastille `i` (flèches en boucle, Début, Fin) ; -1 : la touche ne la concerne pas. */
export function pastilleVisee(i: number, touche: string, n: number = CHOIX_ENCRE.length): number {
  if (touche === "ArrowRight" || touche === "ArrowDown") return (i + 1) % n;
  if (touche === "ArrowLeft" || touche === "ArrowUp") return (i - 1 + n) % n;
  if (touche === "Home") return 0;
  if (touche === "End") return n - 1;
  return -1;
}

/** La couleur cochée : une clé qu'on ne connaît plus (ou retirée de ENCRES) revient à la couleur du rang. */
export const encreCochee = (encre: PaletteCle | null | undefined): PaletteCle | null => (encre && PALETTES[encre] && ENCRES.includes(encre) ? encre : null);

/** Le fond d'une pastille de palette : l'encre de la carte, voilée, au milieu ; les quatre tons du liquide en biais autour (le contour). */
const fondPastille = (k: PaletteCle): CSSProperties => {
  const [a, b, d, e] = PALETTES[k].liquide;
  return { background: `radial-gradient(circle, rgba(12, 9, 7, 0.62) 0 40%, transparent 42%), linear-gradient(135deg, ${a} 0%, ${b} 35%, ${d} 65%, ${e} 100%)` };
};

export function ChoixEncre({ encre, metal, onChange }: { encre: PaletteCle | null; metal: string; onChange: (e: PaletteCle | null) => void }) {
  const groupe = useRef<HTMLDivElement | null>(null);
  const actuelle = encreCochee(encre);
  const p = actuelle ? PALETTES[actuelle] : null;
  /** coche une pastille : onChange seulement si le choix change */
  const choisir = (k: PaletteCle | null) => {
    if (k !== actuelle) onChange(k);
  };

  const clavier = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const j = pastilleVisee(i, e.key);
    if (j < 0) return;
    e.preventDefault();
    choisir(CHOIX_ENCRE[j]);
    groupe.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[j]?.focus();
  };

  return (
    <div className="flex flex-col gap-2" data-choix-encre="">
      <h3 className="t-eyebrow m-0">{BANNIERE_ED.encre}</h3>
      <p className="t-micro m-0">{BANNIERE_ED.encreAide}</p>
      <div ref={groupe} role="radiogroup" aria-label={BANNIERE_ED.encre} className={c.pastilles}>
        {CHOIX_ENCRE.map((k, i) => {
          const actif = k === actuelle;
          const nom = k ? PALETTES[k].nom : BANNIERE_ED.encreRang;
          return (
            <button
              key={k ?? "rang"}
              type="button"
              role="radio"
              aria-checked={actif}
              tabIndex={actif ? 0 : -1}
              title={nom}
              className={c.pastille}
              data-encre-choix={k ?? "rang"}
              onClick={() => choisir(k)}
              onKeyDown={(e) => clavier(e, i)}
            >
              {k ? <span aria-hidden className={c.pastilleTon} style={fondPastille(k)} /> : <span aria-hidden className={c.pastilleTon} data-rang="" style={{ ["--metal" as string]: metal } as CSSProperties} />}
              <span className="sr-only">{nom}</span>
            </button>
          );
        })}
      </div>
      <p className="t-micro m-0">{p ? BANNIERE_ED.encreChoisie(p.nom, p.inspiration) : BANNIERE_ED.encreChoisie(BANNIERE_ED.encreRang, BANNIERE_ED.encreRangDetail)}</p>
    </div>
  );
}
