"use client";

import { useEffect } from "react";

const KEY = "cfahub:recentFlashcardSets";
const MAX = 6;

type RecentEntry = { id: string; title: string; ts: number };

// Enregistre ce set dans le localStorage dès qu'on ouvre sa page,
// pour alimenter le raccourci "Reprendre" sur /flashcards.
export function RecentFlashcardSetTracker({ id, title }: { id: string; title: string }) {
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      const list: RecentEntry[] = raw ? JSON.parse(raw) : [];
      const next = [{ id, title, ts: Date.now() }, ...list.filter((e) => e.id !== id)].slice(0, MAX);
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // localStorage indisponible (navigation privée, etc.) — pas grave, feature dégradée silencieusement
    }
  }, [id, title]);

  return null;
}

export function readRecentFlashcardSets(): RecentEntry[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
