import { pad2 } from "@/components/reviser/rail";
import type { OnePagerItem } from "@/components/reviser/shelves";
import { OP } from "@/lib/voice-reviser";
import { Presentoir, type Piece } from "@/components/ui/Presentoir";

// Les one-pagers (une page A4 PDF par matière) : les vignettes de /fiches/one-pagers. Les PDF vivent dans le bucket privé « fiches » : la page reçoit
// leurs URL signées, générées côté serveur. Sans état ni requête.

/**
 * Les one-pagers sur le présentoir (components/ui/Presentoir) : la vignette A4 de chaque matière,
 * rang et code, poids à l'examen ; le PDF s'ouvre dans un nouvel onglet. `url` null : PDF
 * indisponible (feuille en filigrane, sans lien).
 */
export function OnePagersGrille({ items }: { items: (OnePagerItem & { url: string | null })[] }) {
  const pieces: Piece[] = items.map((it) => ({
    cle: it.key,
    href: it.url,
    externe: true,
    numero: pad2(it.index),
    code: it.code,
    titre: it.name,
    ligne: (it.url ? it.weight : OP.indisponible) ?? undefined,
    image: it.thumb,
    aria: OP.ouvrir(it.name),
  }));
  return <Presentoir pieces={pieces} forme="epingle" label={OP.titre} />;
}
