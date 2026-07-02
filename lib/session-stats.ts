export type SetStats = {
  setId: string;
  title: string;
  mode: "qcm" | "flashcards";
  correct: number;
  total: number;
  lastStudied: number;
};

const KEY = "cfa_session_stats";

function load(): Record<string, SetStats> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, SetStats>) : {};
  } catch {
    return {};
  }
}

export function saveAnswerResult(
  setId: string,
  title: string,
  mode: "qcm" | "flashcards",
  correct: number,
  total: number
): void {
  try {
    const all = load();
    const prev = all[setId];
    all[setId] = {
      setId,
      title,
      mode,
      correct: (prev?.correct ?? 0) + correct,
      total: (prev?.total ?? 0) + total,
      lastStudied: Date.now(),
    };
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {}
}

export function loadAllSetStats(): SetStats[] {
  return Object.values(load()).sort((a, b) => b.lastStudied - a.lastStudied);
}
