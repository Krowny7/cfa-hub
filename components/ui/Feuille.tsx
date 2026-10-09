"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import s from "./Feuille.module.css";

// La Feuille : un panneau qui s'ouvre par-dessus la page, en dialogue natif
// (comme la banque de GIF : Échap ferme, le focus y reste, un toucher hors
// de la feuille la referme). Sur téléphone, une feuille qui monte du bas
// (85 % de la hauteur au plus) ; sur ordinateur (1024 px et plus), un
// panneau latéral de 420 px, à droite. Le contenu défile à l'intérieur.

export function Feuille({
  ouvert,
  onFermer,
  titre,
  fermer = "Fermer",
  children,
}: {
  ouvert: boolean;
  onFermer: () => void;
  /** le titre de la feuille (en tête, et nom du dialogue) */
  titre: string;
  /** libellé du bouton de fermeture */
  fermer?: string;
  children: React.ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (ouvert && !d.open) d.showModal();
    else if (!ouvert && d.open) d.close();
  }, [ouvert]);

  return (
    <dialog
      ref={dialog}
      onClose={onFermer}
      onClick={(e) => {
        if (e.target === dialog.current) onFermer(); // toucher hors de la feuille
      }}
      aria-label={titre}
      className={`${s.feuille} overflow-hidden border border-line-2 bg-[var(--surface)] p-0 text-white shadow-[var(--shadow-3)] backdrop:bg-[rgba(12,12,14,.5)] backdrop:backdrop-blur-[2px]`}
    >
      <div className="flex max-h-[inherit] flex-col lg:h-full">
        <span aria-hidden className="mx-auto mt-2.5 block h-1 w-10 shrink-0 rounded-full bg-[var(--line-2)] lg:hidden" />
        <div className="flex items-center justify-between gap-3 px-5 pb-1 pt-3 lg:pt-5">
          <h2 className="t-eyebrow m-0">{titre}</h2>
          <button type="button" className="btn btn-ghost btn-sm !h-11 !w-11 !p-0" onClick={onFermer} aria-label={fermer}>
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[calc(24px+env(safe-area-inset-bottom,0px))]">{children}</div>
      </div>
    </dialog>
  );
}
