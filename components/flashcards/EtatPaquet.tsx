import { Check } from "lucide-react";
import type { EtatAffiche } from "@/lib/flashcards/progression";

// Où en est la boucle d'un paquet (ou d'une matière), en pastille discrète :
// « Tour 1 · 8 restantes » au premier tour, « Tour 2 · 4 à revoir » ensuite,
// « Maîtrisé · 12 oct. » (coche au stylo, la date visible : le toucher et le
// clavier n'ont pas d'infobulle) une fois bouclée. Calculé par
// lib/flashcards/progression.ts ; sans état, rien n'est affiché. Le lecteur
// d'écran lit la seule phrase d'aide, pas le texte abrégé. Sans hook :
// utilisable côté serveur comme dans un composant client.

export function EtatPaquet({ etat, className = "" }: { etat: EtatAffiche; className?: string }) {
  return (
    <span
      className={`chip chip-sm chip-quiet shrink-0 whitespace-nowrap tabular-nums ${etat.fini ? "text-[var(--ink)]" : ""} ${className}`}
      title={etat.aide}
    >
      {etat.fini && <Check size={13} strokeWidth={2.6} aria-hidden className="text-[var(--pen)]" />}
      <span aria-hidden>{etat.texte}</span>
      <span className="sr-only">{etat.aide}</span>
    </span>
  );
}
