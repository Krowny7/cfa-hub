"use client";

import { Bookmark } from "lucide-react";
import { useMarqueCarte, type SourceMarqueCarte } from "@/lib/marques";
import { MARQUE_CARTE } from "@/lib/voice-z3c";

// « Marquer » une flashcard pour la retrouver dans Moi › Marquées et la
// réviser à part (/flashcards/marquees), comme une question (MarqueQuestion,
// lib/marques). Seulement pour un joueur connecté. Tant que les marques ne
// sont pas lues (rendu serveur, premier rendu), le bouton garde sa place sans
// se montrer : la barre de la révision ne saute pas.
// Le bouton vit hors de la fiche : il ne la retourne pas, et ni le clic ni
// Entrée / Espace ne remontent jusqu'à la boucle (raccourcis de la révision).
// Dans la pile, un clic de souris ne lui donne pas le focus : Espace, Entrée,
// 1 et 2 continuent de retourner et de trier la carte (sinon ils basculeraient
// la marque, même celle de la carte suivante) ; au clavier, Tab l'atteint.
// `frais` : les marques relues en base à l'ouverture et au retour sur
// l'onglet (la révision des marquées : une carte démarquée ailleurs).
//   variante « pile » : la barre du haut de la révision, à côté de Mélanger et
//     du plein écran (44 px, le libellé à partir de sm) ;
//   variante « ligne » : une carte d'une liste (« Le set ») : l'icône seule, 44 px ;
//   variante « puce » : Moi › Marquées, l'icône et le libellé, 44 px de haut.
export function MarqueCarte({
  cardId,
  source,
  variante = "pile",
  nom,
  masque = false,
  frais = false,
  className = "",
}: {
  cardId: string;
  source: SourceMarqueCarte;
  variante?: "pile" | "ligne" | "puce";
  /** le nom de la carte dans une liste (« carte 3 ») : le bouton se nomme sans ambiguïté */
  nom?: string;
  /** garder la place sans montrer le bouton (la dernière fiche s'envole) */
  masque?: boolean;
  /** relire les marques en base à l'ouverture et au retour sur l'onglet */
  frais?: boolean;
  className?: string;
}) {
  const { marquee, pret, connecte, basculer } = useMarqueCarte(cardId, { frais });
  if (pret && !connecte) return null;
  const cache = !pret || masque;
  const libelle = marquee ? MARQUE_CARTE.marquee : MARQUE_CARTE.marquer;
  const cls =
    variante === "pile"
      ? "icon-btn h-11 w-11 shrink-0 rounded-[13px] text-[13px] font-semibold sm:inline-flex sm:w-auto sm:items-center sm:gap-1.5 sm:px-3.5 " + (marquee ? "is-on" : "")
      : variante === "ligne"
        ? "inline-grid h-11 w-11 shrink-0 place-items-center rounded-[12px] transition-colors hover:bg-surface-2 " + (marquee ? "text-[var(--ink)]" : "text-muted hover:text-[var(--ink)]")
        : "inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-[12px] px-3 text-[13px] font-semibold transition-colors " +
          (marquee ? "bg-[var(--ink)] text-[var(--paper)]" : "bg-surface-2 text-muted hover:text-[var(--ink)]");
  return (
    <button
      type="button"
      className={`${cls} ${cache ? "invisible" : ""} ${className}`}
      aria-pressed={marquee}
      aria-hidden={cache || undefined}
      tabIndex={cache ? -1 : undefined}
      disabled={cache}
      title={marquee ? MARQUE_CARTE.titreMarquee : MARQUE_CARTE.titreMarquer}
      onClick={(e) => {
        e.stopPropagation();
        basculer(source);
      }}
      onKeyDown={(e) => {
        // Entrée / Espace activent le bouton, sans retourner la carte
        if (e.key === "Enter" || e.key === " ") e.stopPropagation();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      // le focus reste où il était (la fiche, « Retourner ») : les raccourcis de la révision gardent leur rôle
      onMouseDown={variante === "pile" ? (e) => e.preventDefault() : undefined}
    >
      {/* plein quand la carte est marquée */}
      <Bookmark size={variante === "puce" ? 14 : 16} fill={marquee ? "currentColor" : "none"} aria-hidden />
      <span className={variante === "pile" ? "sr-only sm:not-sr-only" : variante === "ligne" ? "sr-only" : ""}>
        {libelle}
        {nom && <span className="sr-only"> · {nom}</span>}
      </span>
    </button>
  );
}
