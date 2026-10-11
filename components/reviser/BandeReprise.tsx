"use client";

import { useEffect, useState } from "react";
import { Icone } from "@/components/adn/icons";
import { BandeEncre } from "@/components/ui/BandeEncre";
import { ago } from "@/components/ContinueReviewing";
import { plural, splitTitle, subjectOfTitle } from "@/components/ContentDetailHeader";
import { readRecentFlashcardSets } from "@/components/RecentFlashcardSetTracker";
import { RV } from "@/lib/voice-reviser";

type Entree = { id: string; title: string; ts: number };

// La bande d'encre de /flashcards : « Reprendre » le dernier paquet ouvert
// (historique local du navigateur, voir RecentFlashcardSetTracker), sinon la
// suggestion du serveur (« Pour commencer »). Rendu serveur = la suggestion,
// pour que la bande ne saute pas à l'hydratation. Sans suggestion ni
// historique, rien.
export function BandeReprise({
  fallback,
  counts,
  subjects,
  basePath = "/flashcards",
}: {
  fallback: { id: string; title: string; subject?: string | null } | null;
  /** nombre de cartes par paquet (id → cartes) */
  counts: Record<string, number>;
  /** matière de chaque paquet (id → nom) */
  subjects: Record<string, string>;
  basePath?: string;
}) {
  const [recent, setRecent] = useState<Entree[]>([]);
  useEffect(() => {
    setRecent(readRecentFlashcardSets("flashcards"));
  }, []);

  const histo = recent[0] ?? null;
  const head: Entree | null = histo ?? (fallback ? { id: fallback.id, title: fallback.title, ts: 0 } : null);
  if (!head) return null;

  const parts = splitTitle(head.title);
  const matiere = subjects[head.id] ?? (histo ? null : fallback?.subject) ?? subjectOfTitle(head.title)?.name ?? null;
  const n = counts[head.id] ?? null;
  const meta = [matiere, n !== null ? plural(n, "carte", "cartes") : null, histo && head.ts ? ago(head.ts, Date.now()) : null].filter(Boolean).join(" · ");

  return (
    <BandeEncre
      icone={<Icone nom="flashcards" size={22} />}
      titre={histo ? RV.reprendre(parts.main) : RV.commencer(parts.main)}
      ligne={meta ? `${meta}. ${RV.ordreCartes}` : RV.ordreCartes}
      action={{ href: `${basePath}/${head.id}`, label: histo ? RV.reprendreAction : RV.commencerAction }}
    />
  );
}
