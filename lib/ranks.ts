// Rangs : 8 paliers façon Overwatch. Le palier vient de l'ELO, la maîtrise
// (précision moyenne sur les matières du programme) dessine le halo à
// l'encre autour du badge et verrouille les paliers du haut : on n'entre en
// Diamant et au-delà qu'avec une maîtrise minimale. Le dernier palier,
// « Top 10 », n'est pas un seuil d'ELO : ce sont les 10 meilleurs joueurs du
// programme (au moins Grand Maître). Module neutre (pas de "use client") :
// importable par les composants serveur comme client.

export type Tier = {
  key: string;
  name: string;
  /** ELO minimal du palier (Top 10 : rang, pas seuil) */
  min: number;
  /** métal du badge : reflet, teinte, ombre */
  metal: [string, string, string];
  /** maîtrise minimale (en %) pour entrer dans ce palier */
  lock: number | null;
};

export const TIERS: Tier[] = [
  { key: "bronze", name: "Bronze", min: 0, metal: ["#F3BC97", "#B8713F", "#6A3417"], lock: null },
  { key: "argent", name: "Argent", min: 1100, metal: ["#FFFFFF", "#BCC1C7", "#686E75"], lock: null },
  { key: "or", name: "Or", min: 1250, metal: ["#FFF3B0", "#E2B13B", "#875611"], lock: null },
  { key: "platine", name: "Platine", min: 1400, metal: ["#FFFFFF", "#D9E1E8", "#7B8896"], lock: null },
  { key: "diamant", name: "Diamant", min: 1550, metal: ["#F4F8FF", "#AFC0F5", "#5A5CC0"], lock: 60 },
  { key: "maitre", name: "Maître", min: 1700, metal: ["#FFE9A8", "#DA9B2A", "#77440C"], lock: 70 },
  { key: "grand-maitre", name: "Grand Maître", min: 1850, metal: ["#FFFCEC", "#F2D172", "#A3700F"], lock: 80 },
  { key: "top-10", name: "Top 10", min: 1850, metal: ["#EEF2FF", "#97A6FF", "#4535D8"], lock: 90 },
];

export const TOP_TIER = TIERS.length - 1;
export const DEFAULT_ELO = 1200;
const DIVISIONS = ["III", "II", "I"] as const;

export type RankInfo = {
  tierIndex: number;
  tier: Tier;
  /** « III » (bas du palier) → « I » (haut) ; null pour Top 10 */
  division: string | null;
  next: Tier | null;
  /** points d'ELO avant le palier suivant (null au sommet) */
  pointsToNext: number | null;
  /** avancement dans le palier courant, 0–100 */
  progress: number;
  /** palier que l'ELO seul donnerait, si la maîtrise bloque plus bas */
  lockedBy: Tier | null;
};

/**
 * Palier et division pour un ELO donné.
 * @param mastery maîtrise moyenne du programme, 0–100 (null = inconnue : pas de verrou appliqué)
 * @param leaderboardRank place au classement du programme (1 = premier), pour le Top 10
 */
export function rankFor(elo: number, mastery: number | null = null, leaderboardRank: number | null = null): RankInfo {
  let byElo = 0;
  for (let i = 0; i < TOP_TIER; i++) if (elo >= TIERS[i].min) byElo = i;
  if (leaderboardRank !== null && leaderboardRank <= 10 && byElo >= TOP_TIER - 1) byElo = TOP_TIER;
  let idx = byElo;
  if (mastery !== null) while (idx > 0 && TIERS[idx].lock !== null && mastery < (TIERS[idx].lock as number)) idx--;
  const tier = TIERS[idx];
  const lockedBy = idx < byElo ? TIERS[byElo] : null;
  if (idx === TOP_TIER) return { tierIndex: idx, tier, division: null, next: null, pointsToNext: null, progress: 100, lockedBy };
  const lo = tier.min;
  const hi = idx + 1 < TOP_TIER ? TIERS[idx + 1].min : lo + 150;
  const span = Math.max(1, hi - lo);
  const within = Math.max(0, Math.min(span - 1, elo - (idx === 0 ? hi - 150 : lo)));
  const progress = Math.round((within / span) * 100);
  const division = DIVISIONS[Math.min(2, Math.floor((within / span) * 3))];
  const next = idx + 1 < TOP_TIER ? TIERS[idx + 1] : null;
  return { tierIndex: idx, tier, division, next, pointsToNext: next ? Math.max(0, next.min - elo) : null, progress, lockedBy };
}

/** Score attendu de A contre B (formule d'Elo, comme aux échecs). */
export function eloExpected(ratingA: number, ratingB: number) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Variation d'ELO de A après un match contre B.
 * @param score 1 = victoire, 0.5 = nul, 0 = défaite
 * @param k facteur K (32 par défaut ; plus élevé pour les 10 premiers matchs)
 */
export function eloDelta(ratingA: number, ratingB: number, score: number, k = 32) {
  return Math.round(k * (score - eloExpected(ratingA, ratingB)));
}

/** Gain si A gagne, perte si A perd, contre B (pour afficher l'enjeu avant un duel). */
export function eloStakes(ratingA: number, ratingB: number, k = 32) {
  return { win: eloDelta(ratingA, ratingB, 1, k), loss: eloDelta(ratingA, ratingB, 0, k) };
}
