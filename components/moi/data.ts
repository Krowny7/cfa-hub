// Mises en forme des données de l'espace Moi. Module neutre (pas de
// "use client"), sans accès à la base.
import type { TopicMastery } from "@/lib/mastery";
import type { TopicStat } from "@/components/moi/types";

/** Libellés courts des matières, pour le radar (ordre officiel du CFA). */
export const RADAR_SHORT: Record<string, string> = {
  ethics: "ETH",
  quant: "QM",
  economics: "ECO",
  fsa: "FSA",
  corporate: "CI",
  equity: "EQ",
  fixed_income: "FI",
  derivatives: "DER",
  alternatives: "ALT",
  portfolio: "PM",
};

export function buildTopicStats(topics: TopicMastery[], averages: Record<string, number | null>): TopicStat[] {
  return topics.map((t) => ({
    key: t.key,
    label: t.label,
    short: RADAR_SHORT[t.key] ?? t.label,
    pct: t.pct,
    answered: t.answered,
    avg: averages[t.key] ?? null,
  }));
}

/** XP gagnée depuis lundi (jours en UTC, comme get_xp_daily). */
export function xpThisWeek(days: { day: string; xp: number }[], now = new Date()) {
  const dow = (now.getUTCDay() + 6) % 7;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dow));
  const from = monday.toISOString().slice(0, 10);
  return days.filter((d) => d.day >= from).reduce((s, d) => s + (d.xp || 0), 0);
}
