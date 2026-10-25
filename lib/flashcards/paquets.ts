import { splitTitle } from "@/components/ContentDetailHeader";

// Petits outils neutres pour les paquets de flashcards officielles.

/**
 * Le thème d'un paquet, pour l'en-tête des cartes :
 * « Fixed Income — Flashcards 2/4 (Duration & convexity) » → « Duration & convexity » ;
 * « Fixed Income — Credit analysis » → « Credit analysis » ; un titre libre reste tel quel.
 */
export function themePaquet(title: string | null | undefined): string {
  const t = (title ?? "").trim();
  if (!t) return "";
  const p = splitTitle(t);
  if (p.lead) return p.main;
  const m = /^.+?\s+[—–-]\s+(.+)$/.exec(t);
  return (m?.[1] ?? t).trim();
}

/** Le numéro d'un paquet officiel : « Fixed Income — Flashcards 2/4 (…) » → 2 ; null pour un titre libre. */
export function numeroPaquet(title: string | null | undefined): number | null {
  const m = /Flashcards\s+(\d+)\s*\/\s*\d+/i.exec(title ?? "");
  return m ? Number(m[1]) : null;
}

/** L'en-tête d'une carte : « Fixed Income · Duration & convexity » (ce qui existe des deux). */
export function lieuCarte(matiere: string | null | undefined, theme: string | null | undefined): string {
  return [matiere, theme].filter((x): x is string => !!x && x.trim().length > 0).join(" · ") || "Flashcards";
}
