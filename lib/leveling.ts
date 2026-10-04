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

// Partagé entre l'accueil, Moi et la Session (série visible pendant
// l'effort, pas seulement avant/après) : une seule source de vérité pour
// la série (les « jours d'encre ») à partir des événements XP quotidiens.
export type XpDay = { day: string; xp: number };

export type StreakInfo = {
  /** jours d'encre d'affilée : aujourd'hui compris s'il est fait, sinon jusqu'à hier */
  streak: number;
  xpToday: number;
  /** un trait a déjà été posé aujourd'hui */
  todayDone: boolean;
};

/**
 * La série en jours d'encre.
 *
 * Tant que rien n'est fait aujourd'hui, la série ne retombe pas à 0 : elle
 * compte jusqu'à hier, et le bâton du jour attend (« encre sèche » le soir,
 * voir etatDuJour / HEURE_ENCRE_SECHE dans lib/voice). Elle ne casse que si
 * hier aussi est resté vide.
 *
 * @param days   XP par jour (get_xp_daily, jours UTC)
 * @param opts.today  clé « AAAA-MM-JJ » du jour (défaut : aujourd'hui en UTC,
 *                    comme get_xp_daily ; l'accueil passe le jour de Paris)
 * @param opts.actifs jours actifs d'une autre source (questions répondues),
 *                    qui comptent même sans XP (une réponse fausse, une
 *                    question déjà réussie, un duel ne rapportent pas d'XP)
 */
export function calcStreakAndToday(days: XpDay[], opts: { today?: string; actifs?: Iterable<string> } = {}): StreakInfo {
  const today = opts.today ?? new Date().toISOString().slice(0, 10);
  const map = new Map(days.map((d) => [d.day, d.xp]));
  const actifs = new Set(opts.actifs ?? []);
  const active = (day: string) => (map.get(day) ?? 0) > 0 || actifs.has(day);
  const xpToday = map.get(today) ?? 0;
  const todayDone = active(today);

  let streak = 0;
  const cur = new Date(today + "T00:00:00Z");
  // rien encore aujourd'hui : la série court jusqu'à hier
  if (!todayDone) cur.setUTCDate(cur.getUTCDate() - 1);
  for (;;) {
    const dayStr = cur.toISOString().slice(0, 10);
    if (active(dayStr)) {
      streak++;
      cur.setUTCDate(cur.getUTCDate() - 1);
    } else {
      break;
    }
  }

  return { streak, xpToday, todayDone };
}
