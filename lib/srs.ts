// SM-2 simplifié — partagé entre SessionClient (qui écrit les mises à jour de
// planification) et FlashcardReview (qui lit l'ordre pour ne pas diverger de
// Session quand un set est ouvert directement, ex: via le raccourci "Reprendre").

export type CardSRS = {
  interval: number; // days until next review
  ef: number;       // ease factor (1.3–2.5)
  due: number;      // unix timestamp (ms)
  reps: number;     // successful repetitions
};

type MinimalCard = { id: string };

function srsKey(setId: string) {
  return `cfa_srs_${setId}`;
}

export function loadSRS(setId: string): Record<string, CardSRS> {
  try {
    const raw = localStorage.getItem(srsKey(setId));
    return raw ? (JSON.parse(raw) as Record<string, CardSRS>) : {};
  } catch {
    return {};
  }
}

export function saveSRS(setId: string, state: Record<string, CardSRS>) {
  try {
    localStorage.setItem(srsKey(setId), JSON.stringify(state));
  } catch {}
}

export function applyReview(
  state: Record<string, CardSRS>,
  cardId: string,
  gotIt: boolean
): Record<string, CardSRS> {
  const now = Date.now();
  const prev = state[cardId] ?? { interval: 0, ef: 2.5, due: now, reps: 0 };

  if (gotIt) {
    const newReps = prev.reps + 1;
    let newInterval: number;
    if (newReps === 1) newInterval = 1;
    else if (newReps === 2) newInterval = 6;
    else newInterval = Math.round(prev.interval * prev.ef);
    const newEf = Math.min(2.5, Math.max(1.3, prev.ef + 0.05));
    return {
      ...state,
      [cardId]: {
        interval: newInterval,
        ef: newEf,
        due: now + newInterval * 86_400_000,
        reps: newReps,
      },
    };
  } else {
    return {
      ...state,
      [cardId]: {
        interval: 1,
        ef: Math.max(1.3, prev.ef - 0.2),
        due: now + 86_400_000,
        reps: 0,
      },
    };
  }
}

export function sortBySRS<T extends MinimalCard>(cards: T[], state: Record<string, CardSRS>): T[] {
  const now = Date.now();
  return [...cards].sort((a, b) => {
    const sa = state[a.id];
    const sb = state[b.id];
    const aDue = sa?.due ?? now;
    const bDue = sb?.due ?? now;
    const aNew = !sa;
    const bNew = !sb;
    const aOver = aDue <= now;
    const bOver = bDue <= now;
    // Order: overdue → new → upcoming
    if (aOver && !bOver) return -1;
    if (!aOver && bOver) return 1;
    if (!aOver && !bOver) {
      if (aNew && !bNew) return -1;
      if (!aNew && bNew) return 1;
    }
    return aDue - bDue;
  });
}

export function getSRSCounts<T extends MinimalCard>(cards: T[], state: Record<string, CardSRS>) {
  const now = Date.now();
  let due = 0;
  let newCount = 0;
  for (const c of cards) {
    const s = state[c.id];
    if (!s) { newCount++; }
    else if (s.due <= now) { due++; }
  }
  return { due, newCount };
}
