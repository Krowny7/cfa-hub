"use client";

import { useEffect } from "react";

export type RecentSetKind = "flashcards" | "qcm" | "exercises";

const MAX = 6;

type RecentEntry = { id: string; title: string; ts: number };

function keyFor(kind: RecentSetKind) {
  return `cfahub:recentSets:${kind}`;
}

// Enregistre ce set dans le localStorage dès qu'on ouvre sa page,
// pour alimenter le raccourci "Reprendre" sur /flashcards et /qcm.
export function RecentFlashcardSetTracker({
  id,
  title,
  kind = "flashcards",
}: {
  id: string;
  title: string;
  kind?: RecentSetKind;
}) {
  useEffect(() => {
    try {
      const key = keyFor(kind);
      const raw = window.localStorage.getItem(key);
      const list: RecentEntry[] = raw ? JSON.parse(raw) : [];
      const next = [{ id, title, ts: Date.now() }, ...list.filter((e) => e.id !== id)].slice(0, MAX);
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // localStorage indisponible (navigation privée, etc.) — pas grave, feature dégradée silencieusement
    }
  }, [id, title, kind]);

  return null;
}

export function readRecentFlashcardSets(kind: RecentSetKind = "flashcards"): RecentEntry[] {
  try {
    const raw = window.localStorage.getItem(keyFor(kind));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
