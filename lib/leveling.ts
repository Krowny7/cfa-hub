/**
 * Simple, scalable leveling curve.
 *
 * - Level starts at 1
 * - XP required for next level grows ~15% each level
 * - Designed to be deterministic and fast (O(level))
 */

export type LevelInfo = {
  level: number;
  xpTotal: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  xpToNextLevel: number;
  progressPct: number; // 0..1
};

const BASE_XP = 100;
const GROWTH = 1.15;

export function xpNeededForLevelUp(level: number): number {
  // XP to go from `level` -> `level+1`
  const l = Math.max(1, Math.floor(level));
  return Math.round(BASE_XP * Math.pow(GROWTH, l - 1));
}

export function levelInfoFromXp(xpTotal: number): LevelInfo {
  const total = Math.max(0, Math.floor(xpTotal || 0));

  let level = 1;
  let remaining = total;

  // Loop is small in practice; even at very high XP it's fine.
  while (true) {
    const need = xpNeededForLevelUp(level);
    if (remaining < need) {
      const progress = need > 0 ? remaining / need : 0;
      return {
        level,
        xpTotal: total,
        xpIntoLevel: remaining,
        xpForNextLevel: need,
        xpToNextLevel: need - remaining,
        progressPct: Math.min(1, Math.max(0, progress))
      };
    }
    remaining -= need;
    level += 1;
  }
}

// Partagé entre le dashboard et la Session (badge streak visible pendant
// l'effort, pas seulement avant/après) — une seule source de vérité pour
// le calcul du streak à partir des events XP quotidiens.
export type XpDay = { day: string; xp: number };

export function calcStreakAndToday(days: XpDay[]): { streak: number; xpToday: number } {
  const today = new Date().toISOString().slice(0, 10);
  const map = new Map(days.map((d) => [d.day, d.xp]));
  const xpToday = map.get(today) ?? 0;

  let streak = 0;
  const cur = new Date(today + "T00:00:00Z");
  for (;;) {
    const dayStr = cur.toISOString().slice(0, 10);
    if ((map.get(dayStr) ?? 0) > 0) {
      streak++;
      cur.setUTCDate(cur.getUTCDate() - 1);
    } else {
      break;
    }
  }

  return { streak, xpToday };
}
