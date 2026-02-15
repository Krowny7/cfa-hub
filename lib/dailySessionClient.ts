"use client";

// Client-only helpers for the Daily Session MVP.

export type DailyState = {
  date: string; // YYYY-MM-DD
  stepFlashcards: boolean;
  stepQcm: boolean;
  completed: boolean;
  completedAt?: number;
};

export type StreakState = {
  lastCompletedDate: string | null;
  streak: number;
};

const DAILY_KEY = "cfa.dailySession";
const STREAK_KEY = "cfa.streak";

export function todayKey(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function yesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayKey(d);
}

export function readDaily(): DailyState {
  const t = todayKey();
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    if (!raw) return { date: t, stepFlashcards: false, stepQcm: false, completed: false };
    const parsed = JSON.parse(raw) as Partial<DailyState>;
    if (!parsed || parsed.date !== t) return { date: t, stepFlashcards: false, stepQcm: false, completed: false };
    return {
      date: t,
      stepFlashcards: Boolean(parsed.stepFlashcards),
      stepQcm: Boolean(parsed.stepQcm),
      completed: Boolean(parsed.completed),
      completedAt: typeof parsed.completedAt === "number" ? parsed.completedAt : undefined
    };
  } catch {
    return { date: t, stepFlashcards: false, stepQcm: false, completed: false };
  }
}

export function writeDaily(next: DailyState) {
  try {
    localStorage.setItem(DAILY_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function readStreak(): StreakState {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return { lastCompletedDate: null, streak: 0 };
    const parsed = JSON.parse(raw) as Partial<StreakState>;
    return {
      lastCompletedDate: typeof parsed.lastCompletedDate === "string" ? parsed.lastCompletedDate : null,
      streak: Number(parsed.streak ?? 0) || 0
    };
  } catch {
    return { lastCompletedDate: null, streak: 0 };
  }
}

export function writeStreak(next: StreakState) {
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function markDailyStepDone(step: "flashcards" | "qcm") {
  const d = readDaily();
  if (d.completed) return d;
  const next: DailyState = {
    ...d,
    stepFlashcards: step === "flashcards" ? true : d.stepFlashcards,
    stepQcm: step === "qcm" ? true : d.stepQcm
  };
  writeDaily(next);
  return next;
}

export function completeDailyIfReady() {
  const d = readDaily();
  if (d.completed) return { daily: d, streak: readStreak() };
  if (!d.stepFlashcards || !d.stepQcm) return { daily: d, streak: readStreak() };

  const t = todayKey();
  const y = yesterdayKey();
  const current = readStreak();

  let nextStreak = 1;
  if (current.lastCompletedDate === t) nextStreak = Math.max(current.streak, 1);
  else if (current.lastCompletedDate === y) nextStreak = (current.streak || 0) + 1;

  const nextS: StreakState = { lastCompletedDate: t, streak: nextStreak };
  writeStreak(nextS);

  const nextD: DailyState = { ...d, completed: true, completedAt: Date.now() };
  writeDaily(nextD);

  return { daily: nextD, streak: nextS };
}
