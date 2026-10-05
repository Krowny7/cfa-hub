"use client";

import { Bookmark } from "lucide-react";
import { useMarque, type SourceMarque } from "@/lib/marques";

// « Marquer » une question croisée (juste ou fausse) pour la revoir plus tard,
// dans Moi › Marquées (lib/marques). Affiché seulement une fois la question
// répondue, et seulement pour un joueur connecté.
//   variante « pastille » : à côté de l'état (juste / raté) d'une correction ;
//   variante « lien » : parmi les actions du retour de réponse (fiches).
export function MarqueQuestion({
  questionId,
  source,
  variante = "pastille",
  className = "",
}: {
  questionId: string;
  source: SourceMarque;
  variante?: "pastille" | "lien";
  className?: string;
}) {
  const { marquee, pret, connecte, basculer } = useMarque(questionId);
  if (!pret || !connecte) return null;
  const titre = marquee
    ? "Question marquée : tu la retrouves dans Moi › Marquées. Cliquer pour retirer la marque."
    : "Marquer cette question pour revoir la notion plus tard (Moi › Marquées)";
  const cls =
    variante === "pastille"
      ? "inline-flex shrink-0 items-center gap-1 rounded-[8px] px-2 py-0.5 text-[12px] font-semibold transition-colors " +
        (marquee ? "bg-white text-black" : "bg-surface-2 text-muted hover:text-white")
      : "btn btn-ghost btn-sm shrink-0 " + (marquee ? "text-white" : "text-muted");
  return (
    <button type="button" className={`${cls} ${className}`} aria-pressed={marquee} title={titre} onClick={() => basculer(source)}>
      {/* plein quand la question est marquée */}
      <Bookmark size={variante === "pastille" ? 13 : 14} fill={marquee ? "currentColor" : "none"} aria-hidden />
      {marquee ? "Marquée" : "Marquer"}
    </button>
  );
}
